import {readFile,mkdir,writeFile} from 'node:fs/promises';
const h=await readFile('assets/sources/club.html','utf8');
const map={1:['garcia','Жоан Гарсия'],2:['cancelo','Жоау Канселу'],3:['balde','Алехандро Бальде'],4:['farinas','Бриан Фариньяс'],5:['cubarsi','Пау Кубарси'],6:['gavi','Гави'],7:['fermin','Фермин Лопес'],8:['pedri','Педри'],9:['jesus','Габриэл Жезус'],10:['yamal','Ламин Ямаль'],11:['raphinha','Рафинья'],12:['espart','Хави Эспарт'],13:['szczesny','Войцех Щенсны'],14:['adeyemi','Карим Адейеми'],15:['christensen','Андреас Кристенсен'],16:['rodri','Родри'],17:['gordon','Энтони Гордон'],18:['martin','Жерар Мартин'],19:['bardghji','Руни Бардагжи'],20:['olmo','Дани Ольмо'],21:['dejong','Френки де Йонг'],22:['bernal','Марк Берналь'],23:['kounde','Жюль Кунде'],24:['eric','Эрик Гарсия'],25:['livakovic','Доминик Ливакович'],27:['bisiwu','Джесси Бисиву'],29:['hamza','Хамза Абделькарим']};
const records=[];
for(const m of h.matchAll(/<a\b[^>]*class="team-person js-focus-container"[^>]*>([\s\S]*?)<\/a>/g)){
 const block=m[0],number=Number(block.match(/team-person__number[^>]*>(\d+)/)?.[1]);if(!map[number])continue;
 const source=block.match(/<img class="team-person__image"[^>]*data-image-src="([^"]+)"/)?.[1]?.replaceAll('&amp;','&');
 const role=block.match(/team-person__position-meta">([^<]+)/)?.[1];
 const [id,name]=map[number],ext=new URL(source).pathname.endsWith('.png')?'png':'jpg';
 records.push({id,name,number,role:({Goalkeeper:'Вратарь',Defender:'Защитник',Midfielder:'Полузащитник',Forward:'Нападающий'})[role],photo_path:`/portraits/${id}.${ext}`,photo_source:source,profile_source:block.match(/href="([^"]+)"/)?.[1],checked_on:'2026-09-07'});
}
if(records.length!==27||new Set(records.map(p=>p.id)).size!==27)throw new Error('Source roster mismatch: '+records.length);
await mkdir('public/portraits',{recursive:true});
let cursor=0;await Promise.all(Array.from({length:4},async()=>{while(cursor<records.length){const p=records[cursor++];const response=await fetch(p.photo_source,{signal:AbortSignal.timeout(25000)});if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw new Error('Portrait download failed: '+p.id);const data=Buffer.from(await response.arrayBuffer());if(data.length<3000)throw new Error('Empty portrait '+p.id);await writeFile('public'+p.photo_path,data);console.log(p.id,data.length);}}));
await writeFile('assets/squad-2026-09-07.json',JSON.stringify({checked_on:'2026-09-07',source:'https://www.fcbarcelona.com/en/football/first-team/squad',crosscheck:'https://www.uefa.com/uefachampionsleague/clubs/50080/squad/',players:records},null,2));
const homepage=await fetch('https://www.fcbarcelona.com/en/').then(r=>r.text());await writeFile('assets/sources/home.html',homepage);const links=[...homepage.matchAll(/href="([^"]+)"[^>]*>[\s\S]{0,400}?High five/g)].map(m=>m[1]);console.log('report links',links);
