# Вилла и доверие Grey Wiese — 2026-09-07

Статус: scoped PASS. Публикация на GitHub не выполнялась.

## Изменения

- Канонические арты: `assets/concepts/campaigns/penisuela/scenes/private-villa-approach.png`, `private-villa-door.png`, `graywise-door-opened.png`. Побайтовые копии утверждённых вариантов, зарегистрированы в manifest.
- `content/campaigns/penisuela-session-preview.json`: подход к вилле, закрытая дверь, два варианта рассказчика после броска; никаких изображений невесты.
- `content/campaigns/penisuela-gallery-gameplay.json`: вместо ручного выбора результата — одна Харизма DC 12. Стабильный ID успешного действия сохранён. Флаги старых завершённых сохранений поддерживаются. Успех даёт союзный callback; провал — сопровождение. Оба результата открывают дверь, без HP, Doom и расхода ресурса.
- `content/campaigns/penisuela-session-preview-guide.md`: тексты и механика синхронизированы.
- `src/widgets/campaign-scene/ui/GraywiseDoorAdventure/GraywiseDoorAdventure.tsx`: FSD widgets; общие SceneCheckPanel, SceneTextPanel, CampaignScene, GameMasterConsole. Повторный вход после возврата поддерживается. Собственного кубика или CSS нет.
- `src/pages/campaign-play/ui/CampaignPlayPage/CampaignPlayPage.tsx`: подключение виджета.
- `src/widgets/campaign-scene/ui/LateStoryAdventure/LateStoryAdventure.tsx`: область парадной двери на вилле, понятная подпись перехода; добровольный просмотр записи вынесен в корону.
- `docs/campaigns/penisuela/{art-plan.json,cast.md,script.md,gameplay.json,gameplay-notes.md,implementation-plan.md,story-graph.json,story-graph.md,workflow.json}`: согласованные образ, маршрут и проверка.
- `scripts/test-graywise-door.mjs`: проверка порога DC для пяти героев, 1/20, два исхода, запрет повторной проверки, gate входа, отсутствие цены, replay/undo/storage и связи артов/гайда.

## Проверки

- npm run typecheck — PASS.
- npm run build — PASS.
- npm run build:pages — PASS. Есть прежнее предупреждение о больших JS chunks.
- npm run validate:penisuela-playable — PASS, 726 проверок, четыре финала.
- node scripts/test-groom-tunnel.mjs — PASS, включая встречу с Кридом.
- node scripts/test-graywise-door.mjs — PASS.
- JSON parse, уникальность ID сцен и campaign assets, канонические пути изображений — PASS.
- git diff --check для изменённого runtime — PASS.

## Встроенный браузер

Проверены 1280×720 и 1024×768: закрытая дверь, модальное окно с пятью аватарками, выбор Головача Лены, физические результаты 20 и 1, цифровой D20 с приёмом результата, оба варианта рассказчика и арт Grey Wiese, скрытый персонаж до проверки, отдельный вход в дом, сохранение после перезагрузки, отмена входа и броска, переход от виллы к двери. Горизонтального скролла и битых изображений нет; error/warn console пусты. Контрольные скриншоты получены и просмотрены средствами встроенного браузера в текущей задаче, без отдельной файловой копии.

Тестовые действия отменены, прежнее состояние игры сохранено; вкладка оставлена на post-kreed-route. Временный viewport сброшен.

## Границы проверки

Общие экраны карты, книги героев, боя и финала в браузере повторно не проходились: их UI в этой задаче не менялся. У следующей bedroom-reveal пока прежний временный арт; новый арт спальни в scope этой задачи не входил. Это не полная приёмка всей кампании.

Канонические уточнения пользователя: маршрут идёт к роскошной вилле; Grey Wiese — эльф в закрытом чёрном платье, утверждён вариант v3. Проверка доверия обязательна, безопасный проход после провала сохранён из сценария.
