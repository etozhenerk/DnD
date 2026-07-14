---
name: test-dnd-gameplay-scenarios
description: Exercise the implemented local D&D gameplay engine with deterministic campaign scenarios. Use when testing abilities, resource consumption, initiative, NPC decisions, dialogue consequences, inventory, manual corrections, global flags, branching scenes, localStorage recovery, alternate endings, or regression paths before browser release verification.
---

# Проверка игровых сценариев

Проверить движок на воспроизводимых последовательностях команд и событий до визуальной приёмки.

## Набор сценариев

Покрыть минимум:

- старт партии и сессионные снимки;
- физический и цифровой бросок;
- навык с целью, эффектом и ограничением uses;
- полный бой с инициативой, раундами, NPC-решениями и downed;
- лечение, состояния и восстановления всех scope;
- инвентарь, заряды и передача предмета;
- выбор реплики мастером и её последствия;
- решение ранней сцены, меняющее позднюю сцену и финал;
- ручную коррекцию и отмену;
- сохранение, перезагрузку и продолжение.

## Метод

Тестировать чистые функции и reducer fixture-события независимо от React. Для каждого сценария фиксировать исходное состояние, команды, ожидаемые события и итоговый снимок. Если в проекте ещё нет тестового раннера, предложить минимальный вариант и согласовать новую зависимость до добавления.

## Результат

Выдать пройденные сценарии, расхождения, непроверенные ручные эффекты и блокеры браузерной проверки.
