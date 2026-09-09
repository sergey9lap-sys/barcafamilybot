export function votingTime(match,now=Date.now()){
 if(match.state==='closed')return {closed:true,label:'Голосование завершено',deadline:''};
 if(match.state==='draft')return {closed:false,label:'Голосование ещё не открыто',deadline:''};
 if(!match.closes_at)return {closed:false,label:'Голосование открыто · срок пока не задан',deadline:''};
 const end=Date.parse(match.closes_at);
 if(!Number.isFinite(end))return {closed:false,label:'Голосование открыто',deadline:''};
 const remaining=end-now;
 const deadline=new Date(end).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
 if(remaining<=0)return {closed:true,label:'Время голосования истекло',deadline};
 const minutes=Math.ceil(remaining/60000),hours=Math.floor(minutes/60);
 return {closed:false,label:hours?`Осталось ${hours} ч ${minutes%60} мин`:`Осталось ${minutes} мин`,deadline};
}
