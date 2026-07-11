# Контент D&D-сервиса

Эта папка — канонический источник данных для будущего фронтенда. Существующие материалы перенесены без смены авторского тона; недостающие элементы помечены как новый контент.

## Файлы

- `rules.json` — облегчённые правила, единицы времени и состояния.
- `races.json` — игровые расы.
- `characters.json` — пять готовых героев.
- `world-map.json` — карта, восемь кликабельных регионов и связи с кампаниями.
- `campaigns/nor-il-skald.json` — кампания, локации, NPC, враги, сцены и финальный босс.
- `campaigns/nor-il-skald-guide.md` — сценарий для мастера в удобном для чтения виде.

## Типовой шаблон сущностей

### Герой или враг

```text
id, name, kind, race, role, hp, maxHp, ac
visual: portrait, status, raceConceptIds, alt
stats: strength, dexterity, constitution, wisdom, intelligence, charisma
story, motivation, personality, relationships
abilities[]: id, name, description, trigger, check, effect, uses
items[]: id, name, description, effect, charges
```

`visual.portrait` указывает на канонический файл из `assets/concepts/characters/`. Поле `status` должно быть `canonical` только после одобрения пользователя. `raceConceptIds` ссылается на `assets/concepts/manifest.json`.

### Локация

```text
id, name, mapLabel, summary, atmosphere
intro, pointsOfInterest[], npcs[], encounters[], clues[], rewards[]
unlockCondition, nextLocations[]
```

### Регион мировой карты

```text
order, id, name, description, image, campaignId, status
polygon[]: пары [x, y] в системе координат viewBox 1024 × 1024
```

`status` принимает `completed`, `ready` или `planned`. `campaignId` остаётся `null`, пока файл кампании не создан.

### Сцена

```text
id, locationId, title, type, readAloud, objective
choices[]: label, check, success, failure
encounterId, rewards[], clues[], nextSceneIds[]
```

## Термины времени

- `turn` — ход одного участника.
- `round` — все участники сделали по одному ходу.
- `battle` — один бой.
- `location` — пребывание в одной локации до перехода.
- `campaign` — вся кампания Нор’Иль’Скальда.

До появления автоматического движка спорные исходы решает мастер. Значения DC и характеристики в данных — рекомендуемые.
