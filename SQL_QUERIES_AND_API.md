# 📝 SQL Запросы и API примеры для ТрансНафта

## Таблица содержания
1. [Управление пользователями](#управление-пользователями)
2. [Управление заказами](#управление-заказами)
3. [Аналитика и отчёты](#аналитика-и-отчёты)
4. [Отслеживание доставок](#отслеживание-доставок)
5. [Платежи и финансы](#платежи-и-финансы)
6. [Python API примеры](#python-api-примеры)

---

## 👤 Управление пользователями

### Поиск пользователя по email
```sql
SELECT * FROM users 
WHERE email = 'client@example.ru';
```

### Получение всех активных клиентов
```sql
SELECT id, full_name, email, phone, total_orders, total_spent
FROM users
WHERE user_type = 'customer' AND status = 'active'
ORDER BY total_spent DESC;
```

### Регистрация нового пользователя
```sql
INSERT INTO users (email, password_hash, full_name, phone, user_type, avatar_initials, status)
VALUES ('newuser@example.ru', 'hashed_password_here', 'Иван Иванов', '+7 (999) 000-00-00', 'customer', 'И', 'active');
```

### Обновление профиля пользователя
```sql
UPDATE users 
SET full_name = 'Новое имя',
    phone = '+7 (999) 111-11-11',
    company_name = 'ООО Компания',
    inn = '1234567890',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;
```

### Блокировка пользователя
```sql
UPDATE users 
SET status = 'blocked', 
    updated_at = CURRENT_TIMESTAMP
WHERE id = 5;
```

### Получить статистику по пользователям
```sql
SELECT 
    COUNT(*) as total_users,
    SUM(CASE WHEN user_type = 'customer' THEN 1 ELSE 0 END) as customers,
    SUM(CASE WHEN user_type = 'driver' THEN 1 ELSE 0 END) as drivers,
    SUM(CASE WHEN user_type = 'admin' THEN 1 ELSE 0 END) as admins,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users,
    SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked_users
FROM users;
```

### Топ клиентов по количеству заказов
```sql
SELECT 
    u.id,
    u.full_name,
    u.email,
    u.total_orders,
    u.total_spent,
    u.created_at
FROM users u
WHERE u.user_type = 'customer'
ORDER BY u.total_orders DESC
LIMIT 20;
```

### Последние 10 зарегистрированных пользователей
```sql
SELECT full_name, email, phone, user_type, created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🛒 Управление заказами

### Получить все заказы пользователя
```sql
SELECT 
    o.order_number,
    o.status,
    o.cargo_description,
    o.pickup_location,
    o.delivery_location,
    o.total_cost,
    o.payment_status,
    o.created_at,
    s.name as service_name
FROM orders o
LEFT JOIN services s ON o.service_id = s.id
WHERE o.user_id = 1
ORDER BY o.created_at DESC;
```

### Создание нового заказа
```sql
INSERT INTO orders (
    order_number,
    user_id,
    service_id,
    cargo_weight,
    cargo_volume,
    cargo_description,
    pickup_location,
    delivery_location,
    pickup_address,
    delivery_address,
    estimated_distance_km,
    scheduled_pickup,
    scheduled_delivery,
    base_cost,
    total_cost,
    status,
    payment_status
) VALUES (
    'ORD-2026-' || CAST(CAST(random() AS INTEGER) AS TEXT),
    1,
    1,
    5.5,
    25.0,
    'Запчасти для автомобилей',
    'Москва',
    'Санкт-Петербург',
    'ул. Лесная, 5',
    'ул. Невская, 10',
    700,
    datetime('now'),
    datetime('now', '+2 days'),
    5000,
    6750,
    'pending',
    'pending'
);
```

### Обновление статуса заказа
```sql
UPDATE orders
SET status = 'confirmed',
    payment_status = 'paid',
    updated_at = CURRENT_TIMESTAMP
WHERE order_number = 'ORD-2026-12345';
```

### Присвоить водителя и машину к заказу
```sql
UPDATE orders
SET driver_id = 3,
    vehicle_id = 2,
    status = 'in_progress',
    actual_pickup = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;
```

### Завершить заказ
```sql
UPDATE orders
SET status = 'delivered',
    actual_delivery = CURRENT_TIMESTAMP,
    payment_status = 'paid',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;
```

### Отменить заказ
```sql
UPDATE orders
SET status = 'cancelled',
    payment_status = 'refunded',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;
```

### Получить все активные заказы
```sql
SELECT * FROM order_summary
WHERE status IN ('confirmed', 'in_progress')
ORDER BY scheduled_delivery ASC;
```

### Заказы, требующие внимания (задержки)
```sql
SELECT 
    o.order_number,
    u.full_name,
    o.cargo_description,
    o.scheduled_delivery,
    o.status,
    CAST((julianday('now') - julianday(o.scheduled_delivery)) * 24 AS INTEGER) as hours_overdue
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
WHERE o.status IN ('confirmed', 'in_progress')
  AND julianday('now') > julianday(o.scheduled_delivery)
ORDER BY o.scheduled_delivery ASC;
```

### Статистика по статусам заказов
```sql
SELECT 
    status,
    COUNT(*) as count,
    SUM(total_cost) as total_revenue,
    AVG(total_cost) as avg_cost
FROM orders
GROUP BY status;
```

### Заказы за период
```sql
SELECT 
    date(created_at) as date,
    COUNT(*) as orders,
    SUM(total_cost) as revenue
FROM orders
WHERE created_at BETWEEN '2026-01-01' AND '2026-05-31'
GROUP BY date(created_at)
ORDER BY date DESC;
```

---

## 📊 Аналитика и отчёты

### Ежедневный отчёт (сегодня)
```sql
SELECT 
    COUNT(DISTINCT id) as new_orders,
    SUM(total_cost) as today_revenue,
    SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
FROM orders
WHERE date(created_at) = date('now');
```

### Доход по услугам за месяц
```sql
SELECT 
    s.name,
    s.service_type,
    COUNT(o.id) as orders,
    SUM(o.total_cost) as revenue,
    AVG(o.total_cost) as avg_order,
    ROUND(SUM(o.total_cost) * 100.0 / (SELECT SUM(total_cost) FROM orders WHERE status = 'delivered'), 2) as percent_of_total
FROM services s
LEFT JOIN orders o ON s.id = o.service_id AND o.status = 'delivered'
WHERE o.created_at >= date('now', '-30 days')
GROUP BY s.id
ORDER BY revenue DESC;
```

### Ежемесячная динамика
```sql
SELECT 
    strftime('%Y-%m', created_at) as month,
    COUNT(*) as orders,
    SUM(total_cost) as revenue,
    ROUND(AVG(total_cost), 2) as avg_order,
    COUNT(DISTINCT user_id) as unique_customers
FROM orders
WHERE status = 'delivered'
GROUP BY strftime('%Y-%m', created_at)
ORDER BY month DESC
LIMIT 12;
```

### Рост и тренды
```sql
WITH monthly_data AS (
    SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as orders,
        SUM(total_cost) as revenue
    FROM orders
    WHERE status = 'delivered'
    GROUP BY strftime('%Y-%m', created_at)
)
SELECT 
    month,
    orders,
    revenue,
    LAG(orders) OVER (ORDER BY month) as prev_orders,
    LAG(revenue) OVER (ORDER BY month) as prev_revenue,
    ROUND((CAST(orders AS FLOAT) / LAG(orders) OVER (ORDER BY month) - 1) * 100, 2) as growth_percent
FROM monthly_data
ORDER BY month DESC;
```

### Средний рейтинг и отзывы
```sql
SELECT 
    ROUND(AVG(rating), 2) as avg_rating,
    COUNT(*) as total_reviews,
    SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_stars,
    SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_stars,
    SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_stars,
    SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_stars,
    SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
FROM reviews;
```

### Самые популярные маршруты
```sql
SELECT 
    pickup_location,
    delivery_location,
    COUNT(*) as shipments,
    ROUND(AVG(estimated_distance_km), 0) as avg_distance,
    ROUND(AVG(total_cost), 2) as avg_cost,
    MAX(actual_delivery) as last_delivery
FROM orders
WHERE status = 'delivered'
GROUP BY pickup_location, delivery_location
ORDER BY shipments DESC
LIMIT 10;
```

### Анализ доходности по регионам
```sql
SELECT 
    pickup_location as region,
    COUNT(*) as orders,
    SUM(total_cost) as revenue,
    ROUND(AVG(total_cost), 2) as avg_order,
    ROUND(AVG(estimated_distance_km), 0) as avg_distance,
    ROUND(SUM(total_cost) / NULLIF(SUM(estimated_distance_km), 0), 2) as revenue_per_km
FROM orders
WHERE status = 'delivered'
GROUP BY pickup_location
ORDER BY revenue DESC;
```

---

## 🗺️ Отслеживание доставок

### Получить текущее местоположение заказа
```sql
SELECT 
    o.order_number,
    o.status,
    ot.location_name,
    ot.latitude,
    ot.longitude,
    ot.event_type,
    ot.description,
    ot.timestamp
FROM orders o
LEFT JOIN order_tracking ot ON o.id = ot.order_id
WHERE o.order_number = 'ORD-2026-12345'
ORDER BY ot.timestamp DESC
LIMIT 1;
```

### История отслеживания заказа
```sql
SELECT 
    event_type,
    location_name,
    latitude,
    longitude,
    description,
    timestamp
FROM order_tracking
WHERE order_id = 1
ORDER BY timestamp ASC;
```

### Добавить контрольную точку отслеживания
```sql
INSERT INTO order_tracking (order_id, latitude, longitude, location_name, event_type, description)
VALUES (1, 55.7558, 37.6173, 'Москва, ул. Лесная', 'in_transit', 'Проезжаем Москву');
```

### Заказы в пути (с последней позицией)
```sql
SELECT DISTINCT
    o.order_number,
    u.full_name,
    o.pickup_location,
    o.delivery_location,
    ot.location_name,
    ot.event_type,
    ot.timestamp,
    o.scheduled_delivery
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
LEFT JOIN order_tracking ot ON o.id = ot.order_id
WHERE o.status = 'in_progress'
  AND ot.timestamp = (SELECT MAX(timestamp) FROM order_tracking WHERE order_id = o.id)
ORDER BY ot.timestamp DESC;
```

---

## 💳 Платежи и финансы

### Все платежи заказа
```sql
SELECT 
    p.id,
    p.payment_method,
    p.amount,
    p.status,
    p.transaction_id,
    p.payment_date
FROM payments p
WHERE p.order_id = 1
ORDER BY p.created_at DESC;
```

### Создание платежа
```sql
INSERT INTO payments (order_id, user_id, payment_method, amount, status, transaction_id)
VALUES (1, 1, 'card', 6750.00, 'completed', 'TXN-2026-001');
```

### Непроведённые платежи
```sql
SELECT 
    p.id,
    o.order_number,
    u.full_name,
    p.amount,
    p.payment_method,
    p.status,
    p.created_at
FROM payments p
LEFT JOIN orders o ON p.order_id = o.id
LEFT JOIN users u ON p.user_id = u.id
WHERE p.status IN ('pending', 'failed')
ORDER BY p.created_at ASC;
```

### Статистика по методам оплаты
```sql
SELECT 
    payment_method,
    COUNT(*) as transactions,
    SUM(amount) as total,
    ROUND(AVG(amount), 2) as avg_amount,
    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as successful
FROM payments
WHERE payment_date >= date('now', '-30 days')
GROUP BY payment_method
ORDER BY total DESC;
```

### Возмещения и возвраты
```sql
SELECT 
    p.id,
    o.order_number,
    u.full_name,
    p.amount,
    p.payment_date,
    p.notes
FROM payments p
LEFT JOIN orders o ON p.order_id = o.id
LEFT JOIN users u ON p.user_id = u.id
WHERE p.status = 'refunded'
ORDER BY p.payment_date DESC;
```

### Использованные промокоды
```sql
SELECT 
    pc.code,
    COUNT(pu.id) as times_used,
    SUM(pu.discount_amount) as total_discount,
    ROUND(AVG(pu.discount_amount), 2) as avg_discount,
    MAX(pu.created_at) as last_used
FROM promo_codes pc
LEFT JOIN promo_usage pu ON pc.id = pu.promo_id
WHERE pc.is_active = 1
GROUP BY pc.id
ORDER BY times_used DESC;
```

---

## 🐍 Python API примеры

### Подключение к БД
```python
import sqlite3
from datetime import datetime

class TransnaftaDB:
    def __init__(self, db_path='transnafta.db'):
        self.db_path = db_path
        self.conn = None
    
    def connect(self):
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        return self.conn
    
    def disconnect(self):
        if self.conn:
            self.conn.close()
    
    def execute_query(self, query, params=None):
        cursor = self.conn.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        return cursor.fetchall()
    
    def execute_single(self, query, params=None):
        cursor = self.conn.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        return cursor.fetchone()
    
    def insert(self, query, params):
        cursor = self.conn.cursor()
        cursor.execute(query, params)
        self.conn.commit()
        return cursor.lastrowid
    
    def update(self, query, params):
        cursor = self.conn.cursor()
        cursor.execute(query, params)
        self.conn.commit()
        return cursor.rowcount
```

### Примеры методов

```python
# Пример: Получить пользователя по email
def get_user_by_email(db, email):
    result = db.execute_single(
        "SELECT * FROM users WHERE email = ?",
        (email,)
    )
    return dict(result) if result else None

# Пример: Создать заказ
def create_order(db, user_id, service_id, cargo_desc, from_city, to_city, distance, cost):
    query = """
    INSERT INTO orders (
        order_number, user_id, service_id, cargo_description,
        pickup_location, delivery_location, estimated_distance_km,
        base_cost, total_cost, status, payment_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', datetime('now'))
    """
    order_num = f"ORD-{datetime.now().strftime('%Y%m%d')}-{db.execute_single('SELECT COUNT(*) as cnt FROM orders').cnt()}"
    
    params = (order_num, user_id, service_id, cargo_desc, from_city, to_city, distance, cost, cost)
    return db.insert(query, params)

# Пример: Получить статистику
def get_daily_stats(db):
    return dict(db.execute_single("""
        SELECT 
            COUNT(*) as orders,
            SUM(total_cost) as revenue,
            COUNT(DISTINCT user_id) as customers
        FROM orders
        WHERE date(created_at) = date('now')
    """))

# Пример: Обновить статус заказа
def update_order_status(db, order_id, new_status):
    query = "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?"
    return db.update(query, (new_status, order_id))
```

---

## 📱 Интеграция с фронтенд

Примеры для JavaScript:

```javascript
// Получить заказы пользователя
async function getUserOrders(userId) {
    const response = await fetch(`/api/orders?userId=${userId}`);
    const orders = await response.json();
    return orders;
}

// Создать новый заказ
async function createOrder(orderData) {
    const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    });
    return response.json();
}

// Отследить заказ
async function trackOrder(orderNumber) {
    const response = await fetch(`/api/tracking/${orderNumber}`);
    const tracking = await response.json();
    return tracking;
}

// Получить аналитику
async function getAnalytics(period) {
    const response = await fetch(`/api/analytics?period=${period}`);
    const stats = await response.json();
    return stats;
}
```

