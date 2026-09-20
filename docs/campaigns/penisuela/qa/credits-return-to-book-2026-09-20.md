# Возврат в книгу после титров — 20 сентября 2026

Запрос: после послетитровой сцены вернуть группу на страницу Пенисуэлы в книге.

## Реализация

`CampaignCreditsPage` передаёт виджету `returnHref` из канонического `penisuelaPreview.regionId`. Общий `CampaignCredits` после завершения послетитрового ролика отображает React Router `Navigate replace` на `/region/penisuela`. Это существующая страница региона с пергаментной книгой. Router учитывает base path GitHub Pages.

Переход относится к фазе `end`: окончание ленты сначала показывает благодарность и видео, затем открывает книгу. Существующий обработчик ошибки видео тоже завершает сцену и возвращает в книгу. Музыка и ролик останавливаются штатной очисткой плеера. Результаты кампании, награды и localStorage не меняются. Виджет без `returnHref` сохраняет прежний конечный экран.

## Файлы

- `src/pages/campaign-credits/ui/CampaignCreditsPage/CampaignCreditsPage.tsx` — композиция адреса возврата.
- `src/widgets/campaign-scene/ui/CampaignCredits/CampaignCredits.tsx` — общий переход после завершения.
- `content/README.md`, `content/campaigns/penisuela-credits-guide.md` — описание нового поведения.
- `docs/campaigns/penisuela/implementation-plan.md`, `workflow.json`, этот отчёт.

Новых канонических сущностей, полей JSON или миграций нет. Баланс пяти героев не затронут.

## Проверки

- PASS: одноразовая проверка настоящих компонентов страницы, виджета и useCreditsPlayback через существующий component harness: лента → послетитровая сцена → Navigate в книгу; без раннего перехода; два вызова завершения; replace; повторный вход снова открывает ленту. Адрес существует в канонической карте.
- PASS: `node scripts/run-typescript-test.mjs scripts/test-credits-roll.ts` — реальная разметка ленты и благодарности, 20 фотографий, 23 имени.
- PASS: `node scripts/run-typescript-test.mjs scripts/test-credits-music-handoff.ts` — завершение и ошибка ролика, защита от повторных событий, очистка и повторный вход.
- PASS: `npm run build`, `npm run build:pages`, включая typecheck. Vite сохраняет предупреждение о больших JS-чанках.
- PASS: JSON workflow и `git diff --check`; маршрут и регион проверены по каноническим данным.

Браузерный прогон не выполнен: инструмент управления встроенным браузером недоступен. [verify-dnd-campaign-release](../../../../skills/verify-dnd-campaign-release/SKILL.md) требует: «Если встроенный браузер недоступен или не подключается, остановить браузерную часть». Отдельного разрешения на standalone нет; новый альтернативный браузер не запускался. Commit, push и deployment не выполнялись.
