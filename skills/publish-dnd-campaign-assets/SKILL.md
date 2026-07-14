---
name: publish-dnd-campaign-assets
description: Prepare and register explicitly approved campaign visual assets for runtime use. Use when assigning final repository paths, applying lossless or approved format optimization, preserving map transparency, updating assets/concepts/manifest.json, and verifying that content references only canonical art.
---

# Публикация ассетов кампании

Перенести только явно утверждённые изображения из рабочего результата в канонические пути.

## Входы

Прочитать `AGENTS.md`, утверждённый `art-plan.json`, вердикт проверки и текущий manifest. Остановиться, если статус варианта не `approved`.

## Порядок

1. Выбрать путь по существующей структуре `assets/concepts/campaigns/<campaign-id>/`.
2. Сохранить прозрачность, анимацию и качество, необходимые интерфейсу.
3. Оптимизировать формат только без изменения утверждённого содержания.
4. Не переносить личную фотографию, тяжёлый исходник или временный рендер.
5. Для персонажа по реальному человеку удалить из метаданных имя частного источника, путь к фото и рабочие сведения о публичной фигуре; alt-текст должен описывать только вымышленного персонажа.
6. Добавить запись в `assets/concepts/manifest.json` со связанной сущностью и назначением.
7. Проверить уникальность `id`, существование файла и отсутствие ссылок на отклонённые версии.

## Результат

Перечислить опубликованные пути, изменения manifest и техническую обработку. Не добавлять ссылки в campaign JSON: это делает `$publish-dnd-campaign` после утверждения всех данных.
