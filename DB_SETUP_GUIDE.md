# 🚛 ПОЛНОЕ РУКОВОДСТВО: БАЗА ДАННЫХ ТрансНафта для DBBrowser

## 📋 Содержание

1. [Что создано](#что-создано)
2. [Быстрая установка (5 минут)](#быстрая-установка-5-минут)
3. [Детальная установка](#детальная-установка)
4. [Использование в DBBrowser](#использование-в-dbbrowser)
5. [Интеграция с сайтом](#интеграция-с-сайтом)
6. [Полезные команды](#полезные-команды)

---

## 📦 Что создано

### Файлы БД
- **`database.sql`** — Полная SQL-схема со всеми таблицами, индексами и триггерами
- **`transnafta.db`** — Готовая база данных SQLite (создаётся после инициализации)

### Утилиты
- **`init_database.py`** — Python скрипт для создания и управления БД
- **`db.js`** — Node.js модуль для работы с БД

### Документация
- **`DATABASE_GUIDE.md`** — Полное описание всех таблиц и полей
- **`SQL_QUERIES_AND_API.md`** — Примеры SQL запросов и API примеры
- **`DB_SETUP_GUIDE.md`** — Этот файл

### Структура БД
```
15 таблиц:
✓ users            — пользователи, клиенты, водители, админы
✓ services         — услуги доставки
✓ orders           — заказы
✓ drivers          — информация о водителях
✓ vehicles         — автомобили и техника
✓ order_tracking   — GPS отслеживание
✓ payments         — платежи
✓ reviews          — отзывы и рейтинги
✓ support_tickets  — тикеты поддержки
✓ ticket_messages  — переписка в тикетах
✓ order_statuses   — статусы заказов
✓ delivery_regions — регионы доставки
✓ promo_codes      — промокоды и скидки
✓ promo_usage      — использованные промокоды
✓ analytics        — статистика
✓ activity_logs    — логи активности

4 представления (Views):
✓ order_summary          — сводка по заказам
✓ driver_stats           — статистика водителей
✓ monthly_stats          — ежемесячная статистика
✓ pending_support_tickets — открытые тикеты

17 индексов для оптимизации
5 триггеров для автоматизации
```

---

## 🚀 Быстрая установка (5 минут)

### Шаг 1: Скачайте DBBrowser
- Перейдите на https://sqlitebrowser.org/
- Скачайте версию для вашей ОС
- Установите программу

### Шаг 2: Создайте БД (самый быстрый способ)

#### Способ A: Через Python (РЕКОМЕНДУЕТСЯ)

1. Откройте терминал/командную строку
2. Перейдите в папку проекта:
   ```bash
   cd "ПП ПЕРЕВОЗКА ГРУЗОВ 2026"
   ```

3. Запустите скрипт:
   ```bash
   python init_database.py
   ```

4. Выберите пункт 1: **Создать базу данных**

5. ✅ Готово! Файл `transnafta.db` создан

#### Способ B: Через командную строку SQLite

```bash
cd "ПП ПЕРЕВОЗКА ГРУЗОВ 2026"
sqlite3 transnafta.db < database.sql
```

### Шаг 3: Откройте в DBBrowser

1. Запустите **DB Browser for SQLite**
2. Нажмите **File → Open Database**
3. Выберите файл **`transnafta.db`** из папки проекта
4. ✅ БД открыта и готова к использованию!

---

## 🔧 Детальная установка

### Требования

- **Python 3.7+** (для скрипта `init_database.py`)
  - Windows: https://www.python.org/downloads/
  - macOS: `brew install python3`
  - Linux: `sudo apt install python3`

- **SQLite3** (обычно встроенный)
  - Windows: https://www.sqlite.org/download.html
  - macOS: встроен в систему
  - Linux: `sudo apt install sqlite3`

- **DB Browser for SQLite** (графический интерфейс)
  - https://sqlitebrowser.org/

- **Node.js 12+** (только если используете `db.js`)
  - https://nodejs.org/

### Вариант 1: Полная инициализация (Рекомендуется)

```bash
# 1. Перейдите в папку проекта
cd "C:\Users\YourUser\Desktop\ПП ПЕРЕВОЗКА ГРУЗОВ 2026"

# 2. Проверьте версию Python
python --version

# 3. Запустите скрипт
python init_database.py

# 4. В меню выберите опцию 1 (Создать базу данных)
# 5. Ответьте на вопрос о перезаписи (если БД уже существует)
```

**Вывод:**
```
✅ База данных успешно создана: transnafta.db

📊 Статистика базы данных:
   • Таблиц: 15
   
📋 Созданные таблицы:
   ✓ users (3 записей)
   ✓ services (5 записей)
   ✓ orders (0 записей)
   ✓ drivers (0 записей)
   ...
```

### Вариант 2: Через DBBrowser GUI

1. Откройте **DB Browser for SQLite**
2. Меню: **File → New Database**
3. Сохраните как: **`transnafta.db`** в папку проекта
4. Перейдите на вкладку: **Execute SQL**
5. Откройте файл: **`database.sql`**
6. Скопируйте весь текст в окно запроса
7. Нажмите: **Execute → Run**
8. Проверьте: **Database Structure** → должно быть 15 таблиц

### Вариант 3: Через командную строку

**Windows (PowerShell):**
```powershell
cd "C:\Users\YourUser\Desktop\ПП ПЕРЕВОЗКА ГРУЗОВ 2026"
sqlite3.exe transnafta.db < database.sql
```

**macOS/Linux:**
```bash
cd ~/Desktop/"ПП ПЕРЕВОЗКА ГРУЗОВ 2026"
sqlite3 transnafta.db < database.sql
```

---

## 📊 Использование в DBBrowser

### Открытие БД

1. Запустите **DB Browser for SQLite**
2. **File → Open Database**
3. Выберите **`transnafta.db`**
4. Нажмите **Open**

### Основные вкладки

#### 📋 Database Structure
- Просмотр всех таблиц
- Просмотр полей каждой таблицы
- Просмотр индексов
- Просмотр триггеров
- Просмотр представлений (Views)

**Как использовать:**
1. В левой панели видите список таблиц
2. Кликните на таблицу чтобы увидеть её поля
3. Внизу видны: Column Name, Type, Constraints

#### 📱 Browse Data
- Просмотр и редактирование данных
- Добавление новых записей
- Удаление записей
- Фильтрация и сортировка

**Как использовать:**
1. Выберите таблицу из списка
2. Двойклик на ячейку для редактирования
3. Нажмите **New Record** чтобы добавить запись
4. Используйте фильтр вверху для поиска

#### ⚙️ Edit Pragmas
- Настройки БД
- Оптимизация производительности

**Важные параметры:**
- `cache_size`: увеличить на `-65536`
- `foreign_keys`: включить (1)
- `journal_mode`: переключить на WAL

#### 🔍 Execute SQL
- Выполнение SQL запросов
- Просмотр результатов
- Экспорт результатов

**Как использовать:**
1. Перейдите на вкладку **Execute SQL**
2. Напишите SQL запрос (примеры ниже)
3. Нажмите **Execute** или **Ctrl+Enter**
4. Результаты появятся внизу

### Примеры запросов в DBBrowser

#### Просмотр всех пользователей
```sql
SELECT * FROM users;
```

#### Просмотр последних 10 заказов
```sql
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;
```

#### Просмотр статистики
```sql
SELECT * FROM order_summary;
```

#### Поиск клиента по email
```sql
SELECT * FROM users WHERE email LIKE '%example%';
```

#### Заказы в статусе "в пути"
```sql
SELECT * FROM orders WHERE status = 'in_progress';
```

### Экспорт данных

1. **File → Export**
2. Выберите таблицу
3. Выберите формат:
   - CSV (для Excel)
   - JSON (для JavaScript)
   - SQL (для другой БД)
   - HTML (для веб)
4. Нажмите **Export**

### Импорт данных

1. **File → Import**
2. Выберите таблицу
3. Выберите файл (CSV, JSON и т.д.)
4. Настройте параметры
5. Нажмите **Import**

---

## 🔗 Интеграция с сайтом

### Node.js интеграция

Если вы используете Node.js для бэкенда:

#### 1. Установите зависимость
```bash
npm install sqlite3
```

#### 2. Используйте модуль `db.js`

```javascript
const db = require('./db');

// Инициализация
async function main() {
    try {
        await db.initialize();
        
        // Создать пользователя
        const userId = await db.createUser({
            email: 'ivan@example.ru',
            password: 'password123',
            fullName: 'Иван Иванов',
            phone: '+7 999 123-45-67'
        });
        
        // Создать заказ
        const order = await db.createOrder({
            userId: userId,
            serviceId: 1,
            cargoWeight: 5.5,
            cargoDescription: 'Грузоперевозка'
            // ... остальные параметры
        });
        
        // Получить статистику
        const stats = await db.getDailyStats();
        console.log('Статистика:', stats);
        
        await db.close();
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

main();
```

### Python интеграция

Если вы используете Python для бэкенда:

```python
import sqlite3
from datetime import datetime

class DB:
    def __init__(self):
        self.conn = sqlite3.connect('transnafta.db')
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()
    
    def get_user(self, email):
        self.cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        return dict(self.cursor.fetchone() or {})
    
    def get_orders(self, user_id):
        self.cursor.execute('SELECT * FROM orders WHERE user_id = ?', (user_id,))
        return [dict(row) for row in self.cursor.fetchall()]

# Использование
db = DB()
user = db.get_user('client@example.ru')
orders = db.get_orders(user['id'])
```

### Express.js API пример

```javascript
const express = require('express');
const db = require('./db');
const app = express();

app.use(express.json());

// Инициализация БД при запуске
app.use(async (req, res, next) => {
    if (!db.db) await db.initialize();
    next();
});

// API: Получить профиль пользователя
app.get('/api/user/:email', async (req, res) => {
    try {
        const user = await db.getUserByEmail(req.params.email);
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Создать заказ
app.post('/api/orders', async (req, res) => {
    try {
        const order = await db.createOrder(req.body);
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Получить заказы пользователя
app.get('/api/user/:userId/orders', async (req, res) => {
    try {
        const orders = await db.getUserOrders(req.params.userId);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Отследить заказ
app.get('/api/tracking/:orderNumber', async (req, res) => {
    try {
        const order = await db.getOrderByNumber(req.params.orderNumber);
        const tracking = await db.getTrackingHistory(order.id);
        res.json(tracking);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('API запущен на http://localhost:3000');
});
```

---

## 🛠️ Полезные команды

### Управление БД через Python скрипт

#### Создать БД
```bash
python init_database.py create
```

#### Показать информацию о БД
```bash
python init_database.py info
```

#### Проверить целостность
```bash
python init_database.py verify
```

#### Интерактивное меню
```bash
python init_database.py
```

### Командная строка SQLite

#### Открыть БД в интерактивном режиме
```bash
sqlite3 transnafta.db
```

#### Выполнить запрос
```bash
sqlite3 transnafta.db "SELECT * FROM users LIMIT 5;"
```

#### Создать резервную копию
```bash
sqlite3 transnafta.db ".dump" > backup.sql
```

#### Восстановить из резервной копии
```bash
sqlite3 transnafta.db < backup.sql
```

#### Проверить целостность
```bash
sqlite3 transnafta.db "PRAGMA integrity_check;"
```

#### Оптимизировать БД
```bash
sqlite3 transnafta.db "VACUUM;"
```

---

## ✅ Проверка установки

### Проверка 1: Файл БД существует
```bash
ls -la transnafta.db
```
Должен быть файл размером > 50 KB

### Проверка 2: БД открывается в DBBrowser
1. Откройте DBBrowser
2. File → Open → transnafta.db
3. Должны видеть 15 таблиц в левой панели

### Проверка 3: Таблицы созданы
В DBBrowser, вкладка **Database Structure**, должны видеть:
- ✓ users
- ✓ orders
- ✓ services
- ✓ drivers
- ✓ vehicles
- ✓ payments
- ✓ reviews
- ... и остальные

### Проверка 4: Начальные данные загружены
В DBBrowser, вкладка **Browse Data**:
1. Выберите таблицу **services**
2. Должно быть 5 услуг
3. Выберите таблицу **users**
4. Должно быть 3 пользователя

### Проверка 5: Запросы работают
В DBBrowser, вкладка **Execute SQL**:
```sql
SELECT COUNT(*) as cnt FROM services;
```
Должно вернуть: `5`

---

## 🆘 Решение проблем

### БД не создаётся
**Проблема:** `файл database.sql не найден`
**Решение:**
- Убедитесь, что вы в правильной папке: `cd "ПП ПЕРЕВОЗКА ГРУЗОВ 2026"`
- Проверьте наличие файла `database.sql`

### Python не найден
**Проблема:** `'python' не найдено`
**Решение:**
- Установите Python с https://www.python.org/
- Убедитесь, что Python добавлен в PATH
- Используйте `python3` вместо `python`

### DBBrowser не открывает БД
**Проблема:** `Ошибка при открытии файла`
**Решение:**
- Убедитесь, что БД полностью создана
- Попробуйте создать БД заново
- Проверьте права доступа к файлу

### БД работает медленно
**Решение:**
1. В DBBrowser: **Edit → Pragmas**
2. Установите `cache_size = -65536`
3. Установите `journal_mode = WAL`
4. Выполните команду: `PRAGMA optimize;`

### Ошибка при запуске скрипта
**Решение:**
```bash
# Проверьте версию Python
python --version

# Должно быть 3.7 или выше
# Если нет, установите Python 3.9+
```

---

## 📚 Дополнительные материалы

- **DATABASE_GUIDE.md** — Полное описание всех таблиц
- **SQL_QUERIES_AND_API.md** — SQL запросы и примеры
- **db.js** — Node.js модуль для работы с БД
- **init_database.py** — Python скрипт управления

---

## 💬 Начальные пользователи для тестирования

```
Email: admin@transnafta.ru
Пароль: (MD5 hash: 5e884898da28047151d0e56f8dc62927)

Email: client@example.ru
Пароль: (MD5 hash: d8578edf8458ce06fbc5bb76a58c5ca4)

Email: driver@transnafta.ru
Пароль: (MD5 hash: 6512bd43d9caa6e02c990b0a82652dca)
```

---

## 📞 Поддержка

Если у вас возникли проблемы:

1. Проверьте, что все файлы на месте:
   - ✓ `database.sql`
   - ✓ `init_database.py`
   - ✓ `db.js`
   - ✓ `DATABASE_GUIDE.md`

2. Просмотрите логи ошибок в терминале

3. Проверьте, что установлены все зависимости:
   ```bash
   python --version  # 3.7+
   sqlite3 --version  # 3.8+
   ```

4. Попробуйте переустановить БД:
   ```bash
   python init_database.py create
   ```

---

**Версия:** 1.0  
**Дата создания:** Май 2026  
**ТрансНафта — Логистическая компания России**
