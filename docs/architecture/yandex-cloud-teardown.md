# Удаление ресурсов Yandex Cloud — 14 октября 2026

Инструкция для восстановления: [yandex-cloud-recovery.md](yandex-cloud-recovery.md). Настройки до удаления: [reference-2026-10-14.json](../../infra/yandex/reference-2026-10-14.json). [Журнал операций и последняя проверка](../../infra/yandex/teardown-2026-10-14.json). Данные и изображения локально не сохранялись. По запросу пользователя открыто [обращение KS311813045](https://center.yandex.cloud/support/tickets/KS311813045) с просьбой удалить остатки; [отправленный текст](yandex-cloud-cleanup-support.md). Удаление остатков поддержкой пока не подтверждено; автоматического повтора нет.

## Удалено и проверено

| Ресурс | Что удалено |
| --- | --- |
| API Gateway | dnd-api, d5dopqqib47kpsh6929m |
| Serverless Container | dnd-api, bbam71p2dn50q57l250i, его ревизии |
| PostgreSQL | кластер dnd-characters-pg, c9qdojtaghn6i5h4vq4o, его БД и пользователи |
| Frontend Object Storage | бакет dnd-etozhenerk-b1g8siv8ve2si1qp04nm, объекты и 7 незавершённых multipart-загрузок |
| Media Object Storage | бакет dnd-character-media-b1g8siv8ve2si1qp04nm и тестовые изображения |
| Container Registry | dnd-backend, crp3ok452qdp2r44ene5 и 12 Docker-образов |
| Статические IP | 89.169.133.106 / e9bi47bkuerbgdetvlvo, 89.169.139.143 / e9bu3rnps8tlgai1d9mj |
| Security groups | dnd-llm-ssh / enpcdfodrmjnev3lfn36, dnd-api-db-client / enpq1pnbcm3ooj59gdm1 |
| Service accounts | dnd-frontend-ci, dnd-backend-ci, dnd-api-runtime, dnd-api-gateway, ai-studio-e3a4c0 |
| Доступы CI | OIDC federation ajeiea3qe37gcboihrbj и привязки ролей удалённых аккаунтов; список folder bindings пуст |
| Секрет владельца | e6qekfvk3errjqmfthia уже отсутствует после удаления кластера |

Обе экспериментальные ВМ уже отсутствовали до этой задачи; сейчас экземпляров нет. GPU-диска 150 ГБ тоже не было при инвентаризации. Новые Cloud Functions или ВМ для выгрузки не создавались. Отдельных AI Studio agents, MCP gateways и serverless workflows для приложения нет.

## Осталось удалить / проверить

| Ресурс | ID | Причина |
| --- | --- | --- |
| SSD CPU-пилота, 40 ГиБ | fhm1suggimufieop65r1 | READY, без ВМ. yc и REST: 429 Service is overloaded. Попытка через консоль также не создала операции удаления. |
| Группа безопасности бывшей БД | enpt92gqapt4lb0rtm4i | Связана с оставшимся управляемым интерфейсом PostgreSQL 10.129.0.24 в e2lc1oah9b65162oqhd3. |
| Управляемый секрет API / подключение | e6q52abgke68mcms2ntu / a59mlh81akkocv5eifm5 | Ручное удаление запрещено: управляются удалённым PostgreSQL и его backup. |
| Автоматическая резервная копия БД | c9qdojtaghn6i5h4vq4o:mdbetg2ko21vo6hb97oe | API разрешает удалять только manual backups. После удаления кластера сервис сохраняет backup 7 дней, ориентировочно до 21 октября. |
| Прежняя Cloud Logging group — существование не подтверждено | e23end2dgqdg1obeh4ed | list/get/delete отвечают 503 Unavailable; нужно проверить после восстановления API сервиса. |

Семидневное хранение резервной копии — [правило Yandex Cloud](https://yandex.cloud/ru/docs/managed-postgresql/operations/cluster-delete). Нулевые расходы пока не подтверждены: как минимум SSD ещё выделен.

## Не относятся к созданным ресурсам DnD

Сохранены существовавшие до проекта сети default/default-1, 7 подсетей, 2 default security groups и автоматические DNS-зоны. Облако, каталог, организация, платёжный аккаунт и грант не удалялись. GitHub Pages и сам GitHub-репозиторий сохранены.

## Следующая попытка

Не создавать ресурсы заново. Прочитать актуальный список, повторить удаление SSD и освобождённой группы БД. Проверить автоматическую очистку секрета/Connection Manager/backup и Cloud Logging. Обновить отчёт фактическими результатами. Облачные deploy jobs заблокированы до `DND_YANDEX_CLOUD_ENABLED=true`; CI-аккаунты и OIDC удалены.

## Повторная попытка 14 октября, 17:32 МСК

По запросу пользователя повторно проверены все остатки и выполнена одна попытка удаления SSD, группы БД и управляемого секрета. Удалить ничего не удалось: SSD снова возвращает `RESOURCE_EXHAUSTED / Service is overloaded`; группа связана с управляемым VM-интерфейсом; удаление секрета запрещено для прямого клиента. Logging list вновь вернул `Unavailable`. Автоматическая копия PostgreSQL всё ещё существует; срок её системного хранения не истёк. Новые ресурсы и права не создавались. Детали записаны в `latestRetry` журнала операций.

## Обращение в поддержку 14 октября

Создано [KS311813045](https://center.yandex.cloud/support/tickets/KS311813045), тип «Проблема», сервис «Другое», облако src-user-cloud-etozhenerk. В обращение включены все пять групп остатков, ID и ошибки удаления. Обоснование: ресурсы использовались по гранту для сотрудников Яндекса и освобождаются по просьбе из рассылки. Запрошены удаление без сохранения тестовых данных и подтверждение прекращения начислений. Сам факт создания обращения не подтверждает удаление ресурсов.
