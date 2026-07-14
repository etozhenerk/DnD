---
name: implement-dnd-dialogue-console
description: Implement the Game Master's dialogue-preset interface for campaign NPCs. Use when filtering presets by scene and campaign state, showing intent, tone, text, secret notes, reveals, and consequences, letting the master choose or adapt a line, and applying confirmed dialogue effects without automatic NPC speech selection.
---

# Консоль реплик мастера

Дать мастеру удобный банк фраз из `dialogue.json`. Решение, какую реплику произнести, всегда принимает мастер.

## Интерфейс

- показывать активных в сцене персонажей;
- группировать пресеты по намерению и тону;
- скрывать или блокировать пресеты по декларативным условиям;
- отдельно показывать произносимый текст, скрытую цель и формальные последствия;
- позволять мастеру выбрать, скопировать, пересказать или не использовать пресет;
- применять `reveals` и `effects` только после подтверждения;
- записывать `dialogue-preset-chosen` и связанные события.

## Ограничения

Не генерировать новые реплики во время игры, не выбирать вариант автоматически и не показывать игрокам `gmNote`. Изменение пресета в интерфейсе не должно молча менять канонический `dialogue.json`.

## Проверка

Проверить доступные и закрытые пресеты, сценовые условия, изменение флага, раскрытие улики, отсутствие эффекта при отмене и защиту мастерских заметок.
