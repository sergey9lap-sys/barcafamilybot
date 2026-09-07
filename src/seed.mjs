import squad from '../assets/squad-2026-09-07.json' with {type:'json'};
// Club roster verified on 2026-09-07. Demo ballot is not a certified match sheet.
export const demoLineup=['garcia','kounde','cubarsi','eric','balde','rodri','pedri','fermin','yamal','raphinha','gordon','dejong','olmo','gavi','martin','jesus'];
export const roster=[...demoLineup.map(id=>squad.players.find(p=>p.id===id)),...squad.players.filter(p=>!demoLineup.includes(p.id))].map(p=>[p.id,p.name,p.role,p.number]);
export async function seed(db,cfg) {
  await db.transaction(async tx => {
    for(const p of roster) await tx.query('INSERT INTO players(id,name,role,number) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',p);
    for(const p of squad.players)await tx.query('INSERT INTO player_profiles(player_id,photo_path,photo_source,checked_on,active) VALUES($1,$2,$3,$4,1) ON CONFLICT(player_id) DO NOTHING',[p.id,p.photo_path,p.photo_source,p.checked_on]);
    if(cfg.owner) {
      if(!/^\d{1,16}$/.test(cfg.owner)) throw new Error('OWNER_TELEGRAM_ID must be numeric');
      const existing = await tx.query("SELECT user_id FROM admins WHERE role='owner'");
      if(!existing.length) await tx.query("INSERT INTO admins(user_id,role) VALUES($1,'owner') ON CONFLICT(user_id) DO UPDATE SET role='owner'",[cfg.owner]);
    }
    if(cfg.demo) {
      const existingDemo=(await tx.query("SELECT id FROM matches WHERE id='demo-valencia'")).length;
      await tx.query("INSERT INTO matches(id,opponent,score,played_on,season,competition,state,closes_at,demo) VALUES('demo-valencia','Валенсия','0:5','2026-09-06','2026/27','Ла Лига','open',NULL,1) ON CONFLICT(id) DO NOTHING");
      if(!existingDemo)for(const [i,p] of roster.slice(0,16).entries()) await tx.query("INSERT INTO match_players(match_id,player_id,position) VALUES('demo-valencia',$1,$2) ON CONFLICT(match_id,player_id) DO NOTHING",[p[0],i]);
    }
  });
}
