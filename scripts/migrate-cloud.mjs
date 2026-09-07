import {DatabaseSync} from 'node:sqlite';
import {openDatabase} from '../src/db.mjs';
import {config} from '../src/config.mjs';
const cfg=config();if(!cfg.databaseUrl)throw new Error('DATABASE_URL required');
const local=new DatabaseSync(cfg.sqlitePath,{readOnly:true}),cloud=await openDatabase({...cfg,skipSchema:true});
try{
 await cloud.transaction(async tx=>{
   for(const table of ['players','player_profiles','matches','match_players','bot_content','admins','ballots','votes']){
     let rows=local.prepare('SELECT * FROM '+table).all();
     if(['admins','ballots','votes'].includes(table))rows=rows.filter(r=>/^\d+$/.test(r.user_id));
     for(const row of rows){const keys=Object.keys(row);await tx.query(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')}) ON CONFLICT DO NOTHING`,Object.values(row));}
     console.log(table+': '+rows.length+' source rows checked');
   }
 });
}finally{local.close();await cloud.close();}
