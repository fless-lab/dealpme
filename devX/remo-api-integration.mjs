import assert from "node:assert/strict";
import { createServer as createHttpsServer } from "node:https";
import { createServer as createNetServer } from "node:net";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes, randomUUID, createHash, createHmac, X509Certificate } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import postgres from "postgres";
import { IdentityProvider, ServiceProvider } from "samlify";
import "@dealpme/federation";
import { chromium } from "playwright";
import { readOtp } from "./notification-inbox.mjs";

if (!/^dealpme-ci-/.test(process.env.CI_TEST_PROJECT ?? "")) throw new Error("Pile CI isolée requise");
const source = JSON.parse(spawnSync("docker", ["inspect", process.env.SMOKE_CORE_CONTAINER], { encoding: "utf8" }).stdout)[0];
assert.equal(source.Config.Labels["com.docker.compose.project"], process.env.CI_TEST_PROJECT);
assert(source.NetworkSettings.Ports["5432/tcp"].some(p => p.HostPort === new URL(process.env.DATABASE_URL_CORE_ADMIN).port));
const root = resolve(import.meta.dirname, "..");
await mkdir("/tmp/opencode", { recursive: true });
const temp = await mkdtemp("/tmp/opencode/remo-contract-");
const companyId = "644662cc766fdabb714cf9f9", apiKey = randomBytes(24).toString("hex");
const admin = postgres(process.env.DATABASE_URL_CORE_ADMIN, { max: 4 });
const credentials = JSON.parse(await readFile(process.env.DEMO_CREDENTIALS_FILE, "utf8"));
const report = { status: "RUNNING", target: "HTTPS_CONTRACT_FIXTURE_NOT_REMO_ACCOUNT", checks: [] };
const save = () => writeFile(resolve(root, ".ci-artifacts/remo-api-results.json"), JSON.stringify(report, null, 2) + "\n");
async function check(name, work) { const row = { name, status: "RUNNING" }; report.checks.push(row); try { await work(); row.status = "PASS"; console.log(`[Remo API] OK ${name}`); } catch (error) { row.status = "FAIL"; throw error; } finally { await save(); } }
async function freePort() { const s = createNetServer(); await new Promise(ok => s.listen(0, "127.0.0.1", ok)); const port = s.address().port; await new Promise(ok => s.close(ok)); return port; }
const privateKey = resolve(temp, "key.pem"), certificate = resolve(temp, "cert.pem");
assert.equal(spawnSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", privateKey, "-out", certificate, "-days", "1", "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1"], { stdio: "ignore" }).status, 0);
const key = await readFile(privateKey), cert = await readFile(certificate);
const remoteEvents = new Map(), remoteMembers = new Map(), pendingSaml = new Map();
let creations = 0, invitations = 0, loseCreate = false, loseInvite = false, rejectCreate = false, sp, idp, samlReceipt;
const fixture = createHttpsServer({ key, cert }, async (req, res) => {
  const respond = (status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
  const url = new URL(req.url, "https://fixture.invalid");
  const chunks = []; for await (const chunk of req) chunks.push(chunk); const raw = Buffer.concat(chunks).toString();
  if (url.pathname === "/saml/acs" && req.method === "POST") {
    try {
      const form = new URLSearchParams(raw);
      const result = await sp.parseLoginResponse(idp, "post", { body: { SAMLResponse: form.get("SAMLResponse") } });
      const requestId = result.extract.response.inResponseTo;
      assert.equal(form.get("RelayState"), pendingSaml.get(requestId)); assert(pendingSaml.delete(requestId));
      samlReceipt = { email: result.extract.nameID, requestId };
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end("<h1>SSO vérifié par le SP de recette</h1>");
    } catch { respond(400, { error: "SAML_REJECTED" }); }
    return;
  }
  if (req.headers.authorization !== `Token: ${apiKey}`) { respond(401, { isSuccess: false }); return; }
  const body = raw ? JSON.parse(raw) : {};
  if (url.pathname === `/api/v1/companies/${companyId}/events` && req.method === "POST") {
    if(rejectCreate){rejectCreate=false;respond(403,{isSuccess:false});return;}
    assert.equal(body.isPrivate, true); assert.equal(body.isDiscoveryOptedOut, true); assert.equal(typeof body.startTime, "number");
    const id = randomBytes(12).toString("hex"), event = { ...body, _id: id, company: companyId };
    creations++; remoteEvents.set(id, event); remoteMembers.set(id, new Map());
    if (loseCreate) { loseCreate = false; res.destroy(); return; }
    respond(200, { isSuccess: true, event }); return;
  }
  const match = url.pathname.match(/^\/api\/v1\/events\/([a-f0-9]{24})(?:\/(.*))?$/);
  if (!match) { respond(404, { isSuccess: false }); return; }
  const [, id, action] = match, event = remoteEvents.get(id);
  if (!event) { respond(req.method === "DELETE" ? 400 : 404, { isSuccess: false }); return; }
  if (!action && req.method === "GET") { respond(200, { isSuccess: true, event }); return; }
  if (!action && req.method === "PUT") { Object.assign(event, body); respond(200, { isSuccess: true }); return; }
  if (!action && req.method === "DELETE") { remoteEvents.delete(id); respond(200, { isSuccess: true }); return; }
  if (action === "members" && req.method === "POST") {
    assert.deepEqual(Object.keys(body).sort(), ["emails", "role"]); invitations++;
    for (const email of body.emails) remoteMembers.get(id).set(email, { user: { email, id: randomBytes(12).toString("hex"), profile: { notForDealPME: "PRIVATE_PROVIDER_PROFILE" } }, role: body.role, isBlocked: false });
    if (loseInvite) { loseInvite = false; res.destroy(); return; }
    respond(200, { isSuccess: true }); return;
  }
  if (action === "attendees" && req.method === "GET") { respond(200, { isSuccess: true, attendees: [...remoteMembers.get(id).values()] }); return; }
  if (action?.startsWith("groups/")) { assert.equal(typeof body.emailId, "string"); respond(action.includes("missing-group") ? 404 : 200, { isSuccess: !action.includes("missing-group") }); return; }
  respond(404, { isSuccess: false });
});
await new Promise(ok => fixture.listen(0, "127.0.0.1", ok));
const providerOrigin = `https://127.0.0.1:${fixture.address().port}`, apiPort = await freePort();
const api = `http://127.0.0.1:${apiPort}/v1`;
const samlConfig = { idpEntityId: "https://dealpme-contract.example.test/sso/remo/metadata", ssoUrl: "https://dealpme-contract.example.test/sso/remo", spEntityId: "http://live.remo.co/", acsUrl: `${providerOrigin}/saml/acs` };
const child = spawn(process.execPath, ["dist/main.js"], { cwd: resolve(root, "codebases/backend/api"), env: {
  ...process.env, API_PORT: String(apiPort), NODE_EXTRA_CA_CERTS: certificate,
  CONNECTOR_REMO_PROVIDER: "remo", CONNECTOR_REMO_API_KEY: apiKey, REMO_API_BASE_URL: `${providerOrigin}/api/v1`, REMO_EVENT_BASE_URL: providerOrigin,
  REMO_COMPANY_ID: companyId, REMO_ACCOUNT_KEY: "remo-contract", REMO_QUOTA_REFERENCE: "RECETTE_CONTRAT_LOCALE", REMO_HOST_EMAIL: "officier@cci-togo.demo.dealpme.local",
  REMO_SSO_ENABLED: "true", REMO_SAML_IDP_ENTITY_ID: samlConfig.idpEntityId, REMO_SAML_SSO_URL: samlConfig.ssoUrl, REMO_SAML_SP_ENTITY_ID: samlConfig.spEntityId, REMO_SAML_ACS_URL: samlConfig.acsUrl,
  REMO_SAML_KEY_FILE: privateKey, REMO_SAML_CERT_FILE: certificate,
}, stdio: "ignore" });
let web, browser;
async function request(path, { token, body, status = body === undefined ? 200 : 201, cid = randomUUID() } = {}) {
  const res = await fetch(api + path, { method: body === undefined ? "GET" : "POST", headers: { "content-type": "application/json", "x-correlation-id": cid, ...(token ? { authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000) });
  const data = await res.json().catch(() => ({})); assert((Array.isArray(status) ? status : [status]).includes(res.status), `${path}: ${res.status} ${JSON.stringify(data)}`); return { ...data, httpStatus: res.status };
}
async function login(email) { const result = await request("/auth/login", { body: { email, password: credentials[email] }, status: 200 }); return result.mfaRequired ? (await request("/auth/mfa/verify", { body: { challengeId: result.challengeId, code: await readOtp("sms", result.challengeId) }, status: 200 })).token : result.token; }
const slot = minutes => new Date(Date.now() + minutes * 60000).toISOString();
try {
  let ready = false; for (let i = 0; i < 150; i++) { try { ready = (await fetch(`${api}/ready`)).ok; } catch { /* Démarrage isolé. */ } if (ready) break; await delay(100); } assert(ready, "API de recette Remo démarrée");
  assert.equal(spawnSync("docker", ["exec", process.env.SMOKE_REDIS_CONTAINER, "redis-cli", "FLUSHDB"]).status, 0);
  const officer = await login("officier@cci-togo.demo.dealpme.local"), investor = await login("investisseur@demo.dealpme.local"), platform = await login("admin@demo.dealpme.local");
  const payload = { title: "Événement API réelle sur fixture", startsAt: slot(1), endsAt: slot(31), capacity: 10, branding: { label: "Institution test", accent: "#123456", welcome: "Bienvenue", logoUrl: "https://example.test/logo.png", welcomeMediaUrl: "https://example.test/welcome.png" } };
  let eventId, remoteId;
  await check("API réelle : création depuis DealPME, authentification Token et salle sur invitation", async () => {
    eventId = (await request("/events", { token: officer, body: payload })).eventId;
    remoteId = (await request(`/events/${eventId}/publish`, { token: officer, body: {}, status: 200 })).remoEventId;
    assert.equal(creations, 1); assert.equal(remoteEvents.get(remoteId).eventBrandingLogoURL, payload.branding.logoUrl);
    await request(`/events/${eventId}/publish`, { token: officer, body: {}, status: 200 }); assert.equal(creations, 1);
  });
  await check("Invitation email distincte des contacts ; réponse perdue rapprochée sans renvoi", async () => {
    await request(`/events/${eventId}/registrations`, { token: investor, body: { displayName: "Nom local", consentContact: false }, status: 400 });
    await request(`/events/${eventId}/registrations`, { token: investor, body: { displayName: "Nom local", consentContact: false, providerConsent: true } });
    loseInvite = true; await request(`/events/${eventId}/join-url`, { token: investor, status: 409 });
    assert.equal((await admin`SELECT invitation_state FROM event_registration WHERE event_id=${eventId}`)[0].invitation_state, "UNKNOWN");
    const entry = await request(`/events/${eventId}/join-url`, { token: investor }); assert.equal(entry.accessMode, "REMO_LOGIN"); assert.equal(entry.simulated, false); assert.equal(invitations, 1);
  });
  await check("Présence et groupes rattachés à l'inscription, sans profil fournisseur exposé", async () => {
    const member = remoteMembers.get(remoteId).get("investisseur@demo.dealpme.local"); member.sessionData = { enteredEventAt: new Date().toISOString(), leftEventAt: null };
    await request(`/events/${eventId}/sync-attendance`, { token: officer, body: {}, status: 200 });
    const detail = await request(`/events/managed/${eventId}`, { token: officer }); assert(detail.registrations[0].joinedAt); assert(!JSON.stringify(detail).includes("PRIVATE_PROVIDER_PROFILE"));
    await request(`/events/${eventId}/member-group`, { token: officer, body: { registrationId: detail.registrations[0].id, code: "groupe-test", add: true }, status: 200 });
    await request(`/events/${eventId}/member-group`, { token: officer, body: { registrationId: detail.registrations[0].id, code: "missing-group", add: true }, status: 409 });
    await request(`/events/${eventId}/member-group`, { token: investor, body: { registrationId: detail.registrations[0].id, code: "groupe-test", add: false }, status: 403 });
    const before = invitations;
    await request(`/events/${eventId}/invite-speaker`, { token: officer, body: { registrationId: detail.registrations[0].id }, status: 200 });
    await request(`/events/${eventId}/invite-speaker`, { token: officer, body: { registrationId: detail.registrations[0].id }, status: 200 });
    assert.equal(invitations, before + 1); assert.equal(remoteMembers.get(remoteId).get("investisseur@demo.dealpme.local").role, "speaker");
  });
  await check("Création indéterminée : aucun second POST, rattachement vérifié de la référence", async () => {
    const id = (await request("/events", { token: officer, body: { ...payload, title: "Création incertaine" } })).eventId;
    loseCreate = true; await request(`/events/${id}/publish`, { token: officer, body: {}, status: 409 }); const before = creations;
    await request(`/events/${id}/publish`, { token: officer, body: {}, status: 409 }); assert.equal(creations, before);
    const remote = [...remoteEvents.values()].find(e => e.name === "Création incertaine");
    await request(`/events/${id}/reconcile`, { token: officer, body: { remoteId }, status: 409 });
    await request(`/events/${id}/reconcile`, { token: officer, body: { remoteId: remote._id }, status: 200 });
    await request(`/events/${id}/cancel`, { token: officer, body: { reason: "Suppression de la fixture" }, status: 409 });
    await request(`/events/${id}/cancel`, { token: officer, body: { reason: "Suppression de la fixture", deleteRemoteData: true }, status: 200 });
  });
  await check("Branding global dans DealPME : rôle administrateur et héritage versionné", async () => {
    const config = await request("/events/integration", { token: platform }); assert(!JSON.stringify(config).includes(apiKey));
    const value = { ...payload.branding, label: "Compte partagé test" };
    await request("/events/account-branding", { token: officer, body: { branding: value, expectedRevision: config.brandRevision }, status: 403 });
    await request("/events/account-branding", { token: platform, body: { branding: value, expectedRevision: config.brandRevision }, status: 200 });
    const inherited = (await request("/events", { token: officer, body: { ...payload, title: "Héritage test", brandingSource: "ACCOUNT" } })).eventId;
    assert.equal((await request(`/events/managed/${inherited}`, { token: officer })).branding.label, value.label);
    assert.equal((await request(`/events/managed/${eventId}`, { token: officer })).branding.label, payload.branding.label);
  });
  await check("Refus certain de création : correction/reprise et annulation sans référence distante",async()=>{
    const id=(await request("/events",{token:officer,body:{...payload,title:"Refus certain",startsAt:slot(120),endsAt:slot(150)}})).eventId;
    rejectCreate=true;await request(`/events/${id}/publish`,{token:officer,body:{},status:409});
    assert.equal((await request(`/events/managed/${id}`,{token:officer})).status,"CREATE_REJECTED");
    await request(`/events/${id}/publish`,{token:officer,body:{},status:200});
    await request(`/events/${id}/cancel`,{token:officer,body:{reason:"Suppression de recette",deleteRemoteData:true},status:200});
    const abandoned=(await request("/events",{token:officer,body:{...payload,title:"Refus abandonné",startsAt:slot(180),endsAt:slot(210)}})).eventId;
    rejectCreate=true;await request(`/events/${abandoned}/publish`,{token:officer,body:{},status:409});
    const before=creations;
    await request(`/events/${abandoned}/cancel`,{token:officer,body:{reason:"Annulation du brouillon refusé"},status:200});assert.equal(creations,before);
  });
  await check("Invitations paginées : tous les inscrits sont traités sans réémission des précédents", async () => {
    for(const email of ["cedant.froidroute@demo.dealpme.local","cedant.tropicvale@demo.dealpme.local"]) {
      const token=await login(email);
      await request(`/events/${eventId}/registrations`,{token,body:{displayName:"Participant de recette",providerConsent:true}});
    }
    const before=invitations;
    const first=await request(`/events/${eventId}/sync-invitations`,{token:officer,body:{limit:2},status:200});
    assert.equal(first.items.length,2);assert(first.nextCursor);
    const second=await request(`/events/${eventId}/sync-invitations`,{token:officer,body:{limit:2,cursor:first.nextCursor},status:200});
    assert.equal(second.items.length,1);assert.equal(second.nextCursor,null);assert.equal(invitations,before+2);
  });
  await check("Modification distante acceptée puis audit indisponible : état à rapprocher et reprise du PUT", async () => {
    const current = await request(`/events/managed/${eventId}`, { token: officer });
    const body = { expectedRevision: current.revision, title: "Contenu rapproché après incident", description: "Test de reprise", branding: payload.branding };
    await admin.unsafe(`CREATE FUNCTION remo_update_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.correlation_id='remo-update-fault' AND NEW.metadata->>'operation'='REMO_CONTENT_UPDATED' THEN RAISE EXCEPTION 'incident de recette'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER remo_update_fault BEFORE INSERT ON audit_event FOR EACH ROW EXECUTE FUNCTION remo_update_fault();`);
    try { await request(`/events/${eventId}/remote-content`, { token: officer, body, status: 409, cid: "remo-update-fault" }); }
    finally { await admin.unsafe("DROP TRIGGER remo_update_fault ON audit_event; DROP FUNCTION remo_update_fault();"); }
    assert.equal(remoteEvents.get(remoteId).name, body.title);
    assert.equal((await request(`/events/managed/${eventId}`, { token: officer })).syncError, "UPDATE_UNKNOWN");
    await request(`/events/${eventId}/remote-content`, { token: officer, body, status: 200 });
    assert.equal((await request(`/events/managed/${eventId}`, { token: officer })).syncError, null);
  });
  await check("Le compte fournisseur reste lié à l'événement lors d'une configuration divergente", async () => {
    await admin`UPDATE event SET provider_company_id='aaaaaaaaaaaaaaaaaaaaaaaa' WHERE id=${eventId}`;
    try { await request(`/events/${eventId}/join-url`, { token: investor, status: 409 }); }
    finally { await admin`UPDATE event SET provider_company_id=${companyId} WHERE id=${eventId}`; }
  });
  await check("Mode Remo : le webhook signé du simulateur est refusé avant le cache", async () => {
    const body = JSON.stringify({ events: [{ remoEventId: "l02-replay", externalUserId: "L02", joinedAt: "2026-09-12T00:00:00Z" }] });
    const response = await fetch(`${api}/webhooks/remo/attendance`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "l02-replay", "x-remo-signature": createHmac("sha256", process.env.CONNECTOR_REMO_WEBHOOK_SECRET).update(body).digest("hex") }, body });
    assert.equal(response.status, 403);
  });
  const metadataResponse = await fetch(`${api}/federation/remo/metadata`); assert(metadataResponse.ok); const metadata = await metadataResponse.text();
  idp = IdentityProvider({ metadata }); sp = ServiceProvider({ entityID: samlConfig.spEntityId, authnRequestsSigned: false, wantAssertionsSigned: true, wantMessageSigned: false, assertionConsumerService: [{ Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST", Location: samlConfig.acsUrl, isDefault: true }] });
  const samlRequest = () => { const relayState = randomBytes(12).toString("hex"), result = sp.createLoginRequest(idp, "redirect", { relayState }); pendingSaml.set(result.id, relayState); return { samlRequest: new URL(result.context).searchParams.get("SAMLRequest"), binding: "redirect", relayState }; };
  await check("SAML API : requête validée, session requise et consommation concurrente unique", async () => {
    const body = samlRequest(), c = await request("/federation/remo/challenges", { body });
    await request("/federation/remo/challenges", { body, status: 409 });
    await request(`/federation/remo/challenges/${c.challengeId}/complete`, { body: {}, status: 401 });
    const responses = await Promise.all([request(`/federation/remo/challenges/${c.challengeId}/complete`, { token: investor, body: {}, status: [200,409] }), request(`/federation/remo/challenges/${c.challengeId}/complete`, { token: investor, body: {}, status: [200,409] })]);
    assert.equal(responses.filter(r => r.httpStatus === 200).length, 1);
    const valid = responses.find(r => r.httpStatus === 200); const parsed = await sp.parseLoginResponse(idp, "post", { body: { SAMLResponse: valid.samlResponse } }); assert.equal(parsed.extract.nameID, "investisseur@demo.dealpme.local");
  });
  await check("SAML : une identité non vérifiée ne reçoit pas d'assertion", async () => {
    const c = await request("/federation/remo/challenges", { body: samlRequest() });
    const [user] = await admin`SELECT id,email_verified_at FROM app_user WHERE email='investisseur@demo.dealpme.local'`;
    await admin`UPDATE app_user SET email_verified_at=NULL WHERE id=${user.id}`;
    try { await request(`/federation/remo/challenges/${c.challengeId}/complete`, { token: investor, body: {}, status: 401 }); }
    finally { await admin`UPDATE app_user SET email_verified_at=${user.email_verified_at} WHERE id=${user.id}`; }
  });
  await check("SAML : challenge expiré et rôle révoqué refusés", async () => {
    const expired = await request("/federation/remo/challenges", { body: samlRequest() });
    assert.equal(spawnSync("docker", ["exec", process.env.SMOKE_REDIS_CONTAINER, "redis-cli", "DEL", `saml:challenge:${expired.challengeId}`]).status, 0);
    await request(`/federation/remo/challenges/${expired.challengeId}/complete`, { token: investor, body: {}, status: 409 });
    const blocked = await request("/federation/remo/challenges", { body: samlRequest() });
    const [user] = await admin`SELECT id,roles FROM app_user WHERE email='investisseur@demo.dealpme.local'`;
    await admin`UPDATE app_user SET roles='["EXPERT"]' WHERE id=${user.id}`;
    try { await request(`/federation/remo/challenges/${blocked.challengeId}/complete`, { token: investor, body: {}, status: 403 }); }
    finally { await admin`UPDATE app_user SET roles=${admin.json(user.roles)} WHERE id=${user.id}`; }
  });
  const webPort = await freePort(), origin = `http://127.0.0.1:${webPort}`;
  web = spawn(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), "start", "-p", String(webPort)], { cwd: resolve(root, "codebases/frontend/web"), env: { ...process.env, NODE_ENV: "production", API_BASE_URL: api }, stdio: "ignore" });
  for (let i = 0; i < 100; i++) { try { if ((await fetch(`${origin}/connexion`)).ok) break; } catch { /* Démarrage. */ } await delay(100); }
  const spki = createHash("sha256").update(new X509Certificate(cert).publicKey.export({ type: "spki", format: "der" })).digest("base64");
  browser = await chromium.launch({ headless: true, args: [`--ignore-certificate-errors-spki-list=${spki}`] });
  await check("Navigateur : connexion DealPME puis POST SAML vérifié par le SP HTTPS", async () => {
    const context = await browser.newContext(), page = await context.newPage(), body = samlRequest();
    const errors=[]; page.on("console",msg=>{if(msg.type()==="error")errors.push(msg.text());});
    await page.goto(`${origin}/sso/remo?${new URLSearchParams({ SAMLRequest: body.samlRequest, RelayState: body.relayState })}`);
    assert.equal(new URL(page.url()).pathname, "/connexion", await page.locator("body").innerText());
    await page.waitForURL("**/connexion?**"); await page.locator("#email").fill("investisseur@demo.dealpme.local"); await page.locator("#password").fill(credentials["investisseur@demo.dealpme.local"]);
    await page.locator('[data-control-id="LOGIN_SUBMIT"]').click();
    try { await page.getByRole("heading", { name: "SSO vérifié par le SP de recette" }).waitFor({timeout:10000}); }
    catch { assert.fail(`${new URL(page.url()).pathname} : ${await page.locator("body").innerText()} ; ${errors.join(" | ")}`); }
    assert.equal(samlReceipt.email, "investisseur@demo.dealpme.local"); assert.equal(new URL(page.url()).origin, providerOrigin);
    assert(!(await context.cookies()).some(c => c.name === "dp_saml_challenge")); await context.close();
  });
  await check("Navigateur organisateur : contenu/visuels publiés modifiés depuis DealPME", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); await context.addCookies([{ name: "dp_session", value: officer, url: origin, httpOnly: true, sameSite: "Lax" }]); const page = await context.newPage();
    await page.goto(`${origin}/organisateur/evenements/${eventId}`); await page.locator("#event-title").fill("Titre modifié depuis DealPME"); await page.locator("#brand-logo").fill("https://example.test/new-logo.png");
    await page.locator('[data-control-id="ORG_EVENT_SAVE"]').click(); await page.getByRole("heading", { level: 1, name: "Titre modifié depuis DealPME" }).waitFor();
    assert.equal(remoteEvents.get(remoteId).eventBrandingLogoURL, "https://example.test/new-logo.png");
    assert(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1));
    await page.screenshot({ path: resolve(root, ".ci-artifacts/remo-content-mobile.png"), fullPage: true }); await context.close();
  });
  report.status = "PASS";
} catch (error) { console.error(error); report.status = "FAIL"; process.exitCode = 1; }
finally {
  await browser?.close(); web?.kill("SIGTERM"); child.kill("SIGTERM"); fixture.closeAllConnections(); await new Promise(ok => fixture.close(ok)); await admin.end({ timeout: 5 }); await save(); await rm(temp, { recursive: true, force: true });
}
