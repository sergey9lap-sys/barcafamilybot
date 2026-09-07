import { readFile, mkdir, open, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {createHash} from 'node:crypto';
import {AppError} from './auth.mjs';
import {contentDefaults,richHtml,validateContent,contentButton} from './content.mjs';
import { config } from './config.mjs';
import { openDatabase } from './db.mjs';
import { seed } from './seed.mjs';
import { Store } from './store.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const rating=n=>n==null?'—':Number(n).toFixed(2).replace('.',',');
const button=(text,callback_data)=>({text,callback_data});
export class Telegram {
 constructor(token,transport=fetch){this.token=token;this.transport=transport;this.next=0;this.chats=new Map();}
 async call(method,payload,{form=false,fast=false}={}) {
   for(let attempt=0;attempt<5;attempt++) {
     if(!fast){const chat=String((form?payload.get('chat_id'):payload.chat_id)||'');if(chat){const slot=Math.max(Date.now(),this.chats.get(chat)||0);this.chats.set(chat,slot+1050);await sleep(Math.max(0,slot-Date.now()));}const slot=Math.max(Date.now(),this.next);this.next=slot+42;await sleep(Math.max(0,slot-Date.now()));if(this.chats.size>10000)for(const [id,t]of this.chats)if(t<Date.now()-60000)this.chats.delete(id);}
     let res;try{res=await this.transport(`https://api.telegram.org/bot${this.token}/${method}`,{method:'POST',...(form?{body:payload}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),signal:AbortSignal.timeout(method==='getUpdates'?40000:20000)});}catch{if(attempt===4)throw new Error('Telegram network request failed');await sleep(1000*(attempt+1));continue;}
     const r=await res.json();if(r.ok)return r.result;
     if(r.error_code===429){await sleep((r.parameters?.retry_after||1)*1000+100);continue;}
     if(r.description?.includes('message is not modified'))return null;
     if(r.error_code>=500){await sleep(1000*(attempt+1));continue;}
     const error=new Error('Telegram API request failed');error.telegramCode=r.error_code;error.description=String(r.description||'').slice(0,240);throw error;
   }throw new Error('Telegram retry limit reached');
 }
}
export function acknowledgeCallback(tg,callback) {
 return tg.call('answerCallbackQuery',{callback_query_id:callback.id,cache_time:0},{fast:true}).catch(()=>{});
}
export function botHandlers(store,tg,cfg) {
 const mediaFiles=new Map();
 const labelKeys={'Оценить здесь · 1–5':'btn_vote','Посмотреть результат':'btn_results','Результаты матча':'btn_results','Результаты':'btn_results','Мои оценки':'btn_mine','Все мои оценки':'btn_mine','Рейтинг сезона':'btn_season','Сезон':'btn_season','Пропустить →':'btn_next','← Назад':'btn_back','Отправить оценки':'btn_submit','Изменить оценку':'btn_edit','Изменить мои оценки':'btn_edit','Изменить оценки':'btn_edit','В начало':'btn_home','Обновить':'btn_refresh','Управление матчами':'btn_admin','Открыть Mini App':'btn_app','Открыть приложение':'btn_app'};
 async function screen(chat,messageId,text,keyboard=[],photoPath='/bot-banner.png') {
   const contents=await store.content();
   const reply_markup={inline_keyboard:keyboard.map(row=>row.map(b=>{const key=labelKeys[b.text];if(!key)return b;const styled=contentButton(contents[key],b.callback_data);if(b.web_app){delete styled.callback_data;styled.web_app=b.web_app;}return styled;}))};
   if(!/^\/(?:portraits\/[\w-]+\.(?:jpg|png)|bot-banner(?:-v2)?\.png)$/.test(photoPath))photoPath='/bot-banner.png';
   let asset=mediaFiles.get(photoPath);if(!asset){const bytes=await readFile('public'+photoPath);asset={bytes,key:'media:'+createHash('sha256').update(bytes).digest('hex').slice(0,24)};mediaFiles.set(photoPath,asset);}
   let cached=await store.getState(asset.key);
   const perform=async(caption,markup)=>{
     const method=messageId?'editMessageMedia':'sendPhoto';
     if(cached){return tg.call(method,messageId?{chat_id:chat,message_id:messageId,media:{type:'photo',media:cached,caption,parse_mode:'HTML'},reply_markup:markup}:{chat_id:chat,photo:cached,caption,parse_mode:'HTML',reply_markup:markup});}
     const form=new FormData();form.set('chat_id',String(chat));form.set('photo',new Blob([asset.bytes],{type:photoPath.endsWith('.png')?'image/png':'image/jpeg'}),photoPath.split('/').at(-1));form.set('reply_markup',JSON.stringify(markup));
     if(messageId){form.set('message_id',String(messageId));form.set('media',JSON.stringify({type:'photo',media:'attach://photo',caption,parse_mode:'HTML'}));}else{form.set('caption',caption);form.set('parse_mode','HTML');}
     return tg.call(method,form,{form:true});
   };
   let sent;
   try{sent=await perform(text,reply_markup);}catch(e){
     if(e.telegramCode===400&&/custom.?emoji|emoji.*(not|invalid|allowed)|ENTITY.*INVALID/i.test(e.description||'')&&(text.includes('<tg-emoji')||keyboard.flat().some(b=>b.icon_custom_emoji_id)||reply_markup.inline_keyboard.flat().some(b=>b.icon_custom_emoji_id))){
       const fallback=text.replace(/<tg-emoji[^>]*>([\s\S]*?)<\/tg-emoji>/g,'$1');const keys={inline_keyboard:reply_markup.inline_keyboard.map(row=>row.map(({icon_custom_emoji_id,...b})=>b))};sent=await perform(fallback,keys);await store.setState('custom-emoji-status','unavailable');
     }else throw e;
   }
   const file=sent?.photo?.at(-1)?.file_id;if(file)await store.setState(asset.key,file);return sent;
 }
 function appButton(id){return cfg.publicUrl?[{text:'Открыть приложение',web_app:{url:cfg.publicUrl+'/?match='+encodeURIComponent(id)}}]:[];}
 async function home(chat,user,messageId,id) {
   const list=await store.matches(),m=list.find(x=>x.id===id)||list.find(x=>x.state==='open')||list[0],admin=await store.role(user)!=='voter';
   const c=await store.content();
   if(!m)return screen(chat,messageId,'<b>BARCA FAMILY</b>\n\n'+richHtml(c.no_matches),admin?[[button('Управление матчами','admin')]]:[]);
   const keys=[[button(m.state==='open'?'Оценить здесь · 1–5':'Результаты матча',m.state==='open'?`p|${m.id}|0`:`r|${m.id}`)]];if(appButton(m.id).length)keys.push(appButton(m.id));keys.push([button('Мои оценки',`mine|${m.id}`),button('Рейтинг сезона',`season|${m.season}`)]);if(list.length>1)keys.push([button('🗓 Другие матчи','matches')]);if(admin)keys.push([button('Управление матчами','admin')]);
   return screen(chat,messageId,`<b>${esc(m.opponent)} ${esc(m.score)} Барселона</b>\n${esc(m.competition)} · ${esc(m.played_on)}\n\n${richHtml(c.intro)}${m.demo?'\n\n<i>Тестовое голосование.</i>':''}`,keys);
 }
 async function player(chat,user,messageId,id,index) {
   const d=await store.detail(id,user);if(d.match.state!=='open')return results(chat,user,messageId,id);
   if(index>=d.players.length)return mine(chat,user,messageId,id);
   const p=d.players[Math.max(0,index)],b=d.ballot,score=b.scores[p.id],c=await store.content();
   return screen(chat,messageId,`<b>${esc(p.name.toUpperCase())}</b>\n${esc(p.role)}${p.number?' · № '+p.number:''} · Игрок ${index+1} из ${d.players.length}\n\n⚽ ${esc(d.match.opponent)} ${esc(d.match.score)} Барселона\n\n${richHtml(c.player_hint)}${score?'\n\nТвоя оценка: <b>'+score+'/5</b>':''}`, [
     [1,2,3,4,5].map(n=>button((score===n?'✓ ':'')+n,`v|${id}|${index}|${n}|${b.version}`)),
     [button('← Назад',index?`p|${id}|${index-1}`:`home|${id}`),button('Пропустить →',`p|${id}|${index+1}`)],
     [button('Все мои оценки',`mine|${id}`)],...(appButton(id).length?[appButton(id)]:[])
   ],p.photo_path||'/bot-banner.png');
 }
 async function mine(chat,user,messageId,id){const d=await store.detail(id,user),b=d.ballot,c=await store.content();const lines=d.players.map(p=>`${esc(p.name)}: <b>${b.scores[p.id]||'—'}</b>`);const keys=[];if(d.match.state==='open'){keys.push([button('Изменить оценку',`pick|${id}`)]);if(Object.keys(b.scores).length)keys.push([button(b.submitted?'Посмотреть результат':'Отправить оценки',b.submitted?`r|${id}`:`done|${id}|${b.version}`)]);}else keys.push([button('Результаты',`r|${id}`)]);keys.push([button('В начало',`home|${id}`)]);return screen(chat,messageId,`<b>📝 Твои оценки · ${esc(d.match.opponent)}</b>\n\n${lines.join('\n')}\n\n${b.submitted?'✅ Оценки отправлены.':richHtml(c.summary_hint)}`,keys);}
 async function results(chat,user,messageId,id){const r=await store.results(id,user),c=await store.content();return screen(chat,messageId,`<b>${esc(r.match.opponent)} ${esc(r.match.score)} Барселона</b>\n\n<b>Команда: ${rating(r.team)} / 5</b>\n${r.participants} участников · ${r.provisional?'Предварительно':'Итог'}\n\n${[...r.players].sort((a,b)=>(b.rating??-1)-(a.rating??-1)).map(p=>`${esc(p.name)} · <b>${rating(p.rating)}</b>`).join('\n')}\n\n${richHtml(c.results_hint)}`,[[button('Изменить мои оценки',`pick|${id}`)],[button('Обновить',`r|${id}`),button('Сезон',`season|${r.match.season}`)],[button('В начало',`home|${id}`)]]);}
 async function admin(chat,user,messageId){await store.requireAdmin(user);const matches=await store.matches(true);const keys=[[button('➕ Создать матч','new')],[button('✏️ Тексты и эмодзи','content'),button('🔘 Названия кнопок','contentbuttons')],...matches.slice(0,15).map(m=>[button(`${m.opponent} ${m.score} · ${m.state==='draft'?'Черновик':m.state==='open'?'Открыто':'Закрыто'}`,`am|${m.id}`)]),[button('В начало','home')]];return screen(chat,messageId,'<b>⚙️ Управление Barca Family</b>\n\nСоздай матч, выбери сыгравших и открой голосование.\n\nВ разделе «Тексты и эмодзи» можно менять сообщения бота. Пришли готовый текст с форматированием и эмодзи, проверь его и сохрани.\n\n/whoami — твой ID\n/cancel — отменить ввод\n\nДоступы: /grant ID, /revoke ID, /transfer ID — только для владельца.',keys);}
 async function editMenu(chat,user,messageId,buttons=false){await store.requireAdmin(user);const contents=await store.content();return screen(chat,messageId,buttons?'<b>🔘 Названия кнопок</b>\n\nВыбери кнопку, затем пришли новое название с эмодзи.':'<b>✏️ Тексты и эмодзи</b>\n\nВыбери сообщение для редактирования. Данные матча и имя игрока бот добавляет сам.',[...Object.entries(contents).filter(([k])=>k.startsWith('btn_')===buttons).map(([key,c])=>[button(c.label,`edittext|${key}`)]),[button('⬅️ В админку','admin')]]);}
 async function adminMatch(chat,user,messageId,id){await store.requireAdmin(user);const d=await store.detail(id,user),m=d.match;const keys=[];if(m.state==='draft')keys.push([button('Выбрать игроков',`line|${id}`)],[button('Открыть на 24 часа',`confirm|${id}|open`)]);if(m.state==='open')keys.push([button('Закрыть и сохранить итоги',`confirm|${id}|closed`)]);if(m.state!=='draft')keys.push([button('Результаты',`r|${id}`)]);if(cfg.publicUrl)keys.push(appButton(id));keys.push([button('Все матчи','admin')]);return screen(chat,messageId,`<b>${esc(m.opponent)} ${esc(m.score)} Барселона</b>\n${esc(m.played_on)} · ${esc(m.season)}\n\nВыбрано игроков: ${d.players.length}\nСтатус: ${m.state==='draft'?'Черновик':m.state==='open'?'Открыто':'Закрыто'}${cfg.botUsername&&m.state!=='draft'?'\n\nСсылка для поста:\nhttps://t.me/'+esc(cfg.botUsername)+'?start=m_'+m.id:''}`,keys);}
 async function lineup(chat,user,messageId,id){await store.requireAdmin(user);const d=await store.detail(id,user);if(d.match.state!=='draft')return adminMatch(chat,user,messageId,id);const ps=await store.players(),selected=new Set(d.players.map(p=>p.id));const keys=ps.map(p=>[button((selected.has(p.id)?'✓ ':'')+p.name,`toggle|${id}|${p.id}`)]);keys.push([button('Готово · '+selected.size+' игроков',`am|${id}`)]);return screen(chat,messageId,'<b>Кто вышел на поле?</b>\n\nОтметь стартовый состав и вышедших на замену. Нажатие добавляет или убирает игрока.\n\nВыбрано: '+selected.size,keys);}
 async function handle(update,{acknowledged=false}={}) {
   const callback=update.callback_query,msg=callback?.message||update.message,user=String(callback?.from?.id||msg?.from?.id||''),chat=msg?.chat?.id;
   if(!chat||msg.chat.type!=='private'||!user)return;
   if(callback){if(!acknowledged)void acknowledgeCallback(tg,callback);const [action,id,arg,score,version]=(callback.data||'').split('|');const mid=msg.message_id;
     try{
       const loading=({home:'Открываем главное меню…',p:'Открываем карточку игрока…',v:'Сохраняем оценку…',pick:'Открываем выбор игрока…',mine:'Загружаем твои оценки…',done:'Отправляем оценки…',r:'Загружаем результаты…',season:'Загружаем рейтинг сезона…',admin:'Открываем управление…',content:'Открываем редактор…',contentbuttons:'Открываем названия кнопок…',matches:'Загружаем матчи…',line:'Открываем состав…'})[action];
       if(loading)await tg.call('editMessageCaption',{chat_id:chat,message_id:mid,caption:'⏳ '+loading,reply_markup:{inline_keyboard:[]}}).catch(()=>{});
       if(action==='home')return home(chat,user,mid,id);
       if(action==='p')return player(chat,user,mid,id,Math.max(0,Number(arg)||0));
       if(action==='v'){const d=await store.detail(id,user),p=d.players[Number(arg)];if(!p)throw new Error('Игрок не найден.');const b=d.ballot;if(b.version!==Number(version))return player(chat,user,mid,id,b.scores[p.id]===Number(score)?Number(arg)+1:Number(arg));await store.save(id,user,{scores:{[p.id]:Number(score)},version:Number(version)});return player(chat,user,mid,id,Number(arg)+1);}
       if(action==='mine')return mine(chat,user,mid,id);
       if(action==='pick'){const d=await store.detail(id,user);if(d.match.state!=='open')return results(chat,user,mid,id);return screen(chat,mid,'<b>Чью оценку изменить?</b>',[...d.players.map((p,i)=>[button(`${p.name} · ${d.ballot.scores[p.id]||'—'}`,`p|${id}|${i}`)]),[button('Мои оценки',`mine|${id}`)]]);}
       if(action==='done'){await store.save(id,user,{version:Number(arg),submit:true});return results(chat,user,mid,id);}
       if(action==='r')return results(chat,user,mid,id);
       if(action==='season'){const r=await store.season(id),c=await store.content();return screen(chat,mid,`<b>Сезон ${esc(id)} · сумма баллов</b>\n\n${r.matches?`Команда: <b>${rating(r.team)} баллов</b> · ${r.matches} матчей\n\n${r.players.slice(0,20).map(p=>`${esc(p.name)} · ${rating(p.rating)} (${p.matches})`).join('\n')}`:'После первого закрытого настоящего голосования здесь появится сезонный рейтинг. Тестовые матчи не учитываются.'}\n\n${richHtml(c.season_hint)}`,[[button('В начало','home')]]);}
       if(action==='matches'){const ms=await store.matches();return screen(chat,mid,'<b>Выбери матч</b>',ms.slice(0,30).map(m=>[button(`${m.opponent} ${m.score} · ${m.played_on}`,`home|${m.id}`)]));}
       await store.requireAdmin(user);
       if(action==='admin')return admin(chat,user,mid);
       if(action==='content'||action==='contentbuttons')return editMenu(chat,user,mid,action==='contentbuttons');
       if(action==='edittext'){
         const c=(await store.content())[id];if(!c)throw new AppError(400,'Текст не найден.');await store.setState('editor:'+user,JSON.stringify({key:id,stage:'input'}));
         return screen(chat,mid,`<b>${esc(c.label)}</b>\n\n${richHtml(c)}\n\n<b>Пришли новый ${id.startsWith('btn_')?'текст кнопки (до 48 символов)':'текст (до 320 символов)'}.</b>\nОбычные и премиум-эмодзи сохранятся вместе с сообщением. Для премиум-эмодзи у владельца бота в BotFather должен быть Telegram Premium.`,[[button('Отмена','editorcancel')]]);
       }
       if(action==='editorcancel'){await store.setState('editor:'+user,'');return admin(chat,user,mid);}
       if(action==='publish'){
         const raw=await store.getState('editor:'+user),draft=raw?JSON.parse(raw):null;if(!draft||draft.key!==id||draft.stage!=='preview')throw new AppError(409,'Предпросмотр устарел. Открой редактор заново.');
         await store.setContent(user,id,draft.text,draft.entities);await store.setState('editor:'+user,'');return screen(chat,mid,'✅ Изменения сохранены. Новые сообщения и карточки будут использовать этот текст.\n\nУже отправленные сообщения обновятся при следующем действии пользователя.',[[button('✏️ Ещё тексты','content'),button('⚙️ В админку','admin')]]);
       }
       if(action==='am')return adminMatch(chat,user,mid,id);
       if(action==='line')return lineup(chat,user,mid,id);
       if(action==='toggle'){const selected=(await store.lineup(id)).map(p=>p.id),ids=selected.includes(arg)?selected.filter(x=>x!==arg):[...selected,arg];if(!ids.length)return screen(chat,mid,'Нужно оставить хотя бы одного игрока.',[[button('Вернуться к составу',`line|${id}`)]]);await store.setLineup(user,id,ids);return lineup(chat,user,mid,id);}
       if(action==='confirm')return screen(chat,mid,arg==='open'?'<b>Открыть голосование на 24 часа?</b>\n\nСостав будет зафиксирован.':'<b>Закрыть голосование?</b>\n\nОценки больше нельзя будет изменить. Итоги настоящего матча попадут в сезон.',[[button('Подтвердить',`set|${id}|${arg}`)],[button('Назад',`am|${id}`)]]);
       if(action==='set'){await store.transition(user,id,arg);return adminMatch(chat,user,mid,id);}
       if(action==='new'){await store.setState('wizard:'+user,JSON.stringify({step:'opponent'}));return screen(chat,mid,'<b>Новый матч</b>\n\nНапиши название соперника одним сообщением.\n/cancel — отменить.',[[button('Отмена','cancel')]]);}
       if(action==='cancel'){await store.setState('wizard:'+user,'');return admin(chat,user,mid);}
       if(action==='transfer'){await store.grant(user,id,'owner');return screen(chat,mid,'Владение передано указанному Telegram ID. Ты остаёшься администратором.',[[button('Управление','admin')]]);}
     }catch(e){if(e.telegramCode)throw e;const safe=e.status?e.message:'Не удалось выполнить действие. Вернись в меню и попробуй ещё раз.';return screen(chat,mid,esc(safe),[[button('В начало','home')]]);}return;
   }
   const text=msg.text||'';
   if(/^\/whoami(?:@\w+)?$/.test(text))return tg.call('sendMessage',{chat_id:chat,text:`Твой Telegram ID: ${user}\n\nПередай его владельцу для выдачи доступа. Пароли и токен бота не нужны.`});
   if(text.startsWith('/start'))return home(chat,user,null,text.split(' ')[1]?.replace(/^m_/,''));
   if(text==='/admin') {try{return await admin(chat,user);}catch(e){if(e.status===403)return tg.call('sendMessage',{chat_id:chat,text:e.message});throw e;}}
   if(text==='/cancel'){await store.setState('wizard:'+user,'');await store.setState('editor:'+user,'');return home(chat,user);}
   const role=await store.role(user);
   if(role!=='voter'){
     const editorRaw=await store.getState('editor:'+user);
     if(editorRaw&&!text.startsWith('/')){
       const editor=JSON.parse(editorRaw);try{
         const draft=validateContent(editor.key,text,msg.entities||[]);await store.setState('editor:'+user,JSON.stringify({key:editor.key,stage:'preview',...draft}));
         const custom=draft.entities.some(e=>e.type==='custom_emoji');const keys=editor.key.startsWith('btn_')?[[contentButton(draft,'previewnoop')]]:[];
         keys.push([button('✅ Сохранить',`publish|${editor.key}`),button('❌ Отмена','editorcancel')]);
         return screen(chat,null,`<b>Предпросмотр</b>\n\n${richHtml(draft)}\n\n${custom?'Если вместо премиум-эмодзи показан обычный, проверь Premium у владельца бота в BotFather.\n\n':''}Сохранить этот вариант?`,keys);
       }catch(e){if(e.telegramCode)throw e;return screen(chat,null,esc(e.status?e.message:'Не удалось сохранить текст. Пришли его ещё раз.'),[[button('Отмена','editorcancel')]]);}
     }
     const access=text.match(/^\/(grant|revoke|transfer) (\d{1,16})$/);
     if(access){try{if(access[1]==='transfer'){if(role!=='owner')throw new Error('Только владелец может передавать права.');return screen(chat,null,`Передать владение пользователю <b>${access[2]}</b>?\n\nПроверь ID. Ты станешь администратором.`,[[button('Передать владение',`transfer|${access[2]}`)],[button('Отмена','admin')]]);}await store.grant(user,access[2],access[1]==='grant'?'admin':'voter');return screen(chat,null,'Права обновлены.',[[button('Управление','admin')]]);}catch(e){return screen(chat,null,esc(e.status?e.message:'Действие доступно только владельцу.'),[[button('Назад','admin')]]);}}
     const raw=await store.getState('wizard:'+user);
     if(raw){let w;try{w=JSON.parse(raw);}catch{w=null;}if(w){
       if(w.step==='opponent'){if(!text.trim()||text.length>80)return screen(chat,null,'Название соперника должно содержать от 1 до 80 символов.');w={...w,opponent:text.trim(),step:'score'};await store.setState('wizard:'+user,JSON.stringify(w));return screen(chat,null,'<b>Какой счёт?</b>\n\nСначала голы соперника, затем Барселоны. Например: 0:5');}
       if(w.step==='score'){if(!/^\d{1,2}:\d{1,2}$/.test(text))return screen(chat,null,'Напиши счёт в формате 0:5.');w={...w,score:text,step:'date'};await store.setState('wizard:'+user,JSON.stringify(w));return screen(chat,null,'<b>Дата матча?</b>\n\nНапиши в формате 2026-09-06.');}
       if(w.step==='date'){if(!/^\d{4}-\d{2}-\d{2}$/.test(text)||Number.isNaN(Date.parse(text)))return screen(chat,null,'Напиши дату в формате 2026-09-06.');w={...w,played_on:text,step:'season'};await store.setState('wizard:'+user,JSON.stringify(w));return screen(chat,null,'<b>Какой сезон?</b>\n\nНапример: 2026/27');}
       if(w.step==='season'){if(!/^\d{4}\/\d{2}$/.test(text))return screen(chat,null,'Напиши сезон в формате 2026/27.');w={...w,season:text,step:'competition'};await store.setState('wizard:'+user,JSON.stringify(w));return screen(chat,null,'<b>Какой турнир?</b>\n\nНапиши название, например: Ла Лига');}
       if(w.step==='competition'){try{const m=await store.create(user,{...w,competition:text});await store.setState('wizard:'+user,'');return lineup(chat,user,null,m.id);}catch(e){return screen(chat,null,esc(e.status?e.message:'Не удалось создать матч. Повтори название турнира.'));}}
     }}
   }
   return home(chat,user);
 }
 return {handle,home,player,results};
}
async function run(){const cfg=config();if(!cfg.token)throw new Error('BOT_TOKEN is not configured.');
 await mkdir('data',{recursive:true});const lockPath=resolve('data/bot.lock');
 try{const old=JSON.parse(await readFile(lockPath,'utf8'));let alive=true;try{process.kill(old.pid,0);}catch{alive=false;}if(alive)throw new Error('A bot worker is already running.');await unlink(lockPath);}catch(e){if(e.code!=='ENOENT')throw e;}
 const lock=await open(lockPath,'wx');await lock.writeFile(JSON.stringify({pid:process.pid}));await lock.close();
 const db=await openDatabase(cfg);await seed(db,cfg);const store=new Store(db),tg=new Telegram(cfg.token),me=await tg.call('getMe',{}, {fast:true});cfg.botUsername=me.username;const handlers=botHandlers(store,tg,cfg);
 const webhook=await tg.call('getWebhookInfo',{}, {fast:true});if(webhook.url)throw new Error('An existing webhook is configured. Stop its deployment before using this local poller.');
 console.log(`Bot ready: @${me.username}. Replies only to incoming private chats.`);
 await db.query("UPDATE bot_jobs SET state='pending' WHERE state='working'");
 let stop=false,offset=Number(await store.getState('update-offset')||0);const activeChats=new Set();
 process.on('SIGTERM',()=>stop=true);process.on('SIGINT',()=>stop=true);
 const worker=async()=>{while(!stop){const jobs=await db.query("SELECT * FROM bot_jobs WHERE state='pending' ORDER BY created_at,id LIMIT 100");const job=jobs.find(j=>!activeChats.has(j.chat_id));if(!job){await sleep(150);continue;}activeChats.add(job.chat_id);await db.query("UPDATE bot_jobs SET state='working' WHERE id=$1",[job.id]);try{await handlers.handle(JSON.parse(job.payload),{acknowledged:true});await db.query("UPDATE bot_jobs SET state='done',payload='{}' WHERE id=$1",[job.id]);}catch(e){const retry=job.attempts<4&&e.telegramCode!==403;await db.query('UPDATE bot_jobs SET state=$2,attempts=attempts+1 WHERE id=$1',[job.id,retry?'pending':'failed']);console.error('Bot job failed:',e.telegramCode||e.code||e.name,e.description||'');await sleep(1000);}finally{activeChats.delete(job.chat_id);}}};
 const workers=Array.from({length:12},()=>worker());
 try{while(!stop){try{const updates=await tg.call('getUpdates',{offset,timeout:25,allowed_updates:['message','callback_query']},{fast:true});await store.setState('heartbeat',new Date().toISOString());if(!updates.length)continue;for(const u of updates){if(u.callback_query?.message?.chat?.type==='private')void acknowledgeCallback(tg,u.callback_query);}await db.transaction(async tx=>{for(const u of updates){const chat=u.callback_query?.message?.chat?.id||u.message?.chat?.id||'unknown';await tx.query("INSERT INTO bot_jobs(id,chat_id,payload,state,created_at) VALUES($1,$2,$3,'pending',$4) ON CONFLICT(id) DO NOTHING",[String(u.update_id),String(chat),JSON.stringify(u),new Date().toISOString()]);}offset=updates.at(-1).update_id+1;await tx.query("INSERT INTO bot_state(key,value) VALUES('update-offset',$1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",[String(offset)]);});}catch(e){console.error('Bot polling failed:',e.telegramCode||e.code||e.name);await sleep(3000);}}}finally{stop=true;await Promise.allSettled(workers);await db.close();await unlink(lockPath).catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)run().catch(e=>{console.error(e.message.includes('http')?'Bot startup failed':e.message);process.exitCode=1;});
