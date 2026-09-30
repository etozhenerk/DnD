# Бэкенд

Go API конструктора новых персонажей «Хроник Восьми Земель». Контракт находится в [`shared/api/openapi.yaml`](../shared/api/openapi.yaml). Он не меняет шесть готовых героев в `content/` и не добавляет карточки в общую книгу.

Обязательные соглашения для нового кода: [CODE_STYLE.md](CODE_STYLE.md). Они определяют границы пакетов, обработку ошибок и context, работу с PostgreSQL, HTTP-контракт и приёмку изменений.

CI проверяет форматирование новых Go-файлов через `scripts/check_code_style.py`; существующие пути из `code-style-baseline.json` исключены из этой проверки. Сборки и тесты в текущей рабочей сессии выполняются в CI.

## Локальная проверка и запуск

```bash
go test ./...
go vet ./...
DATABASE_URL='postgres://...' CORS_ALLOWED_ORIGINS='https://example.org' go run ./cmd/api
```

`go` запускается из `backend/`. Сервер слушает `PORT` (по умолчанию `8080`) и читает канонические `../content/character-creation.json`, `../content/races.json` и `../content/rules.json`. Контейнер включает эти три файла и задаёт `CONTENT_DIR`. Для локального запуска используйте `DATABASE_URL`. В облаке используются отдельные `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME`, `DB_PASSWORD`, `DB_SSL_ROOT_CERT`; пароль приходит из Lockbox, TLS проверяет сертификат и имя хоста (`verify-full`). База доступна только из облачной сети. Пул каждого экземпляра API ограничен двумя соединениями.

`CORS_ALLOWED_ORIGINS` — список полных origin через запятую: схема, домен и при необходимости порт, без пути и завершающего `/`. Укажите действительный адрес фронтенда при развёртывании. `*` не поддерживается. Разрешены `GET`, `POST`, `PATCH`, предварительный `OPTIONS`, заголовки `Authorization` и `Content-Type`. Токен анонимного черновика передаётся как `Authorization: Bearer <token>`; фронтенд должен хранить его локально и не включать в URL. Авторизации пользователя пока нет.

## Состояние API

- `GET /creator/options` возвращает 12 классов и семь игровых рас. Правила v1 утверждены в [`content/character-creation.json`](../content/character-creation.json).
- Черновик создаётся через `POST /drafts`, читается через `GET /drafts/{id}` и сохраняется по разделам через `PATCH /drafts/{id}`. Разделы: `appearance`, `race`, `class`, `attributes`, `abilities`, `equipment`. Браузер держит текущие поля формы и отправляет изменения последовательно; PostgreSQL хранит последнюю сохранённую копию.
- `POST /drafts/{id}/validate` возвращает список ошибок и вычисленные HP/AC. `POST /drafts/{id}/complete` повторно проверяет анкету, сохраняет персонажа, навыки и предметы в одной транзакции и удаляет черновик. Готовые персонажи доступны через `GET /characters` и `GET /characters/{id}`. Редактирование готовой карточки не открыто.
- Навыки и предметы сохраняются как описания с ручным применением эффекта мастером. Формальные эффекты урона, лечения и бонусов отклоняются до утверждения их бюджета. Числовой баланс сейчас гарантируется для характеристик и производных HP/AC, а не для произвольного текста навыка.
- `POST /drafts/{id}/advice` возвращает `advisor_unavailable` до создания агента AI Studio. `POST /drafts/{id}/assets` возвращает `asset_storage_unavailable` до настройки Object Storage. Черновики без портретов и иконок можно завершать.

## PostgreSQL

Миграция [`000001_character_creator.up.sql`](migrations/000001_character_creator.up.sql) применена 29 сентября 2026 года к базе `dnd` кластера `dnd-characters-pg` через Yandex WebSQL. Она создаёт `schema_migrations`, `users`, `character_drafts`, `characters`, `character_abilities`, `character_items` и `character_assets`. Повторно запускать файл в этой базе нельзя. Схема и сетевые параметры описаны в [`docs/architecture/character-database.md`](../docs/architecture/character-database.md) и [`docs/architecture/yandex-postgres.md`](../docs/architecture/yandex-postgres.md).

Миграция [`000002_api_permissions.up.sql`](migrations/000002_api_permissions.up.sql) применена 30 сентября 2026 года: пользователь `dnd_api` получает права на черновики и чтение/создание готовых персонажей. Он не управляет схемой, пользователями и миграциями.

## Контейнер и деплой

Образ собирается из корня репозитория:

```bash
docker build -f backend/Dockerfile -t dnd-api .
```

Workflow [deploy-yandex-backend.yml](../.github/workflows/deploy-yandex-backend.yml) проверяет Go, собирает образ и публикует API из `main`. Секретов GitHub и постоянных ключей CI нет: используется OIDC. Параметры облака, HTTPS адрес и порядок проверки описаны в [yandex-backend.md](../docs/architecture/yandex-backend.md).
