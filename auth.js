/**
 * СИСТЕМА АУТЕНТИФИКАЦИИ
 * Управление регистрацией и входом пользователей
 * ✅ Интегрирована с Node.js сервером и БД
 */

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.restoreSession();
    }

    apiEndpoint() {
        if (typeof window !== 'undefined' && typeof window.getApiSiteOrigin === 'function') {
            return window.getApiSiteOrigin() + '/api';
        }
        return 'http://localhost:3000/api';
    }

    async restoreSession() {
        const savedUser = localStorage.getItem('current_user');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                console.log('✅ Сессия восстановлена для:', this.currentUser.email);
            } catch (e) {
                console.error('Ошибка восстановления сессии:', e);
                localStorage.removeItem('current_user');
            }
        }
    }

    async register(email, password, fullName, phone, companyName) {
        try {
            if (!email || !password || !fullName) {
                return { success: false, message: 'Все поля обязательны' };
            }
            if (password.length < 6) {
                return { success: false, message: 'Пароль должен быть минимум 6 символов' };
            }

            const response = await fetch(`${this.apiEndpoint()}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email, password, fullName,
                    phone: phone || '',
                    companyName: companyName || ''
                })
            });

            const data = await response.json();
            if (!response.ok) {
                return { success: false, message: data.message };
            }

            await this.login(email, password);
            return { success: true, message: 'Регистрация успешна!', userId: data.userId };
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            return { success: false, message: 'Ошибка сервера: ' + error.message };
        }
    }

    async login(email, password) {
        try {
            if (!email || !password) {
                return { success: false, message: 'Email и пароль обязательны' };
            }

            const response = await fetch(`${this.apiEndpoint()}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    visitor_key:
                        typeof localStorage !== 'undefined'
                            ? localStorage.getItem('current_user_id') || ''
                            : ''
                })
            });

            const data = await response.json();
            if (!response.ok) {
                return { success: false, message: data.message };
            }

            const idRaw = data.user && (data.user.id != null ? data.user.id : data.user.userId);
            let idNorm = idRaw;
            if (idRaw != null && idRaw !== '') {
                const n = parseInt(String(idRaw), 10);
                if (Number.isFinite(n)) idNorm = n;
            }

            this.currentUser = {
                id: idNorm,
                email: data.user.email,
                fullName: data.user.fullName,
                userType: data.user.userType,
                avatar: data.user.avatar,
                loginTime: new Date().toLocaleString('ru-RU')
            };

            localStorage.setItem('current_user', JSON.stringify(this.currentUser));
            if (typeof window !== 'undefined' && window.sessionTracker && typeof window.sessionTracker.recordPageVisit === 'function') {
                window.sessionTracker.recordPageVisit(document.title);
            }
            console.log('✅ Успешный вход:', email);
            return { success: true, message: 'Вход успешен!', user: this.currentUser };
        } catch (error) {
            console.error('Ошибка входа:', error);
            return { success: false, message: 'Ошибка сервера: ' + error.message };
        }
    }

    async logout() {
        try {
            const email = this.currentUser?.email;
            this.currentUser = null;
            localStorage.removeItem('current_user');
            console.log('✅ Выход:', email);
            return { success: true, message: 'Вы вышли' };
        } catch (error) {
            console.error('Ошибка выхода:', error);
            return { success: false, message: error.message };
        }
    }

    getCurrentUser() {
        if (!this.currentUser) {
            const saved = localStorage.getItem('current_user');
            if (saved) {
                try {
                    this.currentUser = JSON.parse(saved);
                } catch (e) {
                    console.error('Ошибка парсинга пользователя:', e);
                }
            }
        }
        return this.currentUser;
    }

    isAuthenticated() {
        return this.getCurrentUser() !== null;
    }

    async updateProfile(userId, updates) {
        try {
            const response = await fetch(`${this.apiEndpoint()}/user/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            const data = await response.json();
            if (!response.ok) {
                return { success: false, message: data.message };
            }

            this.currentUser = { ...this.currentUser, ...updates };
            localStorage.setItem('current_user', JSON.stringify(this.currentUser));
            return { success: true, message: 'Профиль обновлен', user: data.user };
        } catch (error) {
            console.error('Ошибка обновления профиля:', error);
            return { success: false, message: error.message };
        }
    }

    async getProfile(userId) {
        try {
            const response = await fetch(`${this.apiEndpoint()}/user/${userId}`);
            const user = await response.json();
            return user;
        } catch (error) {
            console.error('Ошибка получения профиля:', error);
            return null;
        }
    }
}

const authSystem = new AuthSystem();

async function handleRegister() {
    const email = document.getElementById('reg-email')?.value;
    const password = document.getElementById('reg-password')?.value;
    const fullName = document.getElementById('reg-name')?.value;
    const phone = document.getElementById('reg-phone')?.value;
    const companyName = document.getElementById('reg-company')?.value;

    if (!email || !password || !fullName) {
        showAlert('⚠️ Заполните все обязательные поля', 'warning');
        return;
    }

    const result = await authSystem.register(email, password, fullName, phone, companyName);
    if (result.success) {
        showAlert('✅ ' + result.message, 'success');
        setTimeout(() => { window.location.href = 'cabinet.html'; }, 1000);
    } else {
        showAlert('❌ ' + result.message, 'error');
    }
}

async function handleLogin() {
    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password')?.value;

    if (!email || !password) {
        showAlert('⚠️ Заполните все поля', 'warning');
        return;
    }

    const result = await authSystem.login(email, password);
    if (result.success) {
        showAlert('✅ ' + result.message, 'success');
        setTimeout(() => { window.location.href = 'cabinet.html'; }, 1000);
    } else {
        showAlert('❌ ' + result.message, 'error');
    }
}

async function handleLogout() {
    const result = await authSystem.logout();
    if (result.success) {
        showAlert('✅ Вы вышли', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    }
}

function showAlert(message, type = 'info') {
    let alertBox = document.getElementById('alert-box');
    if (!alertBox) {
        alertBox = document.createElement('div');
        alertBox.id = 'alert-box';
        alertBox.style.cssText = `position:fixed;top:20px;right:20px;padding:15px 20px;border-radius:8px;font-weight:500;z-index:10000;animation:slideInRight 0.3s ease-out;`;
        document.body.appendChild(alertBox);
    }

    const styles = {
        success: 'background: #10b981; color: white; border-left: 4px solid #059669;',
        error: 'background: #ef4444; color: white; border-left: 4px solid #dc2626;',
        warning: 'background: #f59e0b; color: white; border-left: 4px solid #d97706;',
        info: 'background: #3b82f6; color: white; border-left: 4px solid #1d4ed8;'
    };

    alertBox.style.cssText += styles[type] || styles.info;
    alertBox.textContent = message;
    alertBox.style.display = 'block';

    setTimeout(() => {
        alertBox.style.display = 'none';
    }, 3000);
}

function updateUserUI() {
    const user = authSystem.getCurrentUser();
    if (!user) {
        const userElements = document.querySelectorAll('[data-user-only]');
        userElements.forEach(el => el.style.display = 'none');
        return;
    }

    const userElements = document.querySelectorAll('[data-user-only]');
    userElements.forEach(el => el.style.display = '');

    const userNameElement = document.getElementById('user-name');
    if (userNameElement) userNameElement.textContent = user.fullName;

    const userEmailElement = document.getElementById('user-email');
    if (userEmailElement) userEmailElement.textContent = user.email;

    const userAvatarElement = document.getElementById('user-avatar');
    if (userAvatarElement) userAvatarElement.textContent = user.avatar;
}

window.addEventListener('DOMContentLoaded', updateUserUI);
