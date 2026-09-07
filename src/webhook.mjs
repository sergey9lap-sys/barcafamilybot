// Conservative serialized delivery for the private test. No detached background jobs.
// Telegram retries non-200 responses; completed update IDs are retained in PostgreSQL.
export async function processWebhook(db,handlers,update){
 return db.transaction(async tx=>{
   const lock=await tx.query('SELECT pg_try_advisory_xact_lock(8494457592) AS acquired');
   if(!lock[0].acquired)throw new Error('Webhook busy');
   const id=String(update.update_id);
   if((await tx.query("SELECT id FROM bot_jobs WHERE id=$1 AND state='done'",[id])).length)return;
   await handlers.handle(update);
   await tx.query("INSERT INTO bot_jobs(id,chat_id,payload,state,created_at) VALUES($1,$2,'{}','done',$3) ON CONFLICT(id) DO UPDATE SET state='done',payload='{}'",[id,String(update.callback_query?.message?.chat?.id||update.message?.chat?.id||'unknown'),new Date().toISOString()]);
 });
}
