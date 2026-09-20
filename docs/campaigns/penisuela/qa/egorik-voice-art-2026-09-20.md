# Арт проверки голосов Егорика и Настасьи · 20 сентября 2026

Автор утвердил вариант и подключение: «окаю вставляй».

## Результат

После действия `test-egorik-nastasia-voices` сцена `egorik-bungalow-reveal` выбирает утверждённый ракурс `voices`. Приоритеты: бой → спасение/разговор → проверка голосов → браслет; после раскрытия правды возврат к общей сцене показывает прежний разговор. Состояние определяется существующими флагами журнала, поэтому новый формат сохранения не требуется. Новый рассказчик описывает уже существующий неудачный исход проверки без диалогов и спойлеров.

Утверждённый PNG 1672×941 скопирован без изменения пикселей. Добавлен только новый визуальный вариант; правила, DC, сюжетные флаги, результаты действий и баланс пяти героев не изменены.

## Изменённые файлы в рамках этой правки

- `assets/concepts/campaigns/penisuela/scenes/egorik-nastasia-voice-test.png`
- `assets/concepts/manifest.json`
- `content/campaigns/penisuela-session-preview.json`
- `content/campaigns/penisuela-session-preview-guide.md`
- `src/widgets/campaign-scene/ui/GuestBungalowsAdventure/EgorikBungalowAdventure.tsx` — слой widgets, прежние `CampaignScene` и `SceneTextPanel`.
- `docs/campaigns/penisuela/script.md`
- `docs/campaigns/penisuela/implementation-plan.md`
- `docs/campaigns/penisuela/art-plan.json`
- `docs/campaigns/penisuela/egorik-voice-test-art-plan.json`
- `docs/campaigns/penisuela/egorik-voice-test-art-review.json`
- `docs/campaigns/penisuela/workflow.json` и этот отчёт.

## Проверки

- `node scripts/test-egorik-bungalow.mjs`: PASS — ассеты, бой для пяти героев, порядок раскрытия правды, ограничения переходов, повторные ракурсы, отмена, восстановление журнала.
- `npm run build`: PASS, включает `npm run typecheck`.
- `npm run build:pages`: PASS, включает повторный typecheck.
- `jq empty`: PASS для всех затронутых JSON.
- Уникальность manifest ID и ID ракурсов, существование ассетов: PASS.
- Синхронность новых вводных с каноническим guide и рабочим script: PASS.
- Сюжетные данные бунгало в canonical gameplay и docs gameplay совпадают.
- Утверждённый draft и канонический PNG побайтно совпадают.
- `git diff --check` для изменённых отслеживаемых файлов: PASS.

Сборщик сообщает предупреждение о больших JS-чанках; ошибок сборки нет.

## Границы проверки

Сам арт просмотрен при генерации и утверждён пользователем. Управление встроенным браузером Codex отсутствует среди доступных инструментов текущего сеанса. Поэтому фактические клики, рендер при 1024/1280 px, консоль и переполнение браузера не проверены. Standalone Playwright не запускался: отдельного разрешения на него нет. Это отчёт о точечной правке, не приёмка полного релиза. Commit, push и deployment не выполнялись.
