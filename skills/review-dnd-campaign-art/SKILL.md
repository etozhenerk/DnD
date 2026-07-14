---
name: review-dnd-campaign-art
description: Review generated D&D campaign art against its approved brief, scene, character identity, repository style, composition, spoiler boundary, and runtime use. Use when deciding whether an image should be accepted, revised, regenerated, or rejected before it enters the canonical asset manifest.
---

# Проверка арта кампании

Провести визуальную приёмку, не меняя изображение и не утверждая его вместо пользователя.

## Проверка

Просмотреть оригинальный результат и сравнить его с записью `art-plan.json`, сценой и локальными референсами. Проверить:

- узнаваемость сущности и правильные местоимения;
- расовые и сюжетные признаки;
- единый стиль серии, масштаб, одежду и повторяющиеся детали;
- требуемый ракурс, свободное место под UI и читаемость кадра;
- отсутствие случайных спойлеров, текста, водяных знаков и лишних объектов;
- прозрачность и границы для map-layer;
- пригодность формата и разрешения.

## Вердикт

Выдать один статус: `accept`, `accept-after-technical-processing`, `regenerate` или `reject`. Для `regenerate` перечислить конкретные исправления промпта. Только явное решение пользователя переводит вариант в `approved`.

После утверждения передать запись `$publish-dnd-campaign-assets`.
