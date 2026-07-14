---
name: plan-dnd-campaign-implementation
description: Produce a repository-specific implementation plan from an approved campaign, gameplay contract, and art registry. Use when mapping content fields, FSD layers, reusable components, routes, local session state, gameplay modules, asset references, task dependencies, and acceptance criteria before changing content or React code.
---

# План реализации кампании

Разбить утверждённую кампанию на небольшие зависимые задачи без изменения `content/` и `src/`.

## Входы

Прочитать весь утверждённый пакет, `AGENTS.md`, `content/README.md`, затрагиваемые модели и существующие компоненты. Определить, какие поля и UI уже существуют.

## План

Записать `implementation-plan.md`:

- изменения схемы и порядок миграции;
- канонические JSON и гайд;
- регистрацию ассетов;
- затронутые FSD-слои и переиспользуемые компоненты;
- маршрут и публичное представление кампании;
- модель сессии, rules engine, NPC behavior, диалоги и GM console;
- последовательность задач и зависимости;
- затрагиваемые файлы;
- критерии готовности и проверки каждой задачи;
- риски обратной совместимости и спойлеров.

Не помещать бизнес-логику в `app` или `pages`, не создавать новый слой без необходимости и не планировать новые зависимости без доказанной потребности.

## Контрольная точка

Показать пользователю порядок реализации и отдельно отметить изменения схемы. Кодирование начинать только после утверждения плана.
