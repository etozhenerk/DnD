# Дверь номера и появление шкалы — 19 сентября 2026

## Результат

По запросу автора выход из номера требует одновременно `anonymous-bracelets` и `overload-console`. Условие хранится в каноническом `continue-1-hotel-gallery.conditions.allItems` и проверяется как обработчиком двери, так и общим исполнением сюжетного действия. Отмена взятия любого предмета снова блокирует дверь. Письмо, запись и дополнительные решения у пульта для выхода не требуются. Баланс пяти героев не меняется.

После взятия пульта общий индикатор появляется в левом верхнем углу: золотая вспышка, ореол, увеличение вдвое и последовательный свет по пяти делениям. Эффект занимает 2,8 секунды, затем остаётся обычная шкала с текущим прогрессом. Взятие пульта не повышает Doom. Восстановление сохранения и возвращение из боя не повторяют эффект; отмена взятия скрывает шкалу, повторное взятие снова запускает анимацию. Reduced motion сохраняет золотую подсветку без движения.

## Изменённые файлы этой задачи

- `content/campaigns/penisuela-gallery-gameplay.json`, `docs/campaigns/penisuela/gameplay.json`: требование двух предметов.
- `content/campaigns/penisuela-session-preview.json`, `content/campaigns/penisuela-session-preview-guide.md`: согласованные сведения о браслетах, двери и шкале.
- `src/widgets/campaign-scene/ui/HotelOverloadSearchAdventure/HotelOverloadSearchAdventure.tsx`: каноническая проверка, сообщение о недостающих предметах, координаты двери относительно изображения.
- `src/widgets/campaign-scene/ui/GameMasterConsole/GameMasterConsole.tsx`: отдельная проекция владения пультом.
- `src/features/navigate-campaign-scene/model/campaignPresentation.ts`: отделение взятия пульта от восстановления и временного скрытия.
- `src/features/navigate-campaign-scene/ui/CampaignPresentation/CampaignPresentation.tsx`: время и жизненный цикл появления.
- `src/features/navigate-campaign-scene/ui/DoomIndicator/DoomIndicator.tsx`, `DoomIndicator.module.css`: анимация общего индикатора.
- `docs/campaigns/penisuela/implementation-plan.md`: описание поведения.
- `scripts/test-gm-console.ts`, `scripts/test-campaign-step-history.mjs`, `scripts/test-penisuela-navigation-regressions.mjs`: проверки появления, условий выхода и отмены.

## Проверки

- `node scripts/run-typescript-test.mjs scripts/test-gm-console.ts` — PASS: взятие, нулевой прогресс, восстановление, возврат из боя, отмена, повторное взятие, последующие деления.
- `node scripts/test-campaign-step-history.mjs` — PASS: все четыре сочетания предметов, оба порядка взятия, сохранение/загрузка, переход и отмена.
- `node scripts/test-penisuela-navigation-regressions.mjs` — PASS, 19 проверок.
- `npm run build` — PASS, включая `npm run typecheck`; предупреждение Vite о крупных чанках.
- `jq empty` для трёх изменённых JSON — PASS.
- Проверены уникальность ID сцен, действий и объектов, ссылки обоих предметов и назначения перехода, синхронность изменённого узла с рабочей копией и гайдом, партия из пяти героев — PASS.
- `git diff --check` — PASS.
- `node scripts/test-penisuela-story-sync.mjs` — FAIL: несвязанное расхождение `graywise-door-trust.actions[].resolution` между каноническим JSON и рабочей копией; этот текст задачей не изменялся. Узел `hotel-overload` проверен отдельно и совпадает полностью.

## Ограничения

В этой сессии отсутствуют инструменты управления встроенным браузером. Скриншоты, визуальная проверка анимации и попадания в дверь на 1024/1280 px не выполнены. Standalone Playwright без отдельного разрешения автора не запускался, как требует `skills/verify-dnd-campaign-release/SKILL.md`: «Если встроенный браузер недоступен или не подключается, остановить браузерную часть, сообщить блокер и попросить отдельное разрешение на другой инструмент». Это отчёт о локальном исправлении, полная готовность релиза не утверждается. Публикация не выполнялась.
