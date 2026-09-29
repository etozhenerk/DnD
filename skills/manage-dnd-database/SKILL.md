---
name: manage-dnd-database
description: Design, migrate, and verify the character creator's Yandex Managed PostgreSQL database. Use for SQL schema, constraints, indexes, database access, migrations, and data transfer; leave canonical content files unchanged unless that transfer is explicitly requested.
---

# База данных конструктора

1. Прочитать `AGENTS.md`, `docs/architecture/character-database.md`, `docs/architecture/yandex-postgres.md` и существующие миграции в `backend/migrations/`. Проверить состояние Git и кластера. Канонические герои из `content/` пока не импортируются автоматически.
2. Сначала подготовить версионированную SQL-миграцию. Не зашивать в ограничения БД игровые числа, каталог рас или классов, пока они не утверждены. Сохранять UUID и обратную совместимость будущих миграций.
3. Применять миграцию транзакционно от владельца БД через приватный клиент либо Yandex WebSQL. Для WebSQL включать доступ к кластеру только на время операции, если он не нужен постоянно. Не публиковать хост и не копировать пароль из Lockbox в файл или вывод команд.
4. После применения проверить запись `schema_migrations`, список таблиц, ограничения и индексы запросами к живой БД. При ошибке выяснить фактическое состояние транзакции до повторного запуска.
5. Описать применённую версию, способ проверки и связь с API в `backend/README.md` или документе архитектуры. SQL-миграция меняет структуру, а не наполняет таблицы реальными персонажами без отдельной задачи.

Для изменения правил или нескольких канонических сущностей дополнительно применять `$maintain-dnd-world` после работы с БД.
