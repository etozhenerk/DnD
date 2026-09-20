# Замена видео гибели дракона — 16 сентября 2026

Статус: технические проверки пройдены. Браузер не открывался по указанию автора «Заверши без браузера»; воспроизведение и звук в браузере не проверены.

## Изменение

По сообщению «последнее в загрузках» подключён `grok-video-f7faeec0-2492-45c2-ab1c-e348a64ecdfb.mp4` вместо прежнего восьмисекундного видео. Runtime: `assets/concepts/campaigns/penisuela/scene-videos/andrey-death.mp4`. Файл скопирован побайтно, без обрезки, ускорения и перекодирования.

- Длительность: 6,041667 с; H.264 Main, 1264×720, 24 fps.
- Звук: AAC stereo, 48 кГц, 6 с. Дорожка декодируется, mean -15,3 dB / peak -3,2 dB. Содержание музыки на слух не проверялось.
- Размер: 6 321 339 байт.
- SHA-256: `be1902d70a20ba86b3c6e4fcea24070a184906cdbc74d81fe4933edf54b6b458`.
- Предыдущая версия сохранена: `art-drafts/andrey-video/death-6s/previous-death-8s.mp4`.

Существующий общий плеер показывает видео один раз на скорости 1× после победы над второй фазой. Завершение вызывает `death-video-ended`, после чего открывается `villa-after-andrey`. Длительность не зашита в таймер, поэтому правок React/TypeScript не потребовалось. Схема данных, правила и баланс пяти героев не менялись; новых сюжетных фактов нет.

## Проверки

- `node scripts/test-andrey-boss-sequence.mjs` — PASS: ожидание видео после победы, завершение и его идемпотентность, запрет преждевременного завершения и показа после поражения, reload, undo, переход к финалу и ссылки на ассеты.
- `jq empty` для трёх изменённых JSON — PASS.
- Уникальность ID в коллекциях manifest и sequences; единый путь видео в manifest, canonical gameplay и новом video-plan; SHA-256 runtime и исходника; архив старой версии — PASS.
- Полное декодирование главных видео- и аудиопотоков через ffmpeg — PASS.
- `npm run build` — PASS, включая `npm run typecheck`.
- `npm run build:pages` — PASS, включая `npm run typecheck`.
- Итоговый `dist/assets/andrey-death-CtAKkF7J.mp4` совпадает с исходником по SHA-256; JS-сборка использует `/DnD/assets/andrey-death-CtAKkF7J.mp4` — PASS.
- В обеих сборках есть предупреждение Vite о чанках более 500 kB; ошибок сборки нет.

## Визуальная проверка файла и ограничения

Просмотрены извлечённые кадры начала, середины и конца. Дракон сохраняет облик и падает на арену. В финальном кадре глаза светятся фиолетовым, хотя production prompt требовал погасить свечение. Переданный пользователем клип сохранён без изменений. Избранные кадры не заменяют полный просмотр движения; браузерная проверка и прослушивание не проводились.

## Изменённые файлы

- `assets/concepts/campaigns/penisuela/scene-videos/andrey-death.mp4`
- `assets/concepts/manifest.json`
- `content/campaigns/penisuela-session-preview-guide.md`
- `docs/campaigns/penisuela/video-plan.json`
- `docs/campaigns/penisuela/video-production.md`
- `docs/campaigns/penisuela/workflow.json`
- Этот отчёт; локальная резервная копия прежнего MP4 в `art-drafts/`.

Commit, push и deployment не выполнялись.
