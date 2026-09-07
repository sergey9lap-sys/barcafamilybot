export function userMessage(error){
 const message=error?.message;
 return typeof message==='string'&&/[А-Яа-яЁё]/.test(message)&&!/(?:SyntaxError|TypeError|JSON|Unexpected|<html|stack)/i.test(message)?message:'Не удалось связаться с сервисом. Проверь интернет и попробуй ещё раз.';
}
export async function readApiResponse(response){
 let data;try{data=await response.json();}catch{throw Object.assign(new Error('Сервис временно недоступен. Попробуй ещё раз чуть позже.'),{status:response.status});}
 if(!response.ok)throw Object.assign(new Error(response.status>=500?'Сервис временно недоступен. Попробуй ещё раз чуть позже.':userMessage({message:data?.error})),{status:response.status});
 return data;
}
