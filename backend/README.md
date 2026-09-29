# Бэкенд

Go API конструктора новых персонажей «Хроник Восьми Земель». Контракт находится в [`shared/api/openapi.yaml`](../shared/api/openapi.yaml). Он не меняет шесть готовых героев в `content/` и не добавляет карточки в общую книгу.

## Локальная проверка и запуск

```bash
go test ./...
go vet ./...
DATABASE_URL='postgres://...' CORS_ALLOWED_ORIGINS='https://example.org' go run ./cmd/api
```

`go` запускается из `backend/`. Сервер слушает `PORT` (по умолчанию `8080`) и читает канонические `../content/character-creation.json`, `../content/races.json` и `../content/rules.json`. Для контейнера задайте `CONTENT_DIR` и включите эти три файла в образ. `DATABASE_URL` обязателен; база доступна только из облачной сети. Для облачного подключения используйте TLS и секрет из Lockbox, не сохраняйте строку подключения в репозитории.

`CORS_ALLOWED_ORIGINS` — список полных origin через запятую: схема, домен и при необходимости порт, без пути и завершающего `/`. Укажите действительный адрес фронтенда при развёртывании. `*` не поддерживается. Разрешены `GET`, `POST`, `PATCH`, предварительный `OPTIONS`, заголовки `Authorization` и `Content-Type`. Токен анонимного черновика передаётся как `Authorization: Bearer <token>`; фронтенд должен хранить его локально и не включать в URL. Авторизации пользователя пока нет.

## Состояние API

- `GET /creator/options` возвращает 12 классов и семь игровых рас. Правила v1 утверждены в [`content/character-creation.json`](../content/character-creation.json).
- Черновик создаётся через `POST /drafts`, читается через `GET /drafts/{id}` и сохраняется по разделам через `PATCH /drafts/{id}`. Разделы: `appearance`, `race`, `class`, `attributes`, `abilities`, `equipment`. Браузер держит текущие поля формы и отправляет изменения последовательно; PostgreSQL хранит последнюю сохранённую копию.
- `POST /drafts/{id}/validate` возвращает список ошибок и вычисленные HP/AC. `POST /drafts/{id}/complete` повторно проверяет анкету, сохраняет персонажа, навыки и предметы в одной транзакции и удаляет черновик. Готовые персонажи доступны через `GET /characters` и `GET /characters/{id}`. Редактирование готовой карточки не открыто.
- Навыки и предметы сохраняются как описания с ручным применением эффекта мастером. Формальные эффекты урона, лечения и бонусов отклоняются до утверждения их бюджета. Числовой баланс сейчас гарантируется для характеристик и производных HP/AC, а не для произвольного текста навыка.
- `POST /drafts/{id}/advice` возвращает `advisor_unavailable` до создания агента AI Studio. `POST /drafts/{id}/assets` возвращает `asset_storage_unavailable` до настройки Object Storage. Черновики без портретов и иконок можно завершать.

## PostgreSQL

Миграция [`000001_character_creator.up.sql`](migrations/000001_character_creator.up.sql) применена 29 сентября 2026 года к базе `dnd` кластера `dnd-characters-pg` через Yandex WebSQL. Она создаёт `schema_migrations`, `users`, `character_drafts`, `characters`, `character_abilities`, `character_items` и `character_assets`. Повторно запускать файл в этой базе нельзя. Схема и сетевые параметры описаны в [`docs/architecture/character-database.md`](../docs/architecture/character-database.md) и [`docs/architecture/yandex-postgres.md`](../docs/architecture/yandex-postgres.md).

Реализация API пока не развёрнута в облаке. При развёртывании нужна приватная сетевая связь с PostgreSQL и точный CORS origin фронтенда.
