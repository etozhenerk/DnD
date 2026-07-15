# Контракт video production pack

Применять этот контракт к `video-plan.json` и `video-production.md`. Хранить художественное объяснение на русском, а production prompts для видеомоделей — на английском.

## Структура JSON

```json
{
  "campaignId": "campaign-id",
  "version": 1,
  "status": "draft",
  "readiness": "ready-for-approval",
  "defaults": {
    "aspectRatio": "16:9",
    "masterResolution": "1920x1080",
    "fps": 24,
    "visualPromptLanguage": "en",
    "spokenLanguage": "ru",
    "burnedInText": false
  },
  "sequences": [
    {
      "id": "scene-id-video",
      "type": "transition",
      "purpose": "Коротко описать место показа и драматическую задачу",
      "audience": "players",
      "sourceSceneIds": ["scene-id"],
      "targetDurationSeconds": 6,
      "spoilerBoundary": "Что разрешено увидеть игрокам",
      "musicFirst": false,
      "shots": [
        {
          "id": "scene-id-shot-01",
          "order": 1,
          "purpose": "Что должен сообщить кадр",
          "durationSeconds": 6,
          "framing": "medium-wide",
          "safeArea": "center-safe with clean upper-left title space",
          "sourceArt": {
            "assetId": "approved-asset-id",
            "path": "assets/concepts/campaigns/campaign-id/scenes/example.webp",
            "role": "first-frame"
          },
          "endFrame": null,
          "directionRu": "Камера медленно приближается; герой поднимает фонарь; в глубине появляется слабое свечение.",
          "subjectMotion": "The hero slowly raises the lantern and holds still.",
          "cameraMotion": "Slow controlled dolly-in, no pan, no cut.",
          "environmentMotion": "Subtle fog drift, slight cloth movement, dim motes in the air.",
          "promptEn": "A single continuous six-second cinematic shot. Slow controlled dolly-in toward the approved fantasy hero. The hero slowly raises the lantern and holds still. Subtle fog drift, slight cloth movement and dim motes in the air. Preserve the exact face, costume, lantern, body proportions, environment geometry, lighting palette and painterly dark-fantasy style from the reference image. Natural restrained motion, stable composition, no cuts.",
          "mustPreserve": [
            "exact approved character identity",
            "costume and prop",
            "painterly dark-fantasy style"
          ],
          "avoid": [
            "identity drift",
            "extra limbs or fingers",
            "costume changes",
            "new characters",
            "camera cuts",
            "text, subtitles, logos or watermark",
            "excessive motion or sudden zoom"
          ],
          "target": {
            "primary": "kling",
            "fallback": "runway-gen-4.5",
            "notes": "Use image-to-video and keep creativity low enough to preserve the reference."
          },
          "audio": {
            "narrationRu": null,
            "dialogueCueIds": [],
            "ambiencePromptEn": "Quiet ancient forest at night, distant wind in tall trees, sparse insects, seamless background ambience.",
            "sfxPromptEn": "Old metal lantern handle creaks softly as it is raised.",
            "musicCue": "Low string drone begins at 00:00; no percussion yet."
          },
          "transitionIn": "hard-cut",
          "transitionOut": "audio-j-cut",
          "continuityIn": ["Lantern is held below chest level."],
          "continuityOut": ["Lantern is held at face level; hero looks into the forest."],
          "acceptance": [
            "face and costume remain unchanged",
            "the lantern rises once without hand deformation",
            "camera movement is continuous and slow",
            "no spoiler object appears"
          ],
          "status": "planned"
        }
      ],
      "audioPlan": {
        "narratorVoiceBriefRu": "Возраст, тембр, темп, эмоциональная подача без имитации реального человека",
        "musicPromptEn": "Instrumental dark-fantasy score, restrained strings and low frame drums, clear three-act trailer structure, no vocals.",
        "musicLicenseRequirement": "commercial application and promotional video use",
        "mixNotesRu": "Рассказчик впереди, ambience тише, музыка освобождает середину частот под речь."
      },
      "delivery": {
        "masterFile": "scene-id-master.mov",
        "webFiles": ["scene-id.mp4", "scene-id.webm"],
        "posterFile": "scene-id-poster.webp",
        "captionsFile": "scene-id.ru.vtt",
        "loop": false
      }
    }
  ],
  "blockedInputs": [],
  "assumptions": []
}
```

Допустимые значения `sequence.type`: `trailer`, `scene`, `ambient-loop`, `transition`.

Допустимые значения `readiness`:

- `ready-for-approval` — все сцены и визуальные источники утверждены;
- `blocked` — отсутствует обязательный арт, состояние сцены, решение о спойлерах, голосе, музыке или месте показа.

## Формула визуального промпта

Писать промпт в порядке:

1. Один непрерывный кадр и точная длительность.
2. Движение камеры и крупность.
3. Главный субъект и одно действие.
4. Небольшое движение среды.
5. Что необходимо сохранить из исходного арта.
6. Темп и характер движения.
7. Запрет склеек, текста и визуального дрейфа.

Не пересказывать в промпте сюжет, мотивацию и скрытую правду. Модель должна получить только наблюдаемое действие.

## Адаптация по target

### Kling

Приоритизировать исходный арт, первый/последний кадр, сохранение персонажа и конкретное движение. Не перегружать кадр несколькими действиями. Для повторяющегося героя перечислять одни и те же identity locks в одинаковом порядке.

### Veo

Использовать для пространства, физики, масштабного движения и сложной среды. Точно описывать последовательность событий, но сохранять один непрерывный кадр. Не полагаться на встроенный звук как на финальную русскую дорожку.

### Runway Gen-4.5

Использовать как основной или резервный target для контролируемого движения камеры и image-to-video. Описывать движение, а не повторять все неподвижные детали изображения. Если результат должен совпасть с соседним кадром, явно повторять continuity locks.

## Аудиоплан

Разделять:

- `narrationRu` — финальный русский текст рассказчика;
- `dialogueCueIds` — ссылки на утверждённые реплики, без их переписывания;
- `ambiencePromptEn` — длинный фон или петля;
- `sfxPromptEn` — короткое синхронное событие;
- `musicCue` — музыкальный акцент на монтажной шкале.

Для трейлера сначала разметить музыкальные части `hook`, `build`, `turn`, `climax`, `end-card`, затем привязать кадры к ударам. Для сцены сначала зафиксировать речь и события, затем размещать музыку под ними.

## Шаблон video-production.md

```markdown
# Видео-пакет: <название>

## Назначение

Формат, место показа, аудитория, длительность и граница спойлеров.

## Источники

Утверждённые сцены, арты и реплики. Отдельно перечислить отсутствующие материалы.

## Монтажный порядок

Таблица: №, shot id, длительность, исходный арт, действие, камера, target, звук, переход.

## Промпты

Для каждого shot id: загружаемые утверждённые референсы, promptEn, avoid, acceptance.

## Звук

Рассказчик, реплики, ambience, SFX, музыкальная структура и лицензионное требование.

## Производственный бюджет

Количество финальных кадров, рекомендуемое число проб на кадр и кадры повышенного риска.

## Экспорт

Master, web-версии, poster, captions, loop и место внешнего хранения.
```

## Оценка итераций

Планировать по 3–5 проб на обычный кадр и 5–8 на кадр с несколькими персонажами, руками, боем, разрушением или сложной физикой. Это оценка производственного риска, а не обещание качества или стоимости.
