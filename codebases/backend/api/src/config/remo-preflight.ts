import { readFileSync, statSync } from "node:fs";
import { createLocalRemo, createRemoApiAdapter } from "@dealpme/connector-remo";
import { createSamlIdentityProvider } from "@dealpme/federation";
import { parseEnv } from "./env.js";

export interface PreflightCheck { name:string; status:"PASS"|"FAIL"|"SKIPPED"; code:string; fields:string[] }
/** Aucun appel réseau, aucune valeur de configuration ou exception brute dans la sortie. */
export function checkRemoConfiguration(source:NodeJS.ProcessEnv) {
  const checks:PreflightCheck[]=[];
  const add=(name:string,status:PreflightCheck["status"],code:string,fields:string[]=[])=>checks.push({name,status,code,fields});
  const mode=["disabled","local","remo"].includes(source["CONNECTOR_REMO_PROVIDER"]??"disabled")?source["CONNECTOR_REMO_PROVIDER"]??"disabled":"invalid";
  const report=()=>({schemaVersion:1,status:checks.some(c=>c.status==="FAIL")?"FAIL":"PASS",mode,networkContacted:false,providerQualified:false,persistedAccountChecked:false,checks});
  let env:ReturnType<typeof parseEnv>;
  try { env=parseEnv(source);add("application","PASS","ENV_VALID"); }
  catch(error) {
    const fields=error instanceof Error?[...new Set([...error.message.matchAll(/^([A-Z][A-Z0-9_]+):/gm)].map(m=>m[1]!))]:[];
    add("application","FAIL","ENV_INVALID",fields);return report();
  }
  try {
    if(env.CONNECTOR_REMO_PROVIDER==="local")createLocalRemo({baseUrl:env.REMO_LOCAL_BASE_URL,apiKey:env.REMO_LOCAL_API_KEY,timeoutMs:env.REMO_TIMEOUT_MS});
    if(env.CONNECTOR_REMO_PROVIDER==="remo")createRemoApiAdapter({baseUrl:env.REMO_API_BASE_URL,eventBaseUrl:env.REMO_EVENT_BASE_URL,companyId:env.REMO_COMPANY_ID!,apiKey:env.CONNECTOR_REMO_API_KEY,timeoutMs:env.REMO_TIMEOUT_MS,floorTemplate:env.REMO_FLOOR_TEMPLATE,floorTheme:env.REMO_FLOOR_THEME});
    add("transport",env.CONNECTOR_REMO_PROVIDER==="disabled"?"SKIPPED":"PASS",env.CONNECTOR_REMO_PROVIDER==="disabled"?"TRANSPORT_DISABLED":"TRANSPORT_CONFIG_VALID");
  } catch {add("transport","FAIL","TRANSPORT_CONFIG_INVALID",env.CONNECTOR_REMO_PROVIDER==="local"?["REMO_LOCAL_BASE_URL","REMO_LOCAL_API_KEY"]:["REMO_API_BASE_URL","REMO_EVENT_BASE_URL","REMO_COMPANY_ID","CONNECTOR_REMO_API_KEY"]);}
  if(env.CONNECTOR_REMO_PROVIDER==="remo")add("host",env.REMO_HOST_EMAIL?"PASS":"FAIL",env.REMO_HOST_EMAIL?"HOST_CONFIGURED":"HOST_EMAIL_REQUIRED_FOR_HOST_ENTRY",["REMO_HOST_EMAIL"]);
  if(!env.REMO_SSO_ENABLED){add("saml","SKIPPED","SSO_DISABLED");return report();}
  const values:Record<string,string>={};
  for(const field of ["REMO_SAML_KEY_FILE","REMO_SAML_CERT_FILE","REMO_SAML_PREVIOUS_CERT_FILE"] as const) {
    const path=env[field];if(!path)continue;
    try { const stat=statSync(path);if(!stat.isFile()||stat.size>65536)throw new Error("invalid");values[field]=readFileSync(path,"utf8");add(field,"PASS","FILE_READABLE",[field]); }
    catch {add(field,"FAIL","FILE_UNREADABLE_OR_TOO_LARGE",[field]);}
  }
  if(checks.some(c=>c.status==="FAIL"&&c.name.startsWith("REMO_SAML_")))return report();
  try {
    const provider=createSamlIdentityProvider({idpEntityId:env.REMO_SAML_IDP_ENTITY_ID!,ssoUrl:env.REMO_SAML_SSO_URL!,spEntityId:env.REMO_SAML_SP_ENTITY_ID!,acsUrl:env.REMO_SAML_ACS_URL!,privateKey:values["REMO_SAML_KEY_FILE"]!,certificate:values["REMO_SAML_CERT_FILE"]!,previousCertificate:values["REMO_SAML_PREVIOUS_CERT_FILE"]});
    provider.metadata();add("saml","PASS","SAML_CONFIG_AND_CERTIFICATE_VALID");
  }catch{add("saml","FAIL","SAML_CONFIG_OR_CERTIFICATE_INVALID",["REMO_SAML_KEY_FILE","REMO_SAML_CERT_FILE","REMO_SAML_PREVIOUS_CERT_FILE","REMO_SAML_IDP_ENTITY_ID","REMO_SAML_SSO_URL","REMO_SAML_SP_ENTITY_ID","REMO_SAML_ACS_URL"]);}
  return report();
}
