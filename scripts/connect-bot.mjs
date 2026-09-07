import {readFile,writeFile} from 'node:fs/promises';
import {config} from '../src/config.mjs';
import {Telegram} from '../src/bot.mjs';
const cfg=config(),tg=new Telegram(cfg.token);
try{
 const me=await tg.call('getMe',{}, {fast:true});
 await tg.call('setMyCommands',{commands:[{command:'start',description:'Матч и голосование'},{command:'whoami',description:'Узнать свой Telegram ID'},{command:'admin',description:'Управление для администраторов'},{command:'cancel',description:'Отменить ввод'}]});
 await tg.call('setChatMenuButton',{menu_button:cfg.publicUrl?{type:'web_app',text:'Открыть приложение',web_app:{url:cfg.publicUrl}}:{type:'commands'}});
 let env=await readFile('.env','utf8');env=env.replace(/^BOT_USERNAME=.*$/m,'BOT_USERNAME='+me.username);await writeFile('.env',env);
 console.log(JSON.stringify({connected:true,username:me.username,name:me.first_name}));
}catch(e){console.log(JSON.stringify({connected:false,code:e.telegramCode||e.code||e.name,message:'Could not connect to Telegram. No secret logged.'}));process.exitCode=1;}
