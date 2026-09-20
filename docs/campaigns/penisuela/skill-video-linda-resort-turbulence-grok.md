# «Курортная турбулентность» — production pack для Grok Imagine Video

## Статус

- `content id`: `linda-resort-turbulence`
- Формат: одна боевая видеовставка применения навыка, image-to-video.
- Стадия стартового кадра: `draft`.
- Стадия промпта: `draft`.
- `readiness`: `blocked` до явного утверждения стартового кадра пользователем.
- Канонический эффект: Линда поднимает крыльями тёплый курортный вихрь вокруг всей команды; все герои получают `+2 AC` до начала следующего хода Линды.
- Видео не сгенерировано.

## Стартовый кадр

- Файл: `docs/campaigns/penisuela/art-drafts/skill-video/linda-resort-turbulence-start-frame-v1.png`
- Формат: PNG, `1664×936`, точное `16:9`, без текста и UI.
- Генератор: встроенный imagegen; после адресной правки количества крыльев выполнена только центральная техническая обрезка нескольких краевых пикселей.
- В Grok загружается только этот стартовый кадр. Остальные проектные референсы отдельно не загружать.

### Внутренняя арт-проверка

Verdict: `accept` как черновик для показа пользователю; это не заменяет пользовательское утверждение.

- В кадре ровно пять героев и нет врагов.
- Линда — главный субъект; её лицо, взрослый возраст, костюм и ровно шесть крыльев сохранены.
- Бубсильда, Ламберт, Головач Лена и Торин Пукощит II узнаваемы, анатомически целостны и остаются за/вокруг Линды.
- Один бирюзово-кораллово-золотой вихрь уже начат, но ещё не замкнут вокруг команды.
- Эффект читается как тёплая защита, а не взрыв или атака; предметов и пыльцы нет.

## Целевая поверхность и настройки

- Поверхность: **Grok Imagine**, режим image-to-video.
- Модель API: **`grok-imagine-video-1.5`**.
- Длительность: **6 секунд**.
- Соотношение сторон: **16:9**.
- Разрешение: **1080p**.
- Камера: один непрерывный зафиксированный план, без склеек и перекадрирования.
- Звук: отключить; для API установить `generate_audio=false`. Речь, вокал и синхронизация губ не нужны.
- Монтаж: воспроизводить готовый клип на скорости **x2**, итоговая длительность — 3 секунды.

Актуальные параметры подтверждены официальной документацией xAI: [Video generation](https://docs.x.ai/developers/model-capabilities/video/generation), [Image-to-video](https://docs.x.ai/developers/model-capabilities/video/image-to-video), [Grok Imagine Video 1.5](https://docs.x.ai/developers/models/grok-imagine-video-1.5).

## Окончательный copy-paste prompt

Скопировать весь блок целиком. Если интерфейс показывает отдельное поле Avoid, можно перенести туда только часть после `Avoid:`; смысл и формулировки не менять.

```text
Create one continuous 6-second cinematic image-to-video shot from the uploaded first frame, in exact 16:9. Keep the camera locked in the same medium-wide composition with no pan, tilt, zoom, cut, reframing, or scene change. Preserve exactly the same five heroes and no one else: Linda remains the clear central foreground subject, while Bubsilda, Lambert, Golovach Lena, and Thorin Pukoshchit remain in their exact positions around and behind her.

Animate one single continuous defensive action. During the first 1.5 seconds, Linda's exactly six iridescent wings—three on each side—complete one small, restrained, synchronized down-and-out pulse and then stop flapping. That single wing impulse drives the already visible incomplete resort wind in one smooth clockwise flow around the whole group. From 1.5 through 4.5 seconds, the same unified current rises and curls through the existing open gap above and behind the party: warm golden sunlight, translucent turquoise and coral air ribbons, a few individual tropical leaves, and sparse tiny neutral-gold motes flow together as one coherent spiral. The four companions make only subtle natural balance reactions; hair and loose fabric move gently with the wind, while their bodies, hands, faces, costumes, and positions remain stable. By 4.5 seconds, the open gap closes into one thin, continuous, translucent helical wind shell surrounding exactly all five heroes. The shell must remain airy and transparent, with every face and body still clearly visible; it conveys comfort, shelter, and increased defense, never impact or force. From 4.5 through 6 seconds, hold the completed protective shell steadily around the same five heroes. Linda's wings remain still except for a faint iridescent shimmer, the ribbons circulate slowly, leaves settle into the flow, and the golden light stays warm and controlled. Pace all motion smoothly and deliberately so the wing pulse, closure, and final hold remain clearly readable when the clip is played at 2x speed. Generate no audio, speech, vocalization, lip movement, text, captions, or HUD.

Preserve throughout: the exact five character identities, faces, apparent ages, hairstyles, costumes, body proportions, anatomy, poses, screen positions, and group scale from the uploaded first frame; Linda's exact six-wing anatomy with three wings per side; Golovach Lena without a tail; the black-and-gold tropical resort interior; the warm sunlight; and the turquoise, coral, and gold effect palette.

Avoid: identity drift, face changes, age changes, costume changes, altered body proportions, character movement to new positions, added characters, duplicated characters, missing heroes, enemies, masked carriers, creatures, extra limbs, malformed hands or fingers, merged bodies, missing wings, extra wings, one-sided wings, fused or deformed wing membranes, a second wingbeat, repeated flapping, aggressive poses, attacks, weapons, held objects, shields, armor appearing from magic, pollen, spores, powder clouds, flower-petal clouds, dust, smoke, fire, lightning, explosions, blast waves, shockwaves, violent debris, multiple vortices, chaotic ribbons, an opaque bubble, a hard glass dome, magic hiding any face, the shell closing before 4.5 seconds, the shell breaking after closure, camera motion, zoom pulses, camera shake, cuts, transitions, scene changes, dialogue, lip movement, generated sound, music, text, subtitles, letters, numbers, AC indicators, logos, watermarks, UI, or HUD.
```

## Краткий тайминг

| Исходное время | Действие | При воспроизведении x2 |
| --- | --- | --- |
| `0.0–1.5 с` | Все шесть крыльев Линды дают один сдержанный синхронный импульс; незамкнутый вихрь начинает единое круговое движение. | `0.0–0.75 с` — запуск защиты. |
| `1.5–4.5 с` | Один вихрь плавно поднимается и закрывает верхний/задний разрыв вокруг ровно пяти героев. | `0.75–2.25 с` — читаемое замыкание оболочки. |
| `4.5–6.0 с` | Прозрачная защитная оболочка удерживается; крылья больше не взмахивают, ленты циркулируют медленно. | `2.25–3.0 с` — устойчивый финальный hold. |

## Критерии приёмки

- Во всём ролике остаются ровно пять исходных героев; никто не появляется, не исчезает и не дублируется.
- Лица, возраст, причёски, костюмы, пропорции и позиции всех пяти героев не меняются.
- У Линды всё время ровно шесть крыльев, по три с каждой стороны; они дают один импульс и больше не взмахивают.
- Существует один непрерывный тёплый вихрь: он замыкается не раньше `4.5` секунды, окружает всех пятерых и удерживается до конца.
- Оболочка остаётся тонкой, воздушной и прозрачной; все герои читаются, эффект выглядит защитным, а не атакующим.
- Нет врагов, предметов, пыльцы, взрыва, ударной волны, агрессивной магии или нового сюжетного действия.
- Камера зафиксирована; нет склеек, тряски, зума, смены сцены или перекадрирования.
- Нет генерируемого звука, речи, движения губ, текста, субтитров, логотипов, водяных знаков, UI или HUD.
- На скорости `x2` отчётливо читаются три фазы: единичный импульс, замыкание оболочки и финальный hold длительностью около `0.75` секунды.
