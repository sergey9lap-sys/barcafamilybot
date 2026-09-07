import {timingSafeEqual} from 'node:crypto';
import {config} from '../src/config.mjs';
import {createApp} from '../src/server.mjs';
import {Telegram,botHandlers} from '../src/bot.mjs';
import {processWebhook} from '../src/webhook.mjs';
let ready;
function application(){
 if(!ready) ready=(async()=>{
   const cfg={...config({...process.env,NODE_ENV:'production',DEMO_MODE:'false',DB_POOL_SIZE:'3'}),skipSchema:true,allowTestMatches:process.env.ALLOW_TEST_MATCHES==='true'};
   const app=await createApp(cfg);
   return {...app,handlers:botHandlers(app.store,new Telegram(cfg.token),cfg)};
 })().catch(e=>{ready=undefined;throw e;});
 return ready;
}
export default async function handler(req,res){
 try{
   if(new URL(req.url,'https://local.invalid').pathname==='/api/telegram'){
     if(req.method!=='POST'){res.statusCode=405;return res.end();}
     const secret=process.env.TELEGRAM_WEBHOOK_SECRET||'',provided=req.headers['x-telegram-bot-api-secret-token'];
     if(!secret||typeof provided!=='string'||Buffer.byteLength(provided)!==Buffer.byteLength(secret)||!timingSafeEqual(Buffer.from(provided),Buffer.from(secret))){res.statusCode=403;return res.end();}
     let update=req.body;
     if(update===undefined){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>65536){res.statusCode=413;return res.end();}}update=raw;}
     if(typeof update==='string'){try{update=JSON.parse(update);}catch{res.statusCode=400;return res.end();}}
     if(!update||!Number.isSafeInteger(update.update_id)){res.statusCode=400;return res.end();}
     const app=await application();
     await processWebhook(app.db,app.handlers,update);
     res.statusCode=200;return res.end('ok');
   }
   const app=await application();
   // Vercel may have consumed the JSON stream before invoking the function.
   if(req.body!==undefined){const body=typeof req.body==='string'?req.body:JSON.stringify(req.body);req[Symbol.asyncIterator]=async function*(){yield Buffer.from(body);};}
   return app.server.listeners('request')[0](req,res);
 }catch(e){console.error('Request failed:',e.code||e.name);res.statusCode=503;res.setHeader('Retry-After','2');res.end('Please retry');}
}
