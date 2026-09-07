import { randomUUID } from 'node:crypto';
import { AppError } from './auth.mjs';
import {contentDefaults,validateContent} from './content.mjs';
const now = () => new Date().toISOString();
const fail = (status,msg) => { throw new AppError(status,msg); };
const textField = (v,min=1,max=80) => typeof v==='string' && v.trim().length>=min && v.trim().length<=max;
export class Store {
 constructor(db) { this.db=db; this.cache=new Map(); }
 async role(user) { return (await this.db.query('SELECT role FROM admins WHERE user_id=$1',[user]))[0]?.role || 'voter'; }
 async requireAdmin(user,tx=this.db) { const role=(await tx.query('SELECT role FROM admins WHERE user_id=$1',[user]))[0]?.role; if(!role) fail(403,'Доступ только для администратора.'); return role; }
 async audit(tx,user,action,id=null) { await tx.query('INSERT INTO audit(id,actor_id,action,match_id,created_at) VALUES($1,$2,$3,$4,$5)',[randomUUID(),user,action,id,now()]); }
 async expire() { await this.db.query("UPDATE matches SET state='closed' WHERE state='open' AND closes_at IS NOT NULL AND closes_at<=$1",[now()]); }
 async matches(admin=false) { await this.expire(); return this.db.query(`SELECT * FROM matches ${admin?'':"WHERE state<>'draft'"} ORDER BY played_on DESC,id DESC`); }
 async players() { return this.db.query('SELECT p.*,pp.photo_path,pp.photo_source,pp.checked_on FROM players p LEFT JOIN player_profiles pp ON p.id=pp.player_id WHERE COALESCE(pp.active,1)=1 ORDER BY p.role,p.number,p.name'); }
 async match(id,tx=this.db,lock=false) { const m=(await tx.query(`SELECT * FROM matches WHERE id=$1${lock&&tx.pg?(lock==='share'?' FOR SHARE':' FOR UPDATE'):''}`,[id]))[0]; if(!m) fail(404,'Матч не найден.'); return m; }
 async lineup(id,tx=this.db) { return tx.query('SELECT p.*,mp.position,pp.photo_path,pp.photo_source FROM players p JOIN match_players mp ON p.id=mp.player_id LEFT JOIN player_profiles pp ON pp.player_id=p.id WHERE mp.match_id=$1 ORDER BY mp.position',[id]); }
 async ballot(id,user,tx=this.db) { const b=(await tx.query('SELECT version,submitted FROM ballots WHERE match_id=$1 AND user_id=$2',[id,user]))[0] || {version:0,submitted:0}; const rows=await tx.query('SELECT player_id,score FROM votes WHERE match_id=$1 AND user_id=$2',[id,user]); return {...b,scores:Object.fromEntries(rows.map(r=>[r.player_id,r.score]))}; }
 async detail(id,user) { const m=await this.match(id); if(m.state==='draft') await this.requireAdmin(user); if(m.state==='open'&&m.closes_at&&m.closes_at<=now()) { await this.expire(); m.state='closed'; } return {match:m,players:await this.lineup(id),ballot:await this.ballot(id,user)}; }
 async save(id,user,{scores={},version,submit=false}) {
   if(!scores || Array.isArray(scores) || typeof scores!=='object' || Object.keys(scores).length>30 || !Number.isInteger(version) || version<0 || typeof submit!=='boolean') fail(400,'Некорректная анкета.');
   const result=await this.db.transaction(async tx=>{
     const m=await this.match(id,tx,'share');
     if(m.state!=='open'||m.closes_at&&m.closes_at<=now()) fail(409,'Голосование уже закрыто. Оценки не изменены.');
     await tx.query('INSERT INTO ballots(match_id,user_id,version,submitted,updated_at) VALUES($1,$2,0,0,$3) ON CONFLICT(match_id,user_id) DO NOTHING',[id,user,now()]);
     if(tx.pg) await tx.query('SELECT version FROM ballots WHERE match_id=$1 AND user_id=$2 FOR UPDATE',[id,user]);
     const b=await this.ballot(id,user,tx);
     if(b.version!==version) fail(409,'Оценки изменились в другом окне или в боте. Обнови страницу и повтори выбор.');
     const valid=new Set((await this.lineup(id,tx)).map(p=>p.id));
     for(const [pid,score] of Object.entries(scores)) {
       if(!valid.has(pid)||!(score===null||Number.isInteger(score)&&score>=1&&score<=5)) fail(400,'Игрок или оценка не подходят для этого матча.');
       if(score===null) await tx.query('DELETE FROM votes WHERE match_id=$1 AND user_id=$2 AND player_id=$3',[id,user,pid]);
       else await tx.query('INSERT INTO votes(match_id,user_id,player_id,score) VALUES($1,$2,$3,$4) ON CONFLICT(match_id,user_id,player_id) DO UPDATE SET score=excluded.score',[id,user,pid,score]);
     }
     const updated=await this.ballot(id,user,tx);
     if((submit||b.submitted)&&!Object.keys(updated.scores).length) fail(400,'Выбери хотя бы одну оценку.');
     await tx.query('UPDATE ballots SET version=version+1,submitted=$3,updated_at=$4 WHERE match_id=$1 AND user_id=$2',[id,user,submit?1:b.submitted,now()]);
     return this.ballot(id,user,tx);
   });
   return result;
 }
 async cached(key,fn) { const old=this.cache.get(key); if(old&&Date.now()-old.time<10000) return old.value; const value=await fn(); if(this.cache.size>200) this.cache.clear(); this.cache.set(key,{time:Date.now(),value}); return value; }
 async results(id,user) {
   const m=await this.match(id); if(m.state==='draft') await this.requireAdmin(user);
   if(m.state==='open'&&m.closes_at&&m.closes_at<=now()) { await this.expire(); m.state='closed'; }
   const role=await this.role(user), ballot=await this.ballot(id,user);
   if(m.state==='open'&&!ballot.submitted&&role==='voter') fail(403,'Сначала отправь свои оценки, чтобы посмотреть результаты.');
   const r=await this.cached('match:'+id,()=>this.aggregate(id)); return {match:m,...r,provisional:m.state!=='closed'};
 }
 async aggregate(id) {
   const players=await this.db.query('SELECT p.id,p.name,p.role,p.number,mp.position,AVG(1.0*v.score) AS rating,COUNT(v.score) AS votes FROM match_players mp JOIN players p ON p.id=mp.player_id LEFT JOIN votes v ON v.match_id=mp.match_id AND v.player_id=mp.player_id AND EXISTS(SELECT 1 FROM ballots b WHERE b.match_id=v.match_id AND b.user_id=v.user_id AND b.submitted=1) WHERE mp.match_id=$1 GROUP BY p.id,p.name,p.role,p.number,mp.position ORDER BY mp.position',[id]);
   const rated=players.filter(p=>p.rating!==null); const participants=Number((await this.db.query('SELECT COUNT(*) AS n FROM ballots WHERE match_id=$1 AND submitted=1',[id]))[0].n);
   return {players:players.map(p=>({...p,rating:p.rating===null?null:Number(p.rating),votes:Number(p.votes)})),team: rated.length?rated.reduce((s,p)=>s+Number(p.rating),0)/rated.length:null,participants,ratedPlayers:rated.length,updatedAt:now()};
 }
 async season(season) { await this.expire(); return this.cached('season-sum:'+season,async()=>{
   const matches=await this.db.query("SELECT id FROM matches WHERE season=$1 AND state='closed' AND demo=0 ORDER BY played_on",[season]);
   const map=new Map(),teams=[];
   for(const m of matches) { const r=await this.aggregate(m.id); if(r.team!==null) teams.push(r.team); for(const p of r.players) if(p.rating!==null) { const v=map.get(p.id)||{...p,sum:0,matches:0,votes:0}; v.sum+=p.rating; v.matches++; v.votes+=p.votes; map.set(p.id,v); } }
   return {season,team:teams.length?teams.reduce((a,b)=>a+b,0):null,matches:teams.length,players:[...map.values()].map(({sum,...p})=>({...p,rating:sum})).sort((a,b)=>b.rating-a.rating),updatedAt:now()};
 }); }
 async create(user,data) {
   if(!textField(data.opponent)||!textField(data.competition)||!/^\d{4}\/\d{2}$/.test(data.season)||!/^\d{4}-\d{2}-\d{2}$/.test(data.played_on)||Number.isNaN(Date.parse(data.played_on))||!/^\d{1,2}:\d{1,2}$/.test(data.score)) fail(400,'Проверь соперника, счёт (0:5), дату и сезон (2026/27).');
   const id=randomUUID().slice(0,8);
   await this.db.transaction(async tx=>{ await this.requireAdmin(user,tx); await tx.query("INSERT INTO matches(id,opponent,score,played_on,season,competition,state,closes_at,demo) VALUES($1,$2,$3,$4,$5,$6,'draft',NULL,0)",[id,data.opponent.trim(),data.score,data.played_on,data.season,data.competition.trim()]); await this.audit(tx,user,'create',id); });
   return this.match(id);
 }
 async setLineup(user,id,ids) {
   if(!Array.isArray(ids)||!ids.length||ids.length>30||new Set(ids).size!==ids.length) fail(400,'Выбери от 1 до 30 разных игроков.');
   await this.db.transaction(async tx=>{ await this.requireAdmin(user,tx); const m=await this.match(id,tx,true); if(m.state!=='draft') fail(409,'Состав можно менять только до открытия голосования.');
     const roster=new Set((await tx.query('SELECT id FROM players')).map(p=>p.id)); if(ids.some(id=>!roster.has(id))) fail(400,'Неизвестный игрок.');
     await tx.query('DELETE FROM match_players WHERE match_id=$1',[id]); for(const [i,p] of ids.entries()) await tx.query('INSERT INTO match_players(match_id,player_id,position) VALUES($1,$2,$3)',[id,p,i]); await this.audit(tx,user,'lineup',id);
   }); return this.lineup(id);
 }
 async transition(user,id,state,hours=24) {
   if(!['open','closed'].includes(state)||!Number.isInteger(hours)||hours<1||hours>168) fail(400,'Срок голосования — от 1 до 168 часов.');
   await this.db.transaction(async tx=>{ await this.requireAdmin(user,tx); const m=await this.match(id,tx,true); if(state==='open'&&m.state!=='draft'||state==='closed'&&m.state!=='open') fail(409,'Это действие уже выполнено или недоступно.');
     if(state==='open'&&!(await this.lineup(id,tx)).length) fail(400,'Сначала выбери игроков.');
     await tx.query('UPDATE matches SET state=$2,closes_at=$3 WHERE id=$1',[id,state,state==='open'?new Date(Date.now()+hours*3600000).toISOString():now()]); await this.audit(tx,user,state,id);
   }); this.cache.clear(); return this.match(id);
 }
 async addPlayer(user,data) { if(!textField(data.name,2,60)||!['Вратарь','Защитник','Полузащитник','Нападающий'].includes(data.role)||!Number.isInteger(data.number)||data.number<0||data.number>99) fail(400,'Проверь имя, позицию и номер игрока.'); const id=randomUUID().slice(0,8); await this.db.transaction(async tx=>{ await this.requireAdmin(user,tx); await tx.query('INSERT INTO players(id,name,role,number) VALUES($1,$2,$3,$4)',[id,data.name.trim(),data.role,data.number]); await this.audit(tx,user,'add_player:'+id); }); return {id,...data}; }
 async admins(user) { await this.requireAdmin(user); return this.db.query('SELECT * FROM admins ORDER BY role,user_id'); }
 async grant(user,target,role) { if(!/^\d{1,16}$/.test(target)||!['admin','voter','owner'].includes(role)) fail(400,'Нужен числовой Telegram ID и корректная роль.'); await this.db.transaction(async tx=>{ if(await this.requireAdmin(user,tx)!=='owner') fail(403,'Доступами управляет только владелец.'); if(target===user) fail(400,'Нельзя изменить собственные права этой командой.'); if(role==='owner') { await tx.query("UPDATE admins SET role='admin' WHERE role='owner'"); } if(role==='voter') await tx.query("DELETE FROM admins WHERE user_id=$1 AND role<>'owner'",[target]); else await tx.query('INSERT INTO admins(user_id,role) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role',[target,role]); await this.audit(tx,user,`role:${target}:${role}`); }); }
 async getState(key) { return (await this.db.query('SELECT value FROM bot_state WHERE key=$1',[key]))[0]?.value; }
 async setState(key,value) { await this.db.query('INSERT INTO bot_state(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value',[key,String(value)]); }
 async content(){const all=structuredClone(contentDefaults);for(const r of await this.db.query('SELECT key,value FROM bot_content'))if(all[r.key])all[r.key]={...all[r.key],...JSON.parse(r.value)};return all;}
 async setContent(user,key,text,entities=[]){const value=validateContent(key,text,entities);await this.db.transaction(async tx=>{await this.requireAdmin(user,tx);await tx.query('INSERT INTO bot_content(key,value,updated_by,updated_at) VALUES($1,$2,$3,$4) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=excluded.updated_at',[key,JSON.stringify(value),user,now()]);await this.audit(tx,user,'content:'+key);});return value;}
}
