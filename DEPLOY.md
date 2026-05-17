# Публикация сайта «ТрансНафта»

Проект публикуется как Node.js-приложение: Express отдаёт HTML/CSS/JS-файлы и обслуживает API `/api/*`.

## Что важно перед публикацией

1. Не загружайте на GitHub `.env`, `admin-login.json`, `node_modules/` и `transnafta.db` — они добавлены в `.gitignore`.
2. На хостинге задайте переменные окружения:
   - `NODE_ENV=production`
   - `PORT` — обычно хостинг задаёт сам
   - `DATABASE_PATH` — путь к SQLite-файлу на постоянном диске
   - `ADMIN_PANEL_USER` — логин админ-панели
   - `ADMIN_PANEL_PASSWORD` — новый сложный пароль
3. Для проверки доступности сервера используйте `/healthz`.

## Вариант 1: Render

1. Загрузите проект в GitHub-репозиторий.
2. Откройте https://render.com и создайте новый **Blueprint** из репозитория.
3. Render прочитает `render.yaml` и создаст Web Service с диском.
4. В переменных окружения задайте `ADMIN_PANEL_PASSWORD`.
5. Дождитесь деплоя и откройте выданный Render URL.

Если создаёте сервис вручную:

- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/healthz`
- Disk Mount Path: `/var/data`
- `DATABASE_PATH=/var/data/transnafta.db`

## Вариант 2: VPS

1. Установите Node.js 18+.
2. Скопируйте проект на сервер.
3. В папке проекта выполните:

```bash
npm install --production
```

4. Создайте `.env` или задайте переменные окружения:

```bash
NODE_ENV=production
PORT=3000
DATABASE_PATH=/var/www/transnafta/data/transnafta.db
ADMIN_PANEL_USER=admin
ADMIN_PANEL_PASSWORD=your-strong-password
```

5. Запустите приложение через `pm2`:

```bash
npm install -g pm2
pm2 start server.js --name transnafta
pm2 save
```

6. Настройте Nginx как reverse proxy на `http://127.0.0.1:3000`.

## Локальная проверка перед деплоем

```bash
npm test
npm start
```

После запуска откройте:

- `http://localhost:3000/`
- `http://localhost:3000/healthz`
- `http://localhost:3000/admin.html`
