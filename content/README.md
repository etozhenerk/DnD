# Контент D&D-сервиса

Эта папка — канонический источник данных для будущего фронтенда. Существующие материалы перенесены без смены авторского тона; недостающие элементы помечены как новый контент.

## Файлы

- `rules.json` — облегчённые правила, единицы времени и состояния.
- `races.json` — игровые расы.
- `characters.json` — шесть готовых героев.
- `characters/` — человекочитаемые lore-файлы героев, дополняющие канонический JSON.
- `world-map.json` — карта, восемь кликабельных регионов и связи с кампаниями.
- `campaigns/nor-il-skald.json` — завершённая северная кампания, локации, NPC, враги и летопись.
- `campaigns/linda-small.json` — завершённая кампания Вьетимы и острова Линда Смолл.
- `campaigns/*-guide.md` — синхронные человекочитаемые сценарии и итоги для мастера.

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
order, id, name, description, image, imageLayers[], campaignId, status
polygon[]: пары [x, y] в системе координат viewBox 1024 × 1024
additionalPolygons[]: дополнительные несмежные области того же региона
```

`status` принимает `completed`, `ready` или `planned`. `campaignId` остаётся `null`, пока файл кампании не создан.
`image` указывает на полноразмерный прозрачный слой региона 1024 × 1024, совмещённый с актуальной мировой картой. Он используется и как изображение региона, и для выделения земли при наведении.
`imageLayers` и `additionalPolygons` используются, когда один сюжетный регион состоит из нескольких несмежных земель.

### Сцена

```text
id, locationId, title, type, readAloud, objective
choices[]: label, check, success, failure
encounterId, rewards[], clues[], nextSceneIds[]
```

### Исторический состав партии

`partyCharacterIds` всегда ссылается на текущие стабильные `id` героев. `gameMasterCharacterId` отдельно ссылается на героя, чей игрок вёл кампанию как мастер: такой персонаж не входит в `partyCharacterIds` и не считается участником похода. Если во время старой кампании герой носил другое имя или ещё не прошёл каноническое перерождение, `partyAtTime[]` хранит `characterId`, историческое `displayName`, при необходимости поясняющее `note` и необязательный кампанийный `visual`. Визуал показывает героя именно во время этого похода и не заменяет его канонический портрет в `characters.json`. Необязательный `groupVisual` хранит общий кадр партии и мастера.

### Летопись завершённой кампании

```text
completedChronicle:
  template, statusLabel, completedSummary, finalResult
  journeyTitle, finaleTitle
  story[]
  trials[]: id, title, locationId, result
  defeatedEnemies[]: enemyId, count, outcome
  restored[]: id, title, result
```

`completedChronicle` — публичный шаблон пройденной кампании. Он хранит только то, что игроки уже знают после финала: какие испытания пройдены, какие враги побеждены или выведены из строя, что восстановлено и чем завершилась глава. Поля `enemyId` и `locationId` ссылаются на существующие сущности кампании.

Кампания может хранить `presentation.pageSubtitle`, `presentation.background`, `presentation.statusSeal` и визуальное поле `visual` у локаций, NPC и врагов. Для статичного арта используются `visual.image` и `visual.alt`; для фоновой анимации — `visual.video`, необязательный `visual.poster` и `visual.alt`. У одной сущности указывается либо `image`, либо `video`. Видео предназначено для публичной атмосферной подачи, воспроизводится без звука и элементов управления и зацикливается нативно. Все пути ссылаются на зарегистрированные файлы из `assets/concepts/`.

В завершённой кампании `ending.visual` показывает положительный итог или награду, а отдельный `ending.closingVisual` — последний сюжетный кадр после этого блока. Для него можно задать `ending.closingTitle` и `ending.closingCaption`; это не создаёт новую сущность врага и не заменяет его основную карточку.

## Термины времени

- `turn` — ход одного участника.
- `round` — все участники сделали по одному ходу.
- `battle` — один бой.
- `location` — пребывание в одной локации до перехода.
- `campaign` — вся текущая кампания.

До появления автоматического движка спорные исходы решает мастер. Значения DC и характеристики в данных — рекомендуемые.
