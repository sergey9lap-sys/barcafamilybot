import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile,unlink,open} from 'node:fs/promises';
import {openSync,closeSync} from 'node:fs';
import {resolve} from 'node:path';
await mkdir('data',{recursive:true});
const lockPath=resolve('data/supervisor.lock');
try{const saved=JSON.parse(await readFile(lockPath,'utf8'));let alive=true;try{process.kill(saved.pid,0);}catch{alive=false;}if(alive){console.log('Services are already running.');process.exit(0);}await unlink(lockPath);}catch(e){if(e.code!=='ENOENT')throw e;}
const lock=await open(lockPath,'wx');await lock.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));await lock.close();
const children=new Map();let stopping=false;
function start(name){if(stopping)return;const out=openSync(`data/${name}.stdout.log`,'a'),err=openSync(`data/${name}.stderr.log`,'a');const child=spawn(process.execPath,['--env-file=.env',`src/${name}.mjs`],{cwd:process.cwd(),windowsHide:true,stdio:['ignore',out,err]});closeSync(out);closeSync(err);children.set(name,child);writeFile(`data/${name}.pid`,String(child.pid)).catch(()=>{});child.on('error',()=>{console.error(name+' could not start.');});child.on('exit',code=>{children.delete(name);if(!stopping){console.error(name+' exited ('+code+'); restarting in 3 seconds.');setTimeout(()=>start(name),3000);}});}
start('server');start('bot');
async function stop(){if(stopping)return;stopping=true;for(const child of children.values())child.kill('SIGTERM');await unlink(lockPath).catch(()=>{});setTimeout(()=>process.exit(0),1000);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
console.log('Local bot and Mini App started. Logs: data/*.log. This computer must remain on.');
