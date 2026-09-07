import {Telegram} from '../src/bot.mjs';
const url=process.env.PUBLIC_URL,secret=process.env.TELEGRAM_WEBHOOK_SECRET;
if(!url?.startsWith('https://')||!secret||!process.env.BOT_TOKEN)throw new Error('Set PUBLIC_URL, TELEGRAM_WEBHOOK_SECRET and BOT_TOKEN.');
const health=await fetch(url+'/healthz');if(!health.ok)throw new Error('Deployment health check failed.');
const tg=new Telegram(process.env.BOT_TOKEN);
await tg.call('setWebhook',{url:url+'/api/telegram',secret_token:secret,max_connections:1,allowed_updates:['message','callback_query'],drop_pending_updates:false},{fast:true});
await tg.call('setChatMenuButton',{menu_button:{type:'web_app',text:'Открыть приложение',web_app:{url}}});
console.log('Webhook and Mini App menu enabled.');
