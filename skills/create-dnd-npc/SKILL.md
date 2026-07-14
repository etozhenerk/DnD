---
name: create-dnd-npc
description: Create non-player story characters for a campaign without treating them as playable heroes or combat enemies. Use when defining an NPC's role, wants, fears, secrets, relationships, voice, scene behavior, clues, possible allegiance changes, or structured draft entry for the campaign cast.
---

# Создание сюжетного NPC

Создать персонажа, которым говорит и управляет мастер. Для игрового героя применять `$create-dnd-character`, для боевого противника — `$create-dnd-enemy`.

## Входы

Прочитать утверждённые `concept.md`, `outline.md`, `story-graph.json`, текущий `cast.md` и канон связанных сущностей.

## Вопросы

Если ответ не следует из сюжета, выяснить роль NPC, отношение к героям и обязательный тон или шутку. Не задавать больше трёх вопросов за раунд.

## Создание

Для NPC определить:

- `id`, имя, местоимения, расу при подтверждённой связи;
- сюжетную функцию и сцены появления;
- желание, потребность, страх, секрет и предел уступки;
- отношения и возможное изменение стороны;
- что знает, чего не знает и о чём лжёт;
- манеру речи, жест и повторяющийся образ;
- последствия спасения, предательства, гибели или ухода;
- визуальный бриф без генерации изображения.

Не писать полный набор реплик: это ответственность `$write-dnd-dialogue`.

## Результат

Добавить структурированный раздел в `cast.md`, отметить новые предложения канона и связанные `sceneId`. Не переносить NPC в campaign JSON. После утверждения состава передать его `$write-dnd-scene-script` и `$write-dnd-dialogue`.
