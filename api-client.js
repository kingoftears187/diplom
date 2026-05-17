/**
 * Клиент API (локальный сервер node + SQLite).
 */
class ApiClient {
    constructor(baseUrl) {
        this._fixed = baseUrl ? String(baseUrl).replace(/\/$/, '') : '';
        this.headers = { 'Content-Type': 'application/json' };
    }

    baseUrl() {
        if (this._fixed) return this._fixed;
        if (typeof window !== 'undefined' && typeof window.getApiSiteOrigin === 'function') {
            return window.getApiSiteOrigin() + '/api';
        }
        return 'http://localhost:3000/api';
    }

    async getUserOrders(userId) {
        try {
            let vk = '';
            if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
                if (window.sessionTracker && window.sessionTracker.visitorKey) {
                    vk = String(window.sessionTracker.visitorKey);
                } else if (typeof window.getOrCreateVisitorKey === 'function') {
                    vk = String(window.getOrCreateVisitorKey());
                } else {
                    vk = localStorage.getItem('current_user_id') || '';
                }
            }
            const q = vk ? `?vk=${encodeURIComponent(vk)}` : '';
            const r = await fetch(`${this.baseUrl()}/user/${encodeURIComponent(userId)}/orders${q}`);
            if (!r.ok) return [];
            return await r.json();
        } catch {
            return [];
        }
    }

    async getPaymentMethods(userId) {
        try {
            const r = await fetch(`${this.baseUrl()}/user/${encodeURIComponent(userId)}/payment-methods`);
            if (!r.ok) return [];
            return await r.json();
        } catch {
            return [];
        }
    }

    async addPaymentMethod(userId, payload) {
        const r = await fetch(`${this.baseUrl()}/user/${encodeURIComponent(userId)}/payment-methods`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(payload)
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.message || 'Не удалось привязать карту');
        return data;
    }

    async setDefaultPaymentMethod(userId, methodId) {
        const r = await fetch(`${this.baseUrl()}/user/${encodeURIComponent(userId)}/payment-methods/${encodeURIComponent(methodId)}/default`, {
            method: 'PUT',
            headers: this.headers
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.message || 'Не удалось выбрать карту');
        return data;
    }

    async deletePaymentMethod(userId, methodId) {
        const r = await fetch(`${this.baseUrl()}/user/${encodeURIComponent(userId)}/payment-methods/${encodeURIComponent(methodId)}`, {
            method: 'DELETE',
            headers: this.headers
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.message || 'Не удалось удалить карту');
        return data;
    }

    async payOrder(userId, orderNumber, paymentMethodId) {
        const r = await fetch(`${this.baseUrl()}/user/${encodeURIComponent(userId)}/orders/${encodeURIComponent(orderNumber)}/pay`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ payment_method_id: paymentMethodId })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.message || 'Не удалось оплатить заказ');
        return data;
    }

    async submitOrderBatch(payload) {
        const r = await fetch(`${this.baseUrl()}/orders/batch`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(payload)
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.message || 'Ошибка оформления');
        return data;
    }

    async sendContactMessage(body) {
        const r = await fetch(`${this.baseUrl()}/contact`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body)
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.message || 'Ошибка отправки');
        return data;
    }
}

const apiClient = new ApiClient();
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiClient, apiClient };
}
