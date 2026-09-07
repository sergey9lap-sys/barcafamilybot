export class VoteQueue {
  constructor({send,onSaved,onStatus,onError}){Object.assign(this,{send,onSaved,onStatus,onError});this.pending=new Map();this.running=null;this.failed=false;}
  put(player,score){this.pending.set(player,score);this.onStatus();if(!this.failed)this.flush();}
  flush(){
    if(this.running)return this.running;
    if(this.failed||!this.pending.size)return Promise.resolve();
    this.running=(async()=>{
      while(this.pending.size&&!this.failed){
        const batch=new Map(this.pending);this.pending.clear();
        try{const ballot=await this.send(Object.fromEntries(batch));this.onSaved(ballot);}
        catch(error){this.pending=new Map([...batch,...this.pending]);this.failed=true;this.onError(error);}
        this.onStatus();
      }
    })().finally(()=>{this.running=null;this.onStatus();});
    this.onStatus();return this.running;
  }
  retry(){this.failed=false;return this.flush();}
  discard(){if(this.running)throw new Error('Save is still running');this.pending.clear();this.failed=false;this.onStatus();}
}
