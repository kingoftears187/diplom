# 🚛 База данных ТрансНафта для DBBrowser

## 📋 Оглавление
- [Введение](#введение)
- [Быстрый старт](#быстрый-старт)
- [Структура базы данных](#структура-базы-данных)
- [Таблицы и поля](#таблицы-и-поля)
- [Представления (Views)](#представления-views)
- [Работа с DBBrowser](#работа-с-dbbrowser)
- [Примеры запросов](#примеры-запросов)

## 📖 Введение

Это полнофункциональная база данных SQLite для логистической компании "ТрансНафта". База разработана для работы с инструментом **DBBrowser for SQLite** - простым и удобным графическим редактором для SQLite баз данных.

### Возможности
- ✅ Управление пользователями и аутентификацией
- ✅ Создание и отслеживание заказов
- ✅ Управление водителями и транспортом
- ✅ GPS-отслеживание доставок
- ✅ Система платежей
- ✅ Отзывы и рейтинги
- ✅ Служба поддержки (тикеты)
- ✅ Промокоды и скидки
- ✅ Аналитика и статистика

## 🚀 Быстрый старт

### 1️⃣ Скачайте DBBrowser
- Переходим на [sqlitebrowser.org](https://sqlitebrowser.org/)
- Скачиваем версию для вашей ОС (Windows, macOS, Linux)
- Устанавливаем

### 2️⃣ Создайте базу данных

#### Вариант A: Использование Python скрипта (Рекомендуется)
```bash
# Перейти в папку проекта
cd "ПП ПЕРЕВОЗКА ГРУЗОВ 2026"

# Запустить скрипт (интерактивное меню)
python init_database.py

# Или создать БД напрямую
python init_database.py create

# Показать информацию о БД
python init_database.py info

# Проверить целостность
python init_database.py verify
```

#### Вариант B: Вручную через DBBrowser
1. Откройте DBBrowser
2. Меню: **File → New Database**
3. Выберите папку проекта, назовите **transnafta.db**
4. Меню: **File → Import → From SQL Script**
5. Выберите файл **database.sql**
6. Нажмите **Execute**

#### Вариант C: Использование командной строки SQLite
```bash
cd "ПП ПЕРЕВОЗКА ГРУЗОВ 2026"
sqlite3 transnafta.db < database.sql
```

### 3️⃣ Откройте в DBBrowser
1. Откройте DBBrowser
2. Меню: **File → Open → transnafta.db**
3. Используйте вкладки для навигации:
   - **Database Structure** - просмотр таблиц
   - **Browse Data** - редактирование данных
   - **Edit Pragmas** - настройки БД
   - **Execute SQL** - выполнение запросов

## 🏗️ Структура базы данных

```
transnafta.db
├── Таблицы данных (15)
├── Представления (4)
├── Индексы (17)
└── Триггеры (5)
```

### Диаграмма связей

```
users (центральная таблица)
├── orders (заказы пользователей)
│   ├── order_tracking (GPS отслеживание)
│   ├── payments (платежи)
│   ├── reviews (отзывы)
│   └── promo_usage (использованные промокоды)
├── drivers (водители)
│   └── vehicles (транспортные средства)
├── support_tickets (тикеты поддержки)
│   └── ticket_messages (сообщения)
└── activity_logs (логи активности)

services (услуги)
└── orders (связь через заказы)

delivery_regions (регионы доставки)
promo_codes (промокоды)
analytics (аналитика)
```

## 📊 Таблицы и поля

### 👤 users (Пользователи)
Основная таблица для хранения информации о пользователях (клиенты, администраторы, водители).

| Поле | Тип | Описание |
|------|-----|---------|
| id | INTEGER | Уникальный идентификатор (PK) |
| email | TEXT | Email (UNIQUE) |
| password_hash | TEXT | Хеш пароля |
| full_name | TEXT | ФИО |
| phone | TEXT | Номер телефона |
| user_type | TEXT | Тип: customer/admin/driver |
| avatar_initials | TEXT | Инициалы для аватара |
| company_name | TEXT | Название компании (для БЮЛ) |
| inn | TEXT | ИНН компании |
| kpp | TEXT | КПП компании |
| bik | TEXT | БИК компании |
| account_address | TEXT | Адрес для корреспонденции |
| status | TEXT | active/inactive/blocked |
| created_at | DATETIME | Дата регистрации |
| updated_at | DATETIME | Последнее обновление |
| last_login | DATETIME | Последний вход |
| total_orders | INTEGER | Количество заказов |
| total_spent | DECIMAL | Сумма потрачено |

**Пример:** Иван Петров (client@example.ru), тип: customer

---

### 📦 services (Услуги)
Описание доступных услуг доставки.

| Поле | Тип | Описание |
|------|-----|---------|
| id | INTEGER | Уникальный идентификатор |
| name | TEXT | Название услуги |
| description | TEXT | Описание |
| service_type | TEXT | auto/container/refrigerator/express/warehouse |
| base_price | DECIMAL | Базовая цена |
| price_per_km | DECIMAL | Цена за км |
| price_per_ton | DECIMAL | Цена за тонну |
| max_weight_tons | DECIMAL | Максимальный вес |
| max_volume_m3 | DECIMAL | Максимальный объем |
| icon | TEXT | Emoji или иконка |
| is_active | BOOLEAN | Активна ли услуга |
| created_at | DATETIME | Дата создания |

**Примеры:**
- Автомобильные перевозки (базовая цена 5000₽, 25₽/км)
- Рефрижераторные перевозки (базовая цена 12000₽, 45₽/км)
- Экспресс-логистика (базовая цена 3000₽, 50₽/км)

---

### 🛒 orders (Заказы)
Основная таблица для заказов доставки.

| Поле | Тип | Описание |
|------|-----|---------|
| id | INTEGER | Уникальный идентификатор |
| order_number | TEXT | Номер заказа (unique) |
| user_id | INTEGER | ID пользователя (FK) |
| service_id | INTEGER | ID услуги (FK) |
| status | TEXT | pending/confirmed/in_progress/delivered/cancelled/disputed |
| cargo_weight | DECIMAL | Вес груза (тонны) |
| cargo_volume | DECIMAL | Объем груза (м³) |
| cargo_description | TEXT | Описание груза |
| cargo_type | TEXT | Тип груза |
| pickup_location | TEXT | Город отправки |
| delivery_location | TEXT | Город доставки |
| pickup_address | TEXT | Адрес отправки |
| delivery_address | TEXT | Адрес доставки |
| estimated_distance_km | DECIMAL | Расчётное расстояние |
| scheduled_pickup | DATETIME | Плановое время вывоза |
| scheduled_delivery | DATETIME | Плановое время доставки |
| actual_pickup | DATETIME | Фактическое время вывоза |
| actual_delivery | DATETIME | Фактическое время доставки |
| base_cost | DECIMAL | Базовая стоимость |
| additional_cost | DECIMAL | Дополнительные расходы |
| total_cost | DECIMAL | Итоговая стоимость |
| payment_status | TEXT | pending/paid/partial/refunded |
| driver_id | INTEGER | ID водителя (FK) |
| vehicle_id | INTEGER | ID транспорта (FK) |
| special_requirements | TEXT | Особые требования |
| notes | TEXT | Примечания |
| created_at | DATETIME | Дата создания |
| updated_at | DATETIME | Последнее обновление |

---

### 👨‍✈️ drivers (Водители)
Информация о водителях компании.

| Поле | Тип | Описание |
|------|-----|---------|
| id | INTEGER | Уникальный идентификатор |
| user_id | INTEGER | Связь с таблицей users (FK) |
| license_number | TEXT | Номер водительского удостоверения (UNIQUE) |
| license_category | TEXT | Категория (A, B, C, D и т.д.) |
| license_expiry | DATE | Дата истечения лицензии |
| vehicle_id | INTEGER | Закрепленный автомобиль (FK) |
| status | TEXT | available/on_trip/on_break/inactive |
| total_trips | INTEGER | Количество рейсов |
| rating | DECIMAL | Рейтинг водителя (1-5) |
| experience_years | INTEGER | Опыт (лет) |
| created_at | DATETIME | Дата добавления |

---

### 🚗 vehicles (Транспортные средства)
Данные об автомобилях.

| Поле | Тип | Описание |
|------|-----|---------|
| id | INTEGER | Уникальный идентификатор |
| registration_number | TEXT | Номер регистрации (UNIQUE) |
| vehicle_type | TEXT | truck/container/refrigerator/small |
| brand | TEXT | Марка (Volvo, Scania и т.д.) |
| model | TEXT | Модель |
| year | INTEGER | Год выпуска |
| color | TEXT | Цвет |
| max_weight_tons | DECIMAL | Грузоподъёмность |
| volume_m3 | DECIMAL | Объем кузова |
| fuel_type | TEXT | Тип топлива (дизель, бензин) |
| status | TEXT | active/maintenance/inactive |
| last_inspection | DATE | Последний ТО |
| next_inspection | DATE | Следующий ТО |
| insurance_expiry | DATE | Окончание страховки |
| owner_id | INTEGER | Владелец (FK к users) |
| created_at | DATETIME | Дата добавления |

---

### 📍 order_tracking (Отслеживание заказов)
GPS-точки отслеживания движения груза.

| Поле | Тип | Описание |
|------|-----|---------|
| id | INTEGER | Уникальный идентификатор |
| order_id | INTEGER | ID заказа (FK) |
| latitude | DECIMAL | Широта |
| longitude | DECIMAL | Долгота |
| location_name | TEXT | Название места |
| status | TEXT | Статус в этой точке |
| event_type | TEXT | pickup/in_transit/delivery/stop/delay/issue |
| description | TEXT | Описание события |
| timestamp | DATETIME | Время записи |

---

### 💳 payments (Платежи)
Информация о платежах.

| Поле | Тип | Описание |
|------|-----|---------|
| id | INTEGER | Уникальный идентификатор |
| order_id | INTEGER | ID заказа (FK) |
| user_id | INTEGER | ID пользователя (FK) |
| payment_method | TEXT | card/bank_transfer/cash/invoice |
| amount | DECIMAL | Сумма платежа |
| status | TEXT | pending/completed/failed/refunded |
| transaction_id | TEXT | ID транзакции (UNIQUE) |
| payment_date | DATETIME | Дата платежа |
| notes | TEXT | Примечания |
| created_at | DATETIME | Дата создания |

---

### ⭐ reviews (Отзывы)
Отзывы клиентов о доставке.

| Поле | Тип | Описание |
|------|-----|---------|
| id | INTEGER | Уникальный идентификатор |
| order_id | INTEGER | ID заказа (FK) |
| user_id | INTEGER | ID пользователя (FK) |
| rating | INTEGER | Общий рейтинг (1-5) |
| title | TEXT | Заголовок отзыва |
| comment | TEXT | Текст отзыва |
| delivery_rating | INTEGER | Рейтинг доставки |
| communication_rating | INTEGER | Рейтинг общения |
| price_rating | INTEGER | Рейтинг цены |
| is_anonymous | BOOLEAN | Анонимный отзыв |
| is_verified | BOOLEAN | Проверенный отзыв |
| helpful_count | INTEGER | Количество "полезных" |
| created_at | DATETIME | Дата создания |

---

### 🎟️ support_tickets (Тикеты поддержки)
Система управления запросами в поддержку.

| Поле | Тип | Описание |
|------|-----|---------|
| id | INTEGER | Уникальный идентификатор |
| ticket_number | TEXT | Номер тикета (UNIQUE) |
| user_id | INTEGER | ID пользователя (FK) |
| order_id | INTEGER | Связанный заказ (опционально) |
| category | TEXT | order/payment/delivery/complaint/other |
| priority | TEXT | low/normal/high/urgent |
| subject | TEXT | Тема |
| description | TEXT | Описание проблемы |
| status | TEXT | open/in_progress/resolved/closed/reopened |
| assigned_to | INTEGER | Назначено сотруднику (FK) |
| created_at | DATETIME | Дата создания |
| updated_at | DATETIME | Последнее обновление |
| resolved_at | DATETIME | Дата решения |

---

### 💬 ticket_messages (Сообщения в тикетах)
Переписка в тикетах поддержки.

| Поле | Тип | Описание |
|------|-----|---------|
| id | INTEGER | Уникальный идентификатор |
| ticket_id | INTEGER | ID тикета (FK) |
| sender_id | INTEGER | Отправитель (FK) |
| message | TEXT | Текст сообщения |
| attachment_url | TEXT | Ссылка на вложение |
| is_read | BOOLEAN | Прочитано |
| created_at | DATETIME | Дата отправки |

---

### 🗺️ delivery_regions (Регионы доставки)
Информация о регионах обслуживания.

| Поле | Тип | Описание |
|------|-----|---------|
| id | INTEGER | Уникальный идентификатор |
| region_name | TEXT | Название региона |
| region_code | TEXT | Код региона (UNIQUE) |
| country | TEXT | Страна |
| is_available | BOOLEAN | Доступен ли регион |
| base_price_km | DECIMAL | Базовая цена за км |
| estimated_days | INTEGER | Примерные дни доставки |
| created_at | DATETIME | Дата добавления |

---

### 🎁 promo_codes (Промокоды)
Система скидок и промокодов.

| Поле | Тип | Описание |
|------|-----|---------|
| id | INTEGER | Уникальный идентификатор |
| code | TEXT | Код промокода (UNIQUE) |
| discount_percent | DECIMAL | Скидка в процентах |
| discount_fixed | DECIMAL | Фиксированная скидка |
| max_uses | INTEGER | Максимальное количество использований |
| current_uses | INTEGER | Текущее количество использований |
| min_order_amount | DECIMAL | Минимальная сумма заказа |
| valid_from | DATETIME | Дата начала действия |
| valid_until | DATETIME | Дата окончания действия |
| is_active | BOOLEAN | Активен ли код |
| created_at | DATETIME | Дата создания |

---

### 📈 analytics (Аналитика)
Ежедневная статистика.

| Поле | Тип | Описание |
|------|-----|---------|
| id | INTEGER | Уникальный идентификатор |
| date | DATE | Дата (UNIQUE) |
| total_orders | INTEGER | Всего заказов |
| total_revenue | DECIMAL | Общий доход |
| new_users | INTEGER | Новых пользователей |
| completed_deliveries | INTEGER | Доставлено заказов |
| average_order_value | DECIMAL | Средняя стоимость |
| average_rating | DECIMAL | Средний рейтинг |
| created_at | DATETIME | Дата создания |

---

### 📋 activity_logs (Логи активности)
Запись всех действий в системе.

| Поле | Тип | Описание |
|------|-----|---------|
| id | INTEGER | Уникальный идентификатор |
| user_id | INTEGER | ID пользователя (FK) |
| action | TEXT | Описание действия |
| entity_type | TEXT | Тип сущности (order, payment и т.д.) |
| entity_id | INTEGER | ID сущности |
| old_value | TEXT | Старое значение |
| new_value | TEXT | Новое значение |
| ip_address | TEXT | IP адрес пользователя |
| user_agent | TEXT | User Agent браузера |
| created_at | DATETIME | Дата создания |

---

## 👁️ Представления (Views)

### order_summary
Сводная информация по всем заказам с деталями клиента, услуги и водителя.

```sql
SELECT 
    o.order_number,
    u.full_name as customer_name,
    s.name as service_name,
    o.pickup_location,
    o.delivery_location,
    o.status,
    o.total_cost,
    d.user_id as driver_name
FROM ...
```

### driver_stats
Статистика по водителям (количество рейсов, доход, рейтинг).

### monthly_stats
Ежемесячная статистика (заказы, доход, рейтинг).

### pending_support_tickets
Активные тикеты поддержки, отсортированные по приоритету.

## 🖥️ Работа с DBBrowser

### Открытие БД
1. **File → Open Database**
2. Выберите файл `transnafta.db`

### Просмотр данных
1. Перейдите на вкладку **Browse Data**
2. Выберите таблицу из списка слева
3. Просматривайте, редактируйте или удаляйте записи

### Выполнение SQL запросов
1. Перейдите на вкладку **Execute SQL**
2. Напишите SQL запрос
3. Нажмите **Execute** или **Ctrl+Return**

### Экспорт данных
1. **File → Export**
2. Выберите формат (CSV, SQL, JSON и т.д.)
3. Укажите место сохранения

### Импорт данных
1. **File → Import**
2. Выберите файл и целевую таблицу
3. Настройте параметры импорта

## 📝 Примеры запросов

### Все активные заказы
```sql
SELECT * FROM order_summary 
WHERE status IN ('confirmed', 'in_progress')
ORDER BY scheduled_delivery ASC;
```

### Доход за месяц
```sql
SELECT 
    strftime('%Y-%m', created_at) as month,
    COUNT(*) as orders,
    SUM(total_cost) as revenue,
    AVG(total_cost) as avg_value
FROM orders
WHERE status = 'delivered'
GROUP BY strftime('%Y-%m', created_at)
ORDER BY month DESC;
```

### Топ водителей по количеству доставок
```sql
SELECT * FROM driver_stats
ORDER BY completed_orders DESC
LIMIT 10;
```

### Отзывы с рейтингом выше 4
```sql
SELECT 
    r.title,
    r.comment,
    r.rating,
    u.full_name,
    o.order_number
FROM reviews r
LEFT JOIN users u ON r.user_id = u.id
LEFT JOIN orders o ON r.order_id = o.id
WHERE r.rating >= 4
ORDER BY r.created_at DESC;
```

### Открытые тикеты поддержки
```sql
SELECT * FROM pending_support_tickets
ORDER BY priority, created_at ASC;
```

### Используемые промокоды
```sql
SELECT 
    p.code,
    COUNT(pu.id) as usage_count,
    SUM(pu.discount_amount) as total_discount
FROM promo_codes p
LEFT JOIN promo_usage pu ON p.id = pu.promo_id
WHERE p.is_active = 1
GROUP BY p.id
ORDER BY usage_count DESC;
```

### Статистика по услугам
```sql
SELECT 
    s.name,
    COUNT(o.id) as total_orders,
    SUM(o.total_cost) as revenue,
    AVG(o.total_cost) as avg_order_value,
    COUNT(DISTINCT o.user_id) as unique_customers
FROM services s
LEFT JOIN orders o ON s.id = o.service_id
WHERE o.status = 'delivered'
GROUP BY s.id
ORDER BY revenue DESC;
```

## 📚 Дополнительная информация

### Начальные пользователи
- **Admin**: admin@transnafta.ru (хеш пароля: 5e884898da28047151d0e56f8dc62927)
- **Клиент**: client@example.ru (хеш пароля: d8578edf8458ce06fbc5bb76a58c5ca4)
- **Водитель**: driver@transnafta.ru (хеш пароля: 6512bd43d9caa6e02c990b0a82652dca)

### Индексы
Созданы индексы для оптимизации частых запросов:
- Поиск по email пользователя
- Фильтрация по статусу
- Поиск по ID пользователя в заказах
- Временные диапазоны

### Триггеры
- Автоматическое обновление `updated_at` при изменении записей
- Увеличение счётчика заказов пользователя при создании нового заказа
- Увеличение счётчика использования промокода

## ❓ Решение проблем

### Ошибка при открытии файла
- Убедитесь, что Python установлен
- Проверьте, что файл `database.sql` находится в той же папке
- Попробуйте удалить `transnafta.db` и создать заново

### БД очень медленная
- Используйте вкладку **Pragmas** в DBBrowser
- Установите `cache_size = -64000` (для больших БД)
- Оптимизируйте индексы

### Не видно данных
- Проверьте, что вы выполнили инициализацию БД
- Убедитесь, что БД открыта в DBBrowser (полный путь показан внизу)

## 📞 Контакты

Для вопросов по базе данных:
- Email: support@transnafta.ru
- Телефон: +7 (999) 123-45-67
