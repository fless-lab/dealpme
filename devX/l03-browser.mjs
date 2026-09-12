import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { chromium } from "playwright";
import { readOtp, receivedMessage } from "./notification-inbox.mjs";

export async function verifyNotificationBrowser({ check, root, api, freePort, waitFor, credentials, xssKey }) {
  const origin = `http://127.0.0.1:${await freePort()}`;
  const app = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "start", "-p", new URL(origin).port], {
    cwd: join(root, "codebases/frontend/web"), env: { ...process.env, NODE_ENV: "production", API_BASE_URL: api }, stdio: "ignore",
  });
  let browser;
  try {
    await waitFor(async () => { try { return (await fetch(`${origin}/connexion`)).ok; } catch { return false; } });
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext(); const page = await context.newPage();
    const email = `l03-browser-${randomUUID()}@demo.dealpme.local`;
    const fillRegistration = async () => {
      await page.goto(`${origin}/inscription`);
      await page.locator("#organisationName").fill("Organisation navigateur L03");
      await page.locator("#email").fill(email);
      await page.locator("#phone").fill("+22890000001");
      await page.locator("#password").fill("MotDePasse-Navigateur-L03");
      await page.locator("#terms").check(); await page.locator("#privacy").check();
    };
    await check("Navigateur : panne réseau conserve les saisies et permet de réessayer", async () => {
      await fillRegistration();
      await page.route("**/api/auth/register", (route) => route.abort());
      await page.locator('[data-control-id="REGISTER_SUBMIT"]').click();
      await page.locator('[data-control-id="REGISTER_ERROR"]').waitFor();
      assert.equal(await page.locator("#email").inputValue(), email);
      assert.equal(await page.locator('[data-control-id="REGISTER_SUBMIT"]').isDisabled(), false);
      await page.unroute("**/api/auth/register");
    });
    await check("Navigateur : inscription, code reçu par SMTP et vérification sans raccourci", async () => {
      const [response] = await Promise.all([page.waitForResponse((r) => r.url().endsWith("/api/auth/register")), page.locator('[data-control-id="REGISTER_SUBMIT"]').click()]);
      const data = await response.json(); assert(data.ok && data.emailChallengeId); assert(!("devCode" in data));
      await page.waitForURL("**/verification-email?**");
      assert(!new URL(page.url()).searchParams.has("devCode"));
      assert.equal(await page.locator("#code").inputValue(), "");
      await page.locator("#code").fill(await readOtp("email", data.emailChallengeId));
      await page.locator('[data-control-id="VERIFY_EMAIL_SUBMIT"]').click();
      await page.waitForURL("**/connexion");
      await page.locator("#email").fill(email); await page.locator("#password").fill("MotDePasse-Navigateur-L03");
      await page.locator('[data-control-id="LOGIN_SUBMIT"]').click();
      await page.waitForURL(`${origin}/`);
      assert((await context.cookies()).some((c) => c.name === "dp_session" && c.httpOnly));
    });
    await check("Navigateur : MFA validé avec le SMS effectivement reçu", async () => {
      const officerContext = await browser.newContext(); const officer = await officerContext.newPage();
      await officer.goto(`${origin}/connexion`);
      await officer.locator("#email").fill("officier@cci-togo.demo.dealpme.local");
      await officer.locator("#password").fill(credentials["officier@cci-togo.demo.dealpme.local"]);
      const [response] = await Promise.all([officer.waitForResponse((r) => r.url().endsWith("/api/auth/login")), officer.locator('[data-control-id="LOGIN_SUBMIT"]').click()]);
      const data = await response.json(); assert(data.mfaRequired); assert(!("devCode" in data));
      assert(!(await officerContext.cookies()).some((c) => c.name === "dp_session"));
      await officer.locator('[data-control-id="LOGIN_MFA_CODE"]').fill(await readOtp("sms", data.challengeId));
      await officer.locator('[data-control-id="LOGIN_MFA_SUBMIT"]').click();
      await officer.waitForURL(`${origin}/`);
      assert((await officerContext.cookies()).some((c) => c.name === "dp_session" && c.httpOnly));
    });
    await check("Boîte SMS : filtre, affichage Unicode et contenu HTML inerte", async () => {
      const box = await browser.newPage(); await box.goto(process.env.SMS_LOCAL_BASE_URL);
      const message = await receivedMessage("sms", xssKey);
      await box.locator("#correlation").fill(message.delivery.correlationId);
      await box.getByRole("button", { name: "Actualiser", exact: true }).click();
      await box.getByText(message.text, { exact: true }).waitFor();
      assert.equal(await box.locator("article img").count(), 0);
      assert.equal(await box.evaluate(() => globalThis.smsXss), undefined);
      await box.setViewportSize({ width: 390, height: 844 });
      assert(await box.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1));
    });
  } finally { if (browser) await browser.close(); app.kill("SIGKILL"); }
}
