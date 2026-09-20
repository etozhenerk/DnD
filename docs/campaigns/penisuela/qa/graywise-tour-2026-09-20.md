# Рум-тур Grey Wiese — 20 сентября 2026

Утверждён автором вариант v5 («окаю»). По последующему уточнению «арт с дверью зря убрал; он следующий после арта с квартирой» сохранены три кадра: рум-тур → прежняя закрытая дверь → спальня.

## Результат

Канонический арт `assets/concepts/campaigns/penisuela/scenes/graywise-villa-tour.png`, 1672×941, SHA256 `df584b640a38b2d42164e57955b74138e4b79188bc61db39b885f6ba50d6c075`. Изображение не ретушировалось, личные метаданные отсутствуют. Вариант v6 не используется.

Клик по двери на кадре рум-тура через общий SceneHotspotLayer выполняет `approach-bedroom-door` и устанавливает `graywise-tour-finished`. Это показывает исходный `bedroom-door-closed.png`. Следующий клик выполняет прежнее раскрытие спальни и Doom. Два шага отдельно отменяются, переживают перезагрузку; старые сохранения с раскрытой спальней остаются на открытом кадре. Новых бросков, расходов и сюжетных сведений нет.

## Изменённые файлы

- `assets/concepts/campaigns/penisuela/scenes/graywise-villa-tour.png`, `assets/concepts/manifest.json`.
- `content/README.md`, `content/campaigns/penisuela-session-preview.json`, `penisuela-gallery-gameplay.json`, `penisuela-gm-console.json`, `penisuela-session-preview-guide.md`.
- `src/widgets/campaign-scene/ui/BedroomRevealAdventure/BedroomRevealAdventure.tsx` — существующий widgets-слой, ракурсы и общие hotspot.
- `scripts/test-bedroom-reveal.mjs`, `test-scene-progression.mjs`, `validate-penisuela-playable-bridge.mjs`.
- `docs/campaigns/penisuela/graywise-tour-art-plan.json`, `graywise-tour-art-review.json`, `art-plan.json`, `gameplay.json`, `script.md`, `gameplay-notes.md`, `implementation-plan.md`, `workflow.json`, этот отчёт.

## Проверки

PASS: bedroom/reload/undo/legacy saves; настоящий обработчик переходов в component harness; общий расчёт contain/cover на 1024×768, 1280×800 и широком экране; 969 проверок playable bridge. Эти сценарии также вошли в общий успешный прогон 61/61 от 20 сентября. `npm run build` и `npm run build:pages` прошли вместе с typecheck, новый арт включён в обе сборки. JSON, ID, ссылки, точные зеркала gameplay и guide/script, метаданные PNG и `git diff --check` прошли.

## Ограничения

Управление встроенным браузером недоступно. Живое попадание hotspot в дверь, переполнение, console и скриншоты на 1024/1280 px не проверены; геометрия и component harness не заменяют визуальную приёмку. Standalone Playwright без отдельного разрешения не запускался. Commit, push, deployment не выполнялись.
