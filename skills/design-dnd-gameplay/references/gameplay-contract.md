# Контракт игровых механик

## Действие

Хранить `id`, `name`, `actor`, `target`, `trigger`, `resolution`, `check`, `effects` и необязательный `uses`.

`resolution` принимает `automatic` или `manual`. Ограниченное действие содержит:

```json
{"uses": {"scope": "battle", "max": 2}}
```

## Стандартные эффекты

- `damage`, `healing`;
- `modify-hp`, `modify-ac`, `modify-attack`;
- `add-condition`, `remove-condition`;
- `spend-use`, `restore-use`;
- `spend-charge`, `transfer-item`;
- `set-flag`, `increment-counter`;
- `modify-relationship`, `set-location-state`;
- `reveal-clue`, `modify-ending`.

Каждый эффект содержит явную цель, величину или значение, длительность при наличии и текст для журнала.

## Условия

Использовать декларативные `all`, `any`, `not`, флаги, счётчики, отношения, наличие предмета, состояние участника и текущую сцену. Произвольный JavaScript запрещён.

## Поведение NPC

Хранить приоритеты действий и целей, условия фаз, отступления и поддержки. Решение должно объясняться и подтверждаться мастером до применения.
