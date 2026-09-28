# Тестовый деплой фронтенда в Yandex Cloud

Фронтенд остаётся статическим React-приложением. Для тестового размещения используется Object Storage, без виртуальной машины. GitHub Pages продолжает обслуживать текущую production-версию до отдельного переключения.

## Ресурсы

- Облако: `src-user-cloud-etozhenerk` (`b1gslf6gm8gn0v36r53e`).
- Каталог: `default` (`b1g8siv8ve2si1qp04nm`).
- Бакет: `dnd-etozhenerk-b1g8siv8ve2si1qp04nm`.
- Технический адрес: <https://dnd-etozhenerk-b1g8siv8ve2si1qp04nm.website.yandexcloud.net/>.
- Класс хранения: Standard; ограничение размера бакета: 10 ГиБ.
- Публичны чтение файлов и их список. В бакет загружается только `dist/`, без исходного кода и секретов.
- Главная и страница ошибки: `index.html`.

## CI

Workflow `.github/workflows/deploy-yandex-frontend.yml` собирает фронтенд командой `npm run build` при push в `main` и допускает ручной запуск. Он загружает ресурсы перед `index.html`, не удаляет старые файлы и использует GitHub OIDC вместо постоянного ключа.

Настроены:

1. Отдельный сервисный аккаунт `dnd-frontend-ci` (`ajel1o5ev5sctelav1fp`) с ролью `storage.uploader` **только для бакета** `dnd-etozhenerk-b1g8siv8ve2si1qp04nm`.
2. Workload Identity Federation `dnd-frontend-github` (`ajeiea3qe37gcboihrbj`) с issuer `https://token.actions.githubusercontent.com`, audience `https://github.com/etozhenerk` и JWKS `https://token.actions.githubusercontent.com/.well-known/jwks`.
3. Привязка этого аккаунта к subject `repo:etozhenerk/DnD:ref:refs/heads/main`.
4. GitHub Actions variable `YC_FRONTEND_SA_ID` со значением ID сервисного аккаунта. В репозитории нет постоянных ключей.

Основание для схемы: [официальный пример Yandex Cloud для GitHub OIDC](https://yandex.cloud/en/docs/iam/tutorials/ci-cd-github-functions) и [документация upload action](https://github.com/marketplace/actions/yc-object-storage-upload).

## Ручной повторный деплой

Нужны Node.js 22, npm и авторизованная Yandex Cloud CLI (`yc init`). Из корня репозитория:

```bash
YC_FRONTEND_BUCKET=dnd-etozhenerk-b1g8siv8ve2si1qp04nm ./scripts/deploy-yandex-frontend.sh
```

Если `yc` установлена вне `PATH`, передайте полный путь к ней через `YC_BIN`. Скрипт запускает production-сборку с базовым путём `/`, загружает файлы в бакет и публикует `index.html` последним. GitHub Pages-специфичный `404.html` в бакет не загружается. Скрипт не удаляет старые файлы; ограничение размера бакета не даст накоплению файлов бесконтрольно увеличить расходы.

## Проверка

Проверены `/`, `/heroes`, `/races`, `/roadmap` и `/region/nor-il-skald` по техническому адресу. На странице региона видео лениво загружаются при прокрутке; после появления в области просмотра браузер воспроизвёл их (`readyState=4`). Проверены `Content-Type: video/mp4` и HTTP Range (`206`) для одного ролика. Консоль браузера без ошибок. Дополнительную проверку полного игрового цикла этот инфраструктурный деплой не заменяет.

В рабочем дереве до начала деплоя были удалены `dragon-defeat.mp4` и `linda-pitahaya-reserve.mp4`, хотя канонические JSON ссылались на них. По решению автора оба файла восстановлены из текущего коммита и включены в повторную сборку. Оба URL отвечают `200 video/mp4`; финальный ролик дополнительно проверен в браузере (`readyState=4`).

Object Storage отдаёт `index.html` при неизвестном пути, поэтому React Router может отобразить страницу при прямом открытии. При этом HTTP-статус такого ответа остаётся `404`. Перед назначением этого адреса основным потребуется маршрутизация с ответом `200` для страниц приложения.

## Ограничение прежнего плана

В согласованном [этапе 3](roadmap/stage-3-backend.md) предполагалась раздача всей сборки через API Gateway. У шлюза есть неизменяемый лимит 2,5 МБ на ответ, а текущая сборка содержит файлы крупнее него. Поэтому этот вариант нельзя использовать для всего фронтенда. Решение об одном HTTPS origin для фронтенда и будущего API нужно уточнить перед переносом бэкенда; тестовый адрес Object Storage не меняет согласованный порядок миграции данных.

Документация Yandex Cloud: [статический сайт в Object Storage](https://yandex.cloud/ru/docs/storage/concepts/hosting), [настройка SPA fallback](https://yandex.cloud/ru/docs/storage/operations/hosting/setup), [лимиты API Gateway](https://yandex.cloud/ru/docs/api-gateway/concepts/limits).
