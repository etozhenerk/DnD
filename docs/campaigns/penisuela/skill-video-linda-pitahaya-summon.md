# Видео навыка: «Призыв питахайиноидов»

## Статус

- Ability id: `linda-pitahaya-summon`
- Этап: черновик на утверждение
- Readiness: `blocked` до явного утверждения стартового кадра пользователем
- Публикация: не выполнена; `assets/concepts/**` и manifest не менялись

## Каноническая основа

- Линда призывает `1d4` питахайиноидов; они входят в инициативу сразу после неё и остаются на три раунда.
- Использован только утверждённый фэнтезийный образ Линды: узнаваемое лицо, взрослая фея Линфея, шесть крыльев, розово-зелёное летнее платье, золотой браслет и посох-питахайя.
- Конкретная внешность питахайиноидов в этом кадре является визуальным предложением, а не новым каноническим фактом.

## Стартовый кадр

- Draft id: `penisuela-skill-video-linda-pitahaya-summon-start-v1`
- Файл: `docs/campaigns/penisuela/art-drafts/skill-video/linda-pitahaya-summon-start-frame-v1.png`
- Формат: PNG, 1664×936, точное 16:9, непрозрачный; выполнена только центральная техническая обрезка нескольких краевых пикселей
- Генератор: встроенный imagegen
- Референсы:
  - `assets/concepts/campaigns/penisuela/party/linda.webp` — лицо, полный образ, платье, крылья и посох;
  - `assets/concepts/campaigns/penisuela/ui/hero-tokens/linda.png` — дополнительная фиксация лица;
  - `assets/concepts/campaigns/penisuela/scenes/vip-prop-room-carriers.png` — чёрно-золотой тропический свет и реалистичный стиль кампании, без копирования врагов.

### Арт-проверка

Verdict: `accept` как черновик для показа пользователю; это не заменяет пользовательское утверждение.

- Лицо, платье, посох и взрослая фэнтезийная идентичность Линды сохранены.
- Все шесть крыльев находятся в кадре и читаются отдельно.
- Три питахайиноида показаны только частично внутри портала, поэтому у анимации есть ясное продолжение.
- Композиция не содержит врагов конкретной встречи и подходит для повторного использования в разных боях.
- UI, текст, логотипы, водяные знаки и сюжетные спойлеры отсутствуют.
- Явных дефектов лица, рук, посоха или лишних конечностей не обнаружено; адресная повторная генерация не потребовалась.

## Veo copy-paste pack

Актуальная официальная документация Google на 2026-08-26 перечисляет для Veo 3.1 длительности 4, 6 и 8 секунд; 1080p требует 8 секунд. Поэтому рекомендуемый единый стандарт проекта — **8 секунд, 16:9, 1080p**. Если выбранная поверхность Veo не предлагает эту комбинацию, нужно один раз выбрать доступную фиксированную длительность и использовать её без исключений для всей серии, одновременно заменив длительность в первой фразе prompt. Источники: [Gemini API — Veo video generation](https://ai.google.dev/gemini-api/docs/video), [Vertex AI — video prompt guide](https://cloud.google.com/vertex-ai/generative-ai/docs/video/video-gen-prompt-guide).

### linda-pitahaya-summon-shot-01 · Veo

Surface: `unknown` — выбрать фактически используемый официальный интерфейс: Flow, Gemini или Vertex AI\
Model: `verify in UI` — предпочтительно доступная версия Veo 3.1\
Mode: `image-to-video`\
Duration: `8 seconds` — рекомендуемый единый стандарт проекта\
Aspect ratio: `16:9`\
Resolution: `1080p`\
Audio: `post-production`; сгенерированный звук использовать только как черновой ambience/SFX, без речи

Uploads:

- Start frame: `docs/campaigns/penisuela/art-drafts/skill-video/linda-pitahaya-summon-start-frame-v1.png`
- End frame: none
- Additional references: none

Prompt (EN):

```text
A single continuous eight-second cinematic image-to-video shot. Preserve the uploaded first frame as the exact opening composition. Use a very slow, controlled dolly-in with no pan and no cut. Linda makes one restrained forward sweep with the dragon-fruit staff and then holds her pose. The warm magenta, leaf-green and soft-gold spiral portal rotates clockwise, brightens, and opens slightly wider while the same three small pitahayanoids complete one careful step through the rift; keep their count, designs and scale stable. Linda's six iridescent wings give one subtle synchronized shimmer, while her hair, translucent dress layers, loose leaves and fine magical particles move gently in the portal breeze. Preserve Linda's exact adult face, long brown hair, six-wing anatomy, pink-and-green dress, gold bracelet, staff, body proportions, polished stone floor, black-and-gold tropical architecture, lighting palette and cinematic photorealistic fantasy style from the uploaded image. Motion is elegant, readable and restrained: a magical summoning, not an explosion or attack. If audio is generated, use only a low warm magical hum, a soft spiral whoosh, delicate leaf rustle and three light landing taps; no speech or vocalization. Stable anatomy and composition, no cuts, no camera shake, no text.
```

Negative prompt (EN):

```text
identity drift, altered face, childlike Linda, changed costume, missing wings, extra wings, deformed wing membranes, extra fingers, fused hands, extra limbs, duplicated staff, changing creature count, duplicated creatures, giant pitahayanoids, plush mascots, human children, grotesque body horror, gore, hostile enemies, additional heroes, portal explosion, aggressive attack, rapid camera movement, sudden zoom, camera shake, cuts, split screen, UI, captions, subtitles, letters, logos, watermark
```

Если в выбранном интерфейсе нет отдельного поля negative prompt, добавить этот список в конец основного prompt после фразы `Avoid:`.

## Заложенное движение

1. Камера делает один медленный dolly-in.
2. Линда один раз мягко проводит посохом вперёд и замирает.
3. Портал вращается по часовой стрелке, становится ярче и немного раскрывается.
4. Те же три питахайиноида завершают один шаг наружу без изменения числа и внешности.
5. Крылья Линды один раз переливаются; волосы, платье, листья и частицы слегка подхватывает магический поток.

## Критерии приёмки

- Лицо, возраст, платье, браслет, посох и пропорции Линды не меняются.
- На всём протяжении остаётся ровно шесть крыльев и ровно три питахайиноида.
- Руки и хват посоха не деформируются.
- Питахайиноиды выходят одним понятным движением; портал не превращается во взрыв.
- Камера выполняет только медленный dolly-in, без склеек, тряски и резкого зума.
- Не появляются враги, другие герои, текст, UI, логотипы, водяные знаки или спойлерные объекты.
- В звуке нет речи; ambience и SFX не перекрывают будущую игровую дорожку.

Рекомендуемый бюджет после утверждения кадра: 3–5 прогонов, выбрать один с лучшим удержанием лица, крыльев, рук и количества существ.
