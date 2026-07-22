# Видео-пакет: путь на Пенисуэлу

## Назначение

Музыкальный image-to-video монтаж между девятым слайдом таверненного пролога и игровой сценой `hotel-overload`. Целевая длительность — 45 секунд, формат — 16:9, 24 fps, без рассказчика, реплик, титров и читаемого текста.

Граница спойлеров: разрешены пять браслетов, путь на остров, вход в отель и безопасная первая вечеринка. Письмо, его содержание, личности организаторов, свадебные роли, утренние улики и аварийная линия не показываются.

Готовность production pack — `blocked`: промпты готовы к пробам, но `script.md` ещё имеет статус `draft`, а восемь утверждённых PNG пока не опубликованы из `art-drafts/` в manifest.

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
