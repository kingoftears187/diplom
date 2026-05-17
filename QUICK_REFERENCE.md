# 📖 КРАТКАЯ СПРАВКА ПО БД ТрансНафта

## 🎯 Быстрая помощь (Ctrl+F для поиска)

### ❓ Часто задаваемые вопросы

#### Как создать БД?
```bash
python init_database.py create
```
**Файлы:** `database.sql`, `init_database.py`  
**Документ:** `DB_SETUP_GUIDE.md`

#### Как открыть БД в DBBrowser?
1. Откройте **DB Browser for SQLite**
2. **File → Open Database → transnafta.db**
**Документ:** `DB_SETUP_GUIDE.md` → "Использование в DBBrowser"

#### Какие таблицы есть?
15 таблиц:
- `users`, `orders`, `services`, `drivers`, `vehicles`
- `payments`, `reviews`, `support_tickets`, `ticket_messages`
- `order_tracking`, `delivery_regions`, `promo_codes`, `promo_usage`
- `order_statuses`, `analytics`, `activity_logs`

**Документ:** `DATABASE_GUIDE.md`

#### Как получить все пользователей?
```sql
SELECT * FROM users WHERE user_type = 'customer' AND status = 'active';
```
**Документ:** `SQL_QUERIES_AND_API.md` → "Управление пользователями"

#### Как создать заказ?
```sql
INSERT INTO orders (order_number, user_id, service_id, pickup_location, delivery_location, total_cost)
VALUES ('ORD-001', 1, 1, 'Москва', 'СПб', 6750);
```
**Документ:** `SQL_QUERIES_AND_API.md` → "Управление заказами"

#### Как использовать с Node.js?
```javascript
const db = require('./db');
await db.initialize();
const user = await db.getUserByEmail('client@example.ru');
```
**Файл:** `db.js`  
**Документ:** `SQL_QUERIES_AND_API.md` → "Node.js примеры"

#### Как отследить заказ?
```sql
SELECT * FROM order_tracking WHERE order_id = 1 ORDER BY timestamp DESC;
```
**Документ:** `SQL_QUERIES_AND_API.md` → "Отслеживание доставок"

#### Как получить статистику?
```sql
SELECT * FROM monthly_stats;
```
Или:
```javascript
const stats = await db.getMonthlyStats();
```
**Документ:** `SQL_QUERIES_AND_API.md` → "Аналитика"

#### Где начальные данные?
Загружены автоматически:
- 3 пользователя (admin, client, driver)
- 5 услуг (auto, container, refrigerator, express, warehouse)
- 6 регионов доставки

**Документ:** `DB_STRUCTURE.md` → "Начальные данные"

#### Как проверить целостность БД?
```bash
python init_database.py verify
```
Или:
```bash
sqlite3 transnafta.db "PRAGMA integrity_check;"
```

---

## 📁 Файлы и их назначение

| Файл | Размер | Назначение |
|------|--------|-----------|
| `database.sql` | ~30 KB | SQL схема, 15 таблиц, 17 индексов, 5 триггеров |
| `transnafta.db` | ~100 KB | Готовая SQLite база данных |
| `init_database.py` | ~8 KB | Python скрипт создания и управления БД |
| `db.js` | ~12 KB | Node.js модуль с 30+ готовыми методами |
| `DB_STRUCTURE.md` | ~15 KB | Быстрый обзор всей структуры |
| `DB_SETUP_GUIDE.md` | ~20 KB | Подробное руководство установки |
| `DATABASE_GUIDE.md` | ~40 KB | Справочник по всем таблицам |
| `SQL_QUERIES_AND_API.md` | ~25 KB | 50+ примеров SQL и API |
| `INSTALLATION_CHECKLIST.md` | ~10 KB | Чеклист установки |
| `DB_DOCS_INDEX.md` | ~8 KB | Навигация по документации |

---

## 🗂️ Таблицы и их назначение

### 👤 users
Пользователи системы (клиенты, водители, администраторы)
```sql
SELECT * FROM users WHERE id = 1;
```

### 🛒 orders  
Заказы доставки - самая важная таблица
```sql
SELECT * FROM orders WHERE user_id = 1;
```

### 📦 services
Виды услуг с расценками
```sql
SELECT * FROM services WHERE is_active = 1;
```

### 👨‍✈️ drivers
Водители с лицензиями и статистикой
```sql
SELECT * FROM driver_stats;  -- представление
```

### 🚗 vehicles
Автомобили и техника
```sql
SELECT * FROM vehicles WHERE status = 'active';
```

### 🗺️ order_tracking
GPS отслеживание доставок
```sql
SELECT * FROM order_tracking WHERE order_id = 1;
```

### 💳 payments
Платежи по заказам
```sql
SELECT * FROM payments WHERE order_id = 1;
```

### ⭐ reviews
Отзывы и рейтинги
```sql
SELECT AVG(rating) as avg_rating FROM reviews;
```

### 🎫 support_tickets
Тикеты поддержки
```sql
SELECT * FROM pending_support_tickets;  -- представление
```

### 💬 ticket_messages
Переписка в тикетах
```sql
SELECT * FROM ticket_messages WHERE ticket_id = 1;
```

### 📍 order_statuses
Справочник статусов заказов
```sql
SELECT * FROM order_statuses;
```

### 🗺️ delivery_regions
Регионы доставки
```sql
SELECT * FROM delivery_regions WHERE is_available = 1;
```

### 🎁 promo_codes
Промокоды и скидки
```sql
SELECT * FROM promo_codes WHERE is_active = 1;
```

### 📝 promo_usage
История использования промокодов
```sql
SELECT * FROM promo_usage WHERE order_id = 1;
```

### 📊 analytics
Ежедневная статистика
```sql
SELECT * FROM analytics ORDER BY date DESC LIMIT 30;
```

### 📋 activity_logs
Логи всех действий
```sql
SELECT * FROM activity_logs WHERE user_id = 1;
```

---

## 📊 Представления (Views)

| Представление | Для чего |
|---------------|---------|
| `order_summary` | Сводка по заказам с деталями |
| `driver_stats` | Статистика водителей |
| `monthly_stats` | Ежемесячная статистика |
| `pending_support_tickets` | Открытые тикеты |

**Использование:**
```sql
SELECT * FROM order_summary;
SELECT * FROM monthly_stats;
SELECT * FROM pending_support_tickets;
```

---

## 🔑 Ключевые методы Node.js (db.js)

### Пользователи
```javascript
await db.createUser(userData)
await db.getUserByEmail(email)
await db.getUserById(userId)
await db.verifyPassword(email, password)
await db.updateUserProfile(userId, updates)
```

### Заказы
```javascript
await db.createOrder(orderData)
await db.getUserOrders(userId)
await db.getOrderByNumber(orderNumber)
await db.updateOrderStatus(orderId, status)
await db.getActiveOrders()
```

### Отслеживание
```javascript
await db.addTrackingPoint(trackingData)
await db.getTrackingHistory(orderId)
await db.getLatestLocation(orderId)
```

### Платежи
```javascript
await db.createPayment(paymentData)
await db.completePayment(paymentId)
await db.getOrderPayments(orderId)
```

### Отзывы
```javascript
await db.createReview(reviewData)
await db.getReviews(limit)
await db.getAverageRating()
```

### Аналитика
```javascript
await db.getDailyStats()
await db.getMonthlyStats()
await db.getServiceStats()
await db.getRegionalStats()
```

---

## 🧪 Полезные SQL запросы

### Всё по пользователю
```sql
SELECT * FROM users WHERE id = 1;
```

### Все заказы пользователя
```sql
SELECT * FROM order_summary WHERE id = 1;
```

### Доход за месяц
```sql
SELECT SUM(total_cost) FROM orders 
WHERE strftime('%Y-%m', created_at) = '2026-05';
```

### Средний рейтинг
```sql
SELECT ROUND(AVG(rating), 2) FROM reviews;
```

### Топ водителей
```sql
SELECT * FROM driver_stats ORDER BY completed_orders DESC LIMIT 10;
```

### Активные заказы
```sql
SELECT * FROM order_summary WHERE status IN ('confirmed', 'in_progress');
```

### Непроведённые платежи
```sql
SELECT * FROM payments WHERE status IN ('pending', 'failed');
```

### Открытые тикеты поддержки
```sql
SELECT * FROM pending_support_tickets ORDER BY priority;
```

### Использованные промокоды
```sql
SELECT code, COUNT(*) as used FROM promo_usage pu
JOIN promo_codes pc ON pu.promo_id = pc.id
GROUP BY pc.code ORDER BY used DESC;
```

---

## 🚨 Решение проблем

### БД не создаётся
```bash
# Проверьте, что database.sql существует
ls database.sql

# Или создайте вручную
sqlite3 transnafta.db < database.sql
```

### Python не найден
```bash
python --version    # Должно быть 3.7+
python3 --version   # Если python не работает
```

### DBBrowser не открывает
- Проверьте размер файла: `ls -la transnafta.db`
- Должен быть > 50 KB
- Если меньше, БД не инициализирована

### БД работает медленно
1. Откройте DBBrowser
2. **Edit → Pragmas**
3. Установите `cache_size = -65536`
4. Установите `journal_mode = WAL`

### Данные не сохраняются
- Проверьте, что закрыли транзакцию (`COMMIT`)
- В Node.js используйте `await db.exec()` для INSERT/UPDATE

---

## 💻 Примеры кода

### Node.js: Создать пользователя
```javascript
const userId = await db.createUser({
    email: 'ivan@example.ru',
    password: 'password123',
    fullName: 'Иван Иванов',
    phone: '+7 999 123-45-67'
});
```

### Node.js: Создать заказ
```javascript
const order = await db.createOrder({
    userId: 1,
    serviceId: 1,
    cargoWeight: 5.5,
    cargoDescription: 'Запчасти',
    pickupLocation: 'Москва',
    deliveryLocation: 'СПб',
    estimatedDistance: 700,
    baseCost: 6750
});
```

### Python: Получить заказы
```python
import sqlite3
conn = sqlite3.connect('transnafta.db')
cursor = conn.cursor()
cursor.execute('SELECT * FROM orders WHERE user_id = ?', (1,))
orders = cursor.fetchall()
```

### JavaScript в браузере (fetch API)
```javascript
const orders = await fetch('/api/user/1/orders')
    .then(r => r.json());
```

---

## 📞 Контакты и поддержка

### Документация
- **DB_STRUCTURE.md** — быстрый обзор
- **DB_SETUP_GUIDE.md** — установка и настройка
- **DATABASE_GUIDE.md** — справочник таблиц
- **SQL_QUERIES_AND_API.md** — примеры
- **INSTALLATION_CHECKLIST.md** — пошаговая проверка

### Команды
```bash
python init_database.py create   # Создать БД
python init_database.py info     # Информация
python init_database.py verify   # Проверить целостность
sqlite3 transnafta.db            # Открыть CLI
```

### Инструменты
- **DBBrowser for SQLite** — графический интерфейс (https://sqlitebrowser.org/)
- **VS Code** — редактор с SQL поддержкой
- **SQLite CLI** — командная строка

---

## ✨ Начните отсюда

1. **Быстрая справка**: этот документ (30 сек)
2. **Структура**: `DB_STRUCTURE.md` (5 мин)
3. **Установка**: `DB_SETUP_GUIDE.md` → "Быстрая установка" (5 мин)
4. **Тестирование**: откройте в DBBrowser и поищите данные (5 мин)
5. **Примеры**: `SQL_QUERIES_AND_API.md` (15 мин)

**Всего: 30 минут до полного понимания! ⏱️**

---

**Версия:** 1.0  
**Дата:** май 2026  
**Автор:** ТрансНафта DB Team
