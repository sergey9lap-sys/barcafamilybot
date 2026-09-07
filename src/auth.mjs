import { createHmac, timingSafeEqual } from 'node:crypto';
export class AppError extends Error { constructor(status, message) { super(message); this.status = status; } }
export function telegramIdentity(raw, token, now = Math.floor(Date.now() / 1000)) {
  if (!raw || !token || raw.length > 16000) throw new AppError(401, 'Открой приложение через Telegram-бота.');
  const params = new URLSearchParams(raw);
  const seen = new Set();
  for (const [key] of params) { if (seen.has(key)) throw new AppError(401, 'Некорректная подпись Telegram.'); seen.add(key); }
  const hash = params.get('hash') || '';
  if (!/^[a-f0-9]{64}$/i.test(hash)) throw new AppError(401, 'Некорректная подпись Telegram.');
  params.delete('hash');
  const check = [...params].sort(([a], [b]) => a.localeCompare(b, 'en')).map(([k,v]) => `${k}=${v}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const digest = createHmac('sha256', secret).update(check).digest();
  if (!timingSafeEqual(digest, Buffer.from(hash, 'hex'))) throw new AppError(401, 'Не удалось подтвердить вход через Telegram.');
  const date = Number(params.get('auth_date'));
  if (!Number.isInteger(date) || date > now + 30 || now - date > 86400) throw new AppError(401, 'Сессия истекла. Закрой приложение и открой его снова из бота.');
  let user; try { user = JSON.parse(params.get('user')); } catch { throw new AppError(401, 'Некорректные данные пользователя.'); }
  if (!Number.isSafeInteger(user?.id) || user.id <= 0) throw new AppError(401, 'Не удалось определить Telegram ID.');
  return { id: String(user.id), name: String(user.first_name || 'Болельщик').slice(0, 100) };
}
