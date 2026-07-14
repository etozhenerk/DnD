---
name: implement-dnd-campaign-ui
description: Implement the presentation layer for a published campaign in this React 19, TypeScript, Vite, CSS Modules, and FSD repository. Use when adding a campaign route, scene presentation, public art, NPC or clue cards, location states, transitions, responsive layout, or master navigation while reusing canonical content and approved assets.
---

# Интерфейс кампании

Реализовать визуальное представление опубликованной кампании. Игровой движок и мастерскую консоль оставлять специализированным скиллам.

## Подготовка

Прочитать `AGENTS.md`, утверждённый `implementation-plan.md`, канонический campaign JSON, manifest и существующую FSD-структуру. Проверить существующие `entities`, `widgets`, `features` и страницы до создания новых компонентов.

## Реализация

1. Хранить маршрут и композицию в `app` и `pages`, данные и бизнес-логику — в нижних слоях.
2. Читать факты только из `content/` и разрешать арты существующим resolver.
3. Делать один компонент на `.tsx` и локальный `Component.module.css` рядом.
4. Использовать только переменные из `shared/styles/variables.css` для цветов, градиентов и теней.
5. Сохранить тёмный сказочный язык, доступные подписи, клавиатуру и `focus-visible`.
6. Поддержать публичную сцену, арты и варианты состояния без раскрытия будущих сцен и секретов мастера.
7. Не возвращать удалённые dashboard-паттерны и не добавлять UI-библиотеку без необходимости.

## Проверка

Запустить `npm run typecheck` и `npm run build`. Передать интерактивную проверку `$verify-dnd-campaign-release`; не запускать standalone Playwright автоматически.

## Результат

Показать изменённые FSD-слои, переиспользованные компоненты, маршруты и оставшуюся работу игрового движка.
