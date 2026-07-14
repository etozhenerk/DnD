---
name: publish-dnd-campaign
description: Publish an approved campaign workflow into canonical repository content without implementing React UI. Use when creating or updating campaign JSON, the synchronized Russian Game Master guide, world-map linkage, structured scenes, dialogue presets, gameplay effects, NPC behavior, inventory, and approved asset references.
---

# Публикация данных кампании

Перенести утверждённые рабочие материалы в канон. Не реализовывать интерфейс.

## Входы

Прочитать `AGENTS.md`, `content/README.md`, `content/rules.json`, утверждённый `implementation-plan.md`, все творческие артефакты и опубликованный manifest ассетов.

## Порядок

1. При изменении структуры сначала описать поля в `content/README.md`.
2. Создать или обновить `content/campaigns/<campaign-id>.json`.
3. Создать синхронный `content/campaigns/<campaign-id>-guide.md`.
4. Подключить campaign `id` к региону в `content/world-map.json` только когда данные готовы.
5. Перенести публичный текст и секреты мастера в разные поля.
6. Перенести диалоговые пресеты, эффекты, NPC behavior, граф, флаги, счётчики и инвентарь без исполняемого JavaScript.
7. Ссылаться только на утверждённые записи manifest.
8. Применить `$maintain-dnd-world` и исправить найденные нарушения.

## Проверка

Запустить `jq empty`, проверить уникальность `id`, ссылки графа, персонажей, локаций, встреч, врагов, реплик и ассетов. Сверить JSON и гайд.

## Результат

Перечислить опубликованные факты, файлы, изменения схемы и проверки. Не запускать `$implement-dnd-campaign-ui` до отдельного подтверждения пользователя.
