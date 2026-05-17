/**
 * SQLite для ТрансНафта: пользователи, заказы, сессии сайта, входы, обращения, логи.
 * Схема — database.sql (открывайте тот же файл в DB Browser for SQLite рядом с transnafta.db).
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'transnafta.db');
const SCHEMA_PATH = path.join(__dirname, 'database.sql');

/** Полностью новый файл БД: в PowerShell перед npm start → $env:TN_RESET_DB='1'; npm start */

function hashPasswordPbkdf2(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPasswordPbkdf2(password, stored) {
    if (!stored || !stored.includes(':')) return false;
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const check = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
    } catch {
        return false;
    }
}

function hashPasswordMd5Legacy(password) {
    return crypto.createHash('md5').update(password).digest('hex');
}

function normalizeCardNumber(value) {
    return String(value || '').replace(/\D/g, '');
}

function detectCardBrand(cardNumber) {
    const n = normalizeCardNumber(cardNumber);
    if (n.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(n) || /^2(2[2-9]|[3-6]\d|7[01]|720)/.test(n)) return 'Mastercard';
    if (/^220[0-4]/.test(n)) return 'МИР';
    if (/^3[47]/.test(n)) return 'American Express';
    return 'Bank card';
}

function maskCardNumber(cardNumber) {
    const n = normalizeCardNumber(cardNumber);
    return `**** **** **** ${n.slice(-4)}`;
}

class TransnaftaDB {
    constructor(dbPath = DB_PATH) {
        this.dbPath = dbPath;
        this.db = null;
    }

    initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) reject(err);
                else {
                    this.db.configure('busyTimeout', 10000);
                    this.db.run('PRAGMA foreign_keys = ON', (e2) => {
                        if (e2) reject(e2);
                        else resolve(true);
                    });
                }
            });
        });
    }

    ensureSchema() {
        const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
        return new Promise((resolve, reject) => {
            this.db.exec(sql, (err) => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }

    /**
     * Старый transnafta.db не меняется от CREATE TABLE IF NOT EXISTS — новые колонки не появляются.
     * Переименовываем старые имена маршрута (from/to и т.д.), затем дописываем недостающие поля под INSERT.
     */
    async migrateOrdersLegacyRenames() {
        const rows = await this.all('PRAGMA table_info(orders)');
        if (!rows || rows.length === 0) return;
        const names = new Set(rows.map((r) => r.name));

        const tryRename = async (oldName, newName) => {
            if (names.has(newName) || !names.has(oldName)) return;
            await this.run(`ALTER TABLE orders RENAME COLUMN "${oldName}" TO ${newName}`);
            names.delete(oldName);
            names.add(newName);
            console.log(`[DB] orders: ${oldName} → ${newName}`);
        };

        const routePairs = [
            ['from', 'from_region'],
            ['to', 'to_region'],
            ['fromCity', 'from_region'],
            ['toCity', 'to_region'],
            ['origin', 'from_region'],
            ['destination', 'to_region'],
            ['route_from', 'from_region'],
            ['route_to', 'to_region'],
            ['from_location', 'from_region'],
            ['to_location', 'to_region']
        ];
        for (const [a, b] of routePairs) await tryRename(a, b);

        await tryRename('orderNumber', 'order_number');
        await tryRename('order_no', 'order_number');
    }

    async migrateLegacySchema() {
        const addMissing = async (table, columnDefs) => {
            const rows = await this.all(`PRAGMA table_info(${table})`);
            if (!rows || rows.length === 0) return;
            const have = new Set(rows.map((r) => r.name));
            for (const [col, sqlFragment] of columnDefs) {
                if (!have.has(col)) {
                    await this.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${sqlFragment}`);
                    have.add(col);
                    console.log(`[DB] Таблица "${table}": добавлена колонка ${col}`);
                }
            }
        };

        try {
            await this.migrateOrdersLegacyRenames();
            await addMissing('orders', [
                ['from_region', 'TEXT'],
                ['to_region', 'TEXT'],
                ['order_number', 'TEXT'],
                ['session_token', 'TEXT'],
                ['visitor_key', 'TEXT'],
                ['client_email', 'TEXT'],
                ['cargo_type', "TEXT DEFAULT 'general'"],
                ['weight_t', 'REAL DEFAULT 0'],
                ['volume_m', 'REAL DEFAULT 0'],
                ['price_text', "TEXT DEFAULT ''"],
                ['price_amount', 'REAL DEFAULT 0'],
                ['status', "TEXT DEFAULT 'submitted'"],
                ['payment_status', "TEXT DEFAULT 'unpaid'"],
                ['payment_method_id', 'INTEGER'],
                ['paid_at', 'TEXT'],
                ['updated_at', 'TEXT'],
                ['submitted_at', 'TEXT']
            ]);

            await addMissing('contact_messages', [['session_token', 'TEXT']]);

            await addMissing('activity_logs', [
                ['visitor_key', 'TEXT'],
                ['session_token', 'TEXT'],
                ['entity_type', "TEXT DEFAULT ''"],
                ['entity_id', "TEXT DEFAULT ''"],
                ['details_json', 'TEXT']
            ]);
        } catch (e) {
            console.error('[DB] Ошибка миграции схемы:', e.message);
            throw e;
        }
    }

    async connect() {
        const forceNewDb = process.env.TN_RESET_DB === '1' || process.env.TN_FORCE_NEW_DB === '1';
        if (forceNewDb && fs.existsSync(this.dbPath)) {
            fs.unlinkSync(this.dbPath);
            console.log('[DB] Создан чистый transnafta.db (переменная TN_RESET_DB=1)');
        }

        await this.initialize();
        await this.ensureSchema();
        await this.migrateLegacySchema();
        await this.refreshOrdersSchemaCache();
    }

    close() {
        return new Promise((resolve, reject) => {
            if (!this.db) return resolve(true);
            this.db.close((err) => (err ? reject(err) : resolve(true)));
        });
    }

    all(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => (err ? reject(err) : resolve(rows)));
        });
    }

    get(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(query, params, (err, row) => (err ? reject(err) : resolve(row)));
        });
    }

    run(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function (err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    async verifyPassword(email, password) {
        const user = await this.get('SELECT password_hash FROM users WHERE email = ?', [email]);
        if (!user) return false;
        if (user.password_hash && user.password_hash.includes(':')) {
            return verifyPasswordPbkdf2(password, user.password_hash);
        }
        return hashPasswordMd5Legacy(password) === user.password_hash;
    }

    async migratePasswordHashIfNeeded(email, plainPassword, userRow) {
        if (userRow.password_hash && userRow.password_hash.includes(':')) return;
        const newHash = hashPasswordPbkdf2(plainPassword);
        await this.run(
            "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE email = ?",
            [newHash, email]
        );
    }

    async createUser({ email, password, fullName, phone = '', userType = 'customer' }) {
        const passwordHash = hashPasswordPbkdf2(password);
        const avatar = (fullName && fullName.trim().charAt(0).toUpperCase()) || '?';
        const r = await this.run(
            `INSERT INTO users (email, password_hash, full_name, phone, user_type, avatar_initials, status)
             VALUES (?, ?, ?, ?, ?, ?, 'active')`,
            [email, passwordHash, fullName, phone || '', userType, avatar]
        );
        return r.lastID;
    }

    async getUserByEmail(email) {
        return this.get('SELECT * FROM users WHERE email = ?', [email]);
    }

    async getUserById(id) {
        return this.get(
            'SELECT id, email, full_name, phone, user_type, avatar_initials, status, created_at FROM users WHERE id = ?',
            [id]
        );
    }

    async updateUserProfile(userId, updates) {
        const allowed = { phone: 'phone' };
        const sets = [];
        const vals = [];
        for (const [k, v] of Object.entries(updates)) {
            if (allowed[k]) {
                sets.push(`${allowed[k]} = ?`);
                vals.push(v);
            }
        }
        if (!sets.length) return;
        vals.push(userId);
        await this.run(
            `UPDATE users SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`,
            vals
        );
    }

    async getUserPaymentMethods(userId) {
        const uid = parseInt(String(userId), 10);
        if (!Number.isFinite(uid)) return [];
        return this.all(
            `SELECT
                id,
                card_mask AS cardMask,
                card_brand AS cardBrand,
                holder_name AS holderName,
                exp_month AS expMonth,
                exp_year AS expYear,
                is_default AS isDefault,
                created_at AS createdAt
             FROM payment_methods
             WHERE user_id = ?
             ORDER BY is_default DESC, datetime(created_at) DESC`,
            [uid]
        );
    }

    async addPaymentMethod({ userId, cardNumber, holderName, expMonth, expYear, isDefault }) {
        const uid = parseInt(String(userId), 10);
        if (!Number.isFinite(uid)) throw new Error('Некорректный пользователь');

        const user = await this.get('SELECT id FROM users WHERE id = ?', [uid]);
        if (!user) throw new Error('Пользователь не найден');

        const digits = normalizeCardNumber(cardNumber);
        const brand = detectCardBrand(digits);
        const mask = maskCardNumber(digits);
        const tokenSeed = `${uid}:${digits}:${Date.now()}:${crypto.randomBytes(8).toString('hex')}`;
        const cardToken = 'card_' + crypto.createHash('sha256').update(tokenSeed).digest('hex').slice(0, 32);

        const existing = await this.get('SELECT COUNT(*) AS n FROM payment_methods WHERE user_id = ?', [uid]);
        const shouldBeDefault = isDefault || !existing || existing.n === 0;
        if (shouldBeDefault) {
            await this.run('UPDATE payment_methods SET is_default = 0, updated_at = datetime(\'now\') WHERE user_id = ?', [uid]);
        }

        const r = await this.run(
            `INSERT INTO payment_methods
                (user_id, card_token, card_mask, card_brand, holder_name, exp_month, exp_year, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                uid,
                cardToken,
                mask,
                brand,
                String(holderName || '').trim(),
                parseInt(String(expMonth), 10),
                parseInt(String(expYear), 10),
                shouldBeDefault ? 1 : 0
            ]
        );

        await this.logActivity({
            userId: uid,
            visitorKey: null,
            sessionToken: null,
            action: 'payment_method_added',
            entityType: 'payment_method',
            entityId: String(r.lastID),
            details: { card_mask: mask, card_brand: brand }
        });

        return this.getPaymentMethodById(uid, r.lastID);
    }

    async getPaymentMethodById(userId, methodId) {
        const uid = parseInt(String(userId), 10);
        const mid = parseInt(String(methodId), 10);
        if (!Number.isFinite(uid) || !Number.isFinite(mid)) return null;
        return this.get(
            `SELECT
                id,
                card_mask AS cardMask,
                card_brand AS cardBrand,
                holder_name AS holderName,
                exp_month AS expMonth,
                exp_year AS expYear,
                is_default AS isDefault,
                created_at AS createdAt
             FROM payment_methods
             WHERE id = ? AND user_id = ?`,
            [mid, uid]
        );
    }

    async setDefaultPaymentMethod(userId, methodId) {
        const uid = parseInt(String(userId), 10);
        const mid = parseInt(String(methodId), 10);
        if (!Number.isFinite(uid) || !Number.isFinite(mid)) throw new Error('Некорректный способ оплаты');
        const method = await this.get('SELECT id FROM payment_methods WHERE id = ? AND user_id = ?', [mid, uid]);
        if (!method) throw new Error('Способ оплаты не найден');
        await this.run('UPDATE payment_methods SET is_default = 0, updated_at = datetime(\'now\') WHERE user_id = ?', [uid]);
        await this.run('UPDATE payment_methods SET is_default = 1, updated_at = datetime(\'now\') WHERE id = ?', [mid]);
        return this.getPaymentMethodById(uid, mid);
    }

    async deletePaymentMethod(userId, methodId) {
        const uid = parseInt(String(userId), 10);
        const mid = parseInt(String(methodId), 10);
        if (!Number.isFinite(uid) || !Number.isFinite(mid)) return false;
        const current = await this.get('SELECT id, is_default FROM payment_methods WHERE id = ? AND user_id = ?', [mid, uid]);
        if (!current) return false;
        await this.run('DELETE FROM payment_methods WHERE id = ? AND user_id = ?', [mid, uid]);
        if (current.is_default === 1) {
            const next = await this.get(
                'SELECT id FROM payment_methods WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 1',
                [uid]
            );
            if (next) await this.run('UPDATE payment_methods SET is_default = 1 WHERE id = ?', [next.id]);
        }
        await this.logActivity({
            userId: uid,
            visitorKey: null,
            sessionToken: null,
            action: 'payment_method_deleted',
            entityType: 'payment_method',
            entityId: String(mid),
            details: null
        });
        return true;
    }

    async payOrderWithMethod({ userId, orderNumber, paymentMethodId }) {
        await this.ensureOrdersSchemaCache();
        const uid = parseInt(String(userId), 10);
        const mid = parseInt(String(paymentMethodId), 10);
        const orderNo = String(orderNumber || '').trim();
        if (!Number.isFinite(uid) || !Number.isFinite(mid) || !orderNo) throw new Error('Некорректные данные оплаты');

        const method = await this.get('SELECT id, card_mask FROM payment_methods WHERE id = ? AND user_id = ?', [mid, uid]);
        if (!method) throw new Error('Способ оплаты не найден');

        const order = await this.get('SELECT id, order_number FROM orders WHERE order_number = ? AND user_id = ?', [orderNo, uid]);
        if (!order) throw new Error('Заказ не найден');

        const sets = [];
        const vals = [];
        if (this.hasOrderCol('payment_status')) sets.push("payment_status = 'paid'");
        if (this.hasOrderCol('payment_method_id')) {
            sets.push('payment_method_id = ?');
            vals.push(mid);
        }
        if (this.hasOrderCol('paid_at')) sets.push("paid_at = datetime('now')");
        if (this.hasOrderCol('updated_at')) sets.push("updated_at = datetime('now')");
        if (!sets.length) throw new Error('В таблице заказов нет полей оплаты');
        vals.push(order.id);
        await this.run(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, vals);

        await this.logActivity({
            userId: uid,
            visitorKey: null,
            sessionToken: null,
            action: 'order_paid',
            entityType: 'order',
            entityId: orderNo,
            details: { payment_method_id: mid, card_mask: method.card_mask }
        });

        return { success: true, orderNumber: orderNo, paymentStatus: 'paid' };
    }

    async logLogin(userId, email, ip, userAgent) {
        await this.run(
            `INSERT INTO login_events (user_id, email, ip, user_agent) VALUES (?, ?, ?, ?)`,
            [userId, email, ip || '', userAgent || '']
        );
        await this.logActivity({
            userId,
            action: 'login',
            entityType: 'user',
            entityId: String(userId),
            details: { email },
            sessionToken: null,
            visitorKey: null
        });
    }

    async upsertSessionPing({ sessionToken, visitorKey, userId, ip, userAgent, path }) {
        const row = await this.get('SELECT id FROM site_sessions WHERE session_token = ?', [sessionToken]);
        if (!row) {
            await this.run(
                `INSERT INTO site_sessions (session_token, visitor_key, user_id, ip, user_agent, last_path, status)
                 VALUES (?, ?, ?, ?, ?, ?, 'active')`,
                [sessionToken, visitorKey, userId || null, ip || '', userAgent || '', path || '']
            );
            return;
        }
        await this.run(
            `UPDATE site_sessions SET
                last_seen_at = datetime('now'),
                last_path = ?,
                user_id = COALESCE(?, user_id),
                ip = COALESCE(NULLIF(?, ''), ip),
                user_agent = COALESCE(NULLIF(?, ''), user_agent),
                status = 'active'
             WHERE id = ?`,
            [path || '', userId !== undefined && userId !== null ? userId : null, ip || '', userAgent || '', row.id]
        );
    }

    async endSession(sessionToken) {
        await this.run(
            `UPDATE site_sessions SET ended_at = datetime('now'), status = 'ended' WHERE session_token = ? AND ended_at IS NULL`,
            [sessionToken]
        );
    }

    async addSessionEvent(sessionToken, eventType, path, payloadObj) {
        const s = await this.get('SELECT id FROM site_sessions WHERE session_token = ?', [sessionToken]);
        if (!s) return;
        const payload = payloadObj ? JSON.stringify(payloadObj) : null;
        await this.run(
            `INSERT INTO session_events (session_id, event_type, path, payload_json) VALUES (?, ?, ?, ?)`,
            [s.id, eventType, path || '', payload]
        );
    }

    async logActivity({ userId, visitorKey, sessionToken, action, entityType, entityId, details }) {
        const detailsJson = details ? JSON.stringify(details) : null;
        await this.run(
            `INSERT INTO activity_logs (user_id, visitor_key, session_token, action, entity_type, entity_id, details_json)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                userId || null,
                visitorKey || null,
                sessionToken || null,
                action,
                entityType || '',
                entityId || '',
                detailsJson
            ]
        );
    }

    generateOrderNumber() {
        const t = Date.now().toString(36).toUpperCase();
        const r = crypto.randomBytes(3).toString('hex').toUpperCase();
        return `ТН-${t}-${r}`;
    }

    async refreshOrdersSchemaCache() {
        try {
            const rows = await this.all('PRAGMA table_info(orders)');
            this._ordersColMap = new Map((rows || []).map((row) => [row.name, row]));
        } catch {
            this._ordersColMap = new Map();
        }
    }

    async ensureOrdersSchemaCache() {
        if (!this._ordersColMap) await this.refreshOrdersSchemaCache();
    }

    hasOrderCol(name) {
        return this._ordersColMap && this._ordersColMap.has(name);
    }

    async resolveValidUserIdForInsert(rawUserId) {
        if (rawUserId === undefined || rawUserId === null || rawUserId === '') return null;
        const id = parseInt(String(rawUserId), 10);
        if (!Number.isFinite(id)) return null;
        try {
            const u = await this.get('SELECT id FROM users WHERE id = ?', [id]);
            return u ? id : null;
        } catch {
            return null;
        }
    }

    /** Одна строка в services — иначе orders.service_id бьётся о FOREIGN KEY на пустой справочник. */
    async ensureServicesSeedRow() {
        const cols = await this.all('PRAGMA table_info(services)');
        if (!cols || cols.length === 0) return;

        const byName = new Map(cols.map((c) => [c.name, c]));
        const want = new Map();

        const preset = {
            name: 'Перевозка груза',
            description: 'Автоматически созданная услуга для заказов с сайта',
            service_type: 'auto',
            base_price: 0,
            price_per_km: 0,
            price_per_ton: 0,
            max_weight_tons: 100,
            max_volume_m3: 100,
            icon: '🚚',
            is_active: 1
        };

        for (const [col, val] of Object.entries(preset)) {
            if (byName.has(col)) want.set(col, val);
        }

        if (byName.has('slug') && !want.has('slug')) want.set('slug', 'tn-site-' + Date.now().toString(36));

        if (byName.has('created_at')) want.set('created_at', '__DATETIME_NOW__');

        for (const col of cols) {
            if (col.pk === 1) continue;
            if (want.has(col.name)) continue;
            if (col.notnull !== 1) continue;
            if (col.dflt_value !== null && col.dflt_value !== undefined) continue;

            const t = String(col.type || '').toLowerCase();
            if (t.includes('int') || t.includes('real') || t.includes('floa') || t.includes('doub')) want.set(col.name, 0);
            else want.set(col.name, '');
        }

        const sortedCols = [...want.keys()].sort();
        if (!sortedCols.length) return;

        const placeholders = [];
        const params = [];
        for (const cname of sortedCols) {
            const val = want.get(cname);
            if (val === '__DATETIME_NOW__') placeholders.push(`datetime('now')`);
            else {
                placeholders.push('?');
                params.push(val);
            }
        }

        try {
            await this.run(
                `INSERT INTO services (${sortedCols.join(', ')}) VALUES (${placeholders.join(', ')})`,
                params
            );
            console.log('[DB] Добавлена услуга по умолчанию в таблицу services (для связи FK с заказами).');
        } catch (e) {
            const msg = String(e.message || '');
            if (msg.includes('UNIQUE') || msg.includes('constraint')) {
                console.warn('[DB] Запись в services уже есть или конфликт уникальности — используем существующие id.');
                return;
            }
            throw e;
        }
    }

    /**
     * Только реальный id из services: запрошенный (если есть), иначе первая строка, иначе seed.
     * Раньше подставлялся 1 при пустой таблице — это и давало FOREIGN KEY constraint failed.
     */
    async resolveServiceIdForInsert(requested) {
        try {
            const t = await this.get(
                "SELECT 1 AS x FROM sqlite_master WHERE type='table' AND name='services'"
            );
            if (!t) return null;

            if (requested !== undefined && requested !== null && requested !== '') {
                const rid = parseInt(String(requested), 10);
                if (Number.isFinite(rid)) {
                    const ex = await this.get('SELECT id FROM services WHERE id = ?', [rid]);
                    if (ex && ex.id != null) return Number(ex.id);
                }
            }

            let row = await this.get('SELECT id FROM services ORDER BY id ASC LIMIT 1');
            if (row && row.id != null && Number.isFinite(Number(row.id))) return Number(row.id);

            await this.ensureServicesSeedRow();

            row = await this.get('SELECT id FROM services ORDER BY id ASC LIMIT 1');
            if (!row || row.id == null) {
                throw new Error(
                    'Таблица services пуста — нельзя сохранить заказ (FOREIGN KEY). Добавьте услугу в БД или запустите один раз: $env:TN_RESET_DB=\'1\'; npm start'
                );
            }
            return Number(row.id);
        } catch (e) {
            if (String(e.message || '').includes('Таблица services пуста')) throw e;
            console.error('[DB] Ошибка resolveServiceIdForInsert:', e.message);
            throw e;
        }
    }

    implicitOrderFallback(name, ctx) {
        const known = {
            service_id: ctx.serviceId,
            order_number: ctx.orderNumber,
            user_id: ctx.validUserId,
            session_token: ctx.meta.session_token || '',
            visitor_key: ctx.meta.visitor_key || '',
            client_email:
                typeof ctx.meta.client_email === 'string' && ctx.meta.client_email.trim()
                    ? ctx.meta.client_email.trim()
                    : '',
            from_region: ctx.data.from_region,
            to_region: ctx.data.to_region,
            pickup_location: ctx.data.from_region,
            delivery_location: ctx.data.to_region,
            cargo_type: ctx.ctype,
            cargo_weight: ctx.w,
            cargo_volume: ctx.v,
            weight_t: ctx.w,
            volume_m: ctx.v,
            cargo_description: String(ctx.ctype),
            price_text: ctx.data.price_text || '',
            price_amount: ctx.priceAmt,
            total_cost: ctx.priceAmt,
            base_cost: ctx.priceAmt,
            additional_cost: 0,
            status: ctx.legacyPickupStyle ? 'pending' : 'submitted',
            payment_status: 'unpaid'
        };
        if (Object.prototype.hasOwnProperty.call(known, name)) return known[name];

        const info = this._ordersColMap.get(name);
        if (!info) return undefined;
        const t = String(info.type || '').toLowerCase();
        if (t.includes('int') || t.includes('real') || t.includes('floa') || t.includes('doub')) return 0;
        return '';
    }

    async createOrderRow(data, meta) {
        await this.ensureOrdersSchemaCache();
        if (!this._ordersColMap || this._ordersColMap.size === 0) {
            throw new Error('В SQLite нет таблицы orders или она недоступна');
        }

        const orderNumber = data.order_number || this.generateOrderNumber();
        const priceAmt =
            typeof data.price_amount === 'number'
                ? data.price_amount
                : parseFloat(String(data.price_amount || '').replace(/\s/g, '').replace(',', '.')) || 0;
        const w = data.weight_t || 0;
        const v = data.volume_m || 0;
        const ctype = data.cargo_type || 'general';

        const validUserId = await this.resolveValidUserIdForInsert(meta.user_id);

        let serviceId = null;
        if (this.hasOrderCol('service_id')) {
            serviceId = await this.resolveServiceIdForInsert(meta.service_id);
        }

        const legacyPickupStyle = this.hasOrderCol('pickup_location') || this.hasOrderCol('delivery_location');

        const want = new Map();
        const setIf = (col, val) => {
            if (this.hasOrderCol(col)) want.set(col, val);
        };

        setIf('order_number', orderNumber);
        setIf('user_id', validUserId);
        setIf('session_token', meta.session_token || '');
        setIf('visitor_key', meta.visitor_key || '');
        setIf(
            'client_email',
            typeof meta.client_email === 'string' && meta.client_email.trim()
                ? meta.client_email.trim()
                : ''
        );

        setIf('from_region', data.from_region);
        setIf('to_region', data.to_region);
        setIf('cargo_type', ctype);
        setIf('weight_t', w);
        setIf('volume_m', v);
        setIf('price_text', data.price_text || '');
        setIf('price_amount', priceAmt);
        setIf('status', legacyPickupStyle ? 'pending' : 'submitted');
        setIf('payment_status', 'unpaid');

        setIf('service_id', serviceId);
        setIf('pickup_location', data.from_region);
        setIf('delivery_location', data.to_region);
        setIf('cargo_weight', w);
        setIf('cargo_volume', v);
        setIf('cargo_description', String(ctype));
        setIf('total_cost', priceAmt);
        setIf('base_cost', priceAmt);
        setIf('additional_cost', 0);
        setIf('payment_status', 'pending');

        if (this.hasOrderCol('submitted_at')) want.set('submitted_at', '__DATETIME_NOW__');

        const ctx = { data, meta, validUserId, orderNumber, priceAmt, w, v, ctype, serviceId, legacyPickupStyle };
        for (const [name, info] of this._ordersColMap) {
            if (info.pk === 1) continue;
            if (want.has(name)) continue;
            if (info.notnull !== 1) continue;
            if (info.dflt_value !== null && info.dflt_value !== undefined) continue;
            if (name === 'created_at' || name === 'updated_at') {
                want.set(name, '__DATETIME_NOW__');
                continue;
            }
            const fb = this.implicitOrderFallback(name, ctx);
            if (fb !== undefined) want.set(name, fb);
        }

        const sortedCols = [...want.keys()].sort();
        const missingRequired = [];
        for (const [name, info] of this._ordersColMap) {
            if (info.pk === 1) continue;
            if (info.notnull !== 1) continue;
            if (info.dflt_value !== null && info.dflt_value !== undefined) continue;
            if (!sortedCols.includes(name)) missingRequired.push(name);
        }
        if (missingRequired.length) {
            throw new Error(
                `Схема orders: для NOT NULL не заданы поля: ${missingRequired.join(', ')}. Запустите с TN_RESET_DB=1 или обновите таблицу.`
            );
        }

        const placeholders = [];
        const params = [];
        for (const col of sortedCols) {
            const val = want.get(col);
            if (val === '__DATETIME_NOW__') placeholders.push(`datetime('now')`);
            else {
                placeholders.push('?');
                params.push(val);
            }
        }

        const sql = `INSERT INTO orders (${sortedCols.join(', ')}) VALUES (${placeholders.join(', ')})`;
        const r = await this.run(sql, params);

        await this.logActivity({
            userId: validUserId,
            visitorKey: meta.visitor_key,
            sessionToken: meta.session_token,
            action: 'order_submitted',
            entityType: 'order',
            entityId: orderNumber,
            details: { route: `${data.from_region} → ${data.to_region}`, price_text: data.price_text }
        });

        return { id: r.lastID, order_number: orderNumber };
    }

    async createOrdersBatch(items, meta) {
        const created = [];
        await this.run('BEGIN IMMEDIATE');
        try {
            for (const it of items) {
                const orderNumber = it.order_number || this.generateOrderNumber();
                created.push(
                    await this.createOrderRow(
                        {
                            order_number: orderNumber,
                            from_region: it.from_region,
                            to_region: it.to_region,
                            cargo_type: it.cargo_type,
                            weight_t: it.weight_t,
                            volume_m: it.volume_m,
                            price_text: it.price_text,
                            price_amount: it.price_amount
                        },
                        meta
                    )
                );
            }
            await this.run('COMMIT');
            return created;
        } catch (e) {
            await this.run('ROLLBACK').catch(() => {});
            throw e;
        }
    }

    async getUserOrders(userId) {
        await this.ensureOrdersSchemaCache();
        const uid = parseInt(String(userId), 10);
        if (!Number.isFinite(uid)) return [];
        let fromExpr = `''`;
        if (this.hasOrderCol('from_region') && this.hasOrderCol('pickup_location')) {
            fromExpr = `COALESCE(NULLIF(TRIM(from_region), ''), TRIM(pickup_location), '')`;
        } else if (this.hasOrderCol('from_region')) {
            fromExpr = `COALESCE(from_region, '')`;
        } else if (this.hasOrderCol('pickup_location')) {
            fromExpr = `COALESCE(pickup_location, '')`;
        }
        let toExpr = `''`;
        if (this.hasOrderCol('to_region') && this.hasOrderCol('delivery_location')) {
            toExpr = `COALESCE(NULLIF(TRIM(to_region), ''), TRIM(delivery_location), '')`;
        } else if (this.hasOrderCol('to_region')) {
            toExpr = `COALESCE(to_region, '')`;
        } else if (this.hasOrderCol('delivery_location')) {
            toExpr = `COALESCE(delivery_location, '')`;
        }
        let priceAmtExpr = '0';
        if (this.hasOrderCol('price_amount') && this.hasOrderCol('total_cost')) {
            priceAmtExpr = `COALESCE(price_amount, total_cost, 0)`;
        } else if (this.hasOrderCol('price_amount')) {
            priceAmtExpr = `COALESCE(price_amount, 0)`;
        } else if (this.hasOrderCol('total_cost')) {
            priceAmtExpr = `COALESCE(total_cost, 0)`;
        }
        let priceTextExpr = `''`;
        if (this.hasOrderCol('price_text')) {
            priceTextExpr = this.hasOrderCol('total_cost')
                ? `COALESCE(NULLIF(TRIM(price_text), ''), printf('%.2f', total_cost), '')`
                : `COALESCE(price_text, '')`;
        } else if (this.hasOrderCol('total_cost')) {
            priceTextExpr = `printf('%.2f', total_cost)`;
        }
        const orderBy = this.hasOrderCol('created_at')
            ? 'ORDER BY datetime(created_at) DESC'
            : 'ORDER BY id DESC';
        const paymentStatusExpr = this.hasOrderCol('payment_status') ? `COALESCE(payment_status, 'unpaid')` : `'unpaid'`;
        const paymentMethodExpr = this.hasOrderCol('payment_method_id') ? `payment_method_id` : `NULL`;
        const paidAtExpr = this.hasOrderCol('paid_at') ? `paid_at` : `NULL`;

        return this.all(
            `SELECT
                order_number AS orderNumber,
                ${fromExpr} AS fromRegion,
                ${toExpr} AS toRegion,
                ${priceTextExpr} AS price,
                ${priceAmtExpr} AS priceAmount,
                status,
                ${paymentStatusExpr} AS paymentStatus,
                ${paymentMethodExpr} AS paymentMethodId,
                ${paidAtExpr} AS paidAt,
                ${this.hasOrderCol('created_at') ? 'created_at' : "''"} AS createdAt
             FROM orders
             WHERE user_id = ?
             ${orderBy}`,
            [uid]
        );
    }

    /** Подтянуть заказы, оформленные без user_id, но с тем же visitor_key (браузер). */
    async attachVisitorOrdersToUser(userId, visitorKey) {
        await this.ensureOrdersSchemaCache();
        if (!visitorKey || !this.hasOrderCol('visitor_key')) return;
        const uid = parseInt(String(userId), 10);
        if (!Number.isFinite(uid)) return;
        try {
            await this.run(
                `UPDATE orders SET user_id = ? WHERE visitor_key = ? AND (user_id IS NULL OR user_id = 0)`,
                [uid, visitorKey]
            );
        } catch (e) {
            console.warn('[DB] attachVisitorOrdersToUser:', e.message);
        }
    }

    /** Привязать заказы, где сохранён email без user_id (другой браузер / очистили ключ визита). */
    async attachGuestOrdersByClientEmail(userId, rawEmail) {
        await this.ensureOrdersSchemaCache();
        if (!this.hasOrderCol('client_email')) return;
        const uid = parseInt(String(userId), 10);
        if (!Number.isFinite(uid)) return;
        const em = typeof rawEmail === 'string' ? rawEmail.trim() : '';
        if (!em) return;
        try {
            await this.run(
                `UPDATE orders SET user_id = ?
                 WHERE TRIM(LOWER(COALESCE(client_email,''))) = TRIM(LOWER(?))
                 AND (user_id IS NULL OR user_id = 0)`,
                [uid, em]
            );
        } catch (e) {
            console.warn('[DB] attachGuestOrdersByClientEmail:', e.message);
        }
    }

    async getUserOrdersForCabinet(userId, visitorKey) {
        const uid = parseInt(String(userId), 10);
        if (!Number.isFinite(uid)) return [];
        if (visitorKey) await this.attachVisitorOrdersToUser(uid, visitorKey);
        try {
            const u = await this.get('SELECT email FROM users WHERE id = ?', [uid]);
            if (u?.email) await this.attachGuestOrdersByClientEmail(uid, u.email);
        } catch (e) {
            console.warn('[DB] getUserOrdersForCabinet (email attach):', e.message);
        }
        return this.getUserOrders(uid);
    }

    async addContactMessage({ name, email, phone, message, session_token }) {
        await this.run(
            `INSERT INTO contact_messages (name, email, phone, message, session_token) VALUES (?, ?, ?, ?, ?)`,
            [name || '', email, phone || '', message, session_token || '']
        );
        await this.logActivity({
            userId: null,
            visitorKey: null,
            sessionToken: session_token,
            action: 'contact_form',
            entityType: 'contact',
            entityId: email,
            details: { name }
        });
    }

    /** Админ: обзор цифр */
    async getAdminOverview() {
        const usersCount = await this.get('SELECT COUNT(*) AS n FROM users');
        const ordersCount = await this.get('SELECT COUNT(*) AS n FROM orders');
        const todayOrders = await this.get(
            `SELECT COUNT(*) AS n FROM orders WHERE date(created_at) = date('now')`
        );
        const sumRow = await this.get(`SELECT SUM(price_amount) AS s FROM orders`);
        const todaySum = await this.get(
            `SELECT SUM(price_amount) AS s FROM orders WHERE date(created_at) = date('now')`
        );
        const sessionToday = await this.get(
            `SELECT COUNT(DISTINCT session_token) AS n FROM site_sessions WHERE date(started_at) = date('now')`
        );

        return {
            usersTotal: usersCount?.n ?? 0,
            ordersTotal: ordersCount?.n ?? 0,
            ordersToday: todayOrders?.n ?? 0,
            revenueTotal: sumRow?.s ?? 0,
            revenueToday: todaySum?.s ?? 0,
            sessionsStartedToday: sessionToday?.n ?? 0
        };
    }

    async getAdminSessions(limit = 200) {
        return this.all(
            `SELECT s.*, u.full_name AS user_name, u.email AS user_email
             FROM site_sessions s
             LEFT JOIN users u ON u.id = s.user_id
             ORDER BY datetime(s.last_seen_at) DESC
             LIMIT ?`,
            [limit]
        );
    }

    async getAdminLoginEvents(limit = 100) {
        return this.all(
            `SELECT l.*, u.full_name FROM login_events l
             LEFT JOIN users u ON u.id = l.user_id
             ORDER BY datetime(l.created_at) DESC LIMIT ?`,
            [limit]
        );
    }

    async getAdminUsers() {
        return this.all(`SELECT id, email, full_name, phone, user_type, status, created_at FROM users ORDER BY datetime(created_at) DESC`);
    }

    async getAdminOrders(limit = 500) {
        return this.all(
            `SELECT o.*,
                    u.full_name AS client_name,
                    u.email AS client_email
             FROM orders o
             LEFT JOIN users u ON u.id = o.user_id
             ORDER BY datetime(o.created_at) DESC LIMIT ?`,
            [limit]
        );
    }

    async getAdminActivity(limit = 150) {
        return this.all(
            `SELECT * FROM activity_logs ORDER BY datetime(created_at) DESC LIMIT ?`,
            [limit]
        );
    }

    async getContactMessages(limit = 200) {
        return this.all(`SELECT * FROM contact_messages ORDER BY datetime(created_at) DESC LIMIT ?`, [limit]);
    }
}

const dbInstance = new TransnaftaDB();

module.exports = dbInstance;
