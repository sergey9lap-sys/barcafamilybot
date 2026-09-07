import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('assets/sources',{recursive:true});
for(const [name,url]of [['club','https://www.fcbarcelona.com/en/football/first-team/squad'],['uefa','https://www.uefa.com/uefachampionsleague/clubs/50080/squad/']]){
 try{const r=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw new Error('HTTP '+r.status);const html=await r.text();await writeFile(`assets/sources/${name}.html`,html);const imgs=[...html.matchAll(/<(?:img|source)\b[^>]*>/gi)].map(m=>m[0]);console.log(name,html.length,JSON.stringify(imgs.filter(s=>/player|garcia|kound|cubars|pedri|yamal|portrait/i.test(s)).slice(0,10)));}catch(e){console.log(name,e.message);}
}
