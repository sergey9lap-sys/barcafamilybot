import { resolve } from 'node:path';
export function config(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const demo = env.DEMO_MODE === 'true';
  const host = env.HOST || '127.0.0.1';
  if (demo && (production || !['127.0.0.1', 'localhost', '::1'].includes(host))) throw new Error('Demo mode is allowed only on a local development interface.');
  if (production && (!env.DATABASE_URL || !env.BOT_TOKEN || !env.PUBLIC_URL?.startsWith('https://'))) throw new Error('Production requires DATABASE_URL, BOT_TOKEN and HTTPS PUBLIC_URL.');
  return { production, demo, host, port: Number(env.PORT || 3188), databaseUrl: env.DATABASE_URL || '', sqlitePath: resolve(env.SQLITE_PATH || 'data/barca.sqlite'), token: env.BOT_TOKEN || '', publicUrl: (env.PUBLIC_URL || '').replace(/\/$/, ''), botUsername: env.BOT_USERNAME || '', owner: env.OWNER_TELEGRAM_ID || '', poolSize: Math.min(30, Math.max(1, Number(env.DB_POOL_SIZE || 10))) };
}
