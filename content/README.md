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
- `campaigns/penisuela-chronicle.json` — публичная летопись Пенисуэлы со счастливым финалом и ссылкой на запуск приключения; не заменяет исполняемый bundle.
- `campaigns/*-preview.json` — публичные превью будущих кампаний, не переводящие регион или кампанию в статус готовых.
- `campaigns/*-session-preview.json` — публичный презентационный контракт всех экранов готовой к игре кампании без секретов мастера; историческое имя файла сохранено ради стабильных импортов.
- `campaigns/*-dialogue.json` — канонический банк голосов и выбираемых мастером реплик полной кампании.
- `campaigns/*-gallery-gameplay.json` — публичный исполняемый контракт проверок, диалогов, дверей, сюжетных решений и встреч кампании.
- `campaigns/*-final-boss.json` — формальная конфигурация обязательного многофазного финала, его планов победы и fail-forward.
- `campaigns/*-guide.md` — синхронные человекочитаемые сценарии и итоги для мастера.

Готовая интерактивная кампания может быть опубликована составным bundle вместо дублирующего монолитного `campaigns/<campaign-id>.json`. Для Пенисуэлы единый canonical bundle состоит из `penisuela-session-preview.json`, `penisuela-gallery-gameplay.json`, `penisuela-dialogue.json`, `penisuela-final-boss.json` и `penisuela-session-preview-guide.md`; границы частей перечислены ниже, а полный набор регистрируется одной записью `canonicalCampaignBundle` в рабочем `workflow.json`. Отсутствие отдельного `penisuela.json` в этом случае намеренно: один и тот же факт не должен иметь второй конкурирующий источник истины.

Для проверки сюжетного NPC необязательное `storyScenes[].actions[].check.npcActor` содержит `id`, `name`, `token` и `stats` (модификаторы характеристик). Такая проверка доступна только этому NPC: он не добавляется в партию, не расходует ресурсы героев и не получает их временные модификаторы. Результат хранится в общем журнале бросков с `heroId`, равным ID NPC, и отменяется обычным способом.

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

`abilities[].uses` равен `null` для неограниченного свойства либо имеет форму `{ scope, max }`. `items[].charges: null` означает обычный предмет без расходуемых зарядов; целое число — историческая краткая запись кампанийного запаса, а `{ scope, max }` явно задаёт область восстановления. Допустимые области: `turn`, `round`, `battle`, `location`, `campaign`. Runtime замораживает эти источники и исходные заряды в первом событии сессии.

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

`status` принимает `completed`, `ready` или `planned`. У `planned` поле `campaignId` остаётся `null`, пока данные кампании не созданы; `ready` и `completed` обязаны ссылаться на стабильный `campaignId`. `ready` означает, что интерактивная кампания доступна для игры и пользовательского тестирования, но ещё не перенесена в завершённую летопись.
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
music?: id, title, source, volume, fadeOutMs
outro?: video: {id, title, source}, titleCard: {text, durationMs}, nextSceneId
```

`status` публичного превью принимает значение `preview`. Превью хранится отдельно от полной кампании и не заполняет `world-map.json.campaignId`. `slides[].order` начинается с 1 и идёт без пропусков, `image` ссылается на утверждённый файл из `assets/concepts/manifest.json`, а `alt` описывает значимое действие кадра без спойлеров. `speaker.kind` принимает `narrator` или `character`; `characterId` обязателен только для персонажа и ссылается на стабильный `id` из `characters.json`.

Необязательное `outro` задаёт переход после последнего кадра пролога: `video.source` ссылается на утверждённый ролик в manifest, который проигрывается один раз со звуком на скорости 1×. После окончания или пропуска ролика показывается чёрный экран с временной подписью `titleCard.text` на `titleCard.durationMs` миллисекунд, затем автоматически открывается `nextSceneId` из публичного контракта сессии той же кампании. Длительность титра относится только к интерфейсу и не меняет игровые единицы времени. У Пенисуэлы это «На следующее утро», 5000 мс, затем номер `hotel-overload`.

Необязательное `music: {id, title, source, volume, fadeOutMs}` задаёт фоновый трек пролога. `source` зарегистрирован в manifest и разрешается общим asset resolver; `volume` — громкость от 0 до 1, `fadeOutMs` — положительная длительность затухания в миллисекундах. Музыка автоматически запускается и повторяется по кругу на всех кадрах, кроме последнего. Открытие последнего кадра сразу начинает плавное затухание до нуля, после чего плеер останавливается. Прямое открытие последнего кадра остаётся без музыки. Возврат на предыдущий кадр отменяет затухание и продолжает трек с прежней позиции; завершение и выход из пролога останавливают его. Клики и клавиши повторяют попытку запуска только на обычных кадрах, если браузер заблокировал автозапуск. У Пенисуэлы: «Шёпот каменных стен», 30%, затухание 3000 мс при открытии девятого кадра — полёта Кострюльки.

### Финальные титры

`campaigns/*-credits.json` содержит `version`, `campaignId`, `title`, `partyCharacterIds[]`, `cast[]: {id, characterName, prototypeName?}`, `aiModels[]: {id, name}`, `photos[]: {id, source, alt, caption, creditIds: string[]}`, `closingText` и `entries[]: {sceneId, requiredFlags[]}`. Имена героев берутся из `characters.json` без изменения и без добавления реальных прототипов. `prototypeName` — явно указанная автором подпись человека, вдохновившего вымышленный образ; это не утверждение об участии человека в разработке. Модели перечисляются по сообщению автора без приписывания им неподтверждённых задач. Фотокадры — созданные для титров изображения вымышленной вечеринки; `source` ссылается на утверждённую запись manifest. `creditIds` — непустой список ID из `partyCharacterIds` либо `cast`, чьи имена сопровождают кадр. Это привязка к блоку титров, а не перечень всех людей в кадре. Все ID одного фото относятся к одному разделу. Общий снимок нескольких персонажей объединяет их имена в один блок. Кадры одного героя показываются вместе в порядке `photos`; имена не повторяются, фотографии не дублируются. Персонажи без снимков и модели ИИ выводятся текстом. Пустой список фотографий оставляет в ленте только текстовые блоки. Данные титров не меняют правила, награды или сохранение кампании.

Необязательное `gameMasterIds: string[]` выделяет участников из `cast` в отдельный раздел «Мастер игры» после игровых героев. Их имена и фотографии не повторяются в разделе остальных персонажей. Все `creditIds` одного фото должны принадлежать одному из этих разделов; порядок участников сохраняется по `cast`.

Необязательное `postCreditsVideo: {id, title, source, volume, delayMs}` задаёт общий послетитровый ролик для обеих концовок. `source` ссылается на канонический видеофайл в manifest, `volume` задаётся от 0 до 1, `delayMs` — время показа единственной строки `closingText` на чёрном фоне после окончания ленты. У Пенисуэлы это «Спасибо за эту историю» на 2000 мс. Песня останавливается, затем ролик автоматически проигрывается один раз со своим звуком на скорости 1×, целиком до события `ended`; после него Пенисуэла возвращается на свою страницу книги (`/region/penisuela`) через React Router с заменой записи истории, без повторной благодарности. Ошибка видео выполняет тот же возврат. При загрузке видео строка остаётся до фактического начала воспроизведения, чтобы не возникал пустой промежуток. Новых кнопок нет. Песня и видео используют один сохраняемый медиаплеер, запущенный действием завершения истории. Ролик является общим тизером после титров и не меняет флаги, награды или исход выбранной концовки.

Необязательное `music: {id, title, source, volume}` задаёт музыку титров; `volume` — начальная громкость от 0 до 1, `source` разрешается через общий asset resolver и зарегистрирован в manifest. Действие «Завершить историю — титры» синхронно запускает музыку до загрузки маршрута; экран титров использует тот же плеер без повторного старта или перемотки. При прямом открытии URL выполняется попытка автозапуска, которую браузер может ограничить без предшествующего взаимодействия. Трек играет один раз: клики, ручная прокрутка, пауза текста и скрытие вкладки не выключают музыку и не запускают уже закончившуюся песню повторно. Если песня закончилась раньше ленты, оставшиеся титры идут в тишине. Завершение ленты и выход со страницы останавливают звук. Если браузер запретил первоначальный автозапуск, клики, завершённые касания и нажатия клавиш повторяют попытку, пока запуск не удастся. Экранных кнопок и ссылок навигации в титрах нет.

Титры доступны отдельным действием панели мастера после счастливой концовки с получением благодарности Grey Wiese и после последнего кадра плохой концовки. Вручную их можно открыть по `/campaign/penisuela/credits`. Текст и все фотографии движутся в одной ленте: кадры привязаны к именам через `creditIds` и оформлены белыми полароидными рамками с рукописными подписями. Одиночный снимок располагается сбоку от своих имён, два снимка героя — рядом друг с другом под его именем. На узком экране снимки своего блока идут под именем в одну колонку. Лента прокручивается автоматически; доступна ручная прокрутка, пробел переключает паузу текста. Клик по фотографии не останавливает ленту. Экранных кнопок и навигационных ссылок нет. При `prefers-reduced-motion` автопрокрутка изначально выключена.

### Публичный контракт игровой сессии

```text
version, id, campaignId, regionId, status, initialSceneId
party[]: characterId, label, token
scenes[]:
  id, title, eyebrow, background, alt, readAloud, roomLegend
  backgroundLayout?: cover | contain | portrait
  introActionLabel?: string
  interactionViews[]?: id, background, alt, readAloud?, outfitBuilder?
  inspectables[]: id, label, image?, icon?, visualKind?, locationHint, summary, revealText, useText, order, inventoryOrder?, hotspotPosition?
  exit: label, nextSceneId, availableAfter[], presentation?
```

`status` принимает значение `ready`: файл содержит публичные презентационные данные всех игровых экранов кампании, готовой к пользовательскому прохождению. Для такого релиза `world-map.json.campaignId` ссылается на ту же кампанию, а регион получает статус `ready` («Готово к игре»). Исторический суффикс `-session-preview` сохраняется ради стабильного импорта, но не означает урезанный или скрытый маршрут. Файл хранит только наблюдаемые игроками факты: тексты мастера, состав партии, утверждённые арты, предметы для осмотра и стабильные идентификаторы сцен. DC, проверки, последствия выбора, флаги и счётчики отделены в `*-gallery-gameplay.json` и `*-final-boss.json`; секреты мастера не публикуются на общем экране.

`party[].characterId` ссылается на стабильный `id` в `characters.json`. `background`, `token`, `image` и `icon` ссылаются на канонические записи `assets/concepts/manifest.json`. `backgroundLayout: contain` сохраняет утверждённый кадр целиком на фоне затемнённой копии, а `backgroundLayout: portrait` применяет тот же приём к вертикальному арту. Необязательный `scenes[].roomLegend` продолжает `readAloud` одним цельным художественным описанием осматриваемой комнаты: в нём естественно соединяются расположение находок, наблюдаемые детали и их значение для дальнейшего пути без списков и технических терминов. `introActionLabel` заменяет стандартную подпись первого сюжетного действия. `inspectables[].locationHint` хранит точное расположение объекта для доступной подписи точки поиска, `summary` подробно описывает внешний вид, `revealText` хранит найденные сведения, а `useText` завершает раскрытие предмета естественным выводом героев без формальных игровых эффектов. Для утверждённого code-native изображения вместо `image` и `icon` используется `visualKind`; допустимы `womanizer-case`, `alexis-fashion-certificate` и `bungalow-pass`. `hotspotPosition` при необходимости задаёт координаты `x` и `y` точки находки в процентах от сцены. `inspectables[].order` начинается с 1 и идёт без пропусков внутри сцены, а историческое поле `inventoryOrder` сохранено для совместимости данных и больше не назначает ячейку общей сумки. `exit.availableAfter[]` содержит `id` объектов этой же сцены, которые требуется раскрыть до появления выхода. `exit.presentation: control` показывает сюжетный переход как подписанное действие; без него выход остаётся интерактивной дверью сцены. `exit.nextSceneId` фиксирует стабильный `id` следующей сцены. Для последнего опубликованного экрана и презентационных состояний, чьи переходы управляются отдельным игровым графом, `exit` равен `null`.

`scenes[].interactionViews[]` хранит дополнительные утверждённые ракурсы той же сцены для локального взаимодействия без создания нового сюжетного узла. `id` стабилен внутри сцены, `background` ссылается на канонический ассет, а `alt` описывает только видимое игрокам. Необязательный `readAloud` содержит короткое самостоятельное описание этого ракурса от рассказчика; диалоги и прямая речь NPC в нём запрещены. Реплики хранятся отдельно в сценарии мастера и диалоговых данных; `resolution` или `dialogues` нельзя подставлять вместо вводной рассказчика.

Для игровых сцен Пенисуэлы действует редакция от 11 сентября 2026: `readAloud`, `roomLegend` и показываемые рассказчиком результаты действий передают атмосферу и оставляют намёки. Они не перечисляют предметы на арте, не описывают точные позы, не направляют взгляд к улике и не объясняют решение испытания. Уже полученные в разговоре сведения и последствия совершённых действий сохраняются. Точное расположение остаётся в доступных подписях объектов, правила и эффекты — в соответствующих интерфейсах и формальных полях. Предисловие `penisuela-preview.json.slides` в эту редактуру не входит. `hotel-overload.roomLegend` также служит текстом отдельного экрана поиска в номере; ракурсы примерочной и реквизиторской берут описание из `interactionViews[].readAloud`.

У `storyScenes[].actions[]` с `kind: automatic` необязательное `repeatable: true` разрешает повторное выполнение при соблюдении `conditions`. По умолчанию сюжетное действие однократное. Это используется для переключения сохраняемых ракурсов («Показать браслет» / «Общая сцена»); каждое переключение записывается отдельной отменяемой командой. Повторяемые эффекты должны быть идемпотентными: установка флага и открытие уже известных улик не выдают награду повторно.

Необязательный `interactionViews[].outfitBuilder` описывает визуальный конструктор образа. `pageSize` для примерочной Алексис равен `2`: каждый из трёх рядов одновременно показывает два варианта, а собственные стрелки ряда сдвигают его карусель на один вариант. Перед восемью предметами интерфейс добавляет вариант «Без предмета», снимающий выбранную деталь категории. `categories[]` содержит стабильные категории `top`, `bottom` и `accent`; каждая категория хранит восемь `options[]` с `id`, `setId`, игроковым `label`, каноническим прозрачным `image` и доступным `alt`. Выбранные предметы составляют единый сохраняемый образ и отображаются на всех ракурсах манекена этой сцены.

### Канонический банк реплик

```text
version, campaignId, status, selectionPolicy
voices[]: characterId, voice, tempo, vocabulary, gesture, forbidden[]
presets[]: id, characterId, sceneIds[], label, intent, tone, conditions, text, gmNote, reveals[], effects[]
```

`status` принимает значение `approved`, а `selectionPolicy` — `gm-only`: реплику выбирает мастер, и приложение не раскрывает скрытые условия игрокам. `voices[].characterId` и `presets[].characterId` используют стабильные идентификаторы персонажей. `presets[].sceneIds` ссылается на канонические узлы story graph/gameplay; runtime отдельно сопоставляет такой узел с одним или несколькими публичными презентационными экранами, поэтому идентификатор реплики не обязан буквально присутствовать среди `*-session-preview.json.scenes[].id`. `conditions` декларативно связывает реплику с проверкой, предметом, флагом, выбором или фазой, `reveals` перечисляет открываемые улики, а `effects` остаётся формальным описанием для журнала и не должно применяться второй раз поверх авторитетного игрового события. После публикации приоритет имеет `content/campaigns/<campaign-id>-dialogue.json`; одноимённый рабочий файл в `docs/` служит редактируемой копией и обязан оставаться синхронным.

### Исполняемый контракт кампании

```text
version, id, campaignId, sceneId, initialView
doors[]: id, label, view, status, actionLabel, description, availableDescription?, lockedDescription?, requiresAllFlags[]?, requiresAnyFlag[]?
dialogues.*: speaker, opening, lore? { title, art, alt, paragraphs[] }, help?, threat?, reward?, success?, pressure?, search?, information?, callConsent?
narration: initial, afterKraken, archiveWithKey, passageOpen, propRoomQuest, propRoomRecovered, propRoomRecoveredAfterCarriers
dialogues: публичные реплики NPC по утверждённым условиям; NPC, которого мастер полностью отыгрывает вживую, может отсутствовать в объекте
dancePuzzle: speaker, opening, clue, success, route, video, enchantedMusic, wrongTrackPenalty, firstCorrectTrackCombat?, tracks[]
dancePuzzle.video, dancePuzzle.enchantedMusic, dancePuzzle.tracks[].audio: label, placeholder, source?
dancePuzzle.video.source: путь к утверждённому ассету либо HTTPS-ссылка на непосредственно воспроизводимый видеофайл
dancePuzzle.video.startSeconds?: начальная позиция видео в секундах (по умолчанию 0), применяется при выборе и повторном выборе трека; не сдвигает аудио
dancePuzzle.wrongTrackPenalty: encounterId, modalEyebrow, modalTitle, modalText, confirmLabel
dancePuzzle.firstCorrectTrackCombat?: modalEyebrow, modalTitle, modalText, confirmLabel; бой с той же встречей wrongTrackPenalty.encounterId при верном ответе без предыдущих ошибок
dancePuzzle.tracks[]: id, label, description, correct, feedback, audio
dressingRoom: speaker, opening, objects[], identity, route, satyr, rehearsal, stageModule
dressingRoom.objects[]: id, label, group, description, hotspotPosition { x, y }
dressingRoom.identity, dressingRoom.route, dressingRoom.satyr, dressingRoom.rehearsal: title, success, failure?
dressingRoom.stageModule: opening, success, route, assistance[] { id, heroId, label, description }
guestBungalows: speaker, opening, choiceTitle, choicePrompt, unavailable, womanizer, couplesSession, routeBoundary
guestBungalows.unavailable: womanizerMissing, stasConsentMissing
guestBungalows.womanizer, guestBungalows.couplesSession: id, label, description, resolution
checks[]: id, label, stats[], dc, eligibleHeroIds[]?, dcModifiers[]? { flag, delta }, automaticSuccessAbilityId?, advantageAbilityId?, successText, failureText
npcBehaviors[]: id, encounterId, actorIds[], actions[], targetPriorities[]
npcBehaviors[].actions[]: id, name, category, target, baseScore, explanation, maxTargets?, leaveOneOpponentSafe?, avoidPreviousTargets?, phaseIds[]?, minRound?, maxRound?, requiresFlags[]?, forbidsFlags[]?, resourceId?, actorHpRatioLte?, requiredTargetConditions[]?, excludedTargetConditions[]?, resolution?
npcBehaviors[].targetPriorities[]: rule, score, explanation, actionIds[]?, minRound?, maxRound?
combatActions[]: id, sourceId, encounterIds[], characterId, source, name, description, artwork? { image, viewBox }, activation?, target, resolution, check? { dice, successMin, successMax? }, effects[], skillVideo? { source, poster? }, deactivationVideo? { source, poster? }, uses { scope, max }
encounters[]: id, name, hp, ac, initiative, attack, weakness, heroAttacks[], startText?, victoryText?, defeatFallback?
encounters[].attack, encounters[].units[].attack?: id, name, bonus, damage, artwork? { image, viewBox }, damageType?, attacks?, savingThrow? { stat, dc, condition }
encounters[].units[]?: id, name, token?, hp?, maxHp?, ac?, initiative?, attack?
encounters[].defeatFallback?: resolution, outcome? { flags?, timePressureDelta?, inventoryAcquire[]?, clues[]? }, completionActionId?
storyScenes[]: id, prompt, actions[], challenge?, epilogue?
storyScenes[].challenge?: failureCounter, failureLimit, tracks[] { actionId, label, successCounter, successesRequired, repeatable? }
storyScenes[].actions[]: id, kind, label, description, conditions?, nextSceneId, resolution, outcome
storyScenes[].actions[kind=automatic]: challengeProgressOutcome?
storyScenes[].actions[kind=check]: check { stats[], dc, eligibleHeroIds[]?, advantageIfFlag?, advantageIfHeroId? }, failureResolution, failureOutcome, failureNextSceneId?
storyScenes[].actions[kind=combat-start|combat-complete]: encounterId
storyScenes[].conditions: allFlags[]?, noFlags[]?, allClues[]?, counterLte? { doom?, kreed-evidence-count?, show18-contradictions-broken?, timePressure?, preFinalCombats?, show18LiveSuccesses?, show18TeleprompterSuccesses?, show18Failures?, groomTunnelSuccesses?, groomTunnelFailures?, restoreLogSuccesses?, restoreLogFailures? }, graphCondition?
storyScenes[].conditions.graphCondition: otherwise | all[] | any[] | not | { flag, equals } | { counter, eq? | gt? | gte? | lt? | lte? }
storyScenes[].outcome: flags?, counterDeltas?, relationships?, inventory? { acquire[]?, remove[]? }, itemCharges?, clues[]?, selectedEnding?, nextView?
storyScenes[].epilogue: outcome, recordingAuthorized, recordingPrivate, familyWomanizer, familyStas, familyPolina, familyUnresolved, redButtonUnused
```

Файл содержит наблюдаемые игроками варианты и формальные эффекты всей готовой кампании от гостиничной галереи до перехода в обязательный финал. Броски применяются через сессионную модель событий; компоненты не меняют флаги, HP, инвентарь или счётчики напрямую. `eligibleHeroIds` ограничивает проверку указанными героями, а без него участвовать может любой герой партии; `stats[]` перечисляет допустимые характеристики выбора. `dcModifiers` декларативно меняет сложность по уже установленным флагам. Обязательная улика работает по принципу fail-forward: провал может добавить осложнение, но не уничтожает путь дальше. `dancePuzzle.tracks[].correct` управляет развязкой музыкальной головоломки, но не выводится игрокам. Клик по дорожке только выбирает её для прослушивания; формальный результат применяется после отдельного подтверждения. Неверная дорожка хранит публичную реакцию в `feedback`, блокируется после попытки и через `wrongTrackPenalty` открывает обязательную модалку перед повторяемой встречей из четырёх новых стражей; после боя следующая ещё не проверенная дорожка остаётся доступна. При наличии `firstCorrectTrackCombat` верная песня без предыдущих ошибочных подтверждений освобождает труппу и открывает бой с той же охраной через отдельный текст модального окна. После хотя бы одной ошибки верная песня освобождает труппу без нового боя. Ошибки определяются по сохранённым `dance-track-<id>-rejected`; отменённая попытка не считается ошибкой. Освобождение, награда и ожидание боя записываются одной отменяемой командой. Прослушивание песни попыткой не считается. `dressingRoom.objects[]` описывает только видимые точки расследования; поле `group` связывает их с условием публичной проверки и не выводится игрокам. `dressingRoom.stageModule.assistance[]` перечисляет уже канонические умения героев, способные автоматически заменить одну ещё не закрытую линию технического испытания. `guestBungalows` сохраняет совместимый текстовый адаптер в прежних полях `womanizer` и `couplesSession`; канонические доступность, переходы и эффекты двух решений Оливии определяются только соответствующими `storyScenes[].actions[]`. Отказ устанавливает `olva-bungalow-access-issued` и выдаёт одну ключ-карту `guest-bungalow-pass`; согласие ведёт к столу доказательств, а ключ и карточка отдыха выдаются на отдельном экране благодарности после вердикта. Медиаслот без утверждённого `source` не отображается и не показывает игрокам техническую заглушку; после публикации файла `source` ссылается на каноническую запись ассета теми же правилами, что `background`, `image` и `icon`, и слот появляется без изменения игровой логики. Видео пульта воспроизводится без звука и элементов управления; каждый клик по доступной дорожке, включая уже выбранную, возвращает видео к `startSeconds` (по умолчанию 0). Пульт показывает только номера «Трек 1», «Трек 2» и далее, без названий и описаний песен; поля `label` и `description` сохраняются в данных. Технические заголовки, статусы и подписи вокруг видео не выводятся. Нативные controls видео и аудио скрыты; музыка запускается кнопкой трека, сюжетное подтверждение остаётся отдельным. Большой видеомонитор расположен слева, три цветные клавиши и кнопка подтверждения — справа; декор повторяет чёрно-золотой пульт с арта. Волна выбранного трека слегка анимируется, при `prefers-reduced-motion` анимация отключается. Выбор трека запускает его `audio.source`; повторный выбор начинает аудио заново, а выбор трека без файла останавливает предыдущее аудио. Пульт показывает по три трека на странице; листание сохраняет выбранную песню и оба воспроизводимых потока. Кнопка подтверждения показывает номер выбранного трека даже на другой странице. Ни аудио, ни видео не повторяются: завершение любого потока останавливает оба и делает монитор чёрным. До выбора песни видео не играет. Следующий выбор снова включает монитор и перезапускает оба потока. Для внешнего видео нужен прямой HTTPS-адрес воспроизводимого файла; ссылка на страницу видеосервиса не подходит. `requiresAllFlags` и `requiresAnyFlag` определяют состояние дверей, а сюжетные предметы участвуют в этих условиях или имеют явно указанное более позднее применение. Клик по направлению раскрывает соответствующую легенду мастера; переход выполняется отдельным действием `actionLabel`, если условие входа выполнено. `narration` хранит произносимые мастером варианты легенды галереи: интерфейс выбирает их по состоянию сцены, но не показывает игрокам подписи дверей, флаги или техническую сводку условий. `encounters[]` позволяет запускать разные бои из разных сюжетных веток; активный `encounterId` хранится в сессионном событии. `npcBehaviors[]` задаёт только детерминированные приоритеты легальных действий и целей: скрытая случайность запрещена, равенство разрешается по стабильным `id`, а применение остаётся за явным подтверждением мастера. `combatActions[]` связывает применимые в конкретной встрече навыки и предметы с явной целью, автоматическим эффектом и лимитом использований. `sourceId` всегда ссылается на канонический `abilities[].id` или `items[].id`: разные действия одного источника используют общий счётчик и не обходят лимит сменой `actionId`. Области `turn`, `round`, `battle`, `location` и `campaign` восстанавливаются только соответствующим переходом сессии; кампанийная область — полным reset либо явно разрешённым полным отдыхом `olva-timeout`, который восстанавливает все области. Для предметного действия дополнительно обязательны владелец, положительное количество и, если у предмета есть заряды, положительный остаток; подтверждённое действие и расход заряда записываются одним `commandId`.

Сохраняемый журнал сессии имеет envelope `{ version, campaignId, updatedAt, events }`. Первым и неотменяемым событием всегда идёт `session-started`: оно хранит глубокую копию источников героев, исходных владельцев/количеств/зарядов предметов, `definitionId`, `definitionVersion` и стартовую локацию. Replay не перечитывает изменившиеся карточки героев; несовместимая версия runtime или gameplay definition отвергает старую запись целиком. Перед replay и записью проверяются типы, обязательные поля, диапазоны и безопасные id. `event.id` уникален, а события одного `commandId` образуют только одну непрерывную группу: повтор такой группы считается повреждённым журналом и не применяется второй раз. `safe-location-rested` хранит явный d8 каждого героя, ограничивает лечение текущим максимумом HP и восстанавливает ресурсы `location`. Текущая локация, её состояния, отношения и ручные модификаторы меняются только отменяемыми событиями.

Поля `guestBungalows.unavailable`, `guestBungalows.womanizer` и `guestBungalows.couplesSession` оставлены как совместимый текстовый адаптер для существующего интерфейса и не являются guard-источником. Формальная развилка находится в `bungalow-courtyard`: принятие ведёт в `olva-date-rehearsal` без предварительной выдачи, отказ — в `olva-passes-handoff` с бесплатным ключом. Завершённая консультация даёт ключ и карточку отдыха через `table-claim-reward`. Все завершения добровольной линии возвращают в `guest-bungalows`; после открытия правой дорожки `egorik-bungalow-reveal` ведёт в `groom-tunnel`.

HUD и движок боя читают встречу декларативно и не зависят от конкретной сцены. Общие `hp`, `ac`, `initiative` и `attack` служат значениями по умолчанию для всех противников встречи. Необязательные поля внутри `units[]` переопределяют их для отдельного противника. Без override-полей старый формат остаётся полностью совместимым.

Обычная атака использует `bonus` против AC и затем `damage`. Необязательный `savingThrow` заменяет эту пару спасброском выбранной характеристики: при провале на героя накладывается указанное кампанийное `condition`, при успехе состояние не применяется; ход противника завершается в обоих случаях. `defeatFallback` доступен только когда все герои имеют 0 HP, у встречи остаётся живой противник и нет ожидающего урона. Общая модель возвращает каждому герою 1 HP и гасит оставшихся противников, после чего применяет явно описанный `outcome` либо завершает подготовленное сюжетное действие по `completionActionId`; декларация может хранить оба поля, когда специальный сценовый обработчик применяет outcome самого action. Обычно `completionActionId` ссылается на `storyScenes[].actions[kind=automatic]`. Кордебалет конфиденциальности использует уже реализованный scene-specific fail-forward через одноимённый `combat-complete`: обработчик проверяет те же условия поражения, атомарно завершает живых противников и применяет outcome этого действия ровно один раз.

После победы универсальный боевой слой показывает модальное окно `Victory` и использует `encounters[].victoryText` как короткий публичный итог встречи. Подтверждение модалки не выбирает следующую сцену самостоятельно: сценовый адаптер закрывает HUD и переводит игру в подготовленное послебоевое состояние.

`storyScenes[]` продолжает тот же событийный runtime во всех 49 post-prologue узлах, начиная с `hotel-overload`. `kind` принимает `automatic`, `check`, `combat-start` или `combat-complete`. Каждое действие имеет стабильный `id`, отдельный публичный текст результата и подготовленный `nextSceneId`; переход показывается только после записи `story-action-resolved` и всех эффектов одним `commandId`. Проверка пишет `roll-entered` вместе с успешным либо fail-forward outcome, поэтому перезагрузка и undo не разделяют бросок и последствия. `counterDeltas` принимает двенадцать счётчиков сессии: `doom`, `kreed-evidence-count`, `show18-contradictions-broken`, `timePressure`, `preFinalCombats`, `show18LiveSuccesses`, `show18TeleprompterSuccesses`, `show18Failures`, `groomTunnelSuccesses`, `groomTunnelFailures`, `restoreLogSuccesses` и `restoreLogFailures`. `graphCondition` рекурсивно переносит точное условие утверждённого story graph в runtime; отсутствующий счётчик читается как ноль. Отношения и заряды задаются через `{ mode: "delta" | "set", value }`, причём заряды не могут стать отрицательными.

В `hotel-overload-search` первое нахождение каждого из четырёх `inspectables[]` создаёт отдельную отменяемую команду приобретения предмета. Визуальный inspectable `egorik-recording` сохраняется под каноническим session-item id `recording-for-egorik`; адаптер обратимо связывает эти id для показа находки и undo. Предметная доступность трёх ранних `automatic` actions повторно проверяется обработчиком экрана по сессионному инвентарю; это не расширяет декларативную схему `conditions`, которая по-прежнему хранит только flags, clues и counters. Само раннее действие проходит через общий `commitStoryAction`: `story-action-resolved`, флаг и улика записываются одним `commandId`, повторный запуск блокируется по журналу событий, а undo отменяет весь результат целиком. Скрытые броски для этих действий не выполняются.

Необязательный `challenge` связывает действия с дорожками успехов и общим лимитом провалов. `successCounter` может принадлежать одной дорожке либо быть общим для нескольких разных задач, как в тоннеле жениха. При `repeatable: true` одно действие разрешено повторять до достижения `successesRequired`; без этого поля дорожка неповторяема и закрывается после первого записанного успеха или провала. Неповторяемая автоматическая дорожка задаётся действием `kind: automatic`: она без броска увеличивает `successCounter` на один, а её необязательный `challengeProgressOutcome` сразу записывает одноразовый побочный эффект. Основной `outcome` дорожки применяется только при достижении `successesRequired`. После `failureLimit` все ещё незавершённые проверки и автоматические дорожки испытания скрываются, но явно описанный бой или аварийный выход остаётся доступен. У проверки необязательный `dcOverrides[]` задаёт отдельный DC для перечисленных `heroIds`; базовый `dc` применяется ко всем остальным. В `outcome.inventory.quantities` можно зафиксировать количество приобретаемого предмета, если его `id` одновременно присутствует в `outcome.inventory.acquire`. Условия `allFlags`, `allClues`, `counterLte` и `graphCondition` декларативны и не содержат исполняемого JavaScript. `epilogue` хранит только опубликованные варианты сводки; интерфейс выбирает судьбу записи, семейный кадр и упоминание неиспользованной Красной кнопки из зафиксированного состояния сессии.

### Дополнительные боевые эффекты действий

Необязательный `combatActions[].check` задаёт бросок самого приёма: весь набор `effects[]` применяется только при результате между `successMin` и `successMax`, а использование всё равно расходуется при провале. Стандартные боевые эффекты включают `modify-attack`, `modify-stat`, `remove-negative-conditions`, `area-saving-throw`, `apply-status`, `area-damage` и `roll-table`. `apply-status` хранит воспроизводимый статус с источником, целью, зарядами, необязательной величиной и моментом истечения; `roll-table` выбирает один формальный набор эффектов по диапазону кубика. `area-damage` задаёт общий урон нескольким целям, тип урона и спасбросок с половиной урона либо последующим статусом. У `modify-attack.recipients` допустимы `self`, `selected-ally` и `all-allies`: соответственно бонус получает источник, выбранный живой союзник или вся живая партия.

Массовый спасбросок использует один явно введённый результат для однородной группы противников. Его `failureConditions[]` может одновременно наложить `prone` и `stunned`: цель пропускает следующее действие, после чего оба состояния снимаются. Все действующие условия, модификаторы и статусы проецируются в компактные метки на карточке участника; заряды показываются прямо в метке. В верхней очереди выводятся только эффекты, меняющие порядок или пропуск хода, чтобы постоянные сопротивления и числовые усиления не захламляли инициативу.

### Многофазный финальный босс

```text
version, campaignId, sceneId
encounter: обычная CombatEncounterDefinition с segmentedHp[], overflowDamageCarries, phaseTransitions[]
phases[]: id, number, name, hpFrom, hpTo, background, readAloud, attack, directorDc, preparedDirectorDc?
phases[].attack: id, name, bonus, damage, targets, distinctTargets?, secondaryAttack?, savingThrow?
npcBehavior: тот же детерминированный профиль, что `npcBehaviors[]`, для фазовых действий босса
plans[]: id, label, description, condition, check, endingId, endingFlag, epilogueSceneId
defeatFallback: label, resolution, endingId, endingFlag, epilogueSceneId
```

`segmentedHp[]` задаёт пороги фаз; при `overflowDamageCarries: false` лишний урон на следующую фазу не переносится. Фон, произносимый текст и атака выбираются по текущему HP. `standard` и `director` закрывают ровно один текущий сегмент успешной проверкой, `physical` использует обычный боевой урон; способ закрытия последнего сегмента атомарно записывает `selectedEnding`. Условия планов читают только уже зафиксированные флаги и счётчики. `savingThrow.success: half-damage` округляет половину вниз. Если все герои достигают 0 HP, `defeatFallback` возвращает их в сознание с 1 HP, физически завершает модуль и выбирает аварийный эпилог без смерти персонажей.

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

Публичный пересказ интерактивной кампании может храниться отдельно в `*-chronicle.json` с тем же стабильным `id` кампании. Это редакционная летопись выбранного автором исхода, а не второе описание механик: параметры врагов `hp` и `ac` здесь необязательны, правила остаются в исполняемом bundle. Для Пенисуэлы выбран счастливый финал; необязательные решения партии не фиксируются. Соответствующий `*-chronicle-guide.md` описывает границы пересказа. Необязательное `playableEntry: {to, label}` задаёт внутренний маршрут и подпись кнопки запуска под эпилогом. Переход не сбрасывает сохранение.

Кампания может хранить `presentation.pageSubtitle`, `presentation.background`, `presentation.statusSeal` и визуальное поле `visual` у локаций, NPC и врагов. Для статичного арта используются `visual.image` и `visual.alt`; для фоновой анимации — `visual.video`, необязательный `visual.poster` и `visual.alt`. У одной сущности указывается либо `image`, либо `video`. Видео предназначено для публичной атмосферной подачи, воспроизводится без звука и элементов управления и зацикливается нативно. Все пути ссылаются на зарегистрированные файлы из `assets/concepts/`.

В завершённой кампании `ending.visual` показывает положительный итог или награду, а отдельный `ending.closingVisual` — последний сюжетный кадр после этого блока. Для него можно задать `ending.closingTitle` и `ending.closingCaption`; это не создаёт новую сущность врага и не заменяет его основную карточку.

Необязательное `ending.rewards[]: {id, itemId, title, recipient, description, visual, characterId?}` фиксирует полученные в пересказе награды отдельными карточками. `itemId` ссылается на предмет героя или каталог `party-rewards.json`, `characterId` — на героя-владельца, если награда личная. Страница показывает результат истории без изменения игрового сохранения. В летописи Пенисуэлы автор подтвердил получение Торином изумрудной Birkin (новый облик `seven-job-bag`, не дополнительная сумка) и общих духов Grey Wiese.

Для подробной летописи `locations[].story: string[]` дополняет краткое `summary` абзацами событий; `sceneId` при необходимости связывает эпизод пересказа с игровым экраном, когда их ID различаются. Необязательный `highlights: {eyebrow, title, entries[]: {id, title, description, visual}}` содержит подборку роликов приёмов героев, без утверждения, что каждый приём обязательно применялся в прошедшей партии. В `visual` необязательное `objectPosition` задаёт CSS-положение изображения или постера без изменения исходного файла. Видео автоматически воспроизводится без звука, повторяется по кругу и не показывает элементы управления. Ролики подгружаются по мере приближения к экрану и ставятся на паузу за его пределами.

## Термины времени

Боевой журнал: у `combat-saving-throw-requested.savingThrow` необязательное `actionName` сохраняет имя источника дополнительного броска. Помимо спасбросков, общий интерфейс очереди поддерживает `kind: action-healing` с `rollExpression` и `healing: {maxHp, endTurn}` для явного броска лечения после таблицы эффекта; `kind: enemy-attack-reroll` с `attackReroll: {firstRoll, targetId}` для явного защитного переброса атаки. Это продолжения исходного действия, без нового расхода uses. У лечения `dc: 0` — техническое значение, DC в интерфейсе не показывается. Старые события без этих полей читаются как прежде. Все результаты сохраняются событиями; повторное чтение журнала не бросает кубики заново.

Видео навыков с `activation: action` или `attack` воспроизводятся после разрешения хода: атака, урон, все спасброски целей и дополнительные кубики завершены. Видео навыков с `activation: bonus` или `movement` запускаются сразу после успешного применения и разрешения собственных бросков, сохраняя текущий ход и доступную атаку. Это относится к взлёту, приземлению, уменьшению и возвращению обычного роста Линды; для обратного превращения используется `deactivationVideo`. Видео не применяет эффекты повторно. Если ролик уже идёт, следующий ожидает его окончания. Переход между фазами босса ожидает окончания этой очереди. Очередь видео относится к интерфейсу, не сохраняется в игровой журнал и не повторяется после перезагрузки.

- `turn` — ход одного участника.
- `round` — все участники сделали по одному ходу.
- `battle` — один бой.
- `location` — пребывание в одной локации до перехода.
- `campaign` — вся текущая кампания.

До появления автоматического движка спорные исходы решает мастер. Значения DC и характеристики в данных — рекомендуемые.

### Источники сюжетных действий и проверки с помощью предметов

Необязательное `storyScenes[].actions[].requirements` содержит `heroId`, `itemIds[]`, `abilityIds[]` и `resourceActionId`. Герой должен присутствовать в сохранённой партии и иметь HP > 0; предметы должны находиться у него, способности — в его сохранённой карточке. `resourceActionId` ссылается на существующий `combatActions[].id`: выполнение сюжетного действия списывает его общий ресурс через тот же ledger и в той же отменяемой команде. Без поля расхода пассивное свойство не получает искусственных зарядов.

`check.modifierBonus` добавляет явно согласованный бонус источника к характеристике; `check.dcModifiers[]: {flag, delta}` меняет DC при установленном флаге. UI и движок используют один расчёт. Для преимущества общий SceneCheckPanel принимает два физических d20 или два цифровых кубика, сохраняет оба и выбирает больший. Ракурсы внутри groom-tunnel не меняют локацию и не обновляют Видеонаблюдение. Наружный ракурс `exterior` сменяется внутренним `entry` после автоматического действия `groom-tunnel-enter` с флагом `groom-tunnel-entered`. Пока вход не выполнен, решения для коридора недоступны. Флаги уже пройденных внутренних этапов имеют приоритет при выборе ракурса для совместимости сохранений.

В `bedroom-reveal` начальный фон показывает рум-тур Grey Wiese. Автоматическое `approach-bedroom-door` устанавливает `graywise-tour-finished` и открывает ракурс `bedroom-closed` со старым артом у двери. Только `open-bedroom-door` из этого состояния раскрывает `bedroom-open` и устанавливает прежние флаги спальни и пятого огня. Уже раскрытая спальня имеет приоритет над флагом рум-тура, включая старые сохранения; отмена возвращает по одному кадру.



### Последовательность боёв босса

Необязательное `bossSequence` в `*-gallery-gameplay.json` содержит `sceneId`, `firstEncounterId`, `secondEncounterId`, `secondViewId`, `transformationVideo: { title, source? }` и необязательное `intermission: { viewId, continueLabel }`. `source` — утверждённый ассет ролика. При наличии `intermission` победа первой фазы оставляет открытой общую модалку победы; её подтверждение закрывает бой и показывает указанный ракурс. Кнопка `continueLabel` под рассказчиком записывает `andrey-transformation-started` и запускает видео; только окончание или явный пропуск начинает второй бой. Без файла ролика кнопка сразу начинает второй бой. Без `intermission` сохраняется прежний автоматический переход через ролик. Первый бой завершается при 0 HP всех врагов и отсутствии ожидающих бросков; поражение партии не считается победой. Вторая встреча получает собственные полные HP и новую инициативу. HP героев, предметы и campaign/location uses сохраняются; turn/round/battle uses восстанавливаются по правилу нового боя. Флаги `andrey-phase-one-defeated`, `andrey-transformation-started`, `andrey-transformation-finished`, `andrey-boss-defeated` — производное состояние последовательности. Подтверждение победы и запуск превращения — отдельные отменяемые шаги; окончание ролика объединяется с его запуском. Перезагрузка сохраняет ожидание кнопки. `andrey-monster-visible` от отменённого ручного прототипа не управляет боем.


### Обмен предмета и сессионный облик

`storyScenes[].actions[].conditions.allItems[]` требует наличия всех перечисленных предметов в общем сессионном инвентаре. Это дополняет requirements героя и не заменяет проверку владельца личного предмета. Удаление сертификата и установка флага подарка выполняются одним outcome и отменяются вместе.

Необязательный `itemSkins[]` в gameplay содержит `itemId`, `flag`, `name` и `artwork: { image, viewBox }`. `image` — зарегистрированный утверждённый арт; `viewBox` задаёт область изображения в исходных пикселях для UI. Это отображение фрагмента исходного файла, без изменения PNG, удаления фона или генерации нового изображения. Скин действует только в данной сессии, не изменяет id, владельца, количество, заряды или эффект предмета. Боевой presentation adapter передаёт необязательное `artwork` в общий CombatActionView. Кнопка общего инвентаря во всех игровых сценах показывает тот же облик из состояния общего контроллера; переход назад и перезагрузка его не сбрасывают. Для отдельной прозрачной иконки `viewBox` охватывает весь файл. Скин не создаёт новую запись инвентаря.

`storyScenes[].actions[].requirements.ownedItemIds` проверяет наличие предметов у `heroId` независимо от оставшихся зарядов. `itemIds` дополнительно требует доступный заряд; для косметического обмена используется `ownedItemIds`.

### Разрушаемые боевые объекты и освобождение союзника

В `encounters[].units[]` необязательное `kind: "object"` обозначает атакуемый объект: он не участвует в инициативе, не совершает действий и не учитывается при победе. Остальные юниты — существа. `releaseAlly` содержит `id` (канонический ID NPC), `name`, `hp`, `ac`, `token` и `attack` (`name`, `bonus`, `damage`, `range`, `damageType`). При первом снижении HP объекта до нуля этот союзник автоматически появляется сразу после текущего участника на один ход. Повторное разрушение после ручного восстановления HP не даёт второго союзника; отмена исходного разрушения отменяет и освобождение.

В состоянии союзника необязательное `remainingTurns` ограничивает число ходов независимо от раундов. У освобождённого NPC оно равно 1; уход с его хода, включая пропуск, уменьшает его до 0. После этого NPC исчезает из отображаемой очереди и списка целей. `expiresAfterRound` сохраняет прежнюю семантику обычных призывов. Нереализованные ходы поддержки завершаются вместе с боем; союзники и колбы не переносятся во вторую фазу.

### Возвращение после финального босса

Необязательное `bossSequence.aftermath` задаёт `returnSceneId`, `deathVideo: {title, source?}` и `returnTransition?: "portal"`, `returnViewId?` (ракурс той же сцены после подтверждения победы, под роликом смерти и порталом). Настоящая победа во второй встрече оставляет общую модалку победы открытой. Её подтверждение записывает `andrey-boss-defeated`, закрывает бой и запускает видео гибели босса. Окончание или пропуск записывает `andrey-death-video-finished`; при `returnTransition: "portal"` общий портал скрывает смену кадра и открывает сцену возвращения, иначе переход прямой. Без `source` после подтверждения сразу начинается возвращение, без пустого видеоэкрана. Повторный callback не создаёт событий. Поражение не запускает этот переход. Подтверждение победы — отдельная отменяемая команда; конец видео относится к ней, поэтому шаг назад возвращает модалку победы. Завершённый портал не повторяется при перезагрузке; прерванный ролик восстанавливается. Голосовой сброс в `couple-voice-reset` — обычный automatic story action, который записывает `couple-voice-reset-completed` и `crisis-resolved`; переход к свадьбе выбирает эпилог без изменения согласия на публикацию записей.

`bossSequence.defeat?` содержит `returnSceneId`, `endingId`, `resolution`: альтернативный финал при падении всей партии в любой из двух фаз. Одна отменяемая команда завершает бой без убийства врага, возвращает героям 1 HP, выбирает концовку и устанавливает `andrey-defeat-fallback`, `andrey-bad-ending`, `andrey-hostages-captured`. Автопереход объединяется с последним боевым действием. Отсутствие поля сохраняет старый fallback других встреч.

### Награды, переносимые между кампаниями

`party-rewards.json` — общий каталог наград партии: `id`, `name`, `description`, `effect`, `uses: {scope, max}`, `automaticCheckStat`, `carryToNextCampaign`, `visualKind`. Награда принадлежит всей партии; использовать её может любой живой герой во внебоевой проверке указанной характеристики. Один заряд даёт обычный автоматический успех без d20 и без критического эффекта. Расход и исход входят в одну отменяемую команду. NPC награду не используют.

При получении каталог задаёт `inventoryState` (`ownerId: null`, `quantity: 1`, `charges/maxCharges: uses.max`, `chargeScope: uses.scope`). При начале следующей кампании переданный в `existingInventory` ID награды получает полный кампанийный запас; обычный отдых и перезагрузка страницы его не восстанавливают. `visualKind: grey-wiese-perfume` — кодовая иконка флакона в существующем `ArtifactGlyph`.

Полученные награды сохраняются отдельно в локальном реестре партии `dnd-party-rewards-v1` по исходной кампании. Новый журнал другой кампании импортирует их ID. В уже начатый журнал они не добавляются повторно; отмена получения удаляет запись переноса. Журнал текущей кампании остаётся источником истины для остатка зарядов.

### Сюжетная редакция Пенисуэлы от 8 сентября 2026

`*-gallery-gameplay.json.storyTruth` содержит короткую мастерскую истину: отправителя и пересылку пяти пригласительных, публичную угрозу, секрет Нетака, роли голосов и три разных допуска. Не выводится игрокам до сюжетного раскрытия. `doomMilestones[]: {id, flag, sceneId, label, readAloud}` — пять сюжетных точек. Изменение одного из их флагов пересчитывает Doom по достигнутым точкам. Ошибки, отдых и время не повышают Doom; старые `counter-changed` для Doom игнорируются при наличии этой конфигурации. Ручная коррекция счётчика мастером действует до следующего изменения сюжетной точки. Replay и отмена пересчитывают результат по тем же данным. Пятый Doom не выбирает концовку и не отключает голосовой сброс после победы.

`storyScenes[].actions[].conditions.itemQuantities` задаёт минимальное количество каждого предмета (`Record<itemId, number>`). Для выхода из бара нужны `stas-bungalow-pass: 1` и `troupe-bungalow-passes: 4`; их нельзя заменить пропуском Оливии `guest-bungalow-pass`, который отдельно открывает бунгало Егорика. `dancePuzzle.rewardItemId/rewardQuantity` задают предмет и количество благодарности освобождённой труппы.

`penisuela-final-boss.json.compatibilityNote` обозначает сохранённый старый трёхфазный движок. Действующий босс описан в `penisuela-gallery-gameplay.json`; старые реплики Last Take требуют отдельного мастерского флага `legacy-last-take-route` и не запускаются в текущем бою.

`storyTruth.currentRouteSceneIds` + `optionalSceneIds` + `badEndingSceneIds` + ключи `compatibilityAliases` определяют доступные сцены интерфейса. Старые и отложенные URL не поддерживаются и показывают «Не найдено»; перенаправлений на другие игровые сцены нет. `compatibilityAliases` содержит используемый в игре вариант комнаты Алексиса после визита к Pussy Sultan. Отдельный действующий экран поиска `hotel-overload-search` сохраняется. `retiredDialogueCharacterIds: string[]` исключает архивных персонажей из интерфейса реплик, включая режим всего банка. Исходные JSON сохраняют записи для истории; интерфейс получает отдельную проекцию, в которой нет архивных сцен, их переходов и реплик. Оба ответа Оливии выдают пропуск; принятие открывает новый квест, отказ — сцену передачи. После выдачи доступа можно вернуться на консультацию.
`storyTruth.retiredDialoguePresetIds: string[]` исключает отдельные устаревшие реплики действующих NPC, если их старые контексты пересекаются с нынешними сценами. Для каждой реплики массивы `reveals` и `effects` обязательны, в том числе пустые.
`storyTruth.interfaceCounterIds: GalleryCounter[]` задаёт счётчики полной консоли для действующего маршрута. Значения архивных счётчиков остаются в журнале, но отдельные редакторы Show18, старого испытания тоннеля и восстановления журнала больше не выводятся.

### Размещение предметов в сумке

Инвентарь общего экрана размещает уникальные полученные предметы в первую свободную ячейку и сохраняет занятые ячейки между сценами и перезагрузками. Восемь ячеек образуют страницу сумки; следующие доступны стрелками. `inspectables[].order` задаёт положение находки на сцене; историческое `inventoryOrder` больше не назначает ячейку общей сумки. Локальная запись `dnd:campaign-inventory:<campaignId>` поддерживает необязательный массив `slots: (string | null)[]`; старое сохранение без него получает ячейки в порядке находок.

### Стол доказательств Оливии (текущая версия)

`penisuela-olva-quest.json` хранит `sceneId`, `title`, фон общего кадра `background`, овальный стол `tableBackground`, исторические `endingBackground`/`giftBackground`/`propsArtwork`, вводную `intro`, `evidence[]` (`id`, `kind`, `title`, `caption`, полный `text`, доводы `stas`/`polina`, реплика `olva`), `sides[]` (`id`, `label`), `endings[]` (`id`, `label`, `short`, `resolution`), `gift` (`itemId`, `title`, `proposal`, `confirmation`) и `reward` (`id`, `name`, `effect`, `uses.scope=campaign`, `uses.max=1`, `speech`). Предыдущая схема вопросов и репетиции отменена.

В журнале используются `olva-table-*` флаги прочтения, размещения по сторонам, предложения подарка, голосов каждого из пяти героев, завершения и исхода. `table-*` действия повторяемы до завершения; вердикт проверяет отдельная модель: пять действительных голосов, единственный лидер, реальный предмет для подарочной развязки. При ничьей нужен новый расклад голосов. Старые `olva-date-*` события остаются в сохранении, но не выбирают этап новой версии. `olva-timeout` использует сгенерированную иконку; `visualKind` сохраняется как резервное отображение.

Редакция стола: `evidence[].kind` выбирает оформление предмета: SVG-силуэт для документов либо фотографию из `artwork` для `photo`. `endings[].exitPosition` задаёт координаты двери на варианте арта; `endings[].background` и `alt` задают отдельный кадр после вердикта, `consequence` — видимое объяснение решения перед голосованием. `gift.proposal` раскрывается при первом переходе к голосам с выложенным предметом. Исход `gift` — «Компромис»: сохраняет пару, снижает сексуальное напряжение Полинетты, оставляет вопрос ребёнка открытым. Только `separate` фиксирует расставание. Прежняя версия подарочного расставания отменена. Выход из квеста доступен до и после исхода без сброса прогресса.

### Судьба пары: актуальная редакция Оливии

В `penisuela-olva-quest.json` теперь три `endings`: технический `polina` означает «Остаться вместе», `separate` — «Расстаться», `gift` — «Компромис». Старый `stas` больше не является отдельным выбором; сохранённый голос/исход `stas` читается как `polina`, новые голоса очищают прежний флаг. Приоритет имеет явный новый голос. `speakers[]` описывает имена и портретные фрагменты общего арта: `id`, `name`, `portrait.image`, `portrait.viewBox` (x,y,width,height), `portrait.width/height` исходника. Исторические ID, пути и события не переименовываются. Компромис сохраняет пару, снижает давление вокруг секса, но не решает вопрос ребёнка. `olva-couple-together` и `olva-couple-separated` взаимоисключающие; `olva-couple-compromise` дополнительно отмечает сохранение пары через подарок.

### Расширенные доказательства Оливии

`evidence` содержит пятнадцать основных предметов. `gift.evidence` — условный шестнадцатый предмет с той же схемой `id/kind/title/caption/text/stas/polina/olva`, виден лишь когда Вуманайзер действительно выложен. `gift.artwork` — путь к существующей иллюстрации предмета. Дополнительные значения `kind`: `tickets`, `ledger`, `note`, `womanizer`. Они определяют только оформление осмотра; объективно верная сторона в данных не назначается. Исторический `olva-table-gift-introduction` сохранён для совместимости; текущую навигацию задаёт локальный reducer, описанный ниже. Выкладывание предмета не открывает промежуточный экран.

### Авторство документов и навигация стола Оливии

`evidence[].documentPages` и `gift.evidence.documentPages` — массивы из одной или двух сторон предмета, каждая содержит блоки `{author, text}`. Третьей стороны нет; дополнительные реплики при осмотре хранятся в `stas/polina/olva`. `author` принимает `print`, `stas`, `polina`, `escort` и определяет почерк; `text` предмета — полная текстовая версия блоков через пустую строку, проверяемая тестом. Оформление не угадывает автора по содержимому. Все кириллические шрифты локальные, с SIL OFL.

Текущий экран (`room/table/evidence/unlock/voting`) управляется одним локальным reducer; переходы между уже прочитанными предметами и возврат не добавляют события в журнал. Исторические `voting/gift-introduction` остаются для совместимости и не выбирают открываемый экран. `olva-table-gift-introduced` отмечает, что мастер уже прошёл экран нового исхода: повторный переход ведёт сразу к голосам. Голоса, предметы, чтение, раскладка и результат по-прежнему сохраняются через игровой журнал.

`penisuela-olva-quest.exitSceneId` задаёт общий выход всех экранов консультации. Текущее значение `guest-bungalows`: развилка между бунгало Станиса и Егорика. Выход не запускает повторное приглашение Оливии.

`callingCardArtwork` — декоративная иллюстрация вымышленной взрослой женщины и отпечатка помады на визитке Лолы; используется также в миниатюре улики. Текст визитки остаётся отдельными авторскими блоками, а не частью растрового изображения.

Актуальная визитка — Рокси. `callingCardArtwork` теперь содержит только горизонтальный силуэт для лицевой стороны, `callingCardKissArtwork` — самостоятельный отпечаток помады, показываемый только на обороте. Прямое название услуги и оценка подтверждения заказа удалены из публичного текста.

Для записки к Вуманайзеру `documentPages[].author=sultan` задаёт декоративный почерк Pussy Sultan. Записка — письмо от производителя, располагается отдельным бумажным предметом рядом с футляром. Канон: дорогая личная коллекция Pussy Sultan, ручная работа, золото и рубины; Полинетта узнаёт бренд и с восторгом готова принять подарок.

`gift.unlockNotice` содержит `title`, `ending`, `description`, `inventoryNote`, `continueLabel` для уведомления об открытой концовке. Это интерфейсное уведомление на фоне стола, не сюжетная сцена и не выдача подарка. Новый флаг `olva-table-gift-unlock-notice-seen` отделяет его просмотр от прежнего ошибочного показа арта; старый `gift-introduced` не скрывает новое уведомление.

### Начало блока сцен

`sceneBlocks[]` в публичном контракте сессии задаёт `id`, `title`, `entrySceneId`, `sceneIds[]`. Блок объединяет локацию со всеми внутренними экранами. «В начало сцены» возвращает на `entrySceneId` и восстанавливает прогресс первого входа в блок: журнал, HP, ресурсы, предметы, голоса, выборы и локальные состояния интерфейса. Переходы внутри блока и перезагрузка не перезаписывают точку входа. Повторный старт кампании удаляет её точки входа; откат раннего блока удаляет точки последующих блоков.

Журнал сохраняет отменённую ветку: событие `scene-checkpoint-restored` с `eventCount` восстанавливает действующую историю до указанной границы команд, не удаляя исходные события. Для старого сохранения без точки входа граница восстанавливается по первому событию блока; несохранённые прежним кодом локальные окна возвращаются к началу.

### Подписи большой панели мастера

`campaigns/penisuela-gm-console.json` хранит только интерфейсный словарь: `campaignId`, `counters` и `flags` как словари `{label, description}`, `relationships` как словарь названий. Он не меняет правила или условия прохождения. Этапы механизма берутся из `doomMilestones`, главы — из `sceneBlocks`, имена и предметы — из опубликованных сущностей. Неизвестные служебные ключи доступны лишь в раскрываемой технической коррекции.

В ручном событии `manual-adjustment` с `adjustment.kind="scene"` необязательное `previousSceneId` сохраняет экран перед переходом мастера; необязательное `previousSceneSearch` сохраняет внутренний экран бара (`?view=stas`, `?view=dancers`, `?view=device`). При отмене такого перехода панель возвращает соответствующий URL; старые события без поля по-прежнему читаются.

### Золотые монеты за внебоевые проверки (2026-09-20)

`rules.core.criticalCheckReward` задаёт правило: подтверждённая натуральная 20 на внебоевой проверке даёт одну золотую монету на один переброс внебоевой проверки. Автоматический успех и сумма 20 с модификатором не являются основанием для награды. При преимуществе учитывается выбранный результат d20. Монеты разыгрываются за столом: приложение не хранит их количество, получение или расход и не добавляет их в инвентарь.

Необязательное `manualCheckReward` в gameplay хранит только показ награды: `name`, `artwork`, `artworkAlt`, `description`, `criticalSuccessText`, `claimLabel` и `questRewards[]` (`flag`, `text`). `questRewards` ссылается на существующий флаг успешного завершения квеста. Пенисуэла даёт одну дополнительную монету за помощь с нарядом Алексиса в начале приключения: переход `alexis-style-stabilized` из false в true при любой успешной приёмке. У Оливии дополнительной монеты нет. Для награды сгенерирован и утверждён отдельный арт `assets/concepts/campaigns/penisuela/ui/luck-coin.png`: золотая монета с рельефным d20 и круговой стрелкой. Предмет Ламберта не меняется.

Окно с артом показывается только для новых подтверждённых событий, после эффекта критического броска; очередь окон переживает переход между сценами. Загрузка, повторный рендер и отмена не выдают награду заново. Самостоятельные боевые броски, спасброски и проверки во время боя исключены. Новых событий, флагов, счётчиков, зарядов или ключей localStorage для монет нет.

### Награда Оливии: отдых и отдельная передача (2026-09-09)

`reward.presentation` хранит `background`, `alt`, `continueLabel`, `claimLabel`, `exitLabel`, `receivedText`, зоны `handoffPosition`/`exitPosition` (x/y/width/height в процентах арта). Завершение голосования показывает только исход пары. `table-show-reward` открывает отдельный экран Оливии; `table-claim-reward` выдаёт ключ-карту и карточку отдыха атомарно, устанавливая `olva-table-reward-claimed`. Экраны сохраняются флагом `olva-table-reward-shown`. Принятие квеста больше не выдаёт ключ заранее; отказ сохраняет бесплатный доступ. Ключ — один `guest-bungalow-pass` на всю группу, не пять предметов.

Стабильный ID `olva-timeout` означает одноразовую карточку полного отдыха: вне боя HP каждого героя становится равным его текущему максимуму (включая героев без сознания), заряды всех имеющихся предметов восстанавливаются до `inventoryState.maxCharges`, в том числе кампанийные. Сбрасываются счётчики всех навыков героев и имеющихся предметов для всех областей: `turn`, `round`, `battle`, `location`, `campaign`. Включая кампанийные призывы и двойной выстрел. Полное восстановление согласовано 17 сентября 2026. Предметы без зарядов, количество и текущий владелец не меняются; отданные и потерянные предметы не возвращаются. Сама карточка исключена из восстановления и исчезает. Событие `party-fully-rested {consumedItemId}` вместе со списанием, удалением и флагом `olva-rest-used` имеет один `commandId`; отмена восстанавливает всю операцию. Старое `safe-location-rested` продолжает воспроизводить прежний отдых с d8 без изменения старых сохранений. Повторная выдача награды не перезаряжает карточку.

`reward.restVideo` квеста Оливии хранит `id`, `title`, `source`, `poster`: ролик после успешного подтверждения отдыха из общей сумки. Лечение и расход фиксируются до видео; завершение, пропуск и Escape закрывают плеер, не меняя повторно состояние. Перезагрузка не повторяет расход или ролик.

### Навыки освобождённых гостей в бою

`combatActions[].characterId` может ссылаться на `encounters[].units[].releaseAlly.id`. Такой союзник получает действие только после освобождения, на своём единственном ходу. `sourceId` задаёт стабильный ресурс навыка, `uses: {scope: battle, max: 1}`; выбор обычной атаки сохраняется.

Эффект `{type: guest-skill, kind, enemyId, dice?}`: `grease-trap` отражает следующую атаку указанного врага в него самого; `healing-note` лечит всех героев одним общим броском `dice`; `guaranteed-critical` усиливает следующую атаку выбранного героя против `enemyId`. Статусы `grease-trap`/`guest-critical` не исчезают с уходом гостя, но очищаются при завершении встречи. `againstTargetId?` у боевого статуса ограничивает усиление указанным врагом.

`CombatPendingAttack.automatic?` отмечает автоматическое попадание; только для него `natural: 0` означает отсутствие d20 (отражение). Критическое попадание Kreed использует эквивалент 20, удваивая весь итог обычного броска урона вместе с модификаторами. Видео навыка хранится в обычном `skillVideo`; общий плеер воспроизводит его ×2.

### Навыки врагов и последовательные спасброски

`combatActions[].characterId` также может ссылаться на боевую единицу из `encounters[].units[]`. Для таких навыков `sourceId` — стабильный идентификатор собственного навыка врага, а `target` трактуется относительно его стороны. В первой фазе Нетака мастер выбирает навык в общей панели боя; обычная рекомендация NPC по-прежнему предлагает базовую атаку.

- `enemy-summon`: `count`, `turns`, необязательный `tokens[]` (аватарки по порядку призыва, с резервным `unit.token`), `unit` (обычное описание боевой единицы с обязательной атакой). Событие `combat-enemies-summoned` хранит полный состав призыва; у созданных врагов есть `summonedBy` и `remainingTurns`. Они вставляются перед следующим ходом призывателя, исчезают после своих ходов (включая пропущенные из-за оглушения) либо поражения призывателя. Призыв не препятствует победе над основным боссом.
- `enemy-saving-throw`: `stat`, `dc`, `maxTargets`, необязательные `damage`, `damageType`, `failureCondition`, `successAttackBonus`. Общий урон бросается до спасбросков; каждый герой бросает свой d20. Текущая очередь хранится в `CombatPendingSavingThrow` с `kind: enemy-skill` и `enemySkill {actionId, actionName, remainingTargetIds, damage, damageType?, successAttackBonus?}`. Результаты применяются по одному, весь ход заканчивается после последней цели. Поддержаны яд с половиной урона при успехе и зеркала с помехой при провале либо бонусом следующей атаке по источнику при успехе. При выборе двух целей мастер назначает первую, вторая — другой живой герой с наибольшим HP; при равенстве используется стабильный id. Пассивки помощи спасброскам и сопротивления обрабатываются до урона; временные HP и спасение от падения на 0 HP — общим reducer.

Навыки дракона используют `replace-attack.attack.onHitSavingThrow` для удара хвостом; атака врага расходует выбранный `activation: attack` и затем запрашивает спасбросок живой цели-героя. `enemy-area-damage` содержит `damage`, `damageType`, `maxTargets`: один общий урон всем героям в сознании без спасбросков. `enemy-crown` содержит `acBonus` и `retaliationDice`: кубик ответного урона бросается при создании щита и сохраняется в статусе `retaliating-crown.retaliationDamage`; `amount` хранит прибавку AC. Щит исчезает при первом прямом попадании или начале следующего хода владельца. Обратный урон не запускает другую корону. Падение (`prone`) даёт преимущество всем атакам по цели, включая дальние. В начале своей очереди цель автоматически встаёт без штрафа и сохраняет действие и перемещение. `movement-spent` — устаревший идентификатор: старые журналы принимаются, но этот статус не применяется, не отображается и не ограничивает навыки.


## Возвращение за Станисом — 11 сентября 2026

Полинетта пригласила Оливию на консультацию по близости и ребёнку. Муж отсутствует; Оливия не знает, где он. Без него стол не открывается. Согласие помочь (`olva-quest-accepted`) возвращает героев на развилку. На развилке «Шаг назад» возвращает их в общий зал бара, где можно подойти к Станису. Приглашение открывает проверку Харизмы: DC 4 для Ламберта, DC 12 для остальных героев. Успех даёт `olva-stas-recruited`. При неудаче Станис просит дать ему высказаться; обещание выслушать его сторону открывает консультацию без повторного броска. Из разговора возвращаются в бар, через его обычный проход — к бунгало, затем к Оливии. Прямых переходов от Станиса к столу нет.

Отказ от помощи не мешает получить ключи к Егорику; после отказа можно вернуться к просьбе. Уже начатые сохранения со столом (`olva-table-opened` или `olva-table-complete`) продолжаются без повторного поиска. Новый вход по прямому URL без согласия Станиса возвращает к Оливии. Все награды и три исхода стола сохранены. Новый факт канона: Станис сначала остаётся в баре и соглашается присутствовать только после разговора с героями. Цикл «бунгало → бар → бунгало» прямо запрошен автором.


### Описания сцен Пенисуэлы — уточнение 11 сентября 2026

`readAloud` — короткая литературная вводная от рассказчика: атмосфера и общее впечатление, без диалогов, прямой речи, пересказа разговора, перечисления точных объектов, поз персонажей и подсказок к решению. Это правило применяется также к описаниям после действий и смены ракурса. Сюжетные реплики, сведения и результаты решений сохраняются в отдельных полях мастера; они не заменяют описание сцены. Предисловие со слайдами исключено из этой редакции.

В `penisuela-olva-quest.json` обязательные `endings[].readAloud` и `reward.presentation.readAloud` содержат литературные вводные соответствующих экранов без прямой речи. `endings[].resolution` и `reward.speech` сохраняют подробные результаты и реплики для мастера. `reward.presentation.receivedText` — вводная после получения награды, также без диалогов.


### Имена семейного квеста Пенисуэлы — 11 сентября 2026

Утверждённые имена: **леди Оливия, наставница чувственных искусств**, **Станис**, **Полинетта**. В обычной речи допускается Оливия; в представлении и самостоятельной подписи — Леди Оливия. Формальные имена NPC зарегистрированы в `storyTruth.names`: `olga-vasilenko`, `bungalow-spouse-a`, `bungalow-spouse-b`. Все технические ID, авторы блоков документов (`stas`, `polina`, `olva`), флаги, URL, названия файлов и ссылки на арты сохраняются. Склонения: Оливии/Оливию/Оливией, Станиса/Станису/Станисом, Полинетты/Полинетте/Полинеттой.


### Фотографии на столе Оливии — 11 сентября 2026

`evidence[].kind: photo` использует `artwork` (путь к изображению) и `artworkAlt` (описание фотографии). Тот же снимок показывается миниатюрой на столе и крупно на лицевой стороне при осмотре. Первая сторона `documentPages` содержит подпись под снимком; вторая — записи на единственном обороте. Станис был у университета с друзьями. Полинетта впервые видит этот снимок и узнаёт фразу про «меню» за столом Оливии; её реакция хранится в реплике `polina`, а не в заранее написанных заметках на фотографии. Размер карточки при переворачивании сохраняется. Фотографии участвуют в обычных действиях чтения и распределения, не голосуют за героев и не меняют исход автоматически. Всего пятнадцать основных улик; Вуманайзер остаётся дополнительной шестнадцатой.

Иконки боевых действий: необязательное `artwork: {image, viewBox}` у базовой атаки и `combatActions[]` задаёт утверждённый визуал через общий `ArtworkFocus`. `image` зарегистрирован в manifest; `viewBox` в пикселях может включать поля вокруг исходного изображения, чтобы оружие помещалось в круглую маску без изменения PNG. Все противники, наследующие общую атаку встречи, используют один визуал. Поле не влияет на броски, урон или расход действий.

### Музыка прохождения

Необязательное `soundtrack.sceneRequiredFlags: Record<sceneId, string[]>` задаёт условия включения фона: пока хотя бы один перечисленный флаг сессии не установлен, сцена остаётся без фоновой музыки, включая боевые плейлисты. Проверка выполняется до выбора трека; самостоятельные песни головоломки и звук видео не блокируются. Ракурсы с техническим ID передают общему `CampaignScene` канонический `soundtrackSceneId`, чтобы сохранять музыку и условия родительской сцены. В баре требуется `dance-troupe-freed`; отмена освобождения снова выключает фон.

Необязательное `soundtrack` в `*-gallery-gameplay.json` содержит `volume` (0–1), `tracks[]: {id, title, source}`, `exploration: string[]`, `combat: string[]`, `encounters: Record<encounterId, string[]>`, необязательные `blocks: Record<blockId, string[]>` и `scenes: Record<sceneId, string[]>`. `blocks` ссылается на существующие `sceneBlocks` в session-preview: все экраны одного блока получают общий плейлист, без копирования назначений на каждый экран. `scenes` хранит только явно согласованные исключения: у Пенисуэлы это исключительно коридор `groom-tunnel` с «Каменным шёпотом». Вне боя приоритет: явное исключение экрана → плейлист блока → `exploration`. Массивы содержат ID треков в порядке воспроизведения. В бою плейлист конкретной встречи заменяет общий боевой. Явно пустой список означает тишину и не включает запасной плейлист. Все `source` разрешаются общим asset resolver и регистрируются в manifest.

У Пенисуэлы общие музыкальные блоки: `morning` — оба экрана пробуждения; `hall` — галерея, Алексис, Pussy Sultan и реквизиторская; `bar` — все ракурсы бара; `bungalows` — развилка, Оливия, выдача пропуска, консультация и Егорик с Настасьей; `bunker` — все экраны Kreed и выход из бункера, с отдельной музыкой только в коридоре; `villa` — все комнаты виллы, разговоры и финальные экраны вне боя. Плеер принадлежит всему прохождению: снятие экрана при записи шага, восстановлении контрольной точки или переходе не очищает плейлист и не сбрасывает позицию. Следующий экран обновляет назначение; явный пустой плейлист выключает звук, а выход из прохождения останавливает плеер.

Плейлист повторяется до смены игрового контекста, паузы мастера или выхода из прохождения; единственный трек повторяется через native `loop`, несколько — циклически по порядку. Музыка не начинается заново при каждом ходе или переходе между сценами с одинаковым плейлистом. Прослушивание песни на пульте и сюжетное/боевое видео временно приостанавливают фон; после закрытия он продолжается с той же позиции. В панели мастера доступны запуск/пауза, следующая композиция и громкость. Эти настройки относятся к подаче, не тратят действий и не меняют историю сессии. После запрета автозапуска браузером музыку можно включить вручную. Это правило относится только к фону прохождения: отдельные песни танцевального пульта и титров сохраняют своё однократное воспроизведение.


### История действий и переходов — 16 сентября 2026

«Шаг назад» отменяет последнее действие в общем хронологическом порядке. Переход между сценами или ракурсами бара записывается в тот же журнал как `scene-navigated: {fromPath, toPath}`. Для кнопки, одновременно применяющей сюжетный результат и открывающей следующую сцену, переход входит в тот же `commandId`: одно нажатие отменяется одним шагом. Обычный переход без нового результата — отдельная команда. Отмена перехода возвращает прежний URL, сохраняя более ранние находки и решения; следующая отмена снимает предыдущее действие. Сам откат не записывает новый переход. Перезагрузка сохраняет порядок. «В начало сцены» по-прежнему восстанавливает контрольную точку блока. Для обычного продолжения и возвращения к NPC используются отдельные кнопки переходов.

Ручное обнуление HP последнего противника завершает ожидание урона или спасброска. Подтверждение победы фиксирует предусмотренные результаты встречи и закрывает бой; награда не открывается, если закрытие не произошло. Сохранённые ранее бои с нулевыми HP восстанавливаются по тем же правилам. Ручное обнуление HP всей группы также снимает незавершённый бросок, чтобы доступный исход поражения не блокировался. Новых сюжетных исходов это правило не добавляет.

Боевой статус `helping-reaction` — готовность ручной реакции Торина, а не постоянный бонус AC/спасброска. Подтверждение помощи после броска применяет +2 к одной проверке и снимает один заряд отдельным событием в той же команде. Отказ сохраняет заряд; отмена команды возвращает его. Само наличие статуса не изменяет показатели.

В боевом UI `activation: action` и `attack` завершают ход после разрешения всех бросков, а `bonus` и `movement` сохраняют действие. В актуальном наборе Пенисуэлы дополнительные активные способности — «Изменение размера» и «Полёт» Линды. Панель показывает лимит из `uses.scope/max`, остаток из журнала ресурсов и цену применения по ходу. Эти подписи — производные представления, новых полей канонического JSON нет.

`evidence[].artwork` также может задавать иконку обычной улики (`note/invitation` и другие виды). Она показывается без фотографической рамки, сохраняя прозрачность; текст и две стороны документа остаются отдельной разметкой. Поле необязательное: без него используется существующий силуэт предмета.

### Набор улик Оливии — 20 сентября 2026

Три повторяющиеся улики `gift`, `invitation`, `rules` убраны из активного `evidence` и действий осмотра/раскладки. Их старые события и флаги сохраняются в журнале без переноса на новые предметы; просмотр, раскладка и `readCount` учитывают только текущий набор. ID оставшихся улик, награды, голоса и версия сохранения не меняются. Новые `silent-treatment`, `private-letter`, `desire-note`, `chore-roster`, `job-offer`, `dance-lesson` используют существующие виды `note/invitation` и обычные действия `table-read-*` / `table-place-*-*`. У каждого предмета максимум две стороны.

Редакторская раскладка — 7:7 и одна общая фотография — находится в сценарии мастера. Она не хранится в интерфейсе как правильная сторона и не добавляет голосов. Новые темы: наказание молчанием, нарушение тайны личного разговора, давление в близости, бытовое безделье, ограничение работы партнёрши и гомофобный запрет урока танцев. Чек теперь касается покупки прощения и смены условий, а отменённые билеты — ограничения личной свободы.
