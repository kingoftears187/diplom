# 🚀 ИНСТРУКЦИЯ: ЗАПУСК СЕРВЕРА И ИНТЕГРАЦИЯ С ФРОНТЕНДА

## ⚡ БЫСТРЫЙ СТАРТ (5 минут)

### 1️⃣ Откройте терминал в папке проекта
```bash
cd "c:\Users\roleg\Desktop\ПП ПЕРЕВОЗКА ГРУЗОВ 2026"
```

### 2️⃣ Установите зависимости
```bash
npm install
```
Это установит: express, cors, body-parser, sqlite3

### 3️⃣ Запустите сервер
```bash
npm start
```

**Результат:**
```
✅ Сервер запущен на http://localhost:3000
✅ База данных инициализирована
✅ API доступен по адресу http://localhost:3000/api
```

### 4️⃣ Откройте браузер
```
http://localhost:3000/
```

---

## 📁 ЧТО СОЗДАНО

| Файл | Описание |
|------|---------|
| **server.js** | Express.js сервер с 40+ API endpoints |
| **db.js** | Модуль работы с БД (30+ методов) |
| **database.sql** | Схема БД (15 таблиц, индексы, триггеры) |
| **transnafta.db** | Файл базы данных SQLite |
| **package.json** | Зависимости Node.js |
| **auth.js** | ✅ ОБНОВЛЕНА - интегрирована с API |
| **api-client.js** | ✅ НОВЫЙ - клиент для работы с API |

---

## 🔗 ИНТЕГРАЦИЯ ФРОНТЕНДА

### Используемые функции в HTML страницах:

#### 🔐 АУТЕНТИФИКАЦИЯ
```html
<!-- В forms -->
<form onsubmit="handleRegister(); return false;">
    <input id="reg-email" type="email" placeholder="Email">
    <input id="reg-password" type="password" placeholder="Пароль">
    <input id="reg-name" type="text" placeholder="ФИО">
    <input id="reg-phone" type="tel" placeholder="Телефон">
    <input id="reg-company" type="text" placeholder="Компания">
    <button type="submit">Зарегистрироваться</button>
</form>

<form onsubmit="handleLogin(); return false;">
    <input id="login-email" type="email" placeholder="Email">
    <input id="login-password" type="password" placeholder="Пароль">
    <button type="submit">Войти</button>
</form>
```

#### 📦 СОЗДАНИЕ ЗАКАЗА
```javascript
async function submitOrder() {
    const orderData = {
        userId: authSystem.getCurrentUser().id,
        serviceId: document.getElementById('service').value,
        fromRegion: document.getElementById('from-region').value,
        toRegion: document.getElementById('to-region').value,
        weight: document.getElementById('weight').value,
        description: document.getElementById('description').value,
        price: 5000 // Расчет на фронтенде или на сервере
    };
    
    try {
        const result = await apiClient.createOrder(orderData);
        showAlert('✅ Заказ создан: ' + result.orderNumber, 'success');
    } catch (error) {
        showAlert('❌ ' + error.message, 'error');
    }
}
```

#### 💳 СОЗДАНИЕ ПЛАТЕЖА
```javascript
async function submitPayment() {
    const paymentData = {
        orderId: document.getElementById('order-id').value,
        userId: authSystem.getCurrentUser().id,
        amount: document.getElementById('amount').value,
        paymentMethod: 'card',
        status: 'pending'
    };
    
    try {
        const result = await apiClient.createPayment(paymentData);
        showAlert('✅ Платеж создан', 'success');
    } catch (error) {
        showAlert('❌ ' + error.message, 'error');
    }
}
```

#### ⭐ СОЗДАНИЕ ОТЗЫВА
```javascript
async function submitReview() {
    const reviewData = {
        userId: authSystem.getCurrentUser().id,
        orderId: document.getElementById('order-id').value,
        rating: parseInt(document.getElementById('rating').value),
        comment: document.getElementById('comment').value
    };
    
    try {
        const result = await apiClient.createReview(reviewData);
        showAlert('✅ Отзыв добавлен', 'success');
    } catch (error) {
        showAlert('❌ ' + error.message, 'error');
    }
}
```

#### 📍 ОТСЛЕЖИВАНИЕ ЗАКАЗА
```javascript
async function loadTracking() {
    const orderId = document.getElementById('order-id').value;
    
    try {
        const tracking = await apiClient.getTracking(orderId);
        if (tracking && tracking.points) {
            tracking.points.forEach(point => {
                console.log(`📍 ${point.location} - ${point.timestamp}`);
            });
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}
```

#### 📨 ТИКЕТ ПОДДЕРЖКИ
```javascript
async function submitSupportTicket() {
    const ticketData = {
        userId: authSystem.getCurrentUser().id,
        subject: document.getElementById('subject').value,
        message: document.getElementById('message').value,
        priority: document.getElementById('priority').value
    };
    
    try {
        const result = await apiClient.createSupportTicket(ticketData);
        showAlert('✅ Тикет создан: ' + result.ticketId, 'success');
    } catch (error) {
        showAlert('❌ ' + error.message, 'error');
    }
}
```

#### 🎟️ ПРОМОКОД
```javascript
async function validatePromo() {
    try {
        const result = await apiClient.validatePromoCode(
            document.getElementById('promo-code').value
        );
        showAlert(`✅ Скидка: ${result.discount}%`, 'success');
    } catch (error) {
        showAlert('❌ ' + error.message, 'error');
    }
}
```

---

## ✅ ТРЕБУЕМЫЕ СКРИПТЫ В HTML

Добавьте в `<head>` каждой страницы, которая работает с API:

```html
<!-- Для аутентификации -->
<script src="auth.js"></script>

<!-- Для работы с API -->
<script src="api-client.js"></script>
```

Например, в **index.html**:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ТрансНафта</title>
    <!-- ... другие scripts ... -->
    <script src="auth.js"></script>
    <script src="api-client.js"></script>
</head>
<body>
    <!-- ... содержимое ... -->
</body>
</html>
```

---

## 🧪 ТЕСТИРОВАНИЕ ENDPOINTS

### 1. Регистрация пользователя
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User",
    "phone": "+7 (123) 456-78-90",
    "companyName": "Test Company"
  }'
```

### 2. Вход
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. Получить услуги
```bash
curl http://localhost:3000/api/services
```

### 4. Создать заказ
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "serviceId": 1,
    "fromRegion": "Москва",
    "toRegion": "Санкт-Петербург",
    "weight": 500,
    "description": "Срочная доставка",
    "price": 5000
  }'
```

### 5. Получить аналитику
```bash
curl http://localhost:3000/api/analytics/daily
curl http://localhost:3000/api/analytics/monthly
curl http://localhost:3000/api/analytics/services
curl http://localhost:3000/api/analytics/regions
```

---

## 🐛 РЕШЕНИЕ ПРОБЛЕМ

### Проблема: "Cannot find module 'express'"
**Решение:**
```bash
npm install
```

### Проблема: "Port 3000 already in use"
**Решение:** Измените порт в server.js:
```javascript
const PORT = 3001; // или другой порт
```

### Проблема: "Database not found"
**Решение:**
```bash
python init_database.py create
```

### Проблема: CORS ошибка в браузере
**Решение:** CORS уже настроена в server.js, но если нужно, проверьте:
```javascript
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
```

---

## 📊 API ENDPOINTS (40+)

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход

### Пользователи
- `GET /api/user/:userId` - Получить профиль
- `PUT /api/user/:userId` - Обновить профиль

### Услуги
- `GET /api/services` - Все услуги
- `GET /api/services/:id` - Одна услуга

### Регионы
- `GET /api/regions` - Все регионы

### Заказы
- `GET /api/user/:userId/orders` - Заказы пользователя
- `POST /api/orders` - Создать заказ
- `GET /api/orders/:orderNumber` - Информация о заказе
- `PUT /api/orders/:orderId/status` - Обновить статус

### Платежи
- `POST /api/payments` - Создать платеж
- `PUT /api/payments/:paymentId/complete` - Завершить платеж
- `GET /api/orders/:orderId/payments` - Платежи заказа

### Отслеживание
- `POST /api/tracking` - Добавить точку отслеживания
- `GET /api/tracking/:orderId` - История отслеживания

### Отзывы
- `POST /api/reviews` - Создать отзыв
- `GET /api/reviews` - Все отзывы
- `GET /api/reviews/stats` - Статистика отзывов

### Поддержка
- `POST /api/support/tickets` - Создать тикет
- `GET /api/support/tickets/open` - Открытые тикеты
- `POST /api/support/tickets/:ticketId/messages` - Добавить сообщение

### Промокоды
- `POST /api/promo/validate` - Проверить промокод
- `POST /api/promo/use` - Использовать промокод

### Аналитика
- `GET /api/analytics/daily` - Ежедневная статистика
- `GET /api/analytics/monthly` - Месячная статистика
- `GET /api/analytics/services` - По услугам
- `GET /api/analytics/regions` - По регионам

---

## 🎯 NEXT STEPS

1. ✅ **Запустить сервер:**
   ```bash
   npm install && npm start
   ```

2. ✅ **Обновить HTML страницы:**
   - Добавить скрипты `auth.js` и `api-client.js`
   - Обновить обработчики форм на использование API

3. ✅ **Протестировать функции:**
   - Регистрация / Вход
   - Создание заказа
   - Просмотр заказов
   - Создание платежа
   - Отзывы и поддержку

4. ✅ **Развернуть на хостинг:**
   - Использовать Heroku, Vercel, DigitalOcean или другой
   - Обновить `apiUrl` в `api-client.js`

---

## 📞 ПОДДЕРЖКА

- **Ошибки сервера:** Проверьте консоль `npm start`
- **Ошибки БД:** Переинициализируйте: `python init_database.py create`
- **Ошибки API:** Используйте curl или Postman для тестирования

**Успехов с сервером! 🚀**
