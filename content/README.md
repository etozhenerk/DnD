# Контент D&D-сервиса

Эта папка — канонический источник данных для будущего фронтенда. Существующие материалы перенесены без смены авторского тона; недостающие элементы помечены как новый контент.

## Файлы

- `rules.json` — облегчённые правила, единицы времени и состояния.
- `races.json` — игровые расы.
- `characters.json` — шесть готовых героев.
- `characters/` — человекочитаемые lore-файлы героев, дополняющие канонический JSON.
- `world-map.json` — карта, семь кликабельных сюжетных регионов, объединяющих восемь земель, и связи с кампаниями.
- `campaigns/nor-il-skald.json` — завершённая северная кампания, локации, NPC, враги и летопись.
- `campaigns/linda-small.json` — завершённая кампания Вьетимы и острова Линда Смолл.
- `campaigns/*-preview.json` — публичные превью будущих кампаний, не переводящие регион или кампанию в статус готовых.
- `campaigns/*-session-preview.json` — минимальные публичные данные первого игрового экрана будущей кампании без правил, секретов мастера и публикации всей кампании.
- `campaigns/*-gallery-gameplay.json` — публичный исполняемый срез утверждённых проверок, диалогов, дверей и встречи гостиничной галереи.
- `campaigns/*-guide.md` — синхронные человекочитаемые сценарии и итоги для мастера.

## Типовой шаблон сущностей

### Игровая раса

```text
id, name, status, description
feature: name, effect
source
```

`status` принимает `playable` или `encountered`. Для игровой расы `feature` обязателен. У встреченной в летописи расы механика может отсутствовать, пока автор её не согласовал. Утверждённый расовый арт связывается по `id` через раздел `races` в `assets/concepts/manifest.json`; если отдельного арта нет, интерфейс может показать канонический визуал явно связанного героя, NPC или врага.

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

Необязательный `raceHistory[]` хранит прежние канонические облики героя: `raceConceptId`, историческое `displayName`, `status: former` и поясняющий `note`. Поле не меняет текущую расу и портрет героя.

У NPC и врага необязательный `raceConceptIds[]` явно связывает сущность с расой из `races.json`. Связь добавляется только когда раса прямо названа в каноне; внешний вид сам по себе не считается подтверждением.

### Локация

```text
id, name, mapLabel, summary, atmosphere
intro, pointsOfInterest[], npcs[], encounters[], clues[], rewards[]
unlockCondition, nextLocations[]
```

### Регион мировой карты

```text
order, id, name, subtitle, description, image, imageLayers[], campaignId, status
gameMasterCharacterId
teaser: image, eyebrow, title, description
polygon[]: пары [x, y] в системе координат viewBox 1024 × 1024
additionalPolygons[]: дополнительные несмежные области того же региона
```

`status` принимает `completed`, `ready` или `planned`. `campaignId` остаётся `null`, пока файл кампании не создан.
`image` указывает на полноразмерный прозрачный слой региона 1024 × 1024, совмещённый с актуальной мировой картой. Он используется и как изображение региона, и для выделения земли при наведении.
`imageLayers` и `additionalPolygons` используются, когда один сюжетный регион состоит из нескольких несмежных земель.
Необязательное `subtitle` хранит красивую подпись земли, а `gameMasterCharacterId` ссылается на ответственного мастера из `characters.json`. Для ещё не опубликованной кампании `teaser` может показывать утверждённый публичный арт и неспойлерный анонс на странице региона.

### Сцена

```text
id, locationId, title, type, readAloud, objective
choices[]: label, check, success, failure
encounterId, rewards[], clues[], nextSceneIds[]
```

### Публичное превью кампании

```text
version, id, campaignId, regionId, title, eyebrow, status
slides[]: id, order, image, alt, text
slides[].speaker: kind, label, characterId
```

`status` публичного превью принимает значение `preview`. Превью хранится отдельно от полной кампании и не заполняет `world-map.json.campaignId`. `slides[].order` начинается с 1 и идёт без пропусков, `image` ссылается на утверждённый файл из `assets/concepts/manifest.json`, а `alt` описывает значимое действие кадра без спойлеров. `speaker.kind` принимает `narrator` или `character`; `characterId` обязателен только для персонажа и ссылается на стабильный `id` из `characters.json`.

### Публичный первый экран игровой сессии

```text
version, id, campaignId, regionId, status, initialSceneId
party[]: characterId, label, token
scenes[]:
  id, title, eyebrow, background, alt, readAloud, roomLegend
  backgroundLayout?: cover | portrait
  introActionLabel?: string
  inspectables[]: id, label, image?, icon?, visualKind?, locationHint, summary, revealText, useText, order, inventoryOrder?, hotspotPosition?
  exit: label, nextSceneId, availableAfter[], presentation?
```

`status` принимает значение `preview`. Такой файл позволяет собирать первый публичный игровой экран до публикации полной кампании и не заполняет `world-map.json.campaignId`. Он хранит только наблюдаемые игроками факты: вступительный текст, состав партии, утверждённые арты, предметы для осмотра и подготовленный идентификатор следующей сцены. DC, проверки, скрытая правда, последствия выбора, флаги, счётчики и секреты мастера остаются в полном JSON кампании и игровом движке.

`party[].characterId` ссылается на стабильный `id` в `characters.json`. `background`, `token`, `image` и `icon` ссылаются на канонические записи `assets/concepts/manifest.json`. `backgroundLayout: portrait` сохраняет утверждённый вертикальный арт целиком на фоне затемнённой копии. Необязательный `scenes[].roomLegend` продолжает `readAloud` одним цельным художественным описанием осматриваемой комнаты: в нём естественно соединяются расположение находок, наблюдаемые детали и их значение для дальнейшего пути без списков и технических терминов. `introActionLabel` заменяет стандартную подпись первого сюжетного действия. `inspectables[].locationHint` хранит точное расположение объекта для доступной подписи точки поиска, `summary` подробно описывает внешний вид, `revealText` хранит найденные сведения, а `useText` завершает раскрытие предмета естественным выводом героев без формальных игровых эффектов. Для утверждённого code-native изображения вместо `image` и `icon` используется `visualKind`; `hotspotPosition` при необходимости задаёт координаты `x` и `y` точки находки в процентах от сцены. `inspectables[].order` начинается с 1 и идёт без пропусков внутри сцены, а необязательный `inventoryOrder` закрепляет предмет за общей ячейкой сквозного инвентаря кампании. `exit.availableAfter[]` содержит `id` объектов этой же сцены, которые требуется раскрыть до появления выхода. `exit.presentation: control` показывает сюжетный переход как подписанное действие; без него выход остаётся интерактивной дверью сцены. `exit.nextSceneId` фиксирует стабильный `id` следующей сцены. Для последнего опубликованного экрана и презентационных состояний, чьи переходы управляются отдельным игровым графом, `exit` равен `null`.

### Игровой срез гостиничной галереи

```text
version, id, campaignId, sceneId, initialView
doors[]: id, label, view, status, actionLabel, description, availableDescription?, lockedDescription?, requiresAllFlags[]?, requiresAnyFlag[]?
dialogues.*: speaker, opening, lore? { title, art, alt, paragraphs[] }, help?, threat?, reward?, success?, pressure?, search?
narration: initial, archiveWithKey, passageOpen
dialogues: публичные реплики NPC по утверждённым условиям
checks[]: id, label, stats[], dc, eligibleHeroIds[]?, dcModifiers[]? { flag, delta }, automaticSuccessAbilityId?, advantageAbilityId?, successText, failureText
combatActions[]: id, encounterIds[], characterId, source, name, description, target, resolution, effects[], uses { scope, max }
encounters[]: id, name, hp, ac, initiative, attack, weakness, heroAttacks[], startText?, victoryText?
encounters[].units[]?: id, name, token?, hp?, maxHp?, ac?, initiative?, attack?
```

Файл содержит только наблюдаемые игроками варианты и формальные эффекты опубликованного среза. Броски применяются через сессионную модель событий; компоненты не меняют флаги, HP, инвентарь или счётчики напрямую. `eligibleHeroIds` ограничивает проверку указанными героями, а `dcModifiers` декларативно меняет сложность по уже установленным флагам. Обязательная улика работает по принципу fail-forward: провал может добавить осложнение, но не уничтожает путь дальше. `requiresAllFlags` и `requiresAnyFlag` определяют состояние дверей, а сюжетные предметы участвуют в этих условиях или имеют явно указанное более позднее применение. Клик по направлению раскрывает соответствующую легенду мастера; переход выполняется отдельным действием `actionLabel`, если условие входа выполнено. `narration` хранит произносимые мастером варианты легенды галереи: интерфейс выбирает их по состоянию сцеы, но не показывает игрокам подписи дверей, флаги или техническую сводку условий. `encounters[]` позволяет одному срезу запускать разные бои из разных сюжетных веток; активный `encounterId` хранится в сессионном событии. `combatActions[]` связывает применимые в конкретной встрече навыки и предметы с явной целью, автоматическим эффектом и лимитом использований; интерфейс показывает только действия активного героя, а движок расходует их и передаёт ход через журнал событий.

HUD и движок боя читают встречу декларативно и не зависят от конкретной сцены. Общие `hp`, `ac`, `initiative` и `attack` служат значениями по умолчанию для всех противников встречи. Необязательные поля внутри `units[]` переопределяют их для отдельного противника. Без override-полей старый формат остаётся полностью совместимым.

После победы универсальный боевой слой показывает модальное окно `Victory` и использует `encounters[].victoryText` как короткий публичный итог встречи. Подтверждение модалки не выбирает следующую сцену самостоятельно: сценовый адаптер закрывает HUD и переводит игру в подготовленное послебоевое состояние.

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
