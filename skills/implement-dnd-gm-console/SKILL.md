---
name: implement-dnd-gm-console
description: Implement the single-screen Game Master control interface for a local D&D campaign. Use when building scene control, initiative order, participant cards, abilities, targets, HP, AC, attack modifiers, inventory, charges, conditions, flags, counters, dialogue presets, NPC decisions, event history, manual adjustments, and undo controls.
---

# Мастерская игровая консоль

Собрать управляемый интерфейс поверх опубликованной кампании, session model, rules engine, NPC behavior и dialogue console.

## Компоновка

Предусмотреть шесть областей: текущая сцена, порядок ходов, участники, действия, реплики, журнал и состояние мира. На 1024 и 1280 px сохранять основные действия без внутреннего вертикального скролла критических панелей.

## Управление

Мастер может:

- менять текущий и максимальный HP, AC, атаку и временные модификаторы;
- применять способности, выбирать цели и видеть оставшиеся uses;
- менять инвентарь, владельцев, количество и заряды;
- добавлять, снимать и продлевать состояния;
- вводить инициативу, менять порядок, ход и раунд;
- подтверждать либо переопределять действие NPC;
- выбирать диалоговый пресет;
- менять активную сцену, флаги, счётчики, отношения и состояния локаций;
- просматривать журнал и отменять последнее действие.

Ручная коррекция всегда создаёт `manual-adjustment` с автоматической подписью или причиной мастера. Канонические карточки не менять.

## Доступность и архитектура

Сохранить клавиатурное управление, доступные подписи и `focus-visible`. Разместить действия в `features`, крупные блоки в `widgets`, сущности и модель ниже; не складывать движок в страницу.

## Проверка

Передать полные сценарии `$test-dnd-gameplay-scenarios`, затем `$verify-dnd-campaign-release`.
