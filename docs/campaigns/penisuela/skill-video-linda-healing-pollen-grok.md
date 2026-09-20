# «Целительная пыльца» — production pack для Grok Imagine Video

## Статус

- `content id`: `linda-healing-pollen`
- Формат: один внутриигровой ролик применения навыка, image-to-video.
- Стадия: `draft`.
- `readiness`: `blocked` до явного утверждения стартового кадра пользователем.
- Канонический эффект: Линда восстанавливает выбранному союзнику `2d8 HP`; цель — один союзник; три применения за кампанию.

## Входной кадр

- Файл: `docs/campaigns/penisuela/art-drafts/skill-video/linda-healing-pollen-start-frame-v1.png`
- Соотношение сторон: `16:9`.
- Для генерации кадра использованы утверждённый токен Линды как основной референс лица и образа и канонический групповой арт как дополнительный референс костюма и шести крыльев.
- В Grok загружается только стартовый кадр выше. Референсные арты отдельно не загружать.

## Целевая поверхность и настройки

- Пользовательская поверхность: **Grok Imagine** (`grok.com/imagine`), режим image-to-video.
- Точная модель API: **`grok-imagine-video-1.5`**.
- Проектный стандарт длительности: **8 секунд**. Модель официально поддерживает 1–15 секунд; 8 секунд также дают чистую 4-секундную версию при ускорении `x2`.
- Формат: `16:9`, `1080p`, один непрерывный план, без зацикливания.
- Звук: без генерируемого звука (`generate_audio=false` в API); при работе через интерфейс отключить или удалить автоматически созданный звук. Реплики и синхронизация губ не нужны.
- Если интерфейс предлагает вариант **Video 1.5 Fast**, использовать его текущую версию и те же проектные параметры, насколько они доступны.

Официальные материалы xAI: [Video generation](https://docs.x.ai/developers/model-capabilities/video/generation), [Image-to-video](https://docs.x.ai/developers/model-capabilities/video/image-to-video), [Grok Imagine Video 1.5](https://docs.x.ai/developers/models/grok-imagine-video-1.5), [анонс Video 1.5](https://x.ai/news/grok-imagine-video-1-5).

## Основной prompt — копировать целиком

```text
Create one continuous 8-second cinematic image-to-video shot from the uploaded first frame. Use a very slow, smooth dolly-in of roughly three percent with no pan, tilt, cut, or reframing. Linda keeps the exact face, age, costume, body proportions, leafy crown, small vial, and six iridescent wings from the first frame. She performs one restrained healing gesture: her extended hand moves only a few centimeters forward and her fingers open gently, while the small vial remains steady in her other hand. The existing golden, blush-pink, and fresh-green healing pollen flows from her palm toward the blurred injured ally at frame-right in one clean curved ribbon. The pollen accelerates softly, curls once, and reaches the ally only near the final second; a subtle warm glow spreads over the ally's shoulder as the particles settle, without revealing the ally's identity. Add only secondary motion: a slow iridescent shimmer across all six wings without flapping, slight movement in Linda's hair and dress, sparse floating motes, and gentle lantern flicker. Keep the scene stable, elegant, readable, and deliberately paced so the complete action remains clear when played at 2x speed. End on a stable hold: Linda's hand remains extended, her expression is calm and focused, most of the pollen has settled into a soft golden-pink-green aura on the ally, and a few residual motes drift between them. No dialogue, no lip movement, no camera cut, no text, no UI.
```

## Negative / avoid

```text
Avoid identity drift, face changes, age changes, costume changes, altered body proportions, missing wings, extra wings, deformed wings, strong wing flapping, malformed hands or fingers, extra limbs, the vial changing shape or disappearing, the ally turning toward camera, an identifiable ally face, blood, gore, an open wound, enemies, explosions, aggressive magic, smoke replacing pollen, particles covering Linda's face, chaotic particle motion, rapid camera motion, zoom pulses, camera shake, cuts, scene changes, lip movement, dialogue, text, subtitles, logos, watermarks, UI, HUD, abrupt starts or stops, and a completed heal before the final second.
```

Официальная документация API xAI не описывает отдельный параметр `negative_prompt`. Если в текущем интерфейсе Grok Imagine нет отдельного поля Avoid, добавить этот блок после основного prompt с заголовком `Avoid:`.

## Хореография и тайминг

| Время | Камера | Линда | Пыльца и союзник | При `x2` |
| --- | --- | --- | --- | --- |
| `0.0–2.0 с` | Начало очень медленного наезда, без смены ракурса | Сохраняет позу, затем слегка подаёт ладонь вперёд; взгляд остаётся на цели | Имеющееся облако собирается в читаемую золотисто-розово-зелёную ленту | `0.0–1.0 с` — понятный запуск действия |
| `2.0–6.5 с` | Ровный наезд, суммарно не более ~3% | Пальцы мягко раскрываются; сосуд и корпус стабильны; крылья только переливаются | Лента один раз плавно изгибается и идёт вправо; цель остаётся размытой и обезличенной | `1.0–3.25 с` — полёт частиц читается без суеты |
| `6.5–8.0 с` | Камера останавливается в устойчивой композиции | Рука остаётся вытянутой, выражение спокойное | Пыльца касается плеча союзника, превращается в мягкую ауру; последние частицы продолжают дрейф | `3.25–4.0 с` — контакт и финальная фиксация |

## Финальное состояние

Линда остаётся в исходном образе с шестью целыми крыльями, держит руку вытянутой к союзнику и спокойно завершает жест. Союзник по-прежнему неузнаваем и находится у правого края кадра. Основная пыльца уже осела мягким золотисто-розово-зелёным свечением, между персонажами остаётся несколько медленных частиц. Финал не должен выглядеть как новый статичный кадр или резкая остановка.

## Критерии приёмки

- Лицо, возраст и костюм Линды не меняются; она узнаваема относительно утверждённого токена.
- На протяжении всего ролика видны те же шесть крыльев, без удвоения, исчезновения и сильных взмахов.
- Обе руки и сосуд анатомически стабильны; выполняется ровно один небольшой жест.
- Пыльца остаётся золотисто-розово-зелёной, движется одной читаемой дугой и касается союзника только в последней части ролика.
- Союзник остаётся второстепенным, размытым и неидентифицируемым; нет крови, врагов и сюжетных деталей.
- Нет текста, интерфейса, рамок, логотипов, монтажных склеек и движения губ.
- На скорости `x1` действие выглядит мягким и магическим; на `x2` сохраняются запуск, полёт, контакт и финальный hold.
- Финальная композиция удерживается не менее `0.5 с` на исходной скорости.

## Риски и лимит итераций

- Главные риски генерации: дрейф лица, ошибки пальцев, изменение количества крыльев и хаотичная симуляция частиц.
- Рекомендуется получить 3–5 видеовариантов с неизменным стартовым кадром и prompt, затем выбрать лучший по критериям выше.
- Стартовый кадр прошёл внутреннюю визуальную проверку как качественный черновик; публикация или регистрация в manifest возможна только после утверждения пользователем.
