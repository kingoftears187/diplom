/**
 * Трекинг визитов: сессии и просмотры в SQLite через API сайта (без localStorage для аналитики).
 */

function apiOrigin() {
    if (typeof window !== 'undefined' && typeof window.getApiSiteOrigin === 'function') {
        return window.getApiSiteOrigin();
    }
    if (typeof window === 'undefined') return 'http://localhost:3000';
    var p = window.location.protocol;
    if (p === 'file:' || !window.location.hostname) return 'http://localhost:3000';
    var h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') {
        if (window.location.port === '3000') return window.location.origin;
        return window.location.protocol + '//' + h + ':3000';
    }
    return window.location.origin;
}

function getOrCreateSessionId() {
    let id = localStorage.getItem('current_session_id');
    if (!id) {
        id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 12);
        localStorage.setItem('current_session_id', id);
    }
    return id;
}

function getOrCreateVisitorKey() {
    let id = localStorage.getItem('current_user_id');
    if (!id) {
        id = 'vis_' + Math.random().toString(36).slice(2, 14);
        localStorage.setItem('current_user_id', id);
    }
    return id;
}

/** Вызываем сразу при загрузке скрипта: до window.load уже есть ключи для корзины/заказов. */
if (typeof window !== 'undefined') {
    window.getOrCreateSessionId = getOrCreateSessionId;
    window.getOrCreateVisitorKey = getOrCreateVisitorKey;
    try {
        getOrCreateSessionId();
        getOrCreateVisitorKey();
    } catch (_) {
        /* private mode / недоступен localStorage */
    }
}

function getSyncedUserId() {
    try {
        const raw = localStorage.getItem('current_user');
        if (!raw) return null;
        const u = JSON.parse(raw);
        return u && u.id ? u.id : null;
    } catch {
        return null;
    }
}

async function pingTrack(payload = {}) {
    const base = apiOrigin();
    try {
        await fetch(`${base}/api/track/ping`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (_) {
        /* сервер недоступен при file:// или офлайне */
    }
}

class SessionTracker {
    constructor() {
        this.sessionId = getOrCreateSessionId();
        this.visitorKey = getOrCreateVisitorKey();
        this.init();
    }

    init() {
        this.setupUnload();
    }

    recordPageVisit(title) {
        pingTrack({
            session_token: this.sessionId,
            visitor_key: this.visitorKey,
            user_id: getSyncedUserId(),
            path: window.location.pathname,
            title: title || document.title
        });
    }

    recordAction(type, details = {}) {
        pingTrack({
            session_token: this.sessionId,
            visitor_key: this.visitorKey,
            user_id: getSyncedUserId(),
            path: window.location.pathname,
            title: JSON.stringify({ kind: type, ...details }).slice(0, 480)
        });
    }

    endSession() {
        const base = apiOrigin();
        const body = JSON.stringify({ session_token: this.sessionId });
        try {
            if (navigator.sendBeacon) {
                navigator.sendBeacon(`${base}/api/track/end`, new Blob([body], { type: 'application/json' }));
            } else {
                fetch(`${base}/api/track/end`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body,
                    keepalive: true
                }).catch(() => {});
            }
        } catch (_) {}
        localStorage.removeItem('current_session_id');
    }

    setupUnload() {
        window.addEventListener('beforeunload', () => this.endSession());
    }
}

/** Заглушка для совместимости (заказы пишутся в БД с корзины через API). */
class OrderTracker {
    static notifyCartAdd(data) {
        const st = window.sessionTracker;
        if (st) st.recordAction('cart_add', data);
    }
}

window.addEventListener('load', () => {
    window.sessionTracker = new SessionTracker();
    window.OrderTracker = OrderTracker;
    window.sessionTracker.recordPageVisit(document.title);
});
