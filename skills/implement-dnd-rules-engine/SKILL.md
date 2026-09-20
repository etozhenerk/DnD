---
name: implement-dnd-rules-engine
description: Implement deterministic execution of this repository's homebrew d20 gameplay effects. Use when applying abilities, attacks, physical or digital rolls, AC and DC checks, damage, healing, conditions, temporary modifiers, usage scopes, item charges, target validation, turn recovery, or manual-resolution effects to local game-session state.
---

# Исполняемый движок правил

Реализовать формальные эффекты из `gameplay.json` поверх модели `$model-dnd-game-session`.

## Правила

1. Читать `content/rules.json`; не заменять систему D&D 5e.
2. Проверять активного участника, допустимую цель, предусловия и оставшиеся uses до применения.
3. Для физического броска принимать введённое мастером значение; цифровой бросок оставлять дополнительным.
4. Вычислять AC, DC, урон, лечение, временные модификаторы и состояния чистыми функциями.
5. Списывать uses и charges только после подтверждённого действия.
6. Восстанавливать ресурсы по `turn`, `round`, `battle`, `location` и `campaign`.
7. Эффект `manual` показывать мастеру и применять только выбранное им формальное последствие.
8. Порождать события модели вместо прямой мутации React state.

UI внебоевого броска обязан проходить через общий модальный `SceneCheckPanel`, собранный на `SceneDecisionModal`: цифровой результат получает `D20Roller`, а введённый физический d20 — общий manual critical-roll effect. Критические 1 и 20 не обрабатываются локально в сценах.

## Безопасность управления

Перед применением показывать исполнителя, цель, бросок, модификаторы, ожидаемые эффекты и расход ресурсов. Поддержать отмену корректирующим событием.

## Проверка

Покрыть критические 1 и 20, преимущество и помеху, промах по AC, успех и провал DC, downed, лечение, длительности, исчерпанные ресурсы, восстановление и ручной эффект.
