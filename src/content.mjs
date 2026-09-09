import {AppError} from './auth.mjs';
export const contentDefaults={
 intro:{label:'Приветствие',text:'⚽ Оцени игроков «Барселоны» после матча.\n\nВыбирай оценки от 1 до 5. В конце покажем средние оценки игроков и команды.',entities:[]},
 player_hint:{label:'Подсказка под игроком',text:'⭐ Выбери оценку от 1 до 5.\n1 — плохо · 3 — нормально · 5 — отлично',entities:[]},
 summary_hint:{label:'Перед отправкой оценок',text:'Проверь свои оценки и нажми «Отправить». До закрытия голосования их можно изменить.',entities:[]},
 results_hint:{label:'Под результатами матча',text:'📊 Это средние оценки всех проголосовавших. Пока голосование открыто, результат может меняться.',entities:[]},
 season_hint:{label:'Под рейтингом сезона',text:'📅 В сезонном рейтинге учитываются только завершённые голосования. Рейтинг — среднее оценок за матчи: каждый матч имеет одинаковый вес.',entities:[]},
 no_matches:{label:'Нет открытых матчей',text:'⚽ Сейчас нет голосования. После следующего матча здесь появятся игроки, которым можно поставить оценку.',entities:[]},
 btn_vote:{label:'Кнопка: оценить',text:'⭐ Оценить игроков',entities:[]},btn_app:{label:'Кнопка: мини-приложение',text:'📱 Открыть приложение',entities:[]},btn_mine:{label:'Кнопка: мои оценки',text:'📝 Мои оценки',entities:[]},btn_season:{label:'Кнопка: сезон',text:'🏆 Рейтинг сезона',entities:[]},btn_next:{label:'Кнопка: пропустить',text:'Пропустить ➡️',entities:[]},btn_back:{label:'Кнопка: назад',text:'⬅️ Назад',entities:[]},btn_submit:{label:'Кнопка: отправить',text:'✅ Отправить оценки',entities:[]},btn_edit:{label:'Кнопка: изменить',text:'✏️ Изменить оценки',entities:[]},btn_results:{label:'Кнопка: результаты',text:'📊 Результаты матча',entities:[]},btn_home:{label:'Кнопка: начало',text:'🏠 В начало',entities:[]},btn_refresh:{label:'Кнопка: обновить',text:'🔄 Обновить',entities:[]},btn_admin:{label:'Кнопка: управление',text:'⚙️ Управление',entities:[]}
};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types=new Set(['bold','italic','underline','strikethrough','spoiler','code','pre','blockquote','text_link','custom_emoji']);
export function validateContent(key,text,entities=[]){
 if(!contentDefaults[key]||typeof text!=='string'||!text.trim()||text.length>(key.startsWith('btn_')?48:320)||!Array.isArray(entities)||entities.length>40)throw new AppError(400,'Проверь текст: до 320 символов для сообщения и до 48 для кнопки.');
 const valid=entities.filter(e=>types.has(e.type)).map(e=>{if(!Number.isInteger(e.offset)||!Number.isInteger(e.length)||e.offset<0||e.length<=0||e.offset+e.length>text.length)throw new AppError(400,'Некорректное форматирование текста.');const out={type:e.type,offset:e.offset,length:e.length};if(e.type==='custom_emoji'){if(!/^\d{1,24}$/.test(e.custom_emoji_id||''))throw new AppError(400,'Некорректный эмодзи.');out.custom_emoji_id=e.custom_emoji_id;}if(e.type==='text_link'){if(!/^https:\/\//i.test(e.url||'')||e.url.length>1000)throw new AppError(400,'В тексте разрешены ссылки HTTPS.');out.url=e.url;}return out;}).sort((a,b)=>a.offset-b.offset||b.length-a.length);
 for(let i=0;i<valid.length;i++)for(let j=i+1;j<valid.length;j++){const a=valid[i],b=valid[j];if(a.offset<b.offset&&b.offset<a.offset+a.length&&b.offset+b.length>a.offset+a.length)throw new AppError(400,'Форматирование пересекается. Пришли текст заново.');}
 if(key.startsWith('btn_')&&valid.some(e=>e.type!=='custom_emoji'))throw new AppError(400,'В кнопке можно менять текст и эмодзи. Жирное начертание и ссылки в кнопках не поддерживаются.');
 return {text,entities:valid};
}
export function richHtml({text,entities=[]},custom=true){
 const tags={bold:['<b>','</b>'],italic:['<i>','</i>'],underline:['<u>','</u>'],strikethrough:['<s>','</s>'],spoiler:['<tg-spoiler>','</tg-spoiler>'],code:['<code>','</code>'],pre:['<pre>','</pre>'],blockquote:['<blockquote>','</blockquote>']};
 const events=new Map();let serial=0;
 for(const e of entities){const tag=e.type==='custom_emoji'?(custom?[`<tg-emoji emoji-id="${e.custom_emoji_id}">`,'</tg-emoji>']:null):e.type==='text_link'?[`<a href="${esc(e.url)}">`,'</a>']:tags[e.type];if(!tag)continue;const n=serial++;for(const [pos,open,value]of[[e.offset,true,tag[0]],[e.offset+e.length,false,tag[1]]]){if(!events.has(pos))events.set(pos,[]);events.get(pos).push({open,value,length:e.length,n});}}
 let out='',last=0;for(const pos of [...events.keys()].sort((a,b)=>a-b)){out+=esc(text.slice(last,pos));out+=events.get(pos).sort((a,b)=>Number(a.open)-Number(b.open)||(a.open?b.length-a.length||a.n-b.n:a.length-b.length||b.n-a.n)).map(e=>e.value).join('');last=pos;}return out+esc(text.slice(last));
}
export function contentButton(content,callback_data){const e=content.entities?.find(e=>e.type==='custom_emoji');const text=e?(content.text.slice(0,e.offset)+content.text.slice(e.offset+e.length)).trim():content.text;return {text:text||content.text,callback_data,...(e?{icon_custom_emoji_id:e.custom_emoji_id}:{})};}
