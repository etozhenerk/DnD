# Восстановление Yandex Cloud

[Порядок создания с нуля](../../docs/architecture/yandex-cloud-recovery.md).

`reference-2026-10-14.json` содержит только конфигурацию инфраструктуры до удаления: ресурсные профили, исторические ID, сеть, IAM и OIDC. ID, IP и DNS-имена удалённых ресурсов нельзя использовать для нового деплоя. Это не бэкап БД или файлов.

`frontend-website.json` задаёт SPA fallback Object Storage. Конфигурация шлюза и lifecycle находятся в `../backend/`; установка экспериментальных моделей — в `../llm/` и `../llm-cpu/`.
