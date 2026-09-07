// Local isolated storage stress test. Not a production or Telegram capacity certificate.
import {performance} from 'node:perf_hooks';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../src/db.mjs';
import {seed,roster} from '../src/seed.mjs';
import {Store} from '../src/store.mjs';
const users=Math.min(10000,Math.max(1,Number(process.argv[2]||1000))),concurrency=50,dir=await mkdtemp(join(tmpdir(),'barca-load-'));
const db=await openDatabase({sqlitePath:join(dir,'db.sqlite')}),store=new Store(db);await seed(db,{demo:true});const times=[];let cursor=0,errors=0;const start=performance.now();
await Promise.all(Array.from({length:concurrency},async()=>{while(cursor<users){const id=cursor++,t=performance.now();try{await store.save('demo-valencia',String(id),{scores:Object.fromEntries(roster.slice(0,16).map(p=>[p[0],id%5+1])),version:0,submit:true});}catch{errors++;}times.push(performance.now()-t);}}));
const elapsed=performance.now()-start,r=await store.aggregate('demo-valencia');times.sort((a,b)=>a-b);const report={scope:'Local SQLite storage only; excludes HTTP, PostgreSQL, Telegram and hosting. 50 concurrent workers; batch of 16 votes per user.',users,concurrency,elapsedMs:Math.round(elapsed),ballotsPerSecond:Math.round(users/elapsed*1000),p95Ms:Math.round(times[Math.floor(times.length*.95)]),errors,participants:r.participants,playerVoteCounts:r.players.map(p=>p.votes),passed:errors===0&&r.participants===users&&r.players.every(p=>p.votes===users)};
await mkdir('output',{recursive:true});await writeFile('output/load-test.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await db.close();await rm(dir,{recursive:true,force:true});if(!report.passed)process.exitCode=1;
