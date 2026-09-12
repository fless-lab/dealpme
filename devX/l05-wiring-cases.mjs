import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {spawnSync} from "node:child_process";
import {setTimeout as delay} from "node:timers/promises";
import {resolve} from "node:path";
import {writeFile,readFile} from "node:fs/promises";
import {readOtp} from "./notification-inbox.mjs";

export async function verifyL05Wiring({check,request,login,admin,officer,investor,platform,origin,browser,root,temp,runtimeEnv,restart,eventId,slot,samlRequest,fixture}) {
  const officerMe=await request("/me",{token:officer}),investorMe=await request("/me",{token:investor});
  const platformMe=await request("/me",{token:platform}),seller=await login("cedant.froidroute@demo.dealpme.local");
  const sellerMe=await request("/me",{token:seller});
  const [reg]=await admin`SELECT * FROM event_registration WHERE event_id=${eventId} AND user_id=${sellerMe.userId}`;
  await check("W110 : réponse d'invitation tardive après reprise et changement de rôle",async()=>{
    fixture.pauseRoster();
    const pending=request(`/events/${eventId}/join-url`,{token:seller,status:409});
    try {
      for(let i=0;i<100&&!fixture.held;i++)await delay(20);assert(fixture.held);
      await admin`UPDATE event_registration SET invitation_started_at=now()-interval '2 minutes' WHERE id=${reg.id}`;
      await request(`/events/${eventId}/join-url`,{token:seller});
      await request(`/events/${eventId}/invite-speaker`,{token:officer,body:{registrationId:reg.id},status:200});
    } finally {fixture.release();}
    await pending;
    const [current]=await admin`SELECT provider_role,invitation_state FROM event_registration WHERE id=${reg.id}`;
    assert.equal(current.provider_role,"speaker");assert.equal(current.invitation_state,"SENT");
    assert.equal((await admin`SELECT id FROM audit_event WHERE subject_id=${reg.id} AND metadata->>'operation'='REMO_INVITATION_SUPERSEDED' AND outcome='BLOCKED'`).length,1);
  });
  await check("W110 : groupes/intervenants refusés après changement d'email ou annulation",async()=>{
    const before=fixture.traffic;
    await admin`UPDATE app_user SET email='changed-w110@example.test' WHERE id=${sellerMe.userId}`;
    try {
      await request(`/events/${eventId}/member-group`,{token:officer,body:{registrationId:reg.id,code:"groupe-test",add:true},status:409});
      await request(`/events/${eventId}/invite-speaker`,{token:officer,body:{registrationId:reg.id},status:409});
      assert.equal(fixture.traffic,before);
      const rejected=await admin`SELECT DISTINCT metadata->>'operation' AS operation FROM audit_event WHERE subject_id=${eventId} AND outcome='BLOCKED'`;
      assert(rejected.some(r=>r.operation==="REMO_GROUP_REJECTED"));assert(rejected.some(r=>r.operation==="REMO_SPEAKER_REJECTED"));
    }finally{await admin`UPDATE app_user SET email=${sellerMe.email} WHERE id=${sellerMe.userId}`;}
    await admin`UPDATE event_registration SET cancelled_at=now() WHERE id=${reg.id}`;
    try{await request(`/events/${eventId}/member-group`,{token:officer,body:{registrationId:reg.id,code:"groupe-test",add:true},status:404});}
    finally{await admin`UPDATE event_registration SET cancelled_at=NULL WHERE id=${reg.id}`;}
  });
  const bff=async(token,path,body,status=200)=>{
    const response=await fetch(origin+path,{method:"POST",headers:{"content-type":"application/json",cookie:`dp_session=${token}`},body:JSON.stringify(body)});
    const data=await response.json();assert.equal(response.status,status,`${path} ${JSON.stringify(data)}`);return data;
  };
  await check("W110 : commandes organisateur parcourent le BFF jusqu'au fournisseur",async()=>{
    const payload={requestId:randomUUID(),title:"W110 BFF",startsAt:slot(120),endsAt:slot(150),capacity:4,brandingSource:"EVENT",branding:{label:"Marque BFF",accent:"#123456",welcome:"Bienvenue"}};
    const created=await bff(officer,"/api/organisateur/events",payload);const id=created.eventId;
    const original=await request(`/events/managed/${id}`,{token:officer});
    await bff(officer,`/api/organisateur/events/${id}/edit`,{...payload,title:"W110 BFF modifié",expectedRevision:original.revision});
    await bff(officer,`/api/organisateur/events/${id}/publish`,{});
    const published=await request(`/events/managed/${id}`,{token:officer});
    await bff(investor,`/api/events/${id}/register`,{displayName:"BFF invité",providerConsent:true});
    await bff(investor,`/api/events/${id}/contact-consent`,{consentContact:true});
    await bff(officer,`/api/organisateur/events/${id}/sync-invitations`,{});
    const detail=await request(`/events/managed/${id}`,{token:officer});const rid=detail.registrations[0].id;
    assert.equal(detail.registrations[0].invitationState,"SENT");assert(detail.registrations[0].consentContactAt);
    await bff(officer,`/api/organisateur/events/${id}/invite-speaker`,{registrationId:rid});
    await bff(officer,`/api/organisateur/events/${id}/member-group`,{registrationId:rid,code:"groupe-test",add:true});
    await bff(officer,`/api/organisateur/events/${id}/sync-attendance`,{});
    await bff(officer,`/api/organisateur/events/${id}/remote-content`,{expectedRevision:published.revision,title:"W110 contenu BFF",branding:payload.branding});
    assert.equal(fixture.remoteEvents.get(published.remoEventId).name,"W110 contenu BFF");
    await bff(officer,`/api/organisateur/events/${id}/cancel`,{reason:"Fin de recette BFF",deleteRemoteData:true});
    const cfg=await request("/events/integration",{token:platform});
    await bff(platform,"/api/organisateur/events/account-branding",{expectedRevision:cfg.brandRevision,branding:cfg.branding});
    const uncertain=await bff(officer,"/api/organisateur/events",{...payload,requestId:randomUUID(),title:"W110 rapprochement BFF"});
    fixture.loseCreate();await bff(officer,`/api/organisateur/events/${uncertain.eventId}/publish`,{},409);
    const remote=[...fixture.remoteEvents.values()].find(e=>e.name==="W110 rapprochement BFF");
    await bff(officer,`/api/organisateur/events/${uncertain.eventId}/reconcile`,{remoteId:remote._id});
    await bff(officer,`/api/organisateur/events/${uncertain.eventId}/cancel`,{reason:"Fin de rapprochement",deleteRemoteData:true});
    await bff(officer,"/api/events/not-an-id/contact-consent",{consentContact:true},400);
  });
  await check("W110 : diaspora rejouable par le BFF, confirmation et refus sans doublon",async()=>{
    const body={requestId:randomUUID(),requestedSlot:slot(240),crossBorderNoticeAcknowledged:true,providerConsent:true};
    const responses=await Promise.all([bff(investor,"/api/diaspora",body),bff(investor,"/api/diaspora",body)]);
    assert.equal(responses[0].appointmentId,responses[1].appointmentId);
    const id=responses[0].appointmentId;
    await bff(investor,"/api/diaspora",{...body,requestedSlot:slot(250)},409);
    const confirmed=await bff(officer,`/api/organisateur/events/diaspora/${id}/decision`,{decision:"CONFIRM",reason:"Accord de recette"});
    const replay=await bff(officer,`/api/organisateur/events/diaspora/${id}/decision`,{decision:"CONFIRM",reason:"Accord de recette"});assert.equal(replay.eventId,confirmed.eventId);
    await bff(officer,`/api/organisateur/events/${confirmed.eventId}/cancel`,{reason:"Fin entretien de recette",deleteRemoteData:true});
    const refused=await bff(investor,"/api/diaspora",{...body,requestId:randomUUID()});
    await bff(officer,`/api/organisateur/events/diaspora/${refused.appointmentId}/decision`,{decision:"REFUSE",reason:"Refus de recette"});
    await bff(officer,`/api/organisateur/events/diaspora/${refused.appointmentId}/decision`,{decision:"REFUSE",reason:"Refus de recette"});
  });
  await check("W110 : plus de 100 événements et demandes accessibles sans doublon ni fuite",async()=>{
    const ids=[],appointments=[],foreign=randomUUID();
    await admin.begin(async tx=>{
      for(let i=0;i<105;i++) {
        const id=randomUUID(),aid=randomUUID();ids.push(id);appointments.push(aid);
        await tx`INSERT INTO event(id,title,starts_at,ends_at,organiser_user_id) VALUES(${id},${`W110 page ${i}`},${new Date(slot(300))},${new Date(slot(330))},${officerMe.userId})`;
        await tx`INSERT INTO diaspora_appointment(id,investor_user_id,requested_slot,cross_border_notice_shown_at) VALUES(${aid},${investorMe.userId},${new Date(slot(300))},now())`;
      }
      await tx`INSERT INTO event(id,title,starts_at,ends_at,organiser_user_id) VALUES(${foreign},'W110 autre propriétaire',now(),now()+interval '1 hour',${platformMe.userId})`;
    });
    const collect=async(path,token)=>{let cursor=null;const seen=[];do{const result=await request(`${path}?${new URLSearchParams({limit:"40",...(cursor?{cursor}:{})})}`,{token});seen.push(...result.items.map(r=>r.id));cursor=result.nextCursor;assert(seen.length<1000);}while(cursor);assert.equal(seen.length,new Set(seen).size);return new Set(seen);};
    const events=await collect("/events/managed",officer);assert(ids.every(id=>events.has(id)));assert(!events.has(foreign));
    const mine=await collect("/events/diaspora/appointments",investor);assert(appointments.every(id=>mine.has(id)));
    const queue=await collect("/events/diaspora/managed",officer);assert(appointments.every(id=>queue.has(id)));
    const outsider=await login("diaspora@demo.dealpme.local");const other=await collect("/events/diaspora/appointments",outsider);assert(!appointments.some(id=>other.has(id)));
    await request("/events/managed?cursor=bad",{token:officer,status:400});
    const context=await browser.newContext();await context.addCookies([{name:"dp_session",value:officer,url:origin,httpOnly:true,sameSite:"Lax"}]);const page=await context.newPage();
    await page.goto(`${origin}/organisateur/evenements`);await page.locator('nav[aria-label="Pagination événements"] a[data-control-id="L05_PAGE_NEXT"]').click();
    const eventCursor=new URL(page.url()).searchParams.get("cursor");assert(eventCursor);
    await page.locator('nav[aria-label="Pagination file diaspora"] a[data-control-id="L05_PAGE_NEXT"]').click();assert.equal(new URL(page.url()).searchParams.get("cursor"),eventCursor);assert(new URL(page.url()).searchParams.get("appointmentsCursor"));
    await page.goto(`${origin}/organisateur/evenements?cursor=bad`);await page.locator('[data-control-id="L05_LIST_ERROR"]').waitFor();await context.close();
  });
  await check("W110 : SAML POST et reprise avec MFA navigateur",async()=>{
    const context=await browser.newContext();const page=await context.newPage();
    const metadata=await context.request.get(`${origin}/sso/remo/metadata`);assert.equal(metadata.status(),200);assert.equal(metadata.headers()["cache-control"],"no-store");
    const body=samlRequest();
    const {inflateRawSync}=await import("node:zlib");const xml=inflateRawSync(Buffer.from(body.samlRequest,"base64")).toString();
    await page.goto(`${origin}/connexion`);
    await page.evaluate(({xml,relayState})=>{const form=globalThis.document.createElement("form");form.method="POST";form.action="/sso/remo";for(const [name,value] of Object.entries({SAMLRequest:globalThis.btoa(xml),RelayState:relayState})){const input=globalThis.document.createElement("input");input.name=name;input.value=value;form.append(input);}globalThis.document.body.append(form);form.submit();},{xml,relayState:body.relayState});
    await page.waitForURL("**/connexion?**");await page.locator("#email").fill("officier@cci-togo.demo.dealpme.local");
    const credentials=JSON.parse(await readFile(process.env.DEMO_CREDENTIALS_FILE,"utf8"));await page.locator("#password").fill(credentials["officier@cci-togo.demo.dealpme.local"]);
    const [response]=await Promise.all([page.waitForResponse(r=>r.url().endsWith("/api/auth/login")),page.locator('[data-control-id="LOGIN_SUBMIT"]').click()]);const data=await response.json();assert(data.mfaRequired);
    await page.locator('[data-control-id="LOGIN_MFA_CODE"]').fill(await readOtp("sms",data.challengeId));await page.locator('[data-control-id="LOGIN_MFA_SUBMIT"]').click();await page.getByRole("heading",{name:"SSO vérifié par le SP de recette"}).waitFor();await context.close();
  });
  await check("W111 : précontrôle CLI sans réseau et sans secret dans les diagnostics",async()=>{
    const before=fixture.traffic;
    const result=spawnSync(process.execPath,["devX/remo-preflight.mjs"],{cwd:root,env:runtimeEnv,encoding:"utf8",timeout:20000});assert.equal(result.status,0,result.stderr);const output=JSON.parse(result.stdout);assert.equal(output.status,"PASS");assert.equal(output.networkContacted,false);assert.equal(output.persistedAccountChecked,false);assert.equal(fixture.traffic,before);
    const sentinel="DO_NOT_PRINT_THIS_SENTINEL";
    const envFile=resolve(temp,"invalid.env");await writeFile(envFile,`CONNECTOR_REMO_API_KEY=${sentinel}\nREMO_SAML_KEY_FILE=/${sentinel}/missing.pem\n`);
    const invalid=spawnSync(process.execPath,["devX/remo-preflight.mjs",`--env-file=${envFile}`],{cwd:root,env:runtimeEnv,encoding:"utf8",timeout:20000});assert.notEqual(invalid.status,0);assert(!`${invalid.stdout}${invalid.stderr}`.includes(sentinel));
  });
  await check("W111 : redémarrage, modes disabled/local/remo et changement de compte",async()=>{
    const baseline={traffic:fixture.traffic,invitations:fixture.invitations};
    await restart({CONNECTOR_REMO_PROVIDER:"disabled",REMO_SSO_ENABLED:"false"});
    assert.equal((await request("/events")).items.find(e=>e.id===eventId).liveReady,false);await request(`/events/${eventId}/join-url`,{token:investor,status:409});assert.equal(fixture.traffic,baseline.traffic);
    await restart({CONNECTOR_REMO_PROVIDER:"local",REMO_ACCOUNT_KEY:"local-shared",REMO_SSO_ENABLED:"false"});
    await request(`/events/${eventId}/join-url`,{token:investor,status:409});assert.equal(fixture.traffic,baseline.traffic);
    const local=(await request("/events",{token:officer,body:{title:"W111 local",startsAt:slot(1),endsAt:slot(20),capacity:2}})).eventId;
    await request(`/events/${local}/publish`,{token:officer,body:{},status:200});await request(`/events/${local}/cancel`,{token:officer,body:{reason:"Fin de bascule locale"},status:200});
    await restart({REMO_COMPANY_ID:"bbbbbbbbbbbbbbbbbbbbbbbb",REMO_ACCOUNT_KEY:"different-contract"});
    assert.equal((await request("/events")).items.find(e=>e.id===eventId).liveReady,false);await request(`/events/${eventId}/publish`,{token:officer,body:{},status:409});await request(`/events/${eventId}/join-url`,{token:investor,status:409});assert.equal(fixture.traffic,baseline.traffic);
    await restart();await request(`/events/${eventId}/join-url`,{token:investor});assert.equal(fixture.invitations,baseline.invitations);
  });
  await check("W111 : invitation incertaine reprise après redémarrage sans nouvel envoi",async()=>{
    const e=(await request("/events",{token:officer,body:{title:"W111 reprise",startsAt:slot(1),endsAt:slot(20),capacity:2}})).eventId;
    await request(`/events/${e}/publish`,{token:officer,body:{},status:200});await request(`/events/${e}/registrations`,{token:seller,body:{displayName:"Reprise",providerConsent:true}});
    fixture.loseInvite();await request(`/events/${e}/join-url`,{token:seller,status:409});const before=fixture.invitations;
    await restart();await request(`/events/${e}/join-url`,{token:seller});assert.equal(fixture.invitations,before);
    await request(`/events/${e}/cancel`,{token:officer,body:{reason:"Fin de reprise",deleteRemoteData:true},status:200});
  });
}
