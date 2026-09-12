import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { checkRemoConfiguration } from "../src/config/remo-preflight.js";
import { EventPageSchema, pageOf } from "../src/modules/events/event-page.js";

const secret="PRIVATE-SENTINEL-DO-NOT-PRINT";
const base:NodeJS.ProcessEnv={NODE_ENV:"test",DATABASE_URL_CORE:"postgres://dealpme_api:secret@127.0.0.1/test",DATABASE_URL_VDR:"postgres://test",S3_ENDPOINT:"http://127.0.0.1:9000",S3_ACCESS_KEY:secret,S3_SECRET_KEY:secret,S3_BUCKET_VDR:"vdr",S3_BUCKET_IDENTITY:"identity",SESSION_SECRET:secret,FIELD_ENCRYPTION_KEY:secret,CONNECTOR_EMAIL_PROVIDER:"fake",CONNECTOR_SMS_PROVIDER:"fake"};
let directory:string;
beforeAll(()=>{directory=mkdtempSync(join(tmpdir(),"dealpme-preflight-"));expect(spawnSync("openssl",["req","-x509","-newkey","rsa:2048","-nodes","-keyout",join(directory,"key.pem"),"-out",join(directory,"cert.pem"),"-days","1","-subj","/CN=preflight.example.test"],{stdio:"ignore"}).status).toBe(0);});
afterAll(()=>rmSync(directory,{recursive:true,force:true}));
const remote={...base,CONNECTOR_REMO_PROVIDER:"remo",CONNECTOR_REMO_API_KEY:secret,REMO_COMPANY_ID:"aaaaaaaaaaaaaaaaaaaaaaaa",REMO_ACCOUNT_KEY:"test-account",REMO_QUOTA_REFERENCE:"fixture",REMO_HOST_EMAIL:"host@example.test"};
const saml=()=>({...remote,REMO_SSO_ENABLED:"true",REMO_SAML_IDP_ENTITY_ID:"https://dp.example.test/metadata",REMO_SAML_SSO_URL:"https://dp.example.test/sso",REMO_SAML_SP_ENTITY_ID:"http://live.remo.co/",REMO_SAML_ACS_URL:"https://live.remo.co/__/auth/handler",REMO_SAML_KEY_FILE:join(directory,"key.pem"),REMO_SAML_CERT_FILE:join(directory,"cert.pem")});
describe("Précontrôle Remo hors réseau",()=>{
  it.each(["disabled","local","remo"])("valide le mode %s sans contacter aucun fournisseur",mode=>{
    const spy=vi.spyOn(globalThis,"fetch").mockRejectedValue(new Error("NETWORK_FORBIDDEN"));
    try{const report=checkRemoConfiguration({...remote,CONNECTOR_REMO_PROVIDER:mode});expect(report.status).toBe("PASS");expect(report.networkContacted).toBe(false);expect(report.providerQualified).toBe(false);expect(spy).not.toHaveBeenCalled();expect(JSON.stringify(report)).not.toContain(secret);}finally{spy.mockRestore();}
  });
  it("refuse paramètres manquants, URL hors protocole et mode inconnu sans afficher leurs valeurs",()=>{
    for(const source of [{...remote,REMO_COMPANY_ID:undefined},{...remote,REMO_API_BASE_URL:"https://example.test/wrong-path"},{...remote,REMO_HOST_EMAIL:undefined},{...remote,CONNECTOR_REMO_PROVIDER:secret}]){
      const report=checkRemoConfiguration(source);expect(report.status).toBe("FAIL");expect(JSON.stringify(report)).not.toContain(secret);
    }
  });
  it("utilise la même validation SAML que l'application, sans exposer les PEM ni chemins",()=>{
    const report=checkRemoConfiguration(saml());expect(report.status).toBe("PASS");expect(JSON.stringify(report)).not.toContain(directory);expect(JSON.stringify(report)).not.toContain(readFileSync(join(directory,"key.pem"),"utf8"));
    const missing=checkRemoConfiguration({...saml(),REMO_SAML_KEY_FILE:`/${secret}/absent.pem`});expect(missing.status).toBe("FAIL");expect(JSON.stringify(missing)).not.toContain(secret);
  });
  it("refuse un certificat expiré et les modes locaux en production",()=>{
    vi.useFakeTimers({toFake:["Date"]});vi.setSystemTime(Date.now()+2*86400000);
    try{expect(checkRemoConfiguration(saml()).status).toBe("FAIL");}finally{vi.useRealTimers();}
    expect(checkRemoConfiguration({...base,NODE_ENV:"production",CONNECTOR_REMO_PROVIDER:"local"}).status).toBe("FAIL");
  });
});
describe("Curseurs de listes L05",()=>{
  it("conserve les microsecondes et rejette les curseurs arbitraires",()=>{
    const rows=[{id:"018f0000-0000-7000-8000-000000000001",createdAt:new Date(),cursorTime:"2026-09-12T12:00:00.123456Z"},{id:"018f0000-0000-7000-8000-000000000000",createdAt:new Date(),cursorTime:"2026-09-12T12:00:00.123456Z"}];
    const page=pageOf(rows,1);expect(page.items[0]).not.toHaveProperty("cursorTime");expect(EventPageSchema.parse({cursor:page.nextCursor}).before?.createdAt).toBe(rows[0]!.cursorTime);
    expect(EventPageSchema.safeParse({cursor:"bad"}).success).toBe(false);expect(EventPageSchema.safeParse({limit:101}).success).toBe(false);
  });
});
