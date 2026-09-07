import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { randomBytes, createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { config } from './config.mjs';
import { AppError, telegramIdentity } from './auth.mjs';
import { openDatabase } from './db.mjs';
import { seed } from './seed.mjs';
import { Store } from './store.mjs';

const publicDir=resolve('public');
export async function createApp(cfg) {
 const db=await openDatabase(cfg); await seed(db,cfg); const store=new Store(db);
 if(cfg.production&&(await db.query('SELECT id FROM matches WHERE demo=1 LIMIT 1')).length) throw new Error('Production must use a database without demonstration matches.');
 if(cfg.demo) await db.query("INSERT INTO admins(user_id,role) VALUES('demo-admin','admin') ON CONFLICT(user_id) DO NOTHING");
 const secret=randomBytes(32),limits=new Map();
 const sign=id=>createHmac('sha256',secret).update(id).digest('hex');
 const cookie=(res,id)=>res.setHeader('Set-Cookie',`barca_demo=${id}.${sign(id)}; HttpOnly; SameSite=Strict; Path=/`);
 function identity(req,res) {
   if(req.headers['x-telegram-init-data']) return telegramIdentity(req.headers['x-telegram-init-data'],cfg.token);
   if(!cfg.demo) throw new AppError(401,'Открой приложение через Telegram-бота.');
   const raw=(req.headers.cookie||'').split('; ').find(x=>x.startsWith('barca_demo='))?.slice(11)||'';
   const [id,sig]=raw.split('.');
   if(id&&/^[a-f0-9]{64}$/.test(sig||'')&&timingSafeEqual(Buffer.from(sig,'hex'),Buffer.from(sign(id),'hex'))) return {id,name:id==='demo-admin'?'Демо-администратор':'Болельщик'};
   const fresh='demo-'+randomUUID(); cookie(res,fresh); return {id:fresh,name:'Болельщик'};
 }
 function limited(id) { const t=Date.now(),v=limits.get(id); if(!v||t>v.until) { if(limits.size>50000) for(const [k,x] of limits) if(x.until<t) limits.delete(k); limits.set(id,{n:1,until:t+60000}); return; } if(++v.n>180) throw new AppError(429,'Слишком много запросов. Подожди минуту и повтори.'); }
 async function body(req) { if(!req.headers['content-type']?.startsWith('application/json')) throw new AppError(415,'Ожидается JSON.'); let raw='',length=0; for await(const c of req) { length+=c.length; if(length>32768) throw new AppError(413,'Слишком большой запрос.'); raw+=c; } try { return JSON.parse(raw||'{}'); } catch { throw new AppError(400,'Не удалось прочитать запрос.'); } }
 const server=http.createServer(async(req,res)=>{
   res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','no-referrer');
   res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' https://telegram.org; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'self' https://web.telegram.org https://*.telegram.org; base-uri 'none'; form-action 'self'");
   const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(data));};
   try {
     const url=new URL(req.url,'http://localhost'),path=url.pathname;
     if(path==='/healthz') { await db.query('SELECT 1'); return send(200,{ok:true}); }
     if(path==='/api/config') return send(200,{demo:cfg.demo,botUsername:cfg.botUsername});
     if(path.startsWith('/api/')) {
       if(!['GET','POST'].includes(req.method)) throw new AppError(405,'Метод не поддерживается.');
       if(req.method==='POST') { const origin=req.headers.origin; const expected=cfg.publicUrl?new URL(cfg.publicUrl).origin:`http://${req.headers.host}`; if(origin&&origin!==expected) throw new AppError(403,'Запрос с другого сайта запрещён.'); }
       const user=identity(req,res); limited(user.id);
       if(path==='/api/demo/role'&&req.method==='POST'&&cfg.demo) { const d=await body(req); cookie(res,d.role==='admin'?'demo-admin':'demo-'+randomUUID()); return send(200,{ok:true}); }
       if(path==='/api/me') return send(200,{...user,role:await store.role(user.id),demo:cfg.demo});
       if(path==='/api/matches'&&req.method==='GET') return send(200,await store.matches());
       if(path==='/api/season') return send(200,await store.season(url.searchParams.get('season')||'2026/27'));
       const match=path.match(/^\/api\/matches\/([\w-]+)(?:\/(votes|results))?$/);
       if(match) { const [,id,action]=match; if(action==='votes'&&req.method==='POST') return send(200,await store.save(id,user.id,await body(req))); if(action==='results'&&req.method==='GET') return send(200,await store.results(id,user.id)); if(!action&&req.method==='GET') return send(200,await store.detail(id,user.id)); }
       if(path.startsWith('/api/admin/')) {
         await store.requireAdmin(user.id);
         if(path==='/api/admin/content'){if(req.method==='GET')return send(200,await store.content());const d=await body(req);return send(200,await store.setContent(user.id,d.key,d.text,d.entities||[]));}
         if(path==='/api/admin/matches') return send(200,req.method==='POST'?await store.create(user.id,await body(req)):await store.matches(true));
         if(path==='/api/admin/players') return send(200,req.method==='POST'?await store.addPlayer(user.id,await body(req)):await store.players());
         if(path==='/api/admin/access') { if(req.method==='GET') return send(200,await store.admins(user.id)); const d=await body(req); await store.grant(user.id,d.user_id,d.role); return send(200,{ok:true}); }
         const a=path.match(/^\/api\/admin\/matches\/([\w-]+)\/(lineup|state)$/);
         if(a&&req.method==='POST') { const d=await body(req); return send(200,a[2]==='lineup'?await store.setLineup(user.id,a[1],d.player_ids):await store.transition(user.id,a[1],d.state,d.hours??24)); }
       }
       throw new AppError(404,'Страница не найдена.');
     }
     if(!['GET','HEAD'].includes(req.method)) throw new AppError(405,'Метод не поддерживается.');
     const decoded=decodeURIComponent(path),relative=decoded==='/'?'index.html':decoded.replace(/^\//,'');
     if(relative.split('/').some(p=>p.startsWith('.'))||relative.includes('\\')) throw new AppError(404,'Файл не найден.');
     const file=resolve(publicDir,relative); if(!file.startsWith(publicDir+'/')&&!file.startsWith(publicDir+'\\')) throw new AppError(404,'Файл не найден.');
     const data=await readFile(file).catch(()=>{throw new AppError(404,'Файл не найден.');});
     const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
     res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':/\.(woff2|png)$/.test(file)?'public, max-age=86400':'no-cache'}); res.end(req.method==='HEAD'?undefined:data);
   } catch(e) { if(e.status===429) res.setHeader('Retry-After','60'); if(!e.status) console.error('Request failed:',e.code||e.name); if(!res.headersSent) send(e.status||500,{error:e.status?e.message:'Не удалось выполнить запрос. Попробуй ещё раз.'}); else res.end(); }
 });
 server.requestTimeout=15000; server.headersTimeout=10000;
 return {server,db,store};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
 const cfg=config(),app=await createApp(cfg);
 app.server.listen(cfg.port,cfg.host,()=>console.log(`Barca Family: http://${cfg.host}:${cfg.port} (${cfg.demo?'local demo':'Telegram authentication'})`));
 let stopping=false; const shutdown=()=>{if(stopping)return;stopping=true; app.server.close(async()=>{await app.db.close();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();};
 process.on('SIGTERM',shutdown); process.on('SIGINT',shutdown);
}
