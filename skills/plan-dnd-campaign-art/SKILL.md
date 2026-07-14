---
name: plan-dnd-campaign-art
description: Build an approval-ready art registry from an approved D&D campaign script, cast, scene variants, items, clues, enemies, and endings. Use when deciding which campaign images or videos are necessary, where each asset appears, what it may reveal, and how it should be composed before generation.
---

# Арт-план кампании

Определить минимальный набор визуалов, необходимый для проведения и интерфейса. Не генерировать изображения.

## Входы

Прочитать утверждённый творческий пакет, `assets/concepts/manifest.json` и референсы `assets/concepts/style/`. Проверить, нельзя ли переиспользовать уже утверждённый ассет.

## Реестр

Для каждого необходимого материала записать в `art-plan.json`:

- стабильный `id` и тип: `location`, `npc`, `enemy`, `item`, `clue`, `scene`, `ending`, `map-layer` или `ui`;
- связанную сущность и сцены использования;
- что должно быть видно и что запрещено раскрывать;
- композицию, ракурс, формат, прозрачность и целевой размер;
- состояние или варианты `before`, `after`, `night`, `destroyed`, `restored`;
- визуальный бриф и ссылки на локальные референсы;
- необходимость фотографии реального человека;
- статус `planned`.

## Правила

Не создавать декоративные арты без места использования. Для карты учитывать прозрачность и контур суши. Для реального человека требовать фотографию и согласованную степень расовой трансформации.

## Контрольная точка

Показать пользователю полный список, стоимость в количестве генераций и порядок создания. Генерацию начинать только после утверждения арт-плана.
