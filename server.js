/**
 * Сервер ТрансНафта — Express + SQLite (файл transnafta.db для DB Browser).
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(cors());
app.use(bodyParser.json({ limit: '512kb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(`${new Date().toLocaleTimeString()} | ${req.method} ${req.path}`);
    next();
});

let dbReady = false;

app.get('/healthz', (req, res) => {
    res.status(dbReady ? 200 : 503).json({
        ok: dbReady,
        service: 'transnafta',
        time: new Date().toISOString()
    });
});

function loadOptionalAdminLoginJson() {
    try {
        const p = path.join(__dirname, 'admin-login.json');
        if (!fs.existsSync(p)) return null;
        const j = JSON.parse(fs.readFileSync(p, 'utf8'));
        return j && typeof j === 'object' ? j : null;
    } catch (e) {
        console.warn('⚠ Не удалось прочитать admin-login.json:', e.message);
        return null;
    }
}

const ADMIN_JSON = loadOptionalAdminLoginJson();

/** Пустая строка в process.env не должна «перебивать» значение по умолчанию. */
function pickAdminCred(envName, fileField, fileAlt, defaultValue) {
    const ev = process.env[envName];
    if (ev !== undefined && ev !== null && String(ev).trim() !== '') return String(ev).trim();
    const fv = fileField ?? fileAlt;
    if (fv !== undefined && fv !== null && String(fv).trim() !== '') return String(fv).trim();
    return defaultValue;
}

const ADMIN_PANEL_USER = pickAdminCred(
    'ADMIN_PANEL_USER',
    ADMIN_JSON?.username,
    ADMIN_JSON?.login,
    'admin'
);
const ADMIN_PANEL_PASSWORD = pickAdminCred(
    'ADMIN_PANEL_PASSWORD',
    ADMIN_JSON?.password,
    ADMIN_JSON?.pass,
    'transnafta-admin'
);

function adminPasswordOk(received, expected) {
    try {
        const a = Buffer.from(String(received ?? ''), 'utf8');
        const b = Buffer.from(String(expected ?? ''), 'utf8');
        if (a.length !== b.length) return false;
        return crypto.timingSafeEqual(a, b);
    } catch {
        return false;
    }
}

const adminSessionTokens = new Map();
const ADMIN_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function bearerToken(req) {
    const h = req.headers.authorization || '';
    const m = h.match(/^Bearer\s+(.+)$/i);
    return m ? m[1].trim() : '';
}

function requireAdmin(req, res, next) {
    const tok = bearerToken(req);
    if (!tok || !adminSessionTokens.has(tok)) {
        return res.status(401).json({ error: 'Нужен вход в админ-панель', message: 'Unauthorized' });
    }
    const until = adminSessionTokens.get(tok);
    if (until < Date.now()) {
        adminSessionTokens.delete(tok);
        return res.status(401).json({ error: 'Сессия истекла', message: 'Unauthorized' });
    }
    next();
}

async function initializeDB() {
    try {
        await db.connect();
        dbReady = true;
        console.log('✅ SQLite готова:', path.join(__dirname, 'transnafta.db'));
    } catch (error) {
        console.error('❌ Ошибка SQLite:', error.message);
        dbReady = false;
        setTimeout(initializeDB, 3000);
    }
}

app.use('/api', (req, res, next) => {
    if (!dbReady) {
        return res.status(503).json({ error: 'База данных временно недоступна' });
    }
    next();
});

function clientIp(req) {
    const x = req.headers['x-forwarded-for'];
    if (typeof x === 'string' && x.length) return x.split(',')[0].trim();
    return req.socket.remoteAddress || '';
}

function mapUser(row) {
    if (!row) return null;
    return {
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        phone: row.phone || '',
        userType: row.user_type,
        avatar: row.avatar_initials
    };
}

function normalizeCardNumber(value) {
    return String(value || '').replace(/\D/g, '');
}

function luhnOk(cardNumber) {
    const digits = normalizeCardNumber(cardNumber);
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = digits.length - 1; i >= 0; i -= 1) {
        let n = parseInt(digits[i], 10);
        if (shouldDouble) {
            n *= 2;
            if (n > 9) n -= 9;
        }
        sum += n;
        shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
}

function validCardExpiry(month, year) {
    const m = parseInt(String(month), 10);
    let y = parseInt(String(year), 10);
    if (!Number.isFinite(m) || !Number.isFinite(y) || m < 1 || m > 12) return false;
    if (y < 100) y += 2000;
    const now = new Date();
    const expiry = new Date(y, m, 0, 23, 59, 59);
    return expiry >= now;
}

// --- Аутентификация ---

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, fullName, phone } = req.body;
        if (!email || !password || !fullName) {
            return res.status(400).json({ success: false, message: 'Заполните все поля' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Пароль минимум 6 символов' });
        }

        const exists = await db.getUserByEmail(email);
        if (exists) {
            return res.status(400).json({ success: false, message: 'Email уже зарегистрирован' });
        }

        const userId = await db.createUser({
            email,
            password,
            fullName,
            phone: phone || ''
        });

        res.json({ success: true, message: 'Регистрация успешна', userId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message || 'Ошибка сервера' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Укажите email и пароль' });
        }

        const ok = await db.verifyPassword(email, password);
        if (!ok) {
            return res.status(401).json({ success: false, message: 'Неверный email или пароль' });
        }

        const row = await db.getUserByEmail(email);
        await db.migratePasswordHashIfNeeded(email, password, row);

        const { visitor_key } = req.body || {};
        if (visitor_key) await db.attachVisitorOrdersToUser(row.id, String(visitor_key));

        const user = await db.getUserById(row.id);
        await db.logLogin(row.id, email, clientIp(req), req.headers['user-agent'] || '');

        res.json({
            success: true,
            message: 'Добро пожаловать',
            user: mapUser(user)
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Ошибка входа' });
    }
});

app.get('/api/user/:userId', async (req, res) => {
    try {
        const row = await db.getUserById(req.params.userId);
        if (!row) return res.status(404).json({ error: 'Не найдено' });
        res.json(mapUser(row));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/user/:userId', async (req, res) => {
    try {
        await db.updateUserProfile(req.params.userId, req.body || {});
        const row = await db.getUserById(req.params.userId);
        res.json({ success: true, message: 'Обновлено', user: mapUser(row) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/user/:userId/orders', async (req, res) => {
    try {
        const vk = typeof req.query.vk === 'string' ? req.query.vk : '';
        const list = await db.getUserOrdersForCabinet(req.params.userId, vk);
        res.json(list);
    } catch (e) {
        console.error(e);
        res.status(500).json([]);
    }
});

app.get('/api/user/:userId/payment-methods', async (req, res) => {
    try {
        res.json(await db.getUserPaymentMethods(req.params.userId));
    } catch (e) {
        console.error(e);
        res.status(500).json([]);
    }
});

app.post('/api/user/:userId/payment-methods', async (req, res) => {
    try {
        const { card_number, cardNumber, holder_name, holderName, exp_month, expMonth, exp_year, expYear, is_default, isDefault } = req.body || {};
        const rawCardNumber = card_number || cardNumber || '';
        const rawHolderName = holder_name || holderName || '';
        const rawExpMonth = exp_month || expMonth;
        const rawExpYear = exp_year || expYear;

        if (!luhnOk(rawCardNumber)) {
            return res.status(400).json({ success: false, message: 'Проверьте номер карты' });
        }
        if (!rawHolderName || String(rawHolderName).trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Укажите имя держателя карты' });
        }
        if (!validCardExpiry(rawExpMonth, rawExpYear)) {
            return res.status(400).json({ success: false, message: 'Проверьте срок действия карты' });
        }

        const method = await db.addPaymentMethod({
            userId: req.params.userId,
            cardNumber: rawCardNumber,
            holderName: rawHolderName,
            expMonth: rawExpMonth,
            expYear: rawExpYear,
            isDefault: Boolean(is_default ?? isDefault)
        });
        res.json({ success: true, message: 'Карта привязана', method });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message || 'Не удалось привязать карту' });
    }
});

app.put('/api/user/:userId/payment-methods/:methodId/default', async (req, res) => {
    try {
        const method = await db.setDefaultPaymentMethod(req.params.userId, req.params.methodId);
        res.json({ success: true, message: 'Способ оплаты выбран по умолчанию', method });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

app.delete('/api/user/:userId/payment-methods/:methodId', async (req, res) => {
    try {
        const ok = await db.deletePaymentMethod(req.params.userId, req.params.methodId);
        if (!ok) return res.status(404).json({ success: false, message: 'Способ оплаты не найден' });
        res.json({ success: true, message: 'Способ оплаты удалён' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message || 'Не удалось удалить карту' });
    }
});

app.post('/api/user/:userId/orders/:orderNumber/pay', async (req, res) => {
    try {
        const result = await db.payOrderWithMethod({
            userId: req.params.userId,
            orderNumber: req.params.orderNumber,
            paymentMethodId: req.body?.payment_method_id || req.body?.paymentMethodId
        });
        res.json({ success: true, message: 'Оплата прошла успешно', ...result });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message || 'Не удалось оплатить заказ' });
    }
});

function parsePriceRub(text) {
    const n = parseInt(String(text).replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
}

/** Пакетное оформление заказов из корзины */
app.post('/api/orders/batch', async (req, res) => {
    try {
        const { items, session_token, visitor_key, user_id, service_id, client_email } = req.body;

        let clientMail = '';
        if (typeof client_email === 'string') clientMail = client_email.trim();
        const uid = user_id ? parseInt(String(user_id), 10) : null;
        if (!Number.isFinite(uid)) {
            return res.status(401).json({
                success: false,
                message: 'Для оформления заявки необходимо войти в личный кабинет'
            });
        }
        const userRow = await db.getUserById(uid);
        if (!userRow) {
            return res.status(401).json({
                success: false,
                message: 'Пользователь не найден. Войдите в личный кабинет повторно'
            });
        }
        if (!clientMail && userRow.email) clientMail = String(userRow.email).trim();
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Нет позиций' });
        }

        const mapped = items.map((i) => ({
            from_region: i.from || i.from_region,
            to_region: i.to || i.to_region,
            cargo_type: i.cargoType || i.cargo_type || 'general',
            weight_t: parseFloat(i.weight) || 0,
            volume_m: parseFloat(i.volume) || 0,
            price_text: typeof i.price === 'string' ? i.price : String(i.price || ''),
            price_amount: typeof i.priceAmount === 'number' ? i.priceAmount : parsePriceRub(i.price)
        }));

        for (const m of mapped) {
            if (!m.from_region || !m.to_region) {
                return res.status(400).json({ success: false, message: 'У каждого расчёта нужны город отправления и назначения' });
            }
        }

        const sid = service_id != null && service_id !== '' ? parseInt(String(service_id), 10) : null;

        const meta = {
            user_id: uid,
            session_token: session_token || '',
            visitor_key: visitor_key || '',
            client_email: clientMail,
            service_id: Number.isFinite(sid) ? sid : undefined
        };

        const created = await db.createOrdersBatch(mapped, meta);
        /** Доп. привязка гостевых строк с тем же visitor_key после вставки (на случай расхождения user_id при вставке). */
        if (Number.isFinite(uid) && meta.visitor_key) {
            try {
                await db.attachVisitorOrdersToUser(uid, String(meta.visitor_key));
            } catch (e) {
                console.warn('[orders/batch] attachVisitorOrdersToUser:', e.message);
            }
        }
        if (Number.isFinite(uid) && clientMail) {
            try {
                await db.attachGuestOrdersByClientEmail(uid, clientMail);
            } catch (e) {
                console.warn('[orders/batch] attachGuestOrdersByClientEmail:', e.message);
            }
        }
        res.json({ success: true, created });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    }
});

/** Сессия / визит на сайт */
app.post('/api/track/ping', async (req, res) => {
    try {
        const {
            session_token,
            visitor_key,
            user_id,
            path: p,
            title,
            event_type,
            event_payload
        } = req.body || {};
        if (!session_token || !visitor_key) {
            return res.status(400).json({ ok: false });
        }
        const uid = user_id ? parseInt(String(user_id), 10) : null;
        await db.upsertSessionPing({
            sessionToken: session_token,
            visitorKey: visitor_key,
            userId: Number.isFinite(uid) ? uid : null,
            ip: clientIp(req),
            userAgent: req.headers['user-agent'] || '',
            path: p || ''
        });
        const et = event_type || (title ? 'page_view' : null);
        const payload =
            et === 'page_view' && title
                ? { title }
                : event_payload !== undefined && event_payload !== null
                  ? event_payload
                  : title
                    ? { title }
                    : null;
        if (et) {
            await db.addSessionEvent(session_token, et, p || '', payload);
        }
        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ ok: false });
    }
});

app.post('/api/track/end', async (req, res) => {
    try {
        const { session_token } = req.body || {};
        if (session_token) await db.endSession(session_token);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ ok: false });
    }
});

/** Обращение с страницы контактов */
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, message, session_token } = req.body || {};
        if (!email || !message) {
            return res.status(400).json({ success: false, message: 'Укажите email и сообщение' });
        }
        await db.addContactMessage({
            name: name || '',
            email,
            phone: phone || '',
            message,
            session_token: session_token || ''
        });
        res.json({ success: true, message: 'Сообщение сохранено' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Не удалось сохранить' });
    }
});

// --- Админ: вход и защищённые маршруты ---

app.post('/api/admin/login', (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const rawUser = body.username ?? body.login ?? body.user ?? '';
    const rawPass = body.password ?? body.pass ?? '';
    const username = String(rawUser).trim();
    const password = rawPass !== undefined && rawPass !== null ? String(rawPass) : '';

    if (!username || !password) {
        return res.status(400).json({
            ok: false,
            message:
                'Укажите логин и пароль JSON-ом (поля username и password). Откройте админку с http://localhost:3000 или задайте <meta name="tn-api-origin" content="…"> если сайт на другом порте.'
        });
    }

    if (username === ADMIN_PANEL_USER && adminPasswordOk(password, ADMIN_PANEL_PASSWORD)) {
        const token = crypto.randomBytes(28).toString('hex');
        adminSessionTokens.set(token, Date.now() + ADMIN_SESSION_MS);
        return res.json({ ok: true, token, expiresInMs: ADMIN_SESSION_MS });
    }

    console.warn('[admin/login] Отклонено для логина «' + username + '». Ожидался ADMIN_PANEL_USER из env или admin-login.json.');

    res.status(401).json({
        ok: false,
        message:
            'Неверный логин или пароль. В консоли сервера при старте выводится активный логин; пароль задаётся как ADMIN_PANEL_PASSWORD или файл admin-login.json (см. admin-login.json.example).'
    });
});

app.use('/api/admin', (req, res, next) => {
    if (req.path === '/login' && req.method === 'POST') return next();
    return requireAdmin(req, res, next);
});

app.get('/api/admin/overview', async (req, res) => {
    try {
        const o = await db.getAdminOverview();
        res.json(o);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/sessions', async (req, res) => {
    try {
        const rows = await db.getAdminSessions();
        res.json(rows);
    } catch (e) {
        res.status(500).json([]);
    }
});

app.get('/api/admin/logins', async (req, res) => {
    try {
        res.json(await db.getAdminLoginEvents());
    } catch (e) {
        res.status(500).json([]);
    }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        res.json(await db.getAdminUsers());
    } catch (e) {
        res.status(500).json([]);
    }
});

app.get('/api/admin/orders', async (req, res) => {
    try {
        res.json(await db.getAdminOrders());
    } catch (e) {
        res.status(500).json([]);
    }
});

app.get('/api/admin/activity', async (req, res) => {
    try {
        res.json(await db.getAdminActivity());
    } catch (e) {
        res.status(500).json([]);
    }
});

app.get('/api/admin/contacts', async (req, res) => {
    try {
        res.json(await db.getContactMessages());
    } catch (e) {
        res.status(500).json([]);
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/** Статические HTML/CSS/JS — после API, чтобы запросы /api/* не конкурировали с файлами */
app.use(express.static(path.join(__dirname)));

initializeDB().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🚛 http://localhost:${PORT}`);
        console.log('📂 Файл БД:', process.env.DATABASE_PATH || path.join(__dirname, 'transnafta.db'), '(откройте в DB Browser)');
        console.log(
            '📗 Учётные данные админки: ADMIN_PANEL_USER / ADMIN_PANEL_PASSWORD или файл admin-login.json (см. admin-login.json.example).'
        );
        console.log('   Текущий логин: «' + ADMIN_PANEL_USER + '».');
        const fromEnv = process.env.ADMIN_PANEL_PASSWORD || process.env.ADMIN_PANEL_USER;
        const fromFile = !!(ADMIN_JSON && (ADMIN_JSON.password || ADMIN_JSON.pass));
        if (!fromEnv && !fromFile) {
            console.log('   Пароль по умолчанию (смените!): "' + ADMIN_PANEL_PASSWORD + '"');
        }
        console.log('ℹ Если обновляетесь со старой версии сайта и видите ошибки SQL — удалите старый transnafta.db и перезапустите сервер.\n');
    });
});

process.on('SIGINT', async () => {
    await db.close();
    process.exit(0);
});
