# Черновик обращения в поддержку Yandex Cloud

**Не отправлен. Пользователь сообщил, что поддержка рекомендует повторить позже; дальнейшие попытки отложены.** Подготовлен 14 октября 2026 после подтверждённого удаления основных ресурсов DnD.

Тема: Не удаётся освободить оставшийся SSD и служебные ресурсы после удаления сервиса

Здравствуйте. Мы полностью отключаем тестовый сервис в каталоге `b1g8siv8ve2si1qp04nm`, облако `b1gslf6gm8gn0v36r53e`. ВМ отсутствуют, PostgreSQL `c9qdojtaghn6i5h4vq4o`, API Gateway, контейнер, оба бакета, реестр и сервисные аккаунты уже удалены. Данные и резервные копии сохранять не требуется. Просим помочь полностью освободить следующие остатки и уточнить/остановить связанные начисления:

1. SSD `fhm1suggimufieop65r1` / `dnd-llm-qwen35-dev-boot`, 40 ГиБ, ru-central1-a, READY, без ВМ. Несколько запросов удаления через yc и официальный REST API получают `RESOURCE_EXHAUSTED / 429 Service is overloaded`, операции не создаются. REST requestId `3813b46c-c7b0-4bb8-9198-74d317a5a7a3`; CLI client request `4eeea452-ba00-4a00-af51-ff1245de7661`, trace `c03b2ede-1af9-4d1a-9e1f-592a2b971f3f`. Просим удалить диск.
2. Security group `enpt92gqapt4lb0rtm4i` не удаляется: `reference to VM network interface`. В подсети `e2lc1oah9b65162oqhd3` остаётся 10.129.0.24 с `managedDbaas.cluster`, хотя PostgreSQL удалён. RequestId `25a94f03-7b7a-4cc0-9561-09fcae88d21d`. Просим очистить служебный интерфейс/группу.
3. Lockbox `e6q52abgke68mcms2ntu` и Connection Manager `a59mlh81akkocv5eifm5` запрещают ручное удаление как управляемые бывшим кластером/backup. Connection Manager requestId `75bd5dfe-49ae-4c14-b416-91f0591c4530`. Просим очистить их после удаления кластера.
4. Осталась автоматическая backup `c9qdojtaghn6i5h4vq4o:mdbetg2ko21vo6hb97oe`; API сообщает `only manual backups can be deleted`. Мы не нуждаемся в восстановлении. Уточните срок удаления и начисления за остаток.
5. Cloud Logging list/get/delete отвечает 503 Unavailable. Историческая default log group `e23end2dgqdg1obeh4ed`, её нынешнее существование проверить не удалось. RequestId `93dd2f9f-f049-42c2-99fd-a79824d54ba1`. Просим проверить и очистить остатки логов проекта.

Существовавшие до сервиса VPC default/default-1 и их автоматические подсети не затрагиваем. Пароли, IAM-токены и данные пользователей в обращение не включены.
