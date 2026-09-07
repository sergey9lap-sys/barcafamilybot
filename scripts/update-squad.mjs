import {readFile} from 'node:fs/promises';
import {config} from '../src/config.mjs';
import {openDatabase} from '../src/db.mjs';
import {Store} from '../src/store.mjs';
import {demoLineup} from '../src/seed.mjs';
const manifest=JSON.parse(await readFile('assets/squad-2026-09-07.json','utf8')),db=await openDatabase(config()),store=new Store(db);
await db.transaction(async tx=>{
 for(const p of manifest.players){await tx.query('INSERT INTO players(id,name,role,number) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET name=excluded.name,role=excluded.role,number=excluded.number',[p.id,p.name,p.role,p.number]);await tx.query('INSERT INTO player_profiles(player_id,photo_path,photo_source,checked_on,active) VALUES($1,$2,$3,$4,1) ON CONFLICT(player_id) DO UPDATE SET photo_path=excluded.photo_path,photo_source=excluded.photo_source,checked_on=excluded.checked_on,active=1',[p.id,p.photo_path,p.photo_source,p.checked_on]);}
 for(const id of ['ferran','casado','araujo'])await tx.query("INSERT INTO player_profiles(player_id,active,checked_on) SELECT id,0,'2026-09-07' FROM players WHERE id=$1 ON CONFLICT(player_id) DO UPDATE SET active=0,checked_on=excluded.checked_on",[id]);
 await store.audit(tx,'local-operator','refresh_squad:2026-09-07');
 if(config().demo){
   const added=await tx.query("INSERT INTO matches(id,opponent,score,played_on,season,competition,state,closes_at,demo) VALUES('demo-valencia-v2','Валенсия','0:5','2026-09-06','2026/27','Ла Лига','open',NULL,1) ON CONFLICT(id) DO NOTHING RETURNING id");
   if(added.length){
     await tx.query("UPDATE matches SET state='closed',closes_at=$1 WHERE id='demo-valencia' AND demo=1",[new Date().toISOString()]);
     for(const [position,id]of demoLineup.entries())await tx.query("INSERT INTO match_players(match_id,player_id,position) VALUES('demo-valencia-v2',$1,$2)",[id,position]);
     await store.audit(tx,'local-operator','new_demo_preserving_old_votes','demo-valencia-v2');
   }
 }
});
console.log('Current club roster and photo metadata saved:',manifest.players.length);await db.close();
