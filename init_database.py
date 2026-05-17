#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для инициализации базы данных SQLite для сайта ТрансНафта
Использование: python init_database.py

Создает полную структуру базы данных, индексы и начальные данные.
"""

import sqlite3
import os
from pathlib import Path
from datetime import datetime

# Путь к базе данных
DB_FILE = "transnafta.db"
SQL_SCRIPT = "database.sql"


def create_database():
    """Создает базу данных из SQL скрипта"""
    
    print("🔄 Инициализация базы данных ТрансНафта...")
    
    # Проверяем, существует ли файл базы данных
    db_exists = os.path.exists(DB_FILE)
    
    if db_exists:
        response = input(f"⚠️  База данных '{DB_FILE}' уже существует. Переписать? (y/n): ")
        if response.lower() != 'y':
            print("❌ Отмена операции.")
            return False
        os.remove(DB_FILE)
    
    try:
        # Подключаемся к базе данных
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Читаем SQL скрипт
        if not os.path.exists(SQL_SCRIPT):
            print(f"❌ Ошибка: файл '{SQL_SCRIPT}' не найден!")
            return False
        
        with open(SQL_SCRIPT, 'r', encoding='utf-8') as f:
            sql_script = f.read()
        
        # Выполняем скрипт
        cursor.executescript(sql_script)
        conn.commit()
        
        # Выводим статистику
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        print(f"\n✅ База данных успешно создана: {DB_FILE}")
        print(f"\n📊 Статистика базы данных:")
        print(f"   • Таблиц: {len(tables)}")
        
        # Выводим список таблиц
        print(f"\n📋 Созданные таблицы:")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
            count = cursor.fetchone()[0]
            print(f"   ✓ {table[0]} ({count} записей)")
        
        # Выводим информацию о представлениях
        cursor.execute("SELECT name FROM sqlite_master WHERE type='view'")
        views = cursor.fetchall()
        if views:
            print(f"\n👁️  Представления (Views):")
            for view in views:
                print(f"   ✓ {view[0]}")
        
        conn.close()
        print("\n" + "="*50)
        print("🎉 Инициализация завершена успешно!")
        print("="*50)
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Ошибка SQLite: {e}")
        return False
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False


def verify_database():
    """Проверяет целостность базы данных"""
    if not os.path.exists(DB_FILE):
        print(f"❌ База данных '{DB_FILE}' не найдена!")
        return False
    
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Проверяем целостность
        cursor.execute("PRAGMA integrity_check")
        result = cursor.fetchone()
        
        if result[0] == 'ok':
            print("✅ Целостность базы данных проверена: OK")
        else:
            print(f"⚠️  Результат проверки: {result[0]}")
        
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Ошибка при проверке: {e}")
        return False


def show_database_info():
    """Выводит подробную информацию о базе данных"""
    if not os.path.exists(DB_FILE):
        print(f"❌ База данных '{DB_FILE}' не найдена!")
        return
    
    try:
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        print("\n" + "="*60)
        print("📊 ИНФОРМАЦИЯ О БАЗЕ ДАННЫХ")
        print("="*60)
        
        # Таблицы и их структура
        cursor.execute("""
            SELECT name, sql FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        """)
        
        tables = cursor.fetchall()
        print(f"\n📋 ТАБЛИЦЫ ({len(tables)}):\n")
        
        for table in tables:
            table_name = table['name']
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            cursor.execute(f"SELECT COUNT(*) as cnt FROM {table_name}")
            count = cursor.fetchone()['cnt']
            
            print(f"  ▸ {table_name} ({count} записей)")
            for col in columns:
                col_type = col['type']
                notnull = " ⚠️ NOT NULL" if col['notnull'] else ""
                pk = " 🔑" if col['pk'] else ""
                print(f"    - {col['name']}: {col_type}{pk}{notnull}")
            print()
        
        # Представления
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='view' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        """)
        
        views = cursor.fetchall()
        if views:
            print(f"👁️  ПРЕДСТАВЛЕНИЯ ({len(views)}):\n")
            for view in views:
                print(f"  ✓ {view['name']}")
            print()
        
        # Индексы
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='index' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        """)
        
        indexes = cursor.fetchall()
        if indexes:
            print(f"🔍 ИНДЕКСЫ ({len(indexes)}):\n")
            for idx in indexes:
                print(f"  ✓ {idx['name']}")
            print()
        
        # Статистика памяти
        file_size = os.path.getsize(DB_FILE)
        file_size_mb = file_size / (1024 * 1024)
        print(f"💾 РАЗМЕР ФАЙЛА: {file_size_mb:.2f} MB ({file_size:,} байт)\n")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")


def menu():
    """Главное меню"""
    while True:
        print("\n" + "="*50)
        print("🚛 УПРАВЛЕНИЕ БАЗОЙ ДАННЫХ ТрансНафта")
        print("="*50)
        print("1. 🔨 Создать базу данных")
        print("2. 📊 Показать информацию о БД")
        print("3. ✅ Проверить целостность БД")
        print("4. ❌ Выход")
        print("="*50)
        
        choice = input("\nВыберите действие (1-4): ")
        
        if choice == '1':
            create_database()
        elif choice == '2':
            show_database_info()
        elif choice == '3':
            verify_database()
        elif choice == '4':
            print("\n👋 До свидания!")
            break
        else:
            print("❌ Неверный выбор. Пожалуйста, выберите 1-4.")


if __name__ == "__main__":
    # Проверяем, запущен ли скрипт с аргументами
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        if command == 'create':
            create_database()
        elif command == 'info':
            show_database_info()
        elif command == 'verify':
            verify_database()
        else:
            print(f"Неизвестная команда: {command}")
            print("Доступные команды: create, info, verify")
    else:
        # Интерактивное меню
        menu()
