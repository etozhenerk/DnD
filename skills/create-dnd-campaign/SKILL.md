---
name: create-dnd-campaign
description: Orchestrate the complete approval-gated creation of a new clickable D&D campaign for this repository. Use when starting or continuing a campaign workflow across concept, outline, story graph, NPCs, enemies, scenes, dialogue, gameplay, review, art, canonical publication, React UI, local game engine, browser verification, and retrospective.
---

# Оркестратор создания кампании

Вести пользователя по этапам, не подменяя специализированные скиллы и не меняя канон раньше публикации.

## Начало

1. Прочитать `AGENTS.md` и `docs/campaign-skill-workflow.md`.
2. Проверить Git и существующую папку `docs/campaigns/<campaign-id>/`.
3. Если workflow существует, прочитать `workflow.json`, утверждённые входы и продолжить с первого незавершённого этапа.
4. Если workflow новый, вызвать `$define-dnd-campaign-concept`.

## Последовательность

```text
define-dnd-campaign-concept
outline-dnd-campaign
design-dnd-story-graph
create-dnd-npc + create-dnd-enemy
create-dnd-character (только для нового или существенно изменяемого игрового героя)
write-dnd-scene-script
write-dnd-dialogue
design-dnd-gameplay
review-dnd-campaign
plan-dnd-campaign-art
generate-dnd-campaign-art
review-dnd-campaign-art
publish-dnd-campaign-assets
plan-dnd-campaign-implementation
publish-dnd-campaign
implement-dnd-campaign-ui
model-dnd-game-session
implement-dnd-rules-engine
implement-dnd-npc-behavior
implement-dnd-dialogue-console
implement-dnd-gm-console
test-dnd-gameplay-scenarios
verify-dnd-campaign-release
maintain-dnd-world
```

## Управление подтверждениями

- Задавать не более трёх вопросов за раунд и сначала искать ответ в каноне.
- После каждого творческого этапа показывать результат, новые факты, допущения и открытые решения.
- Не считать молчание утверждением.
- Не запускать следующий этап, пока обязательный вход не `approved`.
- При изменении раннего артефакта помечать зависимые результаты `stale`.
- Не генерировать арты, не писать канон и не менять код до соответствующих подтверждений.

## Границы

Обычного NPC передавать `$create-dnd-npc`, игрового героя — `$create-dnd-character`, врага — `$create-dnd-enemy`. Реплики не смешивать с боевым AI: мастер выбирает диалоговый пресет, NPC-модуль автоматически предлагает боевое действие и цель.

Не вызывать `$create-dnd-character` только ради оценки существующей партии. Для проверки вклада и баланса читать канонические данные героев и передавать их `$design-dnd-gameplay`. Вызывать скилл героя, только если сценарий создаёт нового игрового героя или существенно меняет существующего.

Если пользователь явно просит субагентов, использовать их только после утверждения творческого пакета и давать каждому один ограниченный независимый этап. Финальную целостность выполнять основным агентом.

## Виртуальный режим без файлов

Если пользователь явно просит виртуальный прогон без артефактов, следовать одноимённому разделу `docs/campaign-skill-workflow.md`. Не создавать и не менять файлы, канон, арты или код. Поздние этапы использовать как контракты проектирования: вернуть планы, схемы и критерии приёмки, но не утверждать, что генерация, реализация или браузерная проверка выполнены.

При явно переданной полной автономии разрешено условно пройти контрольные точки только для проверки связности конвейера. Все результаты при этом остаются гипотетическими `draft`, не получают статусы `approved` или `published`. До и после прогона сравнить `git status --short` и сообщить результат.

## Завершение

После реального прохождения записать `retrospective.md`: удобство подготовки, расхождения графа и игры, ручные решения, работа NPC, эффект глобальных выборов, восстановление, недостающие данные и изменения скиллов. Без ретроспективы этап 2 не завершён.
