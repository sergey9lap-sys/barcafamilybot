# Первый тест на Vercel

1. Import Git Repository → sergey9lap-sys/barcafamilybot, main. Framework: Other. Root Directory: корень репозитория. Node.js: 24.x. Остальные настройки берутся из vercel.json.
2. Environment Variables (Production):
   - BOT_TOKEN — из локального .env.
   - DATABASE_URL — Supabase Transaction pooler URI с паролем, из .env.
   - PUBLIC_URL — постоянный адрес проекта https://имя-проекта.vercel.app (без слеша в конце).
   - BOT_USERNAME — barcafamilyratingbot.
   - TELEGRAM_WEBHOOK_SECRET — случайная строка, минимум 32 символа из букв и цифр; тот же секрет нужен при включении webhook.
   - ALLOW_TEST_MATCHES — true для демонстрации. Это допускает тестовые матчи, но не отключает проверку Telegram и не даёт публичных прав администратора.
3. Deploy. Если адрес отличается, исправь PUBLIC_URL и выполни Redeploy.
4. Проверь /healthz: должен вернуть {"ok":true}. Production URL должен быть доступен без входа в Vercel, иначе Telegram не доставит запросы.
5. Останови локальный бот и его supervisor перед переключением. Сохрани PUBLIC_URL и TELEGRAM_WEBHOOK_SECRET в локальном .env, затем выполни:

```powershell
node --env-file=.env scripts/enable-webhook.mjs
```

6. В Telegram проверь /start, /admin, оценку, изменение оценки, результаты и кнопку «Открыть приложение». В браузере без Telegram приложение не даёт доступ к голосованию: это ожидаемо.

## Перенос

setup.sql уже должен быть выполнен. Однократный перенос локальных матчей, настроек и реальных Telegram-голосов: `node --env-file=.env scripts/migrate-cloud.mjs`. Повторный запуск не перезаписывает облачные записи. Локальные технические пользователи не переносятся. После переключения источником истины становится облачная база.

## Границы тестовой версии

Webhook работает в пределах HTTP-запроса; нет бесконечного polling или фонового воркера. PostgreSQL блокировка сериализует обработку, Telegram подключается одним соединением. Завершённые update_id не обрабатываются повторно. При аварии между выполнением действия и записью завершения возможна повторная доставка: оценки защищены версиями, но абсолютная однократность всех административных действий не гарантируется. Для массовой аудитории нужна отдельная очередь и нагрузочная проверка.

Vercel Hobby разрешает личное некоммерческое использование; применение к заказному проекту нужно сверить с условиями тарифа. Supabase Free может приостанавливаться при низкой активности.

Ссылки: https://vercel.com/docs/functions/limitations · https://core.telegram.org/bots/api#setwebhook · https://supabase.com/docs/guides/database/connecting-to-postgres
