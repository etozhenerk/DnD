# Бэкенд

Go API конструктора новых персонажей «Хроник Восьми Земель». Контракт находится в [`shared/api/openapi.yaml`](../shared/api/openapi.yaml). Он не меняет шесть готовых героев в `content/` и не добавляет карточки в общую книгу.

Обязательные соглашения для нового кода: [CODE_STYLE.md](CODE_STYLE.md). Они определяют границы пакетов, обработку ошибок и context, работу с PostgreSQL, HTTP-контракт и приёмку изменений.

CI проверяет форматирование новых Go-файлов через `scripts/check_code_style.py`; существующие пути из `code-style-baseline.json` исключены из этой проверки. Сборки и тесты в текущей рабочей сессии выполняются в CI. `go test -race ./...` включает HTTP/SQL-тесты на отдельной PostgreSQL 17: каждый тест получает собственную временную схему. Ответы options/validate/read дополнительно сверяются с OpenAPI. Production-БД эти тесты не используют; [PostgreSQL service container](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers) работает только внутри job.

## Локальная проверка и запуск

```bash
go test ./...
go vet ./...
DATABASE_URL='postgres://...' CORS_ALLOWED_ORIGINS='https://example.org' go run ./cmd/api
```

`go` запускается из `backend/`. Сервер слушает `PORT` (по умолчанию `8080`) и читает канонические `../content/character-creation.json`, `../content/races.json` , `../content/character-abilities.json` и `../content/rules.json`. Контейнер включает эти четыре файла и задаёт `CONTENT_DIR`. Для локального запуска используйте `DATABASE_URL`. В облаке используются отдельные `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME`, `DB_PASSWORD`, `DB_SSL_ROOT_CERT`; пароль приходит из Lockbox, TLS проверяет сертификат и имя хоста (`verify-full`). База доступна только из облачной сети. Пул каждого экземпляра API ограничен двумя соединениями.

`CORS_ALLOWED_ORIGINS` — список полных origin через запятую: схема, домен и при необходимости порт, без пути и завершающего `/`. Укажите действительный адрес фронтенда при развёртывании. `*` не поддерживается. Разрешены `GET`, `POST`, `PATCH`, предварительный `OPTIONS`, заголовки `Authorization` и `Content-Type`. Токен анонимного черновика передаётся как `Authorization: Bearer <token>`; фронтенд должен хранить его локально и не включать в URL. Авторизации пользователя пока нет.

## Состояние API

- `GET /creator/options` возвращает `rulesetId: character-creation-v2`, 12 классов, семь рас и `abilityRules`: бесплатную базовую атаку, семь профилей навыков, отдельный бюджет 6 и пределы. Характеристики и HP/AC остаются из [`content/character-creation.json`](../content/character-creation.json), навыки — из [`content/character-abilities.json`](../content/character-abilities.json).
- Черновик создаётся через `POST /drafts`, читается через `GET /drafts/{id}` и сохраняется по разделам через `PATCH /drafts/{id}`. Разделы: `appearance`, `race`, `class`, `attributes`, `abilities`, `equipment`. Новые черновики используют v2, начатые v1 завершаются по прежним правилам без автоматического переноса. Браузер держит текущие поля формы и отправляет изменения последовательно; PostgreSQL хранит последнюю сохранённую копию.
- `POST /drafts/{id}/validate` возвращает список ошибок, вычисленные HP/AC и отдельный `skills` с расходом и бюджетом очков навыков для v2. `POST /drafts/{id}/complete` повторно проверяет анкету, сохраняет персонажа, навыки и предметы в одной транзакции и удаляет черновик. Готовые персонажи доступны через `GET /characters` и `GET /characters/{id}`. Редактирование готовой карточки не открыто.
- В `abilities` v2 игрок задаёт `basicAction`, до трёх `items` с `profileId`/`modifierStat` и до трёх `narrativeItems`. Неизвестные поля и неверные типы дают 400 при PATCH; неполный раздел можно сохранить. При validate/complete сервер проверяет бюджет, уникальность ID и профилей, характеристики и лимиты, затем вычисляет кубики, заряды, бонус атаки и `effectText`. Клиентские `effects`, `uses`, `points`, `trigger` и `effectText` не принимаются.
- Готовая карточка хранит базовую атаку, активные навыки и повествовательные особенности в упорядоченном `abilities`. Формальные эффекты имеют `automationMode: automatic` и снимок механики с `profileId` и версией в JSONB; чтение восстанавливает эти данные без пересчёта. Это описание для будущего игрового runtime, его запуск здесь не реализован. Повествовательные особенности, старые навыки v1 и предметы остаются ручными описаниями.
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
