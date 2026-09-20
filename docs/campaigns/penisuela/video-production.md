# Видео-пакет: путь на Пенисуэлу

> Сверка 8 сентября 2026: этот файл — история производства видео. Действующий сюжет — `outline.md`, текущие подключённые клипы — канонические JSON. Старые readiness и сценарные указания относятся к своей дате.

## Назначение

Музыкальный image-to-video монтаж между девятым слайдом таверненного пролога и игровой сценой `hotel-overload`. Целевая длительность — 45 секунд, формат — 16:9, 24 fps, без рассказчика, реплик, титров и читаемого текста.

Граница спойлеров: разрешены пять браслетов, путь на остров, вход в отель и безопасная первая вечеринка. Письмо, его содержание, личности организаторов, свадебные роли, утренние улики и аварийная линия не показываются.

Статус production pack — `draft`, readiness — `blocked`; внешняя генерация и монтаж отложены и не входят в статический release scope кампании. Восемь локальных first-frame существуют как рабочие источники, но намеренно остаются вне manifest и поэтому не могут считаться готовыми production-входами. Перед возобновлением видео их нужно отдельно утвердить и опубликовать либо заменить manifest-ассетами. Статическое приложение от них не зависит и напрямую переходит из пролога в `hotel-overload`.

## Источники

В Veo 3 каждый PNG загружается отдельно как исходный first frame:

1. `art-drafts/video-bridge/bubsilda-bracelet-v1.png`
2. `art-drafts/video-bridge/linda-bracelet-v4.png`
3. `art-drafts/video-bridge/lambert-bracelet-v3.png`
4. `art-drafts/video-bridge/golovach-lena-bracelet-v1.png`
5. `art-drafts/video-bridge/thorin-bracelet-v1.png`
6. `art-drafts/video-bridge/ship-to-penisuela-v5.png`
7. `art-drafts/video-bridge/hotel-arrival-v2.png`
8. `art-drafts/video-bridge/first-night-party-v4.png`

Не загружать в видеосервис исходные личные фотографии. Для всех героев используются только утверждённые фэнтезийные арты.

## Монтажный порядок

| № | Shot id | Время | Действие | Камера | Target | Переход |
|---|---|---:|---|---|---|---|
| 1 | `penisuela-video-shot-01-bubsilda` | 5 с | Бубсильда рассматривает браслет | медленный наезд | Veo 3 | match cut по золоту |
| 2 | `penisuela-video-shot-02-linda` | 5 с | Линда завершает застёжку | короткий наезд | Veo 3 | match cut по рукам |
| 3 | `penisuela-video-shot-03-lambert` | 5 с | Ламберт один раз проверяет застёжку | боковой slide | Veo 3 | cut по повороту запястья |
| 4 | `penisuela-video-shot-04-golovach` | 5 с | Головач поворачивает браслет | медленный наезд | Veo 3 | match cut к сумке |
| 5 | `penisuela-video-shot-05-thorin` | 5 с | Торин берётся за закрытую сумку | медленный отъезд | Veo 3 | музыкальная склейка к общему плану |
| 6 | `penisuela-video-shot-06-ship` | 7 с | Корабль идёт к острову | плавное воздушное сопровождение | Veo 3 | match cut по движению вперёд |
| 7 | `penisuela-video-shot-07-hotel-arrival` | 6 с | Пятеро входят в отель | follow сзади | Veo 3 | тёплый dissolve |
| 8 | `penisuela-video-shot-08-party` | 7 с | Один тост и уход бокалом в темноту | медленный наезд | Veo 3 | blackout → `hotel-overload` |

## Промпты Veo 3

### 1. Бубсильда получает браслет

Загрузить `bubsilda-bracelet-v1.png`.

```text
Use the uploaded approved image as the exact first frame of one continuous five-second cinematic image-to-video shot. Apply a very slow controlled dolly-in. Bubsilda slowly raises the wrist with the gold bracelet a few centimeters and looks at it once, then holds still; Kostrulka makes one small natural pigeon head tilt. Sparse snow drifts across the scene, with restrained movement in Bubsilda's hair and cloak and a faint trace of cold breath. Preserve the exact approved face, snowy outfit, body proportions, single non-glowing gold bracelet, Kostrulka's living pigeon anatomy and integrated white-graphite cargo capsule, environment geometry, lighting and painterly fantasy realism. Natural minimal motion, stable anatomy, no cuts, no dialogue, no text. Avoid identity drift, extra fingers or bracelets, magical bracelet glow, robotic pigeon anatomy, letters, envelopes, subtitles, logos, watermarks, sudden zooms and large body movement.
```

Принимать только если лицо не меняется, запястье двигается один раз без деформации, а Кострюлька остаётся живым голубем с интегрированной капсулой.

### 2. Линда получает браслет

Загрузить `linda-bracelet-v4.png`.

```text
Use the uploaded approved image as the exact first frame of one continuous five-second cinematic image-to-video shot. Make a slow short dolly-in from the existing angle. Linda completes the gold bracelet clasp with one small controlled finger movement and shifts only her gaze toward Kostrulka, remaining naturally seated and physically grounded in the root throne. A warm breeze moves a few leaves, flowers and loose hair strands; all six iridescent wings remain attached on both sides and show only a restrained natural shimmer. Preserve Linda's exact base-canonical face, pastel summer dress, body proportions, six-wing anatomy, single non-glowing bracelet, throne geometry, Kostrulka design, warm liberated Linda Small atmosphere and painterly fantasy realism. No cuts, no speech, no text. Avoid a generic Linda face, missing or duplicated wings, floating body, throne clipping, extra fingers or bracelets, magical glow, letters, subtitles, logos, watermarks, camera orbit and aggressive wing flapping.
```

Принимать только если базовое лицо Линды не меняется, все шесть крыльев остаются на месте, а застёжка выполняется одним маленьким движением.

### 3. Ламберт проверяет браслет

Загрузить `lambert-bracelet-v3.png`.

```text
Use the uploaded approved image as the exact first frame of one continuous five-second cinematic image-to-video shot. Perform a slow controlled lateral camera slide along the workbench. Lambert presses the bracelet clasp once with his right thumb, verifies it, and relaxes both hands without crossing or twisting his wrists; Kostrulka makes one small natural step on the bench. Only subtle dust motes and one light hanging workshop element move in the background. Preserve Lambert's exact approved face, glasses, dark hair, summer outfit, normal two-hand anatomy, single non-glowing bracelet, canonical living pigeon with integrated capsule, workbench geometry, White Castle workshop lighting and painterly fantasy realism. Minimal precise motion, no cuts, no dialogue, no text. Avoid broken or fused wrists, extra fingers, interfaces, tools, extra bracelets, face or glasses drift, robotic pigeon anatomy, letters, subtitles, logos, watermarks, fast pans and dramatic zooms.
```

Любая деформация пальцев или запястий — немедленный брак.

### 4. Головач принимает браслет

Загрузить `golovach-lena-bracelet-v1.png`.

```text
Use the uploaded approved image as the exact first frame of one continuous five-second cinematic image-to-video shot. Apply a slow controlled dolly-in. Golovach Lena rotates the wrist with the gold bracelet once to inspect it, then holds still with a restrained interested smile; Kostrulka blinks once. A warm breeze gently moves pavilion fabric and nearby leaves. Preserve Golovach's exact approved youthful face, horn geometry, black scale pattern, summer gear, completely tailless anatomy, inactive pendant, single non-glowing bracelet, chair contact, canonical Kostrulka and calm daytime pavilion. Natural restrained motion, painterly cinematic fantasy realism, no cuts, no dialogue, no text. Avoid any tail or tail-shaped belt, face or horn drift, red beam, pendant glow, interface, film award, extra fingers, extra bracelets, letters, subtitles, logos, watermarks, camera orbit and exaggerated expression.
```

Проверить покадрово: Головач остаётся без хвоста, кулон не активируется, лицо и рисунок чешуи не плывут.

### 5. Торин готовится к отъезду

Загрузить `thorin-bracelet-v1.png`.

```text
Use the uploaded approved image as the exact first frame of one continuous five-second cinematic image-to-video shot. Apply a slow controlled dolly-out. Thorin closes one hand firmly around the handle of the single closed travel bag and straightens slightly as if ready to depart, then holds still; Kostrulka watches with one small natural head movement. Warm air moves the rolled shirt sleeves and a little sunlit dust across the fortress loading yard. Preserve Thorin's exact approved bald bearded face, light shirt, dark leather vest, body proportions, anatomically correct hands, single non-glowing bracelet, fully closed bag, canonical Kostrulka, Desert Lands environment and painterly fantasy realism. Do not reveal the bag contents. No cuts, no dialogue, no text. Avoid opening the bag, extra bags, broken wrists, extra fingers or bracelets, face or beard drift, letters, envelopes, subtitles, logos, watermarks and heroic action poses.
```

Принимать только если сумка остаётся закрытой, рука один раз берётся за ручку и не ломается.

### 6. Корабль идёт к Пенисуэле

Загрузить `ship-to-penisuela-v5.png`.

```text
Use the uploaded approved image as the exact first frame of one continuous seven-second cinematic image-to-video shot. Create a smooth stabilized aerial chase from the existing high rear three-quarter angle, moving slightly forward and downward as the ship approaches Penisuela. The one believable wooden monohull schooner travels steadily forward; turquoise water parts coherently along both sides of the hull and forms a natural wake, while cream sails fill with wind and simple rigging responds with restrained physical motion. Exactly five approved summer heroes remain naturally positioned on deck and make only tiny balance adjustments with the ship's gentle roll. Preserve the complete single-hull geometry, two-mast layout, island towers and waterfalls, exact five-person count, Linda's bilateral wings, Golovach's tailless anatomy, clothing colors, warm late-afternoon light and painterly cinematic fantasy realism. No cuts, no dialogue, no text, no new people or structures. Avoid a second hull, barge, pontoon, side deck, warped ship anatomy, extra crew, missing heroes, tail on Golovach, missing wings on Linda, storms, giant waves, modern engines, sail lettering, subtitles, logos, watermarks, fast orbit and island morphing.
```

Сразу браковать любое изменение корпуса, числа героев или архитектуры острова.

### 7. Пятеро входят в отель

Загрузить `hotel-arrival-v2.png`.

```text
Use the uploaded approved image as the exact first frame of one continuous six-second cinematic image-to-video shot. The camera makes a slow stabilized follow-in from outside, staying behind the group as exactly five heroes take two natural, slightly staggered steps across the threshold and deeper into the pristine warm hotel lobby. Thorin carries the same single closed leather bag; no one opens or removes anything. Hair, summer fabrics and tropical leaves move gently, Linda's complete bilateral wings flex only slightly without flapping or clipping, lamp flames flicker and the glossy floor reflections remain physically stable. Preserve every approved back-view identity, exact five-person count, Golovach's tailless anatomy, doorway geometry, black-and-gold architecture, clean pre-party condition, sunset light from behind camera and painterly cinematic fantasy realism. No cuts, no visible faces, no dialogue, no text or new characters. Avoid duplicated or turning heroes, visible regenerated faces, tail on Golovach, missing wings, sliding feet, unstable reflections, staff, guests, debris, clues, letters, signs, subtitles, logos, watermarks and reverse movement.
```

Камера не должна обгонять группу: лица весь клип остаются скрыты.

### 8. Первая вечеринка и провал памяти

Загрузить `first-night-party-v4.png`.

```text
Use the uploaded approved image as the exact first frame of one continuous seven-second cinematic image-to-video shot. Apply a very slow controlled dolly-in while preserving all five approved faces. Lambert and Golovach gently bring their existing glasses together for one small toast, make one clean contact, and hold; Bubsilda, Linda and Thorin keep restrained recognizable expressions and only minimal natural breathing and rhythm movement. Confetti drifts slowly, lanterns flicker, and a light sea breeze moves hair, fabric and Linda's complete bilateral wings without flapping. Golovach remains completely tailless. During the final second, the existing out-of-focus foreground goblet rises close to the lens until it fills the frame with a soft dark burgundy blur, creating a continuous natural blackout with no hard cut. Preserve exact facial identities, especially base-canonical Linda, outfits, hands, glasses, table, intact night terrace, warm gold-coral-turquoise palette and painterly cinematic fantasy realism. No dialogue, no text, no new people, no clues. Avoid face averaging, redesigned faces, exaggerated laughter, lip movement resembling speech, extra fingers, glasses or people, tail on Golovach, missing Linda wings, spills, destruction, morning clues, letters, subtitles, logos, watermarks, camera orbit and early full-frame occlusion.
```

Это самый рискованный кадр. Принимать только если все пять лиц стабильны, бокалы соприкасаются один раз, руки не деформируются, а затемнение возникает только в последнюю секунду.

## Звук

Речи нет. Музыкальная структура:

- 00:00–00:10 — один колокольчик, арфа и мягкий низкий пульс;
- 00:10–00:25 — добавляется лёгкий часовой ритм и первый frame drum;
- 00:25–00:32 — раскрывается дорожная тема на струнах;
- 00:32–00:38 — тёплый переход к отелю;
- 00:38–00:45 — короткий праздничный подъём, затем low-pass и резкий провал в тишину.

Ambience и SFX лучше собирать отдельно: снег и голубь; сад; мастерская; павильон; кожаная сумка; море, паруса и корпус; шаги по камню и мрамору; один финальный звон бокалов. Встроенный звук Veo 3 использовать только как черновой ориентир.

## Производственный бюджет

- 8 финальных клипов.
- Кадры 1, 2 и 4: по 4–6 проб из-за лиц и Кострюльки.
- Кадры 3 и 5: по 5–8 проб из-за рук.
- Кадр 6: 5–8 проб из-за физики корпуса, воды и пяти фигур.
- Кадр 7: 5–8 проб из-за шагающей группы и крыльев.
- Кадр 8: 8–12 проб из-за пяти лиц, рук, бокалов и финального затемнения.
- Ожидаемый общий диапазон: 40–62 генерации до восьми стабильных клипов.

Генерировать в порядке риска: 8 → 6 → 7 → 3 → 5 → 2 → 4 → 1. Монтаж собирать в сюжетном порядке 1–8.

## Экспорт

- Master: `penisuela-invitation-to-hotel-master.mov`, 1920×1080, 24 fps.
- Web: H.264 MP4 и VP9/AV1 WebM.
- Poster: первый кадр Бубсильды либо корабль после отдельного решения.
- Captions: не нужны, потому что речи и текста нет.
- Финал: полный чёрный кадр, затем обычная склейка в утверждённый `hotel-overload`.


## Два ролика Андрея — кадры и промпты, 8 сентября 2026

История первоначального задания: 16 сентября ролик гибели заменён версией на 6 секунд, описанной в конце документа. Промпты ниже сохраняют исходный восьмисекундный план.

Два новых кадра v2 пересозданы после замечания об артефактах и утверждены автором: «вторая версия норм». Конечный кадр превращения — точная копия уже утверждённого боевого арта. Ролик превращения получен от пользователя и подключён в игру; ролик гибели также получен и подключён. Плановая длительность обоих роликов: 8 секунд, 16:9, неподвижная камера. Превращение — Seedance 2.5, гибель — Grok Imagine. Промпты адаптированы под выбранные модели: временные отрезки, явные роли кадров, одно действие и встроенные ограничения. Конкретный сайт пользователя не указан; названия кнопок не предполагаются.

| Ролик | Загружаемые кадры | Событие |
| --- | --- | --- |
| 1. Превращение | `art-drafts/andrey-video/01-transformation-start-v2.png` → `art-drafts/andrey-video/02-transformation-end.png` | Андрей на колене превращается в дракона; последняя секунда совпадает с артом второго боя. |
| 2. Гибель | `art-drafts/andrey-video/03-death-start-v2.png` | Дракон теряет опору, падает и замирает; последние две секунды неподвижны. |

Архив с тремя PNG и двумя промптами: `art-drafts/andrey-video/andrey-video-seedance-2.5.zip`. Исходные PNG — 1672×941, без программной ретуши. В архив входят только текущие варианты; v1 сохранены отдельно как отклонённые. Новые кадры не подключены в приложение и не опубликованы в manifest.

### Ролик 1: промпт

Загрузить начало и конец в соответствующие поля режима с первым и последним кадром. Сначала проверить короткую пробу: одно тело, стабильное лицо до превращения, те же рога и лапы к концу. Финальный кадр должен совпасть с `andrey-phase-two-monster.png`, иначе стык с боем будет заметен.

```text
One continuous 8-second dark-fantasy shot. The supplied first frame is the kneeling dark elf; the supplied last frame is the completed dragon and the required final composition. Fixed low frontal camera, constant lens, no camera movement or cuts.

0–2 seconds: The kneeling elf braces against the stone and strains upward. His face remains recognizable. A restrained violet glow grows beneath his coat.
2–6 seconds: His single body grows and transforms into the black armored dragon in the last frame. His arms become the two clawed forelimbs, his legs become the two hind legs, his head becomes the horned dragon head, and two wings unfold from his back. A compact veil of violet vapor briefly covers the changing anatomy, then clears. The transformation has weight and continuous motion; the dragon emerges from the same body and position.
6–7 seconds: The dragon settles into the precise pose, scale and framing of the last frame. Match its head, horns, limbs, wings, tail, violet chest light and arena lighting to that image.
7–8 seconds: Hold the last-frame composition still, ready to cut directly to the identical battle artwork.

Preserve the obsidian arena, arch, eclipse and towers. Keep surfaces stable and clearly defined: natural facial detail, coherent armor plates, restrained glow, sparse vapor. No texture crawling, glitter, particle storm, duplicated creature, additional limbs, new characters, cages, camera shake, text, subtitles or watermark.
Audio: rising low magical rumble, heavy transformation sounds, wings unfolding and one brief deep roar, fading before the final hold. No dialogue, narration or music.
```

### Ролик 2: промпт

Загрузить только стартовый кадр. В ролике резкий разрыв магического ядра и одно тяжёлое падение; дракон не поднимается и не возвращается в человеческий облик. После ролика на монтаже добавить короткое затемнение на 6–8 кадров и перейти к существующему арту `villa-after-andrey.png`.

```text
Animate the supplied image into one continuous 8-second cinematic dark-fantasy death scene. Fixed low frontal camera. This is a sudden, irreversible death, never resting or falling asleep.

0–2 seconds: The violet core in the dragon's chest becomes violently unstable. Bright cracks spread across its chest armor. Its body stiffens in one final spasm, its wings pull taut, and its jaws open in a brief agonized death roar.

2–3 seconds: The core ruptures in ONE concentrated violet-white flash. A shockwave sweeps dust across the obsidian floor. Small fragments of magical energy turn to ash. Both eyes go completely dark as the roar abruptly cuts off.

3–6 seconds: Its legs buckle suddenly. The enormous body crashes onto the stone with uncontrolled dead weight. Its chest hits first, then its head drops heavily onto the floor. Its wings fall limp and its tail lands last. The impact throws up dust and loose stone. No controlled lowering, careful folding or gentle resting pose.

6–8 seconds: Hold on the lifeless body. Its jaw hangs slack, its wings lie limp, its chest and eyes remain extinguished. No breathing, blinking, twitching or returning glow. Only dust and sparse ash settle.

Preserve the exact dragon, horns, four limbs, two wings, tail and arena. Keep the body intact and anatomically coherent. One clear magical rupture, one heavy collapse. Stable scales and solid silhouettes; no texture flickering or continuous particle storm. No resurrection, humanoid transformation, new characters, blood, gore, camera movement, cuts, text or watermark.

Sound: rising cracked magical hum, one death roar cut off by a sharp magical rupture, a massive stone impact, falling debris, then near-silence. No speech or music.
```

### Проверка и сборка

Сначала генерировать превращение, затем гибель. Ожидаются два итоговых клипа; ориентир на итерации — 3–5 проб превращения и 3–5 проб падения, с пересмотром промпта после повторяющегося дефекта. Это оценка попыток, не обещание качества.

Принимать только при сохранении анатомии, отсутствии мерцающей текстуры и лишних конечностей; в первом ролике проверить точный финальный ракурс, во втором — массу падения и полное угасание глаз. Начальные кадры являются новыми ракурсами после ударов; только конец первого ролика обязан точно совпасть с игровым фоном.

Речи и музыки нет. В промпте запрошены синхронные SFX; включить звук, если интерфейс предоставляет этот переключатель. Дорожку проверить и при необходимости свести отдельно. SFX: магический гул, крылья и короткий рык в первом ролике; удар, гравий и затухающий гул во втором. При отдельном сведении использовать оригинальные или лицензированные звуки. Экспорт: `andrey-transformation.mp4`, `andrey-death.mp4`, без титров. Первая склейка — на идентичный арт боя; вторая — через затемнение на виллу.

### Настройки роликов

- Превращение: first + last frame; начало — `01-transformation-start-v2.png`, конец — `02-transformation-end.png`. Задать роли изображений в интерфейсе, а не загружать их только как общие референсы.
- Гибель, Grok Imagine: image-to-video, один first frame; только `03-death-start-v2.png`, конечное изображение не нужно.
- Длительность: 8 секунд на ролик. Формат: исходное широкое соотношение сторон, примерно 16:9. На BytePlus LAS подтверждён выход 720p для этой модели; не предполагать 1080p во всех интерфейсах.
- Вставлять текст из соответствующего `.prompt.txt` целиком. Все ограничения уже внутри; специальный синтаксис @Image и отдельное negative-поле не нужны для промптов с назначенными первым/последним кадрами.
- Тайминг, неподвижность и точное совпадение финального кадра — критерии проверки результата, не гарантия генератора.

Проверено 8 сентября 2026 по [описанию ByteDance](https://seed.bytedance.com/en/blog/one-take-creation-flexible-referencing-introducing-seedance-2-5) и [документации BytePlus LAS](https://docs.byteplus.com/en/docs/byteplus_las/video_gen_enhanced): модель поддерживает управление действием через временные отрезки, режимы одного стартового и первого/последнего изображений. Конкретный интерфейс пользователя ещё не проверен.

Подключённое превращение: `assets/concepts/campaigns/penisuela/scene-videos/andrey-transformation.mp4`, 8.064 с, 1918×1080, 24 fps, H.264 + AAC. Исходный HEVC технически перекодирован с CRF 18 и faststart без изменения кадрирования и тайминга; звук скопирован.

Grok: промпт гибели описывает одно непрерывное падение с неподвижной камерой. Исходный кадр определяет внешность и сцену; последние две секунды — неподвижность. [Официальная документация image-to-video](https://docs.x.ai/developers/model-capabilities/video/image-to-video), проверено 8 сентября 2026. Точный интерфейс пользователя не задан. Текущий пакет: `art-drafts/andrey-video/andrey-video-seedance-grok.zip`; архив с названием seedance-2.5 сохраняет прежнюю версию для Seedance.

Уточнение автора: прежнее падение напоминало засыпание. Текущий Grok-промпт задаёт разрыв ядра одной вспышкой, оборванный предсмертный рёв и резкое падение безжизненного тела.

Текущая гибель: `assets/concepts/campaigns/penisuela/scene-videos/andrey-death.mp4`, 6,041667 с, 1264×720, 24 fps, H.264 + AAC. Пользовательский файл от 16 сентября скопирован побайтно. Прежний ролик на 8,041667 с сохранён в `art-drafts/andrey-video/death-6s/previous-death-8s.mp4`.

## Карточка отдыха: спа с мопсиками

Арт v4 утверждён пользователем. Один ролик Grok, 6 секунд, 16:9. Загружаемый первый кадр: `assets/concepts/campaigns/penisuela/scenes/olva-rest-spa.png`. Ролик передан пользователем и подключён: `assets/concepts/campaigns/penisuela/scene-videos/olva-rest-spa.mp4` — 6,042 с, 1264×720, 24 fps, H.264/AAC. Версии v1–v3 отклонены.

```text
Animate the uploaded image as one continuous 6-second cinematic shot, 16:9. Preserve the exact composition, all five faces, body builds, racial anatomy and three small pug attendants. The camera makes a very slow subtle push-in while keeping every character visible.

The pug gently kneads Bubsilda's shoulders as she lies face down on the massage table; she breathes slowly against her pillow. Thorin rests almost horizontally in the warm pool, his head supported, and exhales calmly. Keep his normal rounded ears. Linda stands beside Lambert at the tea counter. They exchange a brief warm glance and a restrained smile without changing their poses or spilling their cups. The small pug at the counter sniffs toward the teapot. Lena remains lying on his side on the heated stone bench, his head supported by his scaled hand; the pug beside him gently dabs his forearm with the folded towel.

Keep Linda's exact face and translucent wings, Lambert's glasses and long hair, and Lena's dark scales across his entire exposed body, horns, claws and subtle ember fissures. Never turn Lena into a human. Gentle water ripples and a slight curtain breeze, natural unsynchronized breathing and blinking. No standing up, changing positions, face morphing, extra limbs, warped hands, new objects, sliding furniture, cuts, text or subtitles. Quiet water sounds and soft pug snuffling; no dialogue.
```

Место показа: после «Принять» в окне карточки отдыха. По завершении — та же игровая сцена с применённым лечением. Экспорт: olva-rest-spa.mp4, без циклического повторения. Проверить сходство лиц, расы, позы и устойчивость мебели; для одного финального клипа может потребоваться 3–5 проб.

## Angel — «Жировая ловушка»: подключённый ролик

Пользователь передал готовое видео Grok после итерации полного плана с видимым полом. Runtime: `assets/concepts/campaigns/penisuela/skill-videos/angel-fat-trap.mp4`. Длительность 6.042 с, показ ×2 занимает 3.021 с. Плеер общий для боевых навыков; учитывает переключатель отключения видео, позволяет пропуск и Escape. Повторного применения эффекта при завершении, пропуске или восстановлении страницы нет. Начальный кадр извлечён из самого видео.

## Grey Wiese — пробный промпт пения, редакция 2

Пользователь сообщил, что первое видео показывает только дыхание. Промпт генерации исходной картинки не подходит для видео: ограничения на открытый рот и магию относились только к PNG. Новый motion prompt: 6 секунд, ×2 в игре, один кадр и неподвижная камера. Загружаемый первый кадр: `art-drafts/guest-skills/grey-wiese-first-frame-v1.png`. Отдельного утверждения арта ещё нет; промпт остаётся пробным.

```text
Animate the uploaded image into one continuous 6-second fantasy spell shot. Locked camera, same framing. The image is the STARTING pose only: the character must visibly move and SING.

0–1 second: Grey Wiese gives the fabric at his waist one quick elegant tug, releases it, straightens his upper body and lifts his chin slightly.

1–5 seconds: he opens his mouth clearly, lowers his jaw naturally and SINGS one powerful sustained high operatic “AAAA”. Show unmistakable vocal performance: open vowel-shaped mouth, engaged cheeks and throat, focused eyes, chest supporting the note. His hands open slightly away from his hips as the note swells. A bright pearly-gold vibration appears immediately in front of his singing mouth and expands into broad translucent concentric SOUND WAVES. Each wave travels outward through the surrounding air toward the camera and across the empty arena, growing larger than his body. Warm shimmering light washes over the obsidian floor and fills the right side of the frame. His hair and gown flutter gently with the spreading resonance.

5–6 seconds: he finishes the note, closes his mouth and lowers his hands with a satisfied expression. The last luminous wave continues outward and fades.

Preserve the exact face, hair, elven ears, black gown, silver brooch and body proportions. Keep the eyes and mouth visible through the translucent light. The sound originates from his voice, not his hands. Audio: a clear sustained operatic vowel with ringing magical resonance. No dialogue, fire, laser beam, new characters, cuts, subtitles or text.
```

Готовый ролик Grey Wiese передан пользователем и подключён: `assets/concepts/campaigns/penisuela/skill-videos/grey-wiese-high-note.mp4`, 6,042 с, 1264×720, H.264/AAC. Воспроизведение ×2 после подтверждения лечебного d6; первый кадр извлечён в соседний `grey-wiese-high-note-poster.png`. Пробный исходный арт не публиковался отдельно.

## Kreed — «Сюда, блин!», редакция 2

Первый кадр: `art-drafts/guest-skills/kreed-first-frame-v2.png`. Драфт. Лицо пересобрано по публичным фотопортретам Domkino и Prostars; сохранены игровая причёска и костюм. По запросу автора указующий жест заменён криком, хлопком и трясением кулака с намеренно наигранной радостью. Один клип 6 секунд, в игре ×2, камера неподвижна. Промпт для видео:

```text
Animate the uploaded image into one continuous 6-second shot. Fixed camera and framing. Kreed performs a deliberately FAKE, wildly OVERACTED celebration for an audience. Exaggerate his acting, not his anatomy.

0–1.5 seconds: his eyebrows shoot up, eyes widen and he opens his mouth to loudly shout in Russian: “СЮДА, БЛИН!” He leans forward with absurdly excessive enthusiasm, as if trying much too hard to convince everyone he is thrilled. Clearly synchronize his mouth with the words.

1.5–2.5 seconds: he brings his two open palms together for ONE loud clap at chest height, then immediately separates them. Show the palms meeting and separating cleanly.

2.5–5 seconds: he curls his RIGHT hand into a fist and raises it beside his shoulder. With his elbow bent, he pumps that fist up and down three times in short emphatic celebratory motions. His shoulders bounce along; he wears an excessively broad, obviously performed grin and gives enthusiastic little nods. His left hand lowers beside his body. The mood is ridiculous overacted JOY.

5–6 seconds: he holds the fist by his shoulder and freezes in a painfully smug, triumphant grin, still playing to the camera.

Preserve his exact face, hairstyle, beard, elven ears, costume and natural adult proportions. Keep both hands in frame. No pointing, punches, aggression, dancing, new people, camera cuts, text or subtitles. Audio: the single Russian shout, one crisp clap and quiet arena ambience.
```

Готовый ролик Kreed передан пользователем и подключён: `assets/concepts/campaigns/penisuela/skill-videos/kreed-syuda-blin.mp4`, 6,042 с, 1264×720, H.264/AAC. В игре ×2 после назначения усиления герою. Poster извлечён из первого кадра. Пробный арт отдельно не публиковался.

## Навыки первой фазы Нетака — Grok, 10 сентября 2026

По одному непрерывному ролику 6 секунд, 16:9; в игре ×2. Камера неподвижна. Загружать соответствующий первый кадр; видео пока не созданы. Пользователь продолжил к промптам после просмотра трёх кадров.

### Призыв ассистентов

Первый кадр: `art-drafts/netak-skills/netak-assistants-first-frame-v1.png`.

```text
Animate the uploaded image into one continuous 6-second cinematic shot. Keep the camera locked and preserve the exact face, pointed ears, black coat, body proportions and arena.

0–1 second: Netak makes ONE clearly visible, dismissive finger snap with his raised hand. His thumb and middle finger separate sharply. His other hand stays relaxed.
1–4 seconds: immediately after the snap, his shadow splits into two dark streams along the floor, one to each side. Each stream swells upward from the ground and forms ONE adult-sized hooded shadow servant. Their feet remain grounded while their bodies materialize upward. Exactly TWO servants, opaque black robes, empty dark hoods, subtle violet edges; no machinery, armour or copies of Netak's face.
4–6 seconds: both servants finish forming beside him and turn toward the camera, ready to obey. Netak lowers his hand with bored arrogance.

Show the snap and the complete summoning. No cuts, zoom, dialogue, text, extra limbs or additional creatures.
```

### Издевательские зеркала

Первый кадр: `art-drafts/netak-skills/netak-mirrors-first-frame-v1.png`.

```text
Animate the uploaded image into one continuous 6-second cinematic shot. Locked camera. Preserve Netak's exact face, pointed ears, black costume, body proportions and the arena.

The main action is the visible magical CONSTRUCTION of two mirrors from empty air. At the beginning, there are NO mirrors, frames or glass beside Netak.

0–1 second: Netak smoothly spreads his hands outward. Two bright violet sparks shoot from his palms and stop in the empty space on either side of him.
1–2 seconds: each spark traces a tall oval loop in the air, leaving a brilliant violet trail and a shower of small magical particles. The centres remain empty; the arena is still visible through both loops.
2–3 seconds: solid ornate mirror frames grow along the glowing loops. Cloudy silver glass spreads from each frame's edges toward its centre, visibly replacing the view through the opening. A brief violet pulse seals both newly created mirrors. They face the camera and leave Netak clearly visible between them.
3–5 seconds: only now, an indistinct charcoal silhouette develops beneath each cloudy surface, like a reflection through thick frosted glass. Each is a soft opaque head-and-shoulders contour with a continuous dark lower shape, without visible facial or bodily detail. A magical ripple stretches and compresses the silhouettes like funhouse reflections. The frames remain rigid.
5–6 seconds: violet energy continues to flicker around the frames. The reflections remain blurred while Netak gives a small smug smile.

Keep the spell's bright violet light and particles clearly visible throughout the mirror construction. The mirrors must assemble progressively on screen, never appear already complete or merely fade in. Exactly two mirrors. Reflections stay anonymous opaque shapes with no face, skin, anatomical detail, age or gender; they never resolve into people or creatures. No figures emerging from the glass, distortion of Netak, camera movement, cuts, dialogue or text.
```

### Ядовитый туман

Первый кадр: `art-drafts/netak-skills/netak-toxic-first-frame-v1.png`.

```text
Animate the uploaded image into one continuous 6-second cinematic shot. Keep the camera locked. Preserve Netak's exact facial identity, pointed ears, black coat and body proportions.

0–1.5 seconds: Netak wrinkles his nose in disdain and makes ONE broad, clearly visible fanning sweep with his raised hand, moving it away from his face and down toward the open foreground.
1.5–4 seconds: the moving palm and fingertips RELEASE a thick emerald-green poisonous vapour. A continuous stream pours from the hand, curls downward, strikes the floor and spreads rapidly outward toward the camera as a broad, dense, rolling wave. The cloud is visibly produced by HIS HAND, not his mouth or the background.
4–6 seconds: the toxic wave fills the foreground and lower half of the frame. Netak remains standing behind it, his face visible above the smoke, and calmly lowers his hand.

The smoke must visibly travel and spread, not remain a faint aura. No fire, vomiting, walking, new characters, cuts, zoom, dialogue or text.
```

### Призыв Нетака: ролик подключён

Полученный ролик скопирован без перекодирования в `assets/concepts/campaigns/penisuela/skill-videos/netak-assistants.mp4`; 1264×720, H.264/AAC, 6,041667 с. Первый кадр извлечён как poster. Навык использует общий плеер ×2, с пропуском и общей настройкой отключения видео.

Видео зеркал передано пользователем 10 сентября 2026 и подключено: `assets/concepts/campaigns/penisuela/skill-videos/netak-mirrors.mp4`, 6,042 секунды, воспроизведение ×2. После видео продолжаются проверки навыка.

Видео ядовитого тумана передано пользователем 10 сентября 2026 и подключено: `assets/concepts/campaigns/penisuela/skill-videos/netak-toxic.mp4`, 6,042 секунды, воспроизведение ×2. После видео продолжается очередь спасбросков. Все три видео навыков первой фазы подключены.


## «Переснимаем!» — дракон, удар хвостом

Grok, 6 секунд, 16:9; в игре ×2. Актуальная версия 2 использует чистый первый кадр `art-drafts/netak-dragon-skills/netak-retake-first-frame-v4.png`. Один удар через поворот таза и корпуса. Камера неподвижна. Звук: скрежет когтей, свист хвоста, осыпающаяся крошка; без речи и обязательной музыки.

```text
Animate the uploaded image into one continuous 6-second shot. Keep the camera fixed and wide.

The dragon performs ONE heavy tail sweep. Treat the tail as a thick muscular continuation of its spine, with stable length, thickness and connected armour plates.

0–2 seconds: the dragon shifts its weight onto its hind legs and slightly turns its hips to prepare the strike. The tail follows the pelvis naturally, retaining its broad curve from the reference image.

2–4 seconds: the dragon pivots its hind feet and rotates its hips and torso together through a controlled quarter-turn. This body rotation carries the ENTIRE tail in one broad, low sweep from screen right to screen left. The thick base leads; the middle and tip follow together with only slight natural flex. Keep the tail at a consistent distance from the camera, beside the dragon rather than sweeping close to the lens. A little loose dust rises beneath its path.

4–6 seconds: the dragon stops its rotation and braces its feet. The tail decelerates with the body and settles behind it. No second swing.

Prioritize coherent anatomy over speed or dramatic motion. The tail root must remain attached behind the pelvis. Maintain one continuous, gently curved silhouette from base to tip throughout the movement.

No whip-like snapping, sharp bends, kinks, stretching, shrinking, folding, coiling, tail duplication, detached segments, tail passing through the body, full-body spinning or extreme foreshortening. No camera movement, cuts, new characters, spells or text. Preserve the dragon’s appearance and the original arena.
```

Подключено: `assets/concepts/campaigns/penisuela/skill-videos/netak-retake.mp4`; первый кадр ролика: `assets/concepts/campaigns/penisuela/skill-videos/netak-retake-poster.png`. H.264/AAC, 1264×720, 6,041667 с. Файл скопирован без перекодирования. Предыдущий ролик заменён.


## «Вы все уволены» — ледяное дыхание

Grok, image-to-video, 6 секунд, 16:9; в игре ×2. Первый кадр: `art-drafts/netak-dragon-skills/netak-fired-first-frame-v3.png`. Один неподвижный план. Приёмка: поток выходит из пасти, расширяется в конус и оставляет иней. Звук: вдох, ледяной выдох и хруст инея, без речи и музыки. Один финальный клип, ориентир 3–5 попыток.

```text
Animate the uploaded image as the exact first frame of one continuous 6-second cinematic shot. Keep the camera fixed.

0–1.5 seconds: the dragon braces all four feet, draws its neck slightly back and takes a deep breath. Pale violet-white light builds INSIDE its throat. Its lower jaw opens naturally while the upper skull and horns retain their shape.

1.5–4.5 seconds: the dragon thrusts its head slightly forward and releases ONE powerful sustained blast of freezing violet-white breath directly FROM ITS OPEN MOUTH toward the empty lower-left foreground. A bright, dense stream remains visibly connected to the mouth, widening into a broad turbulent cone as it travels away. Cold flame-like tongues and wind-driven ice crystals rush outward. Where the blast touches the stone, a white frost front races across the floor toward the camera. The bright breath lights the dragon’s jaw, chest and nearby stone. Keep its head visible above the spreading cloud.

4.5–6 seconds: the breath stops at the mouth. The last part of the blast continues forward and disperses, revealing a frozen floor covered in frost and low drifting cold mist. The dragon lowers its head into a threatening stance.

Preserve the exact dragon design, proportions, horns, wings, limbs, tail and arena. The blast must visibly originate inside the mouth and travel outward, never appear spontaneously on the floor. Powerful sustained exhalation, not merely breathing or roaring. No orange fire, smoke from nostrils, laser beam, new characters, anatomical distortion, camera cuts, zoom, slow motion, dialogue or text.
```


«Вы все уволены»: пользовательский ролик подключён — `assets/concepts/campaigns/penisuela/skill-videos/netak-fired.mp4`, обложка `assets/concepts/campaigns/penisuela/skill-videos/netak-fired-poster.png`. H.264/AAC, 1264×720, 6,041667 секунды, в общем плеере ×2. Скопирован без перекодирования.


## «Главный здесь я» — защитная корона

Grok, image-to-video, 6 секунд, 16:9; в игре ×2. Первый кадр: `art-drafts/netak-dragon-skills/netak-main-character-first-frame-v3.png`. Один неподвижный план: поднятие лап, видимое создание крупных пластин, смыкание защиты. Финал — целая корона вокруг тела, лицо видно. Без входящей атаки и разрушения: они происходят позднее в бою. Звук: магический гул, кристальный звон и один импульс; без речи и обязательной музыки. Один клип, ориентир 3–5 попыток.

```text
Animate the uploaded image as the exact first frame of one continuous 6-second cinematic shot. Keep the camera fixed and preserve the full-body composition.

0–1.5 seconds: the dragon slowly raises both foreclaws from its sides to chest height, turning the palms outward in a commanding gesture. Its chin lifts arrogantly. Its feet remain planted and its wings stay still. Violet light gathers between the claws.

1.5–4 seconds: the light streams outward and condenses into several LARGE translucent violet crystal plates suspended in the air around the dragon, clearly separated from its skin. The plates slide into alignment along a broad horizontal oval surrounding its body. Their pointed upper edges form the tall teeth of ONE enormous crown-shaped defensive barrier. Show the plates visibly forming and joining into this crown, rather than a finished shield suddenly appearing. The front plates remain transparent enough to see the dragon through them. Keep its face unobstructed above the front rim.

4–6 seconds: the final gap closes with one bright violet pulse. The completed crystal crown remains stable around the dragon. It lowers its claws slightly and holds a proud, dominant pose inside the intact barrier. Soft violet light reflects on the dark stone floor.

The crown surrounds and protects the BODY; it is not a small crown worn on the head. Preserve the exact dragon anatomy, face, horns, black scales, wings, tail and arena. Large clean crystal surfaces, clear silhouettes and controlled glow. No incoming attack, breaking shield, explosion, flying debris, tiny swirling shards, metal cage bars, body transformation, new characters, camera movement, cuts, dialogue or text.
```


«Главный здесь я»: пользовательский ролик подключён — `assets/concepts/campaigns/penisuela/skill-videos/netak-main-character.mp4`, обложка `assets/concepts/campaigns/penisuela/skill-videos/netak-main-character-poster.png`. H.264/AAC, 1264×720, 6,041667 секунды, в общем плеере ×2. Скопирован без перекодирования. Все три ролика навыков дракона подключены.


## Послетитровая сцена — «Ещё один дракон» (16 сентября 2026)

Один клип Grok, image-to-video, 8 секунд, 16:9. Загрузить `art-drafts/post-credits-dragon/first-frame-v1.png`, затем вставить промпт ниже. Отдельная копия для вставки: `art-drafts/post-credits-dragon/grok-8s.txt`. Первый кадр создан встроенным imagegen на основе последнего кадра прежней восьмисекундной версии `andrey-death.mp4` (ныне `art-drafts/andrey-video/death-6s/previous-death-8s.mp4`); PNG ещё ожидает авторской приёмки, в manifest не опубликован. Автор передал готовый ролик; он подключён после титров. Исходный production prompt ниже сохранён как история задания.

| Время | Действие и звук |
| --- | --- |
| 0–1 с | Мёртвый дракон, тихий ветер, низкие грозные струнные и басовый гул, неподвижная камера |
| 1–2,2 с | Одна рука в простой чёрной перчатке входит справа и касается лба; на касании глухой удар |
| 2,2–7,3 с | Неизвестный за кадром произносит точную русскую реплику; музыка становится тише голоса |
| 7,3–8 с | Рука остаётся, дракон неподвижен; грозный низкий медный аккорд завершает клип |

Музыка титров останавливается до клипа. По уточнению автора в самом ролике звучит отдельная грозная оркестровая музыка без вокала: низкие струнные, басовый гул и медь, приглушённые под речью. Ни одно слово не должно теряться; строка «Спасибо за эту историю» показывается приложением две секунды перед роликом; это время вне самого клипа. Лицо говорящего не показывать. Не добавлять дыхание, свечение, движение пасти или воскрешение. Один готовый план; ориентир 3–5 внешних проб из-за синхронизации речи и руки. В первую очередь принять правильную руку, неизменную голову и полную реплику без субтитров.

Дракон взят из победной ветки как визуальный референс. Готовый авторский ролик подключён как общий тизер после титров обеих концовок; он не изменяет исходы, флаги и награды кампании.

[Официальная документация image-to-video](https://docs.x.ai/developers/model-capabilities/video/image-to-video) проверена 16 сентября 2026; версия и UI-переключатели пользователя не заданы. Целевая длительность — ровно восемь секунд, первый кадр — один PNG. Не нужен отдельный последний кадр.

```text
Animate the uploaded image as the exact first frame of one continuous 8-second cinematic dark-fantasy post-credits shot, 16:9. Locked low camera; no cuts or zoom.

0.0–1.0 s: Hold on the dead dragon's head resting on the obsidian floor. Only a trace of ash drifts through the air.

1.0–2.2 s: ONE human-sized right hand in a plain worn black leather glove, with a dark sleeve, slowly enters from the right edge. The forearm remains connected beyond the frame. The hand reaches the dragon's brow above the closed eye, gently makes contact once, then rests there. Five natural fingers, correct scale and solid contact with the scales. The visitor's face and body stay completely off screen.

2.2–7.3 s: The hand stays on the dragon. The unseen visitor speaks ONCE in Russian, in a deep, resonant, menacing male voice, with controlled anger and clear natural diction. Complete the entire line before 7.3 seconds. Say exactly:
"Они убили еще одного дракона, этому надо положить конец"

7.3–8.0 s: Hold the touch as the ominous score rises into one dark low-brass sting. End on this image.

The voice comes from the unseen visitor, never from the dragon. The dragon is DEAD throughout: no breathing, blinking, twitching, mouth movement, glowing eyes or resurrection. Preserve the supplied dragon design, head position, scales, horns, collapsed body, obsidian arena, violet lighting and composition. No magic from the hand, no added characters, rings or symbols, no blood, no subtitles, text, logo or watermark.

Audio: a threatening dark orchestral score starts immediately: deep sustained low strings, an ominous bass drone and restrained low brass, slow and heavy. At the hand contact around 2.2 seconds, add one deep muted percussion pulse. During the Russian line, lower the music clearly beneath the voice so EVERY WORD remains intelligible; the voice is deep and menacing, controlled rather than shouted or whispered. After the final word at 7.3 seconds, let the score rise into one foreboding low-brass sting through 8.0 seconds. Faint cold wind and one quiet leather-on-scale contact remain underneath. No choir, singing, lyrics, narrator, extra words or other voices. Keep the whole soundtrack within exactly 8 seconds.
```


### Полученный ролик и подключение — 16 сентября 2026

По сообщению «ролик в загрузках» подключён `assets/concepts/campaigns/penisuela/scene-videos/post-credits-dragon.mp4`. H.264, 1264×720, 24 fps; AAC stereo 48 кГц. Фактическая длительность 10,041667 с, хотя задание выше рассчитано на 8 с. Авторский файл скопирован побайтно, не обрезан и не ускорен. Звуковая дорожка сохранена; её наличие и ненулевой уровень проверены технически.

Песня играет один раз без повтора. После ленты звук останавливается, строка «Спасибо за эту историю» остаётся на чёрном экране 2000 мс, затем тот же сохраняемый медиаплеер показывает видео со встроенным звуком. При загрузке строка остаётся до фактического начала воспроизведения. После события `ended` — чёрный экран, без повторной благодарности и музыки. Панелей управления и экранных кнопок нет.


## Гибель дракона — вариант Grok на 6 секунд (16 сентября 2026)

Запрос автора: «давай теперь кадр смерти дракона и промпт на 6 секунд». Используется утверждённый `art-drafts/andrey-video/03-death-start-v2.png`; точная копия для загрузки — `art-drafts/andrey-video/death-6s/first-frame.png`. Новый imagegen не запускался. Промпт для вставки — `art-drafts/andrey-video/death-6s/grok-6s.txt`.

Один кадр, Grok image-to-video, 6 секунд, 16:9. Последний спазм → единичная вспышка ядра → тяжёлое падение → 1,5 секунды неподвижности. Звук: короткий предсмертный рёв, магический треск, удар и оседающие камни; сдержанная грозная музыка затухает в конце. Без речи. Ориентир 3–5 внешних проб, основной риск — физика падения и анатомия крыльев. Готовый ролик получен по сообщению «последнее в загрузках» и заменил восьмисекундную версию по стабильному пути `assets/concepts/campaigns/penisuela/scene-videos/andrey-death.mp4`. Фактическая длительность 6,041667 с; H.264/AAC, 1264×720, 24 fps. Копирование побайтное, звук и скорость 1× сохранены. По завершении существующий обработчик открывает `villa-after-andrey`.

Проверены начало, середина и конец файла: дракон падает; в финальном кадре глаза продолжают светиться, хотя промпт требовал их погасить. Предоставленный автором результат сохранён без изменений. Аудиодорожка декодируется и не тиха; прослушивание не выполнялось. Браузерная проверка пропущена по прежнему указанию автора. Техническая проверка: `qa/andrey-death-6s-2026-09-16.md`.

```text
Animate the uploaded image as the exact first frame of ONE continuous 6-second cinematic dark-fantasy death shot, 16:9. Locked low frontal camera, constant framing, no cuts or zoom.

0.0–1.2 seconds: The exhausted dragon stiffens in one final involuntary spasm and releases a short dying roar. The violet energy in its chest briefly swells once.

1.2–1.6 seconds: The chest core ruptures in ONE brief concentrated violet flash. Both eyes and the chest glow go completely dark. The roar cuts off abruptly. Keep the physical body intact.

1.6–4.5 seconds: Its forelegs suddenly buckle. The enormous chest crashes onto the obsidian floor, then the head strikes the stone heavily. The wings fall limp and the tail settles last. Show uncontrolled dead weight and a low burst of dust, not careful lowering or a sleeping pose. Keep the head visible in the frame.

4.5–6.0 seconds: Hold on the lifeless body. No breathing, blinking, twitching, jaw movement or returning glow. Only dust and sparse ash settle.

Preserve the exact dragon, horn arrangement, layered black scales, four legs, two wings, tail, arena, arch, eclipse and lighting from the first frame. One creature, one collapse, stable anatomy and surfaces. No resurrection, transformation, disintegration, new attack, people, hands, blood, gore, camera movement, subtitles, text, logo or watermark.

Audio: a short deep dying roar, one sharp magical crack, a massive heavy impact and falling stone debris. A restrained ominous low-string drone builds during the first second, with one low orchestral hit on the collapse, fading into near-silence for the final hold. No dialogue, narration, lyrics or choir. Fit the complete action and sound within exactly 6 seconds.
```
