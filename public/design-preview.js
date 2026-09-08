// Explicit localhost-only design preview. Never used as a fallback for API failures.
export function designPreview(){
 const names=[['garcia','Жоан Гарсия',1],['kounde','Жюль Кунде',23],['cubarsi','Пау Кубарси',5],['eric','Эрик Гарсия',24],['balde','Алехандро Бальде',3],['rodri','Родри',16],['pedri','Педри',8],['fermin','Фермин Лопес',7],['yamal','Ламин Ямаль',10],['raphinha','Рафинья',11],['gordon','Энтони Гордон',17],['dejong','Френки де Йонг',21],['olmo','Дани Ольмо',20],['gavi','Гави',6],['martin','Жерар Мартин',18],['jesus','Габриэл Жезус',9]];
 let role=sessionStorage.getItem('previewRole')||'voter';const players=names.map(([id,name,number],i)=>({id,name,number,role:i===0?'Вратарь':i<5?'Защитник':i<10?'Полузащитник':'Нападающий',photo_path:'/portraits/'+id+(['rodri','dejong'].includes(id)?'.png':'.jpg'),active:1}));
 const match={id:'preview-match',opponent:'Валенсия',score:'0:5',played_on:'2026-09-06',competition:'Ла Лига',season:'2026/27',state:'open',demo:1,closes_at:new Date(Date.now()+7.5*3600000).toISOString()};let ballot={version:0,submitted:0,scores:{}};
 return async(path,data)=>{await new Promise(r=>setTimeout(r,180));const url=new URL(path,'https://preview.invalid'),p=url.pathname;
 if(p==='/config')return {demo:true,botUsername:'barcafamilyratingbot'};
 if(p==='/me')return {id:'design-preview',name:'Сергей',role,demo:true};
 if(p==='/demo/role'){role=data.role;sessionStorage.setItem('previewRole',role);return {};}
 role=sessionStorage.getItem('previewRole')||role;
 if(p==='/matches')return [match];
 if(p==='/admin/players'&&!data)return players;
 if(p.startsWith('/admin/players/')&&data){Object.assign(players.find(x=>x.id===p.split('/').at(-1)),data);return {};}
 if(p==='/admin/matches')return [match,{...match,id:'draft-preview',opponent:'Жирона',state:'draft'}];
 if(p==='/statistics')return {matches:8,team:{average:4.12,total:32.96},updatedAt:new Date().toISOString(),players:players.map((p,i)=>({...p,average:4.8-i*.13,total:(4.8-i*.13)*(8-i%3),matches:8-i%3,votes:1340-i*37}))};
 if(p==='/leaderboard')return {me:{rank:5,participations:8},items:['Алексей','Мария','Даниил','Артём','Сергей'].map((name,i)=>({name,rank:i+1,participations:12-i,isMe:i===4}))};
 if(p==='/history')return {items:[{match,submitted:false,rated:3,players:16},...['Атлетик','Райо Вальекано','Мальорка'].map((opponent,i)=>({match:{...match,id:'history-'+i,opponent,state:'closed',played_on:'2026-08-'+(28-i*7)},submitted:true,rated:16,players:16}))].filter(x=>!url.searchParams.get('status')||url.searchParams.get('status')==='all'||x.match.state===url.searchParams.get('status'))};
 if(p.endsWith('/votes')){if(data.scores){for(const [k,v]of Object.entries(data.scores))if(v===null)delete ballot.scores[k];else ballot.scores[k]=v;}ballot.version++;if(data.submit)ballot.submitted=1;return structuredClone(ballot);}
 if(p.endsWith('/results'))return {match,team:4.2,participants:1340,provisional:true,ratedPlayers:16,players:players.map((p,i)=>({...p,rating:4.8-i*.12,votes:1320-i*13}))};
 if(p.startsWith('/matches/'))return {match,players,ballot:structuredClone(ballot)};
 throw Object.assign(new Error('Этот экран не входит в демонстрацию.'),{status:404});
 };
}
