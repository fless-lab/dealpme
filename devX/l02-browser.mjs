import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { chromium } from "playwright";

export async function verifyMessagingBrowser({ check, root, base, freePort, waitFor, seller, investorA, investorB, dealId, convA, convB }) {
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "start", "-p", String(port)], {
    cwd: join(root, "codebases/frontend/web"), env: { ...process.env, NODE_ENV: "production", API_BASE_URL: base }, stdio: "ignore",
  });
  let browser;
  try {
    await waitFor(async () => { try { return (await fetch(`${origin}/connexion`)).ok; } catch { return false; } });
    browser = await chromium.launch({ headless: true });
    const actor = async (token) => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
      await context.addCookies([{ name: "dp_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
      return context.newPage();
    };
    const owner = await actor(seller), a = await actor(investorA), b = await actor(investorB);
    const messageRows = (page) => page.locator('[data-control-id="OPP_MESSAGE"]');
    await check("Navigateur : sélection explicite et envoi du cédant vers A puis B", async () => {
      await owner.goto(`${origin}/cedant/${dealId}/audience`);
      await owner.locator(`option[value="${convA}"]`).waitFor({ state: "attached" });
      const alphaInterests = await owner.locator('[data-control-id="SELLER_INTEREST_ROW"]').filter({ hasText: "Intérêt Alpha" }).allTextContents();
      assert(alphaInterests.length > 0 && alphaInterests.every((text) => text.includes(`Échange ${convA.slice(-8)}`)));
      assert(await owner.locator('[data-control-id="SELLER_MESSAGE_SEND"]').isDisabled());
      for (const [id, text] of [[convA, "Réponse interface Alpha"], [convB, "Réponse interface Beta"]]) {
        await owner.getByLabel("Conversation du repreneur").selectOption(id);
        await owner.getByLabel("Répondre", { exact: true }).fill(text);
        const [response] = await Promise.all([
          owner.waitForResponse((r) => r.url().endsWith(`/deals/${dealId}/messages`) && r.request().method() === "POST"),
          owner.locator('[data-control-id="SELLER_MESSAGE_SEND"]').click(),
        ]);
        assert(response.ok());
        assert.equal((await response.json()).conversationId, id);
        await owner.getByText(text, { exact: true }).waitFor();
      }
    });
    await check("Navigateur : les repreneurs ne voient que leurs réponses", async () => {
      await Promise.all([a.goto(`${origin}/opportunites/${dealId}`), b.goto(`${origin}/opportunites/${dealId}`)]);
      await a.getByText("Réponse interface Alpha", { exact: true }).waitFor();
      await b.getByText("Réponse interface Beta", { exact: true }).waitFor();
      assert(!(await messageRows(a).allTextContents()).some((s) => s.includes("Réponse interface Beta")));
      assert(!(await messageRows(b).allTextContents()).some((s) => s.includes("Réponse interface Alpha")));
    });
    await check("Navigateur : panne réseau conserve le brouillon et ne simule aucun succès", async () => {
      await owner.route("**/api/marketplace/deals/*/messages", (route) => route.abort());
      await owner.getByLabel("Répondre", { exact: true }).fill("Brouillon conservé après panne");
      await owner.locator('[data-control-id="SELLER_MESSAGE_SEND"]').click();
      const error = owner.locator('[data-control-id="SELLER_THREAD_ERROR"]');
      await error.waitFor();
      assert((await error.textContent()).includes("Service indisponible. Actualisez les échanges avant de réessayer."));
      assert.equal(await owner.getByLabel("Répondre", { exact: true }).inputValue(), "Brouillon conservé après panne");
      assert(!(await owner.locator('[data-control-id="SELLER_MESSAGE"]').allTextContents()).some((s) => s.includes("Brouillon conservé après panne")));
      await owner.unroute("**/api/marketplace/deals/*/messages");
    });
    await check("Navigateur : réponse tardive d'un ancien fil ignorée après changement", async () => {
      let release;
      const delayed = new Promise((done) => { release = done; });
      let intercepted = false;
      await owner.route("**/api/marketplace/threads/**", async (route) => {
        if (new URL(route.request().url()).searchParams.get("conversationId") === convA) {
          intercepted = true; await delayed;
        }
        await route.continue().catch(() => {});
      });
      await owner.getByLabel("Conversation du repreneur").selectOption(convA);
      await waitFor(() => intercepted);
      await owner.getByLabel("Conversation du repreneur").selectOption(convB);
      await owner.getByText("Réponse interface Beta", { exact: true }).waitFor();
      release();
      await owner.waitForTimeout(200);
      assert(!(await owner.locator('[data-control-id="SELLER_MESSAGE"]').allTextContents()).some((s) => s.includes("Réponse interface Alpha")));
      await owner.unroute("**/api/marketplace/threads/**");
    });
    await check("Navigateur/BFF : erreur de lecture visible, reprise et refus du fil étranger", async () => {
      const unauthorized = await fetch(`${origin}/api/marketplace/threads/${dealId}`);
      assert.equal(unauthorized.status, 401);
      assert.equal((await a.request.get(`${origin}/api/marketplace/threads/${dealId}?conversationId=${convB}`)).status(), 404);
      await a.route("**/api/marketplace/threads/**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Lecture temporairement indisponible" }) }));
      await a.reload();
      const error = a.locator('[data-control-id="OPP_INTEREST_ERROR"]');
      await error.waitFor();
      assert((await error.textContent()).includes("Lecture temporairement indisponible"));
      assert.equal(await a.getByText("Intérêt transmis. Écrivez au cédant pour convenir d'un échange.", { exact: true }).count(), 0);
      await a.unroute("**/api/marketplace/threads/**");
      await a.locator('[data-control-id="MESSAGE_THREAD_REFRESH"]').first().click();
      await a.getByText("Réponse interface Alpha", { exact: true }).waitFor();
    });
    await check("Navigateur mobile : sélection et historique sans débordement", async () => {
      await owner.setViewportSize({ width: 390, height: 844 });
      assert(await owner.getByLabel("Conversation du repreneur").isVisible());
      const layout = await owner.evaluate(() => ({
        width: globalThis.document.documentElement.scrollWidth,
        viewport: globalThis.innerWidth,
        overflow: [...globalThis.document.querySelectorAll("body *")].filter((el) => el.getBoundingClientRect().right > globalThis.innerWidth + 1).slice(0, 12).map((el) => ({ tag: el.tagName, class: el.className })),
      }));
      assert(layout.width <= layout.viewport + 1, JSON.stringify(layout));
    });
  } finally {
    if (browser) await browser.close();
    child.kill("SIGKILL");
  }
}
