import assert from "node:assert/strict";
import {spawn,spawnSync} from "node:child_process";
import {randomUUID,createHash} from "node:crypto";
import {readFileSync,writeFileSync} from "node:fs";
import {createServer} from "node:net";
import {resolve} from "node:path";
import {setTimeout as delay} from "node:timers/promises";
import postgres from "postgres";
import {drizzle} from "drizzle-orm/postgres-js";
import {chromium} from "playwright";
import {withTenant} from "../codebases/backend/api/dist/database/tenant.js";
import {reserveSharedEvent} from "../codebases/backend/api/dist/modules/events/reservations.js";
import {readOtp} from "./notification-inbox.mjs";

const root=resolve(import.meta.dirname,"..");
if(!/^dealpme-ci-/.test(process.env.CI_TEST_PROJECT??""))throw new Error("Pile CI isolée requise");
const inspected=JSON.parse(spawnSync("docker",["inspect",process.env.SMOKE_CORE_CONTAINER],{encoding:"utf8"}).stdout)[0];
assert.equal(inspected.Config.Labels["com.docker.compose.project"],process.env.CI_TEST_PROJECT);
assert(inspected.NetworkSettings.Ports["5432/tcp"].some(p=>p.HostPort===new URL(process.env.DATABASE_URL_CORE_ADMIN).port));
const admin=postgres(process.env.DATABASE_URL_CORE_ADMIN,{max:4}),app=postgres(process.env.DATABASE_URL_CORE,{max:3}),db=drizzle(app);
const base=`http://127.0.0.1:${process.env.API_PORT}/v1`,credentials=JSON.parse(readFileSync(process.env.DEMO_CREDENTIALS_FILE,"utf8"));
const report={status:"RUNNING",startedAt:new Date().toISOString(),checks:[]};
const save=()=>writeFileSync(resolve(root,".ci-artifacts/l05-results.json"),JSON.stringify(report,null,2)+"\n");
async function check(name,work){const row={name,status:"RUNNING"};report.checks.push(row);try{await work();row.status="PASS";console.log(`[L05] OK ${name}`);}catch(error){row.status="FAIL";throw error;}finally{save();}}
async function request(path,{token,body,status=body===undefined?200:201}={}){
  const res=await fetch(base+path,{method:body===undefined?"GET":"POST",headers:{"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
  const data=await res.json();assert((Array.isArray(status)?status:[status]).includes(res.status),`${path} (${res.status}): ${JSON.stringify(data)}`);return {...data,httpStatus:res.status};
}
async function login(email){const data=await request("/auth/login",{body:{email,password:credentials[email]},status:200});return data.mfaRequired?(await request("/auth/mfa/verify",{body:{challengeId:data.challengeId,code:await readOtp("sms",data.challengeId)},status:200})).token:data.token;}
async function port(){const s=createServer();await new Promise(ok=>s.listen(0,"127.0.0.1",ok));const n=s.address().port;await new Promise(ok=>s.close(ok));return n;}
const iso=(minutes)=>new Date(Date.now()+minutes*60000).toISOString();
const brand={label:"Marque événement L05",accent:"#123456",welcome:"Accueil synthétique propre à cet événement"};
let browser,web;
try{
  assert.equal(spawnSync("docker",["exec",process.env.SMOKE_REDIS_CONTAINER,"redis-cli","FLUSHDB"]).status,0);
  const officer=await login("officier@cci-togo.demo.dealpme.local"),investor=await login("investisseur@demo.dealpme.local"),seller=await login("cedant.froidroute@demo.dealpme.local");
  const me=await request("/me",{token:officer});
  const create=async(start=120,extra={})=>request("/events",{token:officer,body:{title:"Événement de recette L05",startsAt:iso(start),endsAt:iso(start+30),capacity:10,branding:brand,...extra}});
  const publish=(id,status=200)=>request(`/events/${id}/publish`,{token:officer,body:{},status});
  const cancel=(id)=>request(`/events/${id}/cancel`,{token:officer,body:{reason:"Clôture de recette synthétique"},status:200});
  const detail=(id)=>request(`/events/managed/${id}`,{token:officer});
  let replay;
  await check("Création rejouée : un brouillon et un audit, autre corps refusé",async()=>{
    const body={requestId:randomUUID(),title:"Création rejouée L05",startsAt:iso(120),endsAt:iso(150),branding:brand};
    const results=await Promise.all([request("/events",{token:officer,body}),request("/events",{token:officer,body})]);replay=results[0].eventId;assert.equal(results[1].eventId,replay);
    assert.equal(Number((await admin`SELECT count(*) n FROM audit_event WHERE subject_id=${replay} AND action='DEAL_CREATED'`)[0].n),1);
    await request("/events",{token:officer,body:{...body,title:"Autre corps"},status:409});
  });
  await check("Brouillons privés, rôle requis et révision de modification contrôlée",async()=>{
    await request("/events/managed",{token:investor,status:403});
    assert(!(await request("/events")).items.some(e=>e.id===replay));
    const e=await detail(replay),body={title:"Brouillon modifié L05",startsAt:e.startsAt,endsAt:e.endsAt,capacity:e.capacity,branding:brand,expectedRevision:e.revision};
    await request(`/events/${replay}/edit`,{token:officer,body,status:200});await request(`/events/${replay}/edit`,{token:officer,body,status:409});
  });
  await check("Profil général hérité et surcharge événement indépendante",async()=>{
    const inherited=await create(180,{brandingSource:"ACCOUNT"});const e=await detail(inherited.eventId);assert.equal(e.branding.label,process.env.REMO_ACCOUNT_BRAND_LABEL);assert.equal(e.brandingOrigin.scope,"ACCOUNT");
    assert.equal((await detail(replay)).branding.label,brand.label);await cancel(inherited.eventId);
  });
  await check("Publication et rejeu : une réservation confirmée",async()=>{
    const a=await publish(replay),b=await publish(replay);assert.equal(a.remoEventId,b.remoEventId);
    const e=await detail(replay);assert.equal(e.status,"PUBLISHED");assert.equal(e.reservation.state,"CONFIRMED");await cancel(replay);
  });
  await check("Trois publications concurrentes respectent le quota de deux",async()=>{
    const ids=await Promise.all([create(240),create(240),create(240)]);const results=await Promise.all(ids.map(e=>publish(e.eventId,[200,409])));assert.equal(results.filter(r=>r.httpStatus===200).length,2);
    for(let i=0;i<ids.length;i++)if(results[i].httpStatus===200)await cancel(ids[i].eventId);
    const rejected=ids[results.findIndex(r=>r.httpStatus===409)].eventId;await publish(rejected);await cancel(rejected);
  });
  await check("Même compte, autre produit : réservation prise en compte",async()=>{
    const start=new Date(iso(360)),end=new Date(iso(400));
    const reserved=await withTenant(db,me,tx=>reserveSharedEvent(tx,{accountKey:process.env.REMO_ACCOUNT_KEY,productKey:"autre-produit-test",resourceId:randomUUID(),startsAt:start,endsAt:end,limit:2,marginMinutes:10}));
    const a=await create(365),b=await create(365);await publish(a.eventId);await publish(b.eventId,409);await cancel(a.eventId);
    await admin`UPDATE event_reservation SET state='RELEASED' WHERE id=${reserved}`;await cancel(b.eventId);
  });
  await check("Timeout après acceptation : créneau conservé et rapprochement sans doublon",async()=>{
    const e=await create(480),key=randomUUID();await admin`UPDATE event SET publication_key=${key} WHERE id=${e.eventId}`;
    const control=await fetch(`${process.env.REMO_LOCAL_BASE_URL}/test-controls`,{method:"POST",headers:{authorization:`Bearer ${process.env.REMO_LOCAL_API_KEY}`},body:JSON.stringify({mode:"accepted-timeout",requestKey:key})});assert(control.ok);
    await publish(e.eventId,409);const uncertain=await detail(e.eventId);assert.equal(uncertain.status,"SYNC_UNKNOWN");assert.equal(uncertain.reservation.state,"UNKNOWN");
    const confirmed=await publish(e.eventId);assert.equal(confirmed.remoEventId,key);assert.equal(Number((await admin`SELECT count(*) n FROM event_reservation WHERE resource_id=${e.eventId}`)[0].n),1);await cancel(e.eventId);
  });
  await check("Capacité d'inscription atomique et décompte public exact sous RLS",async()=>{
    const e=await create(1,{capacity:1});await publish(e.eventId);
    const tokens=[investor,seller];const registrations=await Promise.all(tokens.map(token=>request(`/events/${e.eventId}/registrations`,{token,body:{displayName:"Invité synthétique",consentContact:false},status:[201,409]})));
    assert.equal(registrations.filter(r=>r.httpStatus===201).length,1);assert.equal((await request("/events")).items.find(r=>r.id===e.eventId).registered,1);
    const good=tokens[registrations.findIndex(r=>r.httpStatus===201)],bad=tokens[registrations.findIndex(r=>r.httpStatus===409)];
    await request(`/events/${e.eventId}/join-url`,{token:bad,status:404});const entry=await request(`/events/${e.eventId}/join-url`,{token:good});
    assert(!entry.joinUrl.includes("Invité"));assert.equal((await detail(e.eventId)).registrations[0].joinedAt,null);
    assert((await fetch(entry.joinUrl)).ok);await request(`/events/${e.eventId}/sync-attendance`,{token:officer,body:{},status:200});assert((await detail(e.eventId)).registrations[0].joinedAt);
    await cancel(e.eventId);assert.equal((await fetch(entry.joinUrl)).status,403);await request(`/events/${e.eventId}/join-url`,{token:good,status:404});
  });
  await check("Diaspora : décision humaine, salle privée et accès du demandeur uniquement",async()=>{
    const a=await request("/events/diaspora/appointments",{token:investor,body:{requestedSlot:iso(5),crossBorderNoticeAcknowledged:true}});
    await request(`/events/diaspora/${a.appointmentId}/decision`,{token:investor,body:{decision:"CONFIRM",reason:"Autoconfirmation interdite"},status:403});
    const confirmed=await request(`/events/diaspora/${a.appointmentId}/decision`,{token:officer,body:{decision:"CONFIRM",reason:"Créneau confirmé par officier"},status:200});
    assert(!(await request("/events")).items.some(e=>e.id===confirmed.eventId));
    await request(`/events/${confirmed.eventId}/join-url`,{token:seller,status:404});assert((await request(`/events/${confirmed.eventId}/join-url`,{token:investor})).joinUrl);await cancel(confirmed.eventId);
  });
  const origin=`http://127.0.0.1:${await port()}`;
  web=spawn(process.execPath,[resolve(root,"node_modules/next/dist/bin/next"),"start","-p",new URL(origin).port],{cwd:resolve(root,"codebases/frontend/web"),env:{...process.env,NODE_ENV:"production",API_BASE_URL:base},stdio:"ignore"});
  for(let i=0;i<100;i++){try{if((await fetch(`${origin}/connexion`)).ok)break;}catch{/* démarrage */}await delay(100);}
  browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:960}});await context.addCookies([{name:"dp_session",value:officer,url:origin,httpOnly:true,sameSite:"Lax"}]);const page=await context.newPage();let browserEvent;
  await check("Navigateur : création, panne réseau récupérable et personnalisation",async()=>{
    await page.goto(`${origin}/organisateur/evenements/nouveau`);await page.locator("#event-title").fill("Rencontre navigateur L05");await page.locator("#event-start").fill(iso(1).slice(0,16));await page.locator("#event-end").fill(iso(31).slice(0,16));await page.locator("#branding-source").selectOption("EVENT");await page.locator("#event-brand").fill("Marque du navigateur");
    await page.route("**/api/organisateur/events",r=>r.abort());await page.locator('[data-control-id="ORG_EVENT_SAVE"]').click();await page.locator('[data-control-id="ORG_EVENT_ERROR"]').waitFor();assert.equal(await page.locator("#event-title").inputValue(),"Rencontre navigateur L05");await page.unroute("**/api/organisateur/events");
    await page.locator('[data-control-id="ORG_EVENT_SAVE"]').click();await page.waitForURL(/\/organisateur\/evenements\/[0-9a-f-]{36}$/);browserEvent=page.url().split("/").at(-1);await page.locator('[data-control-id="ORG_EVENT_PUBLISH"]').click();await page.getByText("Publié",{exact:true}).waitFor();
  });
  await check("Navigateur mobile : état, branding et actions sans débordement",async()=>{
    await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth+1));await page.screenshot({path:resolve(root,".ci-artifacts/l05-organisateur-mobile.png"),fullPage:true});
  });
  const guest=await browser.newContext();await guest.addCookies([{name:"dp_session",value:investor,url:origin,httpOnly:true,sameSite:"Lax"}]);const guestPage=await guest.newPage();let roomUrl;
  await check("Navigateur participant : inscription consentie et accès à la salle personnalisée",async()=>{
    await guestPage.goto(`${origin}/evenements`);const card=guestPage.locator('[data-control-id="EVENT_CARD"]').filter({has:guestPage.getByText("Rencontre navigateur L05",{exact:true})});await card.locator('[data-control-id="EVENT_REGISTER_OPEN"]').click();await card.locator('[data-control-id="EVENT_DISPLAY_NAME"]').fill("Participant navigateur");await card.locator('[data-control-id="EVENT_REGISTER_SUBMIT"]').click();await card.getByText("Vous êtes inscrit",{exact:true}).waitFor();
    roomUrl=(await request(`/events/${browserEvent}/join-url`,{token:investor})).joinUrl;await guestPage.goto(`${origin}/evenements/${browserEvent}/acces`);await guestPage.waitForURL(/\/rooms\//);await guestPage.getByRole("heading",{name:"Marque du navigateur"}).waitFor();
  });
  await check("Prototype captation : consentement, octets audio et arrêt sur révocation",async()=>{
    assert.equal(await guestPage.locator("#start").isDisabled(),true);await guestPage.locator("#capture-consent").check();await guestPage.locator("#start").click();await delay(1200);await cancel(browserEvent);await guestPage.waitForFunction(()=>!!globalThis.captureEvidence);
    const evidence=await guestPage.evaluate(()=>globalThis.captureEvidence);assert(evidence.synthetic);assert(evidence.bytes.length>100);assert.equal(evidence.stopReason,"admission_revoked");const bytes=Buffer.from(evidence.bytes);delete evidence.bytes;evidence.sha256=createHash("sha256").update(bytes).digest("hex");evidence.bytes=bytes.length;evidence.coverage="Une session locale, signal généré ; aucune voix Remo ni transcription";writeFileSync(resolve(root,".ci-artifacts/l05-capture-results.json"),JSON.stringify(evidence,null,2)+"\n");assert.equal((await fetch(roomUrl)).status,403);
  });
  report.status="PASS";
}catch(error){console.error(error);report.status="FAIL";process.exitCode=1;}
finally{await browser?.close();web?.kill("SIGTERM");await admin.end({timeout:5});await app.end({timeout:5});report.finishedAt=new Date().toISOString();save();}
