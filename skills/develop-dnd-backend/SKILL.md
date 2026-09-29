---
name: develop-dnd-backend
description: Implement and verify the Go backend in backend/ and its HTTP contract in shared/api/openapi.yaml. Use for routes, services, validation, PostgreSQL integration, AI Studio calls, and backend deployment preparation; do not change frontend UI for backend-only tasks.
---

# Разработка Go API

1. Прочитать `AGENTS.md`, `backend/README.md`, `shared/api/openapi.yaml` и затронутые документы в `docs/architecture/`. Сверить границы данных: `content/` — канон мира, PostgreSQL — персонажи конструктора.
2. Держать транспортные модели и маршруты согласованными с OpenAPI YAML. Валидировать пользовательские данные на сервере; игровые правила брать из утверждённых источников, а не из ответа AI. Советник предлагает изменения, игрок их принимает.
3. Для БД использовать версионированные миграции из `backend/migrations/`; доступ получать через приватную сеть и секреты окружения/Lockbox. Не включать реквизиты и мастерские секреты в ответы API или логи.
4. Добавлять тесты для поведения, где ошибка меняет данные, права или результат проверки. Выполнять `go test ./...` из `backend/` и проверять контракт затронутых маршрутов.
5. Перед развёртыванием проверить конфигурацию, сетевые правила, стоимость и состояние сервиса. Для облачных изменений применять `$manage-yandex-cloud`; для миграций — `$manage-dnd-database`.

Текущий MVP не имеет авторизации. Не объявлять анонимного пользователя владельцем готового персонажа и не вводить редактирование готовых карточек до согласованного этапа авторизации.
