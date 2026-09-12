import {readFile,writeFile} from "node:fs/promises";
import {parseEnv} from "node:util";
import {checkRemoConfiguration} from "../codebases/backend/api/dist/config/remo-preflight.js";

let envFile,output,invalid=false;
for(const argument of process.argv.slice(2)) {
  if(argument.startsWith("--env-file="))envFile=argument.slice(11);
  else if(argument.startsWith("--output="))output=argument.slice(9);
  else invalid=true;
}
const failure=code=>({schemaVersion:1,status:"FAIL",networkContacted:false,providerQualified:false,checks:[{name:"cli",status:"FAIL",code,fields:[]}]});
let report;
if(invalid)report=failure("INVALID_ARGUMENTS");
else {
  try {const source={...process.env,...(envFile?parseEnv(await readFile(envFile,"utf8")):{})};report=checkRemoConfiguration(source);}
  catch {report=failure("ENV_FILE_UNREADABLE");}
}
if(output){try{await writeFile(output,JSON.stringify(report,null,2)+"\n",{mode:0o600});}catch{report=failure("REPORT_WRITE_FAILED");}}
console.log(JSON.stringify(report,null,2));
if(report.status!=="PASS")process.exitCode=1;
