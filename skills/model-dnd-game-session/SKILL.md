---
name: model-dnd-game-session
description: Design and implement the local session-state model for a D&D campaign without mutating canonical characters. Use when creating character and NPC snapshots, commands, append-only events, reducers, initiative state, flags, counters, relationships, inventory reservations, localStorage persistence, undo corrections, or session restoration.
---

# Модель локальной игровой сессии

Создать единый источник истины прохождения по [контракту сессии](references/session-contract.md).

## Инварианты

- Канонический JSON неизменяем; при старте создавать сессионные снимки.
- Состояние изменять только командой, порождающей одно или несколько событий.
- Журнал добавочный: отмена создаёт корректирующее событие, а не удаляет историю.
- Сохранять версию схемы и мигрировать либо явно отклонять несовместимый снимок.
- Хранить состояние в `localStorage` после каждого подтверждённого события.
- Отделять публичное состояние от секретов мастера даже в локальной модели.

## Состояние

Предусмотреть участников, HP, AC, атаку, модификаторы, состояния, способности и uses, инвентарь и заряды, инициативу, ход и раунд, активную сцену, флаги, счётчики, отношения, улики, состояния локаций, NPC outcomes, модификаторы финала и журнал.

## Команды и события

Команды валидировать до изменения состояния. Минимальные события: `session-started`, `action-selected`, `roll-entered`, `ability-used`, `damage-applied`, `healing-applied`, `condition-changed`, `item-changed`, `npc-action-selected`, `dialogue-preset-chosen`, `flag-changed`, `turn-advanced`, `manual-adjustment`, `action-corrected`.

## Размещение

Поместить модель и повторно используемую логику в соответствующий `entities` или `features` model-слой, не в `app` и не в `pages`. Публичный API модуля сделать минимальным и типизированным.

## Проверка

Проверить создание снимка, повторное воспроизведение событий, сохранение, перезагрузку, миграцию версии и отмену последнего действия.
