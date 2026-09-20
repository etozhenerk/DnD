# Музыка холла и тишина бара — 16 сентября 2026

Технические проверки пройдены. Браузерная проверка пропущена по прежнему указанию автора.

## Исправление

Холл `hotel-gallery`, Алексис (оба совместимых ID), аудиенция Pussy Sultan, реквизиторская и возвращение скипетра используют один `wanderers-honey-song` («Медовый напев странников»). Переход между комнатами сохраняет источник и позицию. Боевые назначения холла не менялись.

Бар остаётся без фоновой музыки до `dance-troupe-freed`. Условие `soundtrack.sceneRequiredFlags` проверяется перед выбором обычного или боевого плейлиста. Пять веток бара — зал, Станис, танцоры, пульт, бой — передают канонический ID `closed-bar` общему плееру: технические ID ракурсов больше не ведут к запасному фону. После освобождения фон включается, восстановленное сохранение читает флаг сразу, undo вновь выключает фон. Песни головоломки и звук роликов работают как прежде.

Структура нового поля описана в `content/README.md`, TypeScript-модель и рабочий/canonical gameplay синхронизированы. Изменений баланса, лора, игровых событий и сохранений нет; новые канонические настройки касаются только музыки. Файлы аудио не менялись.

## Проверки

- `node scripts/run-typescript-test.mjs scripts/test-campaign-soundtrack.ts` — PASS: шесть комнат с одним треком, бар без флага/после освобождения/после undo, отсутствие обхода условия боевым плейлистом, сцены, треки и manifest. Исключительность «Каменного шёпота» для тоннеля сохранена.
- `node scripts/test-campaign-soundtrack-player.mjs` — PASS: реальный компонент с тестовыми hooks/media, маршрут холл → Алексис → холл → Pussy Sultan → реквизиторская → возвращение скипетра → Алексис → холл сохраняет трек, позицию и число вызовов play; вход в бар останавливает фон, бой до освобождения остаётся тихим, освобождение включает музыку, отмена выключает. Повтор и foreground pause/resume также проходят.
- `node scripts/test-dance-player.mjs` — PASS: песни головоломки доступны, не зациклены, переходы по страницам не прерывают их, конец любого потока останавливает оба.
- `jq empty` изменённых JSON, уникальность ID треков, ссылки сцен и manifest — PASS.
- Сравнение с состоянием до задачи: в обоих gameplay менялся только soundtrack; аудиофайлы/список треков и назначения боёв не менялись; canonical и draft совпадают — PASS.
- Проверены все пять мест подключения `CampaignScene` внутри `ClosedBarAdventure`: у каждого передан канонический `soundtrackSceneId`.
- `npm run build` и `npm run build:pages` — PASS, включая typecheck. Сохраняется предупреждение Vite о чанках более 500 kB.

Не выполнены живое прослушивание и проверка переходов в браузере. Тесты media adapter проверяют логику, не браузерную политику автозапуска. Commit, push и deployment не выполнялись.

## Изменённые файлы

- `content/README.md`
- `content/campaigns/penisuela-gallery-gameplay.json`
- `content/campaigns/penisuela-session-preview-guide.md`
- `docs/campaigns/penisuela/gameplay.json`
- `docs/campaigns/penisuela/implementation-plan.md`
- `docs/campaigns/penisuela/workflow.json`
- `src/entities/campaign-session/model/galleryGameplay.ts`
- `src/entities/campaign-session/model/soundtrack.ts`
- `src/features/navigate-campaign-scene/model/campaignSoundtrack.ts`
- `src/widgets/campaign-scene/ui/CampaignScene/CampaignScene.tsx`
- `src/widgets/campaign-scene/ui/ClosedBarAdventure/ClosedBarAdventure.tsx`
- `scripts/test-campaign-soundtrack.ts`
- `scripts/test-campaign-soundtrack-player.mjs`
- Этот отчёт.
