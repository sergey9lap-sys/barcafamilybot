import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const schema = `
CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, number INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS player_profiles (player_id TEXT PRIMARY KEY REFERENCES players(id), photo_path TEXT, photo_source TEXT, checked_on TEXT, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS bot_content (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS matches (id TEXT PRIMARY KEY, opponent TEXT NOT NULL, score TEXT NOT NULL, played_on TEXT NOT NULL, season TEXT NOT NULL, competition TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('draft','open','closed')), closes_at TEXT, demo INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS match_players (match_id TEXT NOT NULL REFERENCES matches(id), player_id TEXT NOT NULL REFERENCES players(id), position INTEGER NOT NULL, PRIMARY KEY(match_id,player_id));
CREATE TABLE IF NOT EXISTS ballots (match_id TEXT NOT NULL REFERENCES matches(id), user_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0, submitted INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, PRIMARY KEY(match_id,user_id));
CREATE TABLE IF NOT EXISTS votes (match_id TEXT NOT NULL, user_id TEXT NOT NULL, player_id TEXT NOT NULL, score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5), PRIMARY KEY(match_id,user_id,player_id), FOREIGN KEY(match_id,user_id) REFERENCES ballots(match_id,user_id), FOREIGN KEY(match_id,player_id) REFERENCES match_players(match_id,player_id));
CREATE INDEX IF NOT EXISTS votes_aggregate ON votes(match_id,player_id);
CREATE INDEX IF NOT EXISTS matches_season ON matches(season,state);
CREATE TABLE IF NOT EXISTS admins (user_id TEXT PRIMARY KEY, role TEXT NOT NULL CHECK(role IN ('owner','admin')));
CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL, match_id TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS bot_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS bot_jobs (id TEXT PRIMARY KEY, chat_id TEXT NOT NULL, payload TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS bot_jobs_pending ON bot_jobs(state,created_at);
`;
export async function openDatabase(cfg) {
  if (cfg.databaseUrl) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: cfg.databaseUrl, max: cfg.poolSize, connectionTimeoutMillis: 15000, idleTimeoutMillis: 30000, statement_timeout: 10000 });
    const query = async (sql, args = []) => (await pool.query(sql, args)).rows;
    if(!cfg.skipSchema) await pool.query(schema);
    return { pg: true, query, close: () => pool.end(), transaction: async fn => { const c = await pool.connect(); try { await c.query('BEGIN'); const r = await fn({ query: async (sql, args=[]) => (await c.query(sql,args)).rows, pg: true }); await c.query('COMMIT'); return r; } catch(e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); } } };
  }
  if (cfg.sqlitePath !== ':memory:') mkdirSync(dirname(cfg.sqlitePath), { recursive: true });
  const db = new DatabaseSync(cfg.sqlitePath);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  db.exec(schema);
  const query = async (sql,args=[]) => { const ordered=[]; const q=sql.replace(/\$(\d+)/g,(_,i)=>{ ordered.push(args[Number(i)-1]); return '?'; }); return db.prepare(q).all(...ordered); };
  let chain = Promise.resolve();
  const queued = fn => { const result=chain.then(fn); chain=result.catch(()=>{});return result; };
  return { pg: false, query: (sql,args=[])=>queued(()=>query(sql,args)), close: async () => {await chain;db.close();}, transaction: fn => queued(async()=>{ db.exec('BEGIN IMMEDIATE'); try { const r=await fn({query,pg:false}); db.exec('COMMIT'); return r; } catch(e) { db.exec('ROLLBACK'); throw e; } }) };
}

