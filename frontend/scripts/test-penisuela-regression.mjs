import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const files=readdirSync('scripts').filter(f=>/^test-.*\.(mjs|ts)$/u.test(f)&&f!=='test-penisuela-regression.mjs').sort();
files.push('validate-penisuela-playable-bridge.mjs','validate-penisuela-current-release.mjs');
let failures=0;
for(const file of files){
 const args=file.endsWith('.ts')?['scripts/run-typescript-test.mjs',`scripts/${file}`]:[`scripts/${file}`];
 const result=spawnSync(process.execPath,args,{encoding:'utf8'});
 console.log(`${result.status===0?'PASS':'FAIL'} ${file}`);
 if(result.status!==0){failures++;console.error(result.stdout,result.stderr);}
}
console.log(`Regression: ${files.length-failures}/${files.length} suites passed.`);
process.exitCode=failures?1:0;
