# Восстановление сервиса в Yandex Cloud

Дата фиксации: **14 октября 2026**. Облако временно выводится из эксплуатации по решению владельца. Восстановление создаёт **пустую БД и пустой медиа-бакет**: тестовые персонажи, диалоги и загруженные изображения намеренно не сохраняются. Канонические кампании, герои, ассеты, Go/React-код и SQL-миграции остаются в репозитории.

## 1. Что было развёрнуто

| Часть | Реализация и параметры | Исторический ресурс |
| --- | --- | --- |
| Фронт | React 19 / TS / Vite; статический сайт Object Storage, STANDARD, лимит 10 ГиБ, index/error `index.html` | `dnd-etozhenerk-b1g8siv8ve2si1qp04nm` |
| API | Go, приватный Serverless Container: 1 vCPU, 512 МБ, 100%, concurrency 12, timeout 120 с, provisioned 0, до 1 экземпляра на зону | `bbam71p2dn50q57l250i` |
| HTTPS API | API Gateway проксирует все пути и методы в контейнер; отдельный аккаунт вызова | `d5dopqqib47kpsh6929m` |
| БД | Managed PostgreSQL 17, PRODUCTION, 1 приватный хост в ru-central1-b, `c4a-c2-m4` (2 vCPU / 4 ГБ), SSD 20 ГБ | `c9qdojtaghn6i5h4vq4o` |
| Медиа | Закрытый Object Storage, STANDARD, лимит 1 ГиБ, версии выключены; `characters/` постоянный, `advisor/` удаляется через 2 дня | `dnd-character-media-b1g8siv8ve2si1qp04nm` |
| Docker | Container Registry, linux/amd64; образ `dnd-api:<git-sha>` | `crp3ok452qdp2r44ene5` |
| Секреты | Lockbox / Connection Manager, отдельные пользователи `dnd_owner` и `dnd_api`; пароль API подставляет платформа | Два секрета подключения |
| Советник | AI Studio через API: DeepSeek V4 Flash; компоновщик изображений YandexGPT Lite 5; Alice AI ART 3.0 | Отдельного сохранённого агента AI Studio нет |
| LLM-пилот | A100 80 ГБ, 28 CPU / 119 ГБ, SSD 150 ГБ; Qwen3.8-27B / vLLM | `infra/llm/` |
| CPU-пилот | standard-v4a, 8 CPU / 16 ГБ, SSD 40 ГБ; Qwen3.5-9B Q4_K_M / llama.cpp, 2 слота | `infra/llm-cpu/` |

Каталог: `b1g8siv8ve2si1qp04nm`, облако: `b1gslf6gm8gn0v36r53e`. На момент инвентаризации обе ВМ уже отсутствовали; сохранились SSD CPU-пилота 40 ГБ и два зарезервированных IP. Профили ВМ восстанавливаются по скриптам и README, а не по этим IP.

Фактические настройки и привязки до удаления: [reference-2026-10-14.json](../../infra/yandex/reference-2026-10-14.json). Паролей, приватных ключей, дампов и объектов там нет. Старые ID, IP, имя хоста БД и адрес API — **исторические**, после создания заменить на новые.

Сети `default` (создана в феврале) и `default-1` (в марте), их подсети, default security groups и автоматические DNS-зоны существовали до проекта. Они не удаляются как чужая инфраструктура. DnD использовал `default-1`; новая установка может использовать её либо отдельную сеть.

## 2. Версия кода и граница незавершённой работы

Последняя реально работавшая ревизия — `bbamshmvr7so1oj1g1lk`, commit **00e1c8ce773e215393bf26395fb5b6db5b7c65e9**. Это точка восстановления прежнего сервиса. Новые локальные изменения навыков/предметов v4 ещё не завершены и не проверены CI; их нельзя автоматически объявлять прежним production-кодом.

В облако были применены **000001–000009**. `000010_character_loadout.up.sql` подготовлена локально, но до вывода облака из эксплуатации **не применена**. Для прежней версии применить только 000001–000009. Для будущей v4 сначала закончить код, провести CI и отдельно применить 000010. Применённые миграции не редактировать.

## 3. Подготовка

1. Установить официальный [yc CLI](https://yandex.cloud/ru/docs/cli/operations/install-cli), выполнить `yc init`, выбрать облако и каталог. Проверить `yc resource-manager folder get` и права. Не публиковать OAuth/IAM-токены.
2. Перед покупкой ресурсов проверить действующие тарифы, грант, GPU/SSD-квоты и наличие платформы/образа в выбранной зоне. Старые расчёты стоимости в документах — исторические.
3. Выбрать проверенный commit или закончить текущую работу. Сборки и тесты выполнять в CI; локальные сборки по решению пользователя запрещены.
4. Назначить переменные **DND_FOLDER_ID**, **DND_NETWORK_ID**, **DND_SUBNET_B_ID**. Имена создаваемых ресурсов прежние, идентификаторы получаются заново.
5. Облачные workflow пока выключены: `DND_YANDEX_CLOUD_ENABLED` должен отсутствовать или быть `false`. Включать только после подготовки ресурсов и обновления ID.

## 4. Сеть и PostgreSQL

Создать/выбрать VPC и подсеть ru-central1-b. Создать security group `dnd-postgres-private` с ingress TCP 6432 от `198.19.0.0/16` (служебный диапазон Serverless внутри VPC). Дополнительная `dnd-api-db-client` нужна только для будущего клиента на ВМ; разрешить её как источник для БД, egress 6432 к группе БД. Не добавлять публичный IP БД и `0.0.0.0/0` на PostgreSQL.

Пример создания кластера (значения переменных определяются при восстановлении; CLI 1.41):

```bash
yc managed-postgresql cluster create dnd-characters-pg \
  --folder-id "$DND_FOLDER_ID" --environment production \
  --network-id "$DND_NETWORK_ID" --security-group-ids "$DND_PG_SECURITY_GROUP_ID" \
  --postgresql-version 17 --resource-preset c4a-c2-m4 \
  --disk-size 20GB --disk-type network-ssd \
  --host "zone-id=ru-central1-b,subnet-id=$DND_SUBNET_B_ID,assign-public-ip=false" \
  --user 'name=dnd_owner,generate-password=true,conn-limit=50' \
  --database 'name=dnd,owner=dnd_owner' \
  --backup-window-start 22:00:00 --backup-retain-period-days 7 \
  --deletion-protection
```

Создать `dnd_api` с генерируемым Connection Manager паролем, доступом к `dnd`, лимитом 10 соединений. Взять новый FQDN из `yc managed-postgresql hosts list`; API использует порт **6432**, TLS `verify-full`, CA [Yandex](https://storage.yandexcloud.net/cloud-certs/CA.pem), пул API максимум **2 соединения на экземпляр**.

Схему применить от `dnd_owner` через приватный SQL-клиент либо временный WebSQL. Для WebSQL включить `--websql-access=true` только на время операции и отключить сразу после проверки. Исполнить `.up.sql` **по порядку 000001–000009**, включая permissions 000002, 000005, 000007. Проверить `schema_migrations`, таблицы и GRANT. Канонических героев из `content/` автоматически не импортировать.

SQL-права API: CONNECT `dnd`, USAGE `public`; SELECT/INSERT/UPDATE/DELETE `character_drafts`; SELECT/INSERT `characters`, `character_abilities`, `character_items`, `character_assets`; SELECT/INSERT/UPDATE `advisor_sessions`, `advisor_turns`, `advisor_months`. API не выполняет миграции при запуске. До авторизации HTTP `/drafts` остаётся закрытым.

Сохранять пароли только в новых Lockbox/Connection Manager секретах. Получить ID/version/key секрета `dnd_api`, обновить ссылку в workflow. Значение не писать в файл, GitHub variable, логи или документацию.

## 5. Аккаунты и IAM

Создать четыре основных сервисных аккаунта; выдавать роли на указанный ресурс, а не на всё облако:

| Аккаунт | Права |
| --- | --- |
| `dnd-frontend-ci` | `storage.uploader` только на frontend-бакет |
| `dnd-api-runtime` | `container-registry.images.puller` на реестр; `lockbox.payloadViewer` только на секрет dnd_api; `storage.uploader` только на media-бакет; `ai.languageModels.user`, `ai.imageGeneration.user` на каталог |
| `dnd-api-gateway` | `serverless-containers.containerInvoker` только на контейнер dnd-api |
| `dnd-backend-ci` | `container-registry.images.pusher` на реестр; `serverless-containers.editor` на dnd-api; `iam.serviceAccounts.user` на runtime; `serverless-containers.viewer`, `vpc.user`, `functions.editor` на каталог |

`functions.editor` на каталоге понадобилась официальному deploy action для ссылок на секреты: попытка ограничить её контейнером не сработала. Это широкое право; при восстановлении проверить актуальные требования action и возможность более узкой роли.

Дополнительный `ai-studio-e3a4c0` был создан для ручных опытов AI Studio. Для работы сервиса он **не нужен**; постоянный API-ключ не восстанавливать. Сервис получает краткоживущий IAM в metadata runtime.

Пример назначения привязки на каталог (role и service account берутся из таблицы):

```bash
yc resource-manager folder add-access-binding "$DND_FOLDER_ID" \
  --role ai.languageModels.user --subject "serviceAccount:$DND_RUNTIME_SA_ID"
```

Для бакетов использовать IAM-права конкретного бакета в консоли/API, для реестра/контейнера/секрета — их `add-access-binding`. Проверить итоговые привязки; не заменять всю IAM-политику каталога.

## 6. Два бакета

Создать уникальные имена, записать их в workflow и environment:

- frontend: STANDARD, максимум **10737418240** байт, версии выключены, публичное чтение. Исторически list был разрешён, но для нового сайта он не требуется. Применить [frontend-website.json](../../infra/yandex/frontend-website.json): index и error `index.html` для SPA fallback.
- media: STANDARD, максимум **1073741824** байт, public read/list/config **false**, версии выключены. Только runtime имеет IAM-доступ. Применить [advisor-media-lifecycle.json](../../infra/backend/advisor-media-lifecycle.json) — только `advisor/`, 2 дня. `characters/` не удаляется по этому правилу.

```bash
yc storage bucket update "$DND_FRONTEND_BUCKET" \
  --website-settings-from-file infra/yandex/frontend-website.json
yc storage bucket update "$DND_MEDIA_BUCKET" \
  --lifecycle-rules-from-file infra/backend/advisor-media-lifecycle.json
```

Фронт пересобирается из Git, не восстанавливается из копии бакета. Тестовые портреты/иконки отсутствуют. Файлы кампаний остаются в `frontend/assets/concepts/`. [Контракт медиа](character-media.md) описывает подготовку файлов, SQL-ссылки и приватное чтение через API.

## 7. Реестр, контейнер и шлюз

1. Создать реестр `dnd-backend` и контейнер `dnd-api`; сохранить новые ID. Контейнер не делать публичным. Назначить IAM из таблицы.
2. Docker собирается по `backend/Dockerfile` в CI для linux/amd64. В образ входят Go API, канонические каталоги и `shared/advisor`. Загрузка CA выполняется из официального источника.
3. Environment: `DB_HOST`, `DB_PORT=6432`, `DB_USER=dnd_api`, `DB_NAME=dnd`, `ASSET_BUCKET`, `ADVISOR_FOLDER_ID`, `ADVISOR_CHAT_ENABLED`, `ADVISOR_IMAGES_ENABLED`, `CORS_ALLOWED_ORIGINS`. `DB_PASSWORD` — secret reference, не обычная environment-переменная.
4. Ревизия: **1 core / 512Mb / 100% / concurrency 12 / timeout 120 / provisioned 0 / zone instances limit 1**, сеть выбранной VPC, runtime аккаунт. После простоя возможен холодный старт.
5. Заменить в [api-gateway.yaml](../../infra/backend/api-gateway.yaml) `container_id` и `service_account_id`, создать `dnd-api` API Gateway с этой спецификацией. Он принимает все методы/пути. Использовать его HTTPS-адрес: прямой URL контейнера удаляет Authorization и не подходит приватным сессиям Советника.
6. Обновить frontend API URL в `frontend/src/shared/config/api/api-config.ts` (или `VITE_API_BASE_URL` при сборке) и proxy в `frontend/vite.config.ts`. CORS — точные origin frontend-бакета и `https://etozhenerk.github.io`; путь `/DnD/` не часть origin. Новый домен добавлять явно.

## 8. GitHub Actions и OIDC

Repo **etozhenerk/DnD**, deploy branch **main**. Создать OIDC federation:

```bash
yc iam workload-identity oidc federation create dnd-frontend-github \
  --folder-id "$DND_FOLDER_ID" \
  --issuer https://token.actions.githubusercontent.com \
  --jwks-url https://token.actions.githubusercontent.com/.well-known/jwks \
  --audiences https://github.com/etozhenerk
```

К обоим CI-аккаунтам добавить federated credential только с subject **`repo:etozhenerk/DnD:ref:refs/heads/main`**. Долгоживущие cloud-ключи GitHub не нужны.

Обновить:

- `.github/workflows/deploy-yandex-frontend.yml`: bucket, variable `YC_FRONTEND_SA_ID`.
- `.github/workflows/deploy-yandex-backend.yml`: folder/registry/CI/runtime ID, network ID, DB host, secret ID/version/key, bucket, CORS и smoke URL.
- `.github/workflows/deploy-pages.yml`: публикация GitHub Pages независима от Yandex, cloud-защита к ней не применяется.
- GitHub variables `DND_ADVISOR_CHAT_ENABLED=false`, `DND_ADVISOR_IMAGES_ENABLED=false` для первого запуска. После SQL/IAM/лимитов включать отдельно.
- `DND_YANDEX_CLOUD_ENABLED=true` включить **последней**, затем вручную запустить workflow после проверки новых ID.

Backend CI: race-тесты, PostgreSQL integration, OpenAPI, vet, build. Frontend: существующие regression, typecheck, build; Pages — build:pages. Выход `frontend/dist/`; assets публикуются перед index.html, index без долгого кэша. Дополнительные frontend quality gates пока не вводить.

## 9. Советник и ограничения

Системный характер: `shared/advisor/persona.md`; подсказки/возможности: `shared/advisor/guide.json`. Backend строит публичный контекст из мировой карты и итогов кампаний; секреты мастера не передавать. Баланс проверяет сервер, предложение применяет игрок. Изображения: пожелания + анкета + фиксированный реалистичный стиль → YandexGPT Lite → проверенный prompt до 500 символов → Alice ART. Портрет в полный рост, иконка отдельным изображением.

Лимиты прежней рабочей версии: **200 ₽ на сессию создания**, **10 000 ₽/месяц** на весь Советник. PostgreSQL ведёт резерв/фактический расход, UUID защищает повтор. После ошибки с неизвестным расходом резерв сохраняется, автоматических платных повторов нет. Без входа лимит привязан к сессии, не к человеку. Не повышать лимиты автоматически при восстановлении. Модели и тарифы проверить в актуальной [документации AI Studio](https://aistudio.yandex.ru/ru/docs/ai-studio/), ранее используемые names зафиксированы в исходниках.

## 10. Экспериментальные ВМ — только если снова понадобятся

Для основного сервиса **ВМ не нужна**. CPU/GPU-пилоты можно не воссоздавать, если остаёмся на AI Studio.

CPU: standard-v4a, 8 cores / 16 GB, network-ssd 40 GB, Ubuntu 24.04, зона ru-central1-a. GPU: gpu-standard-v3, 1 A100 80 GB, 28 cores / 119 GB, network-ssd 150 GB, Ubuntu 22.04 CUDA 12.2, ru-central1-a. Получить актуальный образ через image family/проверить квоту. Создать SSH-ключ локально, добавить только public key, ingress SSH ограничить текущим trusted IP. Не использовать старые согласованные IP пользователя. UI на 8080 ранее был временно публичным без пароля; для повторного пилота отдельно выбрать способ доступа.

Cloud-init упаковывается `make-boothook.py`; инструкции установки, systemd и UI уже в [infra/llm](../../infra/llm/README.md) и [infra/llm-cpu](../../infra/llm-cpu/README.md). Веса качаются **только на ВМ**, локально их не скачивать. GPU включать по игровым часам; CPU-пилот имел 2 параллельных слота и до 8192 токенов на запрос. Остановка ВМ не отменяет стоимость SSD и резервированного IP — для полной паузы удалять эти ресурсы.

## 11. Приёмка новой установки

- Дождаться успешных операций создания и всех CI; проверить активную ревизию с новым SHA.
- GET `/health`, `/creator/options`, `/creator/advisor`, `/characters`; пустая БД должна отдавать пустой список без ошибки.
- Проверить создание/чтение тестового персонажа, portrait/icon и ETag; SQL сохраняет только метаданные файлов.
- Проверить CORS настоящего frontend origin, SPA-маршруты `/characters`, страницу героя, карту/летописи и Pages base `/DnD/`.
- Проверить отказ приватной сессии без Bearer/чужому токену, UUID-повтор без нового списания, бюджетный журнал. Платные проверки проводить только в согласованном бюджете.
- Убедиться, что WebSQL выключен, у БД нет публичного IP, media-бакет закрыт и у контейнера нет anonymous invoker.
- Записать новые ID, адреса, secret references, applied migrations и фактический результат в документацию.

## Официальные источники

[Compute Cloud](https://yandex.cloud/ru/docs/compute/), [PostgreSQL](https://yandex.cloud/ru/docs/managed-postgresql/operations/cluster-create), [Object Storage website](https://yandex.cloud/ru/docs/storage/operations/hosting/setup), [Serverless Containers](https://yandex.cloud/ru/docs/serverless-containers/), [API Gateway](https://yandex.cloud/ru/docs/api-gateway/), [yc-actions deploy](https://github.com/yc-actions/yc-sls-container-deploy).

## Фактическое удаление — 14 октября 2026

[Отчёт операций и остатки](../../infra/yandex/teardown-2026-10-14.json). Удалены API Gateway, контейнер, PostgreSQL, оба бакета (включая семь незавершённых multipart-загрузок), 12 Docker-образов и реестр, два IP, все пять сервисных аккаунтов, OIDC federation и две DnD security groups. До начала задачи ВМ уже отсутствовали.

Удаление пока не полное: SSD CPU-пилота 40 ГиБ отклоняется Compute с `429 Service is overloaded`; группа БД ещё связана с управляемым сетевым интерфейсом бывшего PostgreSQL. Остался автоматически управляемый секрет подключения. Cloud Logging отвечает 503, состояние прежней default log group проверить не удалось.

Автоматическая копия удалённого PostgreSQL остаётся в облаке по обязательному сроку сервиса: [семь дней после удаления](https://yandex.cloud/ru/docs/managed-postgresql/operations/cluster-delete), ориентировочно до 21 октября. API удаляет только ручные backups; этот отказ проверен. Локальных копий БД и изображений нет. Нулевые будущие расходы не заявляются, пока диск/служебные остатки не очищены и биллинг не проверен.
