import assert from "node:assert/strict";
import {readFileSync,readdirSync,writeFileSync} from "node:fs";
import {resolve,relative} from "node:path";
import {createHash} from "node:crypto";
import ts from "typescript";

const root=resolve(import.meta.dirname,"..");
const api="codebases/backend/api/src/modules/events/",web="codebases/frontend/web/app/";
const org=web+"(espace)/organisateur/evenements/",dia=web+"(espace)/diaspora/",sso=web+"sso/remo/";
const relay=web+"api/organisateur/[...path]/route.ts",eventRelay=web+"api/events/[eventId]/[action]/route.ts";
// Chaque entrée classe une route produit. Une nouvelle route sans décision de couverture fait échouer ce contrôle.
const features={
  "GET /events":[web+"evenements/page.tsx","EVENT_CARD"],
  "GET /events/options":[dia+"page.tsx","DIA_PROVIDER_CONSENT"],
  "GET /events/integration":[web+"(espace)/organisateur/integration/page.tsx","ORG_INTEGRATION"],
  "POST /events/account-branding":[web+"(espace)/organisateur/integration/brand-form.tsx","REMO_ACCOUNT_BRAND_SAVE",relay],
  "GET /events/managed":[org+"page.tsx","L05_PAGE_NEXT"],
  "GET /events/managed/:eventId":[org+"[eventId]/page.tsx","ORG_EVENT_DETAIL"],
  "POST /events/:eventId/edit":[org+"event-form.tsx","ORG_EVENT_SAVE",relay],
  "POST /events/:eventId/cancel":[org+"event-actions.tsx","ORG_EVENT_CANCEL",relay],
  "POST /events/:eventId/reconcile":[org+"event-actions.tsx","ORG_REMOTE_RECONCILE",relay],
  "POST /events/:eventId/remote-content":[org+"event-form.tsx","ORG_EVENT_SAVE",relay],
  "POST /events/:eventId/sync-invitations":[org+"event-actions.tsx","ORG_SYNC_INVITATIONS",relay],
  "POST /events/:eventId/member-group":[org+"member-group.tsx","REMO_GROUP_ADD",relay],
  "POST /events/:eventId/invite-speaker":[org+"member-group.tsx","REMO_INVITE_SPEAKER",relay],
  "POST /events/:eventId/sync-attendance":[org+"event-actions.tsx","ORG_EVENT_SYNC",relay],
  "GET /events/diaspora/appointments":[dia+"page.tsx","L05_PAGE_NEXT"],
  "GET /events/diaspora/managed":[org+"page.tsx","L05_PAGE_NEXT"],
  "POST /events/diaspora/:appointmentId/decision":[org+"appointment-decision.tsx","DIA_CONFIRM",relay],
  "POST /events":[org+"event-form.tsx","ORG_EVENT_SAVE",relay],
  "POST /events/:eventId/publish":[org+"event-actions.tsx","ORG_EVENT_PUBLISH",relay],
  "POST /events/:eventId/registrations":[web+"evenements/event-card.tsx","EVENT_REGISTER_SUBMIT",eventRelay],
  "POST /events/:eventId/contact-consent":[web+"evenements/event-card.tsx","EVENT_CONSENT_TOGGLE",eventRelay],
  "GET /events/:eventId/join-url":[web+"evenements/[eventId]/acces/page.tsx","EVENT_JOIN",eventRelay],
  "POST /events/diaspora/appointments":[dia+"request-form.tsx","DIA_REQUEST",web+"api/diaspora/route.ts"],
  "GET /federation/remo/metadata":[sso+"metadata/route.ts","REMO_SAML_METADATA"],
  "POST /federation/remo/challenges":[sso+"route.ts",null],
  "POST /federation/remo/challenges/:id/complete":[sso+"complete/route.ts","SAML_POST_CONTINUE"],
  "POST /webhooks/remo/attendance":[api+"remo-webhook.controller.ts",null],
};
const publicRoutes=new Set(["GET /events","GET /events/options","GET /federation/remo/metadata","POST /federation/remo/challenges","POST /webhooks/remo/attendance"]);
const text=path=>readFileSync(resolve(root,path),"utf8");
const registry=JSON.parse(text("qa/registre-interactions.json")).controles;
const hash=value=>createHash("sha256").update(value).digest("hex");
const decorators=node=>(ts.canHaveDecorators(node)?ts.getDecorators(node):[])??[];
const call=d=>ts.isCallExpression(d.expression)?d.expression:null;
const name=d=>{const c=call(d);return c&&ts.isIdentifier(c.expression)?c.expression.text:null;};
const rows=[];
for(const filename of readdirSync(resolve(root,api)).filter(f=>f.endsWith(".controller.ts"))) {
  const path=api+filename,source=text(path),tree=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true);
  for(const cls of tree.statements.filter(ts.isClassDeclaration)) {
    const controller=decorators(cls).find(d=>name(d)==="Controller");if(!controller)continue;
    const prefix=call(controller).arguments[0].text;
    for(const method of cls.members.filter(ts.isMethodDeclaration)) {
      const decs=decorators(method),route=decs.find(d=>["Get","Post","Put","Patch","Delete"].includes(name(d)));if(!route)continue;
      const suffix=call(route).arguments[0]?.text??"",key=`${name(route).toUpperCase()} /${prefix}${suffix?`/${suffix}`:""}`;
      assert(features[key],`Route L05 sans contrat de couverture : ${key}`);
      const [surface,control,bff]=features[key];text(surface);if(bff)text(bff);if(control)assert(registry[control],`Contrôle non documenté : ${control}`);
      if(!publicRoutes.has(key))assert(decs.some(d=>name(d)==="Roles"&&call(d).arguments.length>0),`Route protégée devenue publique : ${key}`);
      if(key.startsWith("POST /webhooks"))assert(decs.some(d=>name(d)==="UseGuards")&&decs.some(d=>name(d)==="UseInterceptors"));
      const body=method.body.getText(tree),delegation=[...body.matchAll(/this\.(events|members)\.(\w+)\(/g)].map(m=>`${m[1]==="events"?"events.service.ts":"remo-members.service.ts"}#${m[2]}`);
      for(const target of delegation){const [file,fn]=target.split("#");assert(new RegExp(`\\b${fn}\\s*\\(`).test(text(api+file)),`Délégation absente : ${target}`);}
       rows.push({api:key,controller:path,handler:method.name.getText(tree),service:delegation.length?delegation:[`${filename}#${method.name.getText(tree)}`],surface,bff:bff??"SSR direct / protocole",control,authentication:publicRoutes.has(key)?"PUBLIC_OR_PROTOCOL_GUARD":"SESSION_AND_ROLES",tests:key.includes("federation")?["packages/federation/test/saml.test.ts","devX/remo-api-integration.mjs","devX/l05-wiring-cases.mjs"]:["devX/l05-integration.mjs","devX/remo-api-integration.mjs","devX/l05-wiring-cases.mjs"],sourceHash:hash(source+text(surface)+(bff?text(bff):"")+delegation.map(d=>text(api+d.split("#")[0])).join(""))});
    }
  }
}
assert.equal(rows.length,Object.keys(features).length,"Entrée de matrice devenue orpheline");
const exclusions=[
  {capability:"POST /events (compagnie implicite)",handling:"Variante remplacée par la création sous Company ID explicite",tracking:"V1-068"},
  {capability:"Découverte publique et rapport global par hôte",handling:"Connecteur disponible ; exploitation statistique approfondie au périmètre P20",tracking:"V1-104 / L11"},
  {capability:"Activation SSO, favicon, domaine et emails globaux",handling:"Initialisation fournisseur ; aucune route d'écriture dans le Swagger",tracking:"V1-112 / V1-113 / V1-114"},
  {capability:"Captation voix réelles, transcripts et recordings",handling:"Recette du compte et stratégie d'export ; aucun endpoint de téléchargement inventé",tracking:"V1-107 / A21"},
  {capability:"Single Logout et suppression individuelle d'inscription Remo",handling:"Non exposés ; ne pas promettre de révocation distante depuis un simple retrait de groupe",tracking:"V1-113 / V1-115"},
];
let evidence="DECLARATIVE_CHECK_ONLY";
const reports={},requiredCases=[...text("devX/l05-wiring-cases.mjs").matchAll(/await check\("([^"]+)"/g)].map(m=>m[1]);
assert(requiredCases.length>=9,"Scénarios de câblage/bascule manquants");
if(process.argv.includes("--evidence")) {
  const smoke=JSON.parse(text(".ci-artifacts/smoke-results.json"));assert.equal(smoke.status,"PASS");assert.equal(smoke.scope,"all");
   for(const file of ["l05-results.json","remo-api-results.json"]){const raw=text(`.ci-artifacts/${file}`),report=JSON.parse(raw);assert.equal(report.status,"PASS");assert(report.checks.length>0&&report.checks.every(c=>c.status==="PASS"));reports[file]={sha256:hash(raw),checks:report.checks.length};if(file==="remo-api-results.json")for(const name of requiredCases)assert(report.checks.some(c=>c.name===name),`Scénario sans preuve : ${name}`);}
  evidence="FULL_ISOLATED_SUITE_PASS";
}
writeFileSync(resolve(root,"qa/l05-wiring-matrix.json"),JSON.stringify({schemaVersion:1,task:"V1-110",status:"PASS",evidence,routeCount:rows.length,rows,exclusions,requiredCases,reports,tests:["devX/l05-integration.mjs","devX/remo-api-integration.mjs","devX/l05-wiring-cases.mjs","packages/federation/test/saml.test.ts","codebases/backend/api/test/remo-preflight.test.ts"]},null,2)+"\n");
console.log(`L05 : ${rows.length} routes classées API/service/SSR-BFF/contrôles ; ${evidence}. Matrice : ${relative(root,resolve(root,"qa/l05-wiring-matrix.json"))}`);
