# Фоновая музыка по сценам — 16 сентября 2026

Статус: автоматические проверки пройдены. Браузер и прослушивание в игре не выполнялись; автор ранее выбрал «Заверши без браузера».

## Что подключено

Использованы четыре новых MP3 из загрузок, скачанных 16 сентября около 15:28. Имена композиций подтверждены встроенными тегами. Файлы перенесены побайтно, без перекодирования; исходники в загрузках сохранены.

| Трек | Назначение | Длительность |
| --- | --- | --- |
| Каменный шёпот | Только `groom-tunnel`, включая все ракурсы и проверки. При выходе в укрытие Kreed музыка сменяется. | 148,960 с |
| Базар золотых монет | Алексис, Pussy Sultan, реквизиторская, возвращение скипетра, распаковка Angel. | 123,600 с |
| Медовый напев странников | Галерея, бар, развилка бунгало, Оливия, подход к вилле, счастливая свадьба. | 141,000 с |
| Затишье перед штормом | Утро и обыск, бунгало Егорика, укрытие Kreed, дверь Grey Wiese, спальня, появление Нетака и арена вне боя, разрушенная вилла, два голоса, плохой финал. | 128,720 с |

В `soundtrack.scenes` 28 явных назначений: все текущие сцены, побочная сцена Оливии, плохая концовка и совместимое имя комнаты Алексиса. Запасной фон — «Затишье перед штормом». «Каменный шёпот» не входит ни в общий фон, ни в боевые плейлисты.

Для обычных боёв выбраны существующие «Засада в узком проходе» и «Ущелье гоблинов». Плейлисты обеих фаз Нетака сохранены. Новых фактов лора и изменений баланса пяти героев нет; канонические изменения — только музыкальные назначения и описание нового поля `soundtrack.scenes`.

## Поведение плеера

Расширен существующий плеер в `features/navigate-campaign-scene`; выбор по сцене находится в `entities/campaign-session`. Общий `CampaignScene` передаёт ID родительской сцены, стабильный при смене ракурса. Приоритет: конкретная встреча / общий бой во время боя, иначе сцена / общий фон. Пустой список явно задаёт тишину.

Один трек повторяется через native `loop`; несколько — по очереди с возвратом к первому. Одинаковый плейлист при передаче от одной сцены другой сохраняет индекс и позицию. Новый плейлист атомарно начинается с первого трека. Отложенная очистка не обнуляет плейлист, уже принятый новой сценой или повторным эффектом StrictMode. Управление громкостью и паузой мастера сохранено.

Foreground media приостанавливает фон; по закрытии он продолжается с прежней позиции, если мастер не поставил паузу. Уход со сцены без следующего владельца очищает музыку; размонтирование плеера останавливает звук. Песни танцевального пульта и титры сохраняют отдельное однократное воспроизведение.

## Выполненные проверки

- `node scripts/run-typescript-test.mjs scripts/test-campaign-soundtrack.ts` — PASS: покрытие текущих сцен, эксклюзивность тоннеля, приоритет боя, запасной фон, явная тишина, ссылки на сцены, встречи, MP3 и manifest.
- `node scripts/test-campaign-soundtrack-player.mjs` — PASS: реальный компонент с тестовыми hooks и media adapter; native loop одного трека, циклическая смена нескольких, автоматический вызов play, сохранение позиции/индекса при передаче между сценами, атомарная смена плейлиста, foreground pause/resume, ручная пауза и очистка при выходе. Это проверка логики, не реального медиадекодера браузера.
- `node scripts/test-dance-player.mjs` — PASS: повторение на пульте по-прежнему выключено, смена страниц не прерывает музыку, завершение одного потока останавливает оба.
- `node scripts/run-typescript-test.mjs scripts/test-credits-music.ts` — PASS.
- `node scripts/run-typescript-test.mjs scripts/test-credits-music-handoff.ts` — PASS: однократная музыка титров, благодарность 2 секунды и переход на послетитровое видео сохранены.
- `node scripts/run-typescript-test.mjs scripts/test-campaign-credits.ts` — PASS.
- `jq empty` для изменённых JSON, уникальность ID manifest — PASS.
- Сравнение с копиями до изменения: в обоих gameplay JSON менялся только soundtrack; канонический и рабочий soundtrack совпадают, боевые плейлисты Нетака не изменены — PASS.
- SHA-256 исходников и подключённых файлов; полное декодирование четырёх аудиопотоков ffmpeg — PASS. Все четыре: MP3, stereo, 48 кГц.
- `npm run build` — PASS, включая typecheck.
- `npm run build:pages` — PASS, включая typecheck.
- Четыре MP3 в `dist/assets/` совпадают с исходниками по SHA-256 и используются сборкой с префиксом `/DnD/assets/` — PASS.

Обе сборки выдают существующее предупреждение Vite о чанках больше 500 kB; ошибок сборки нет. Непроверены на живом браузере: фактический автозапуск, слышимость/баланс громкости, поведение на мобильных устройствах. Commit, push и deployment не выполнялись.

## Файлы этой задачи

- `assets/concepts/campaigns/penisuela/audio/soundtrack/stone-whisper.mp3`
- `assets/concepts/campaigns/penisuela/audio/soundtrack/golden-coin-bazaar.mp3`
- `assets/concepts/campaigns/penisuela/audio/soundtrack/wanderers-honey-song.mp3`
- `assets/concepts/campaigns/penisuela/audio/soundtrack/calm-before-storm.mp3`
- `assets/concepts/manifest.json`
- `content/README.md`
- `content/campaigns/penisuela-gallery-gameplay.json`
- `content/campaigns/penisuela-session-preview-guide.md`
- `docs/campaigns/penisuela/gameplay.json`
- `docs/campaigns/penisuela/implementation-plan.md`
- `docs/campaigns/penisuela/workflow.json`
- `src/entities/campaign-session/model/galleryGameplay.ts`
- `src/entities/campaign-session/model/soundtrack.ts`
- `src/features/navigate-campaign-scene/model/campaignSoundtrack.ts`
- `src/features/navigate-campaign-scene/ui/CampaignSoundtrack/CampaignSoundtrack.tsx`
- `src/widgets/campaign-scene/ui/CampaignScene/CampaignScene.tsx`
- `scripts/test-campaign-soundtrack.ts`
- `scripts/test-campaign-soundtrack-player.mjs`
- Этот отчёт.
