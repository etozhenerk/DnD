# Музыка пролога и затухание — 16 сентября 2026

Статус: технические проверки пройдены. Браузер не открывался по прежнему указанию автора; реальное прослушивание и автозапуск в браузере не проверены.

## Результат

По запросу автора «Шёпот каменных стен» подключён только к прологу. Исходник `shepot-kamennykh-sten-127-5a7a9c.mp3` скопирован побайтно в `assets/concepts/campaigns/penisuela/audio/soundtrack/prologue-stone-walls-whisper.mp3`. MP3 stereo, 48 кГц, 179,519979 с; 4 316 239 байт. SHA-256: `33793d2f7a702ccf52df4af0b56e05a23f0d6799d9940e6f4dd0642bea904d23`.

Громкость 30%, native loop. При открытии последнего кадра — `penisuela-scene-kostryulka-flight`, девятый кадр — начинается плавное затухание smoothstep до нуля за 3000 мс, затем pause. Длительность выбрана как рабочее допущение: автор попросил плавное затухание, но не указал число секунд. Учитывается `isLast` существующей навигации, поэтому стрелки, End и маркеры дают одинаковый результат. Прямое открытие последнего кадра не запускает музыку. Возврат назад отменяет затухание и продолжает трек с сохранённой позиции. Выход или запуск заставки останавливает фон, включая отложенное завершение play().

Музыкальный источник и длительность затухания добавлены в схему preview и канонический JSON. Сам пролог, его девять текстов/артов и настройки перехода через заставку и титр 5000 мс не изменены. «Каменный шёпот» тоннеля — другой файл, его назначение сохранено. Новых фактов лора и изменений игрового баланса нет.

## Проверки

- `node scripts/run-typescript-test.mjs scripts/test-preview-music.ts` — PASS. Автостарт, повтор, непрерывность обычных кадров, промежуточные значения плавного fade, точный ноль и pause через 3 секунды, запрет повторного запуска на последнем кадре, тихий прямой вход, возврат назад и отмена таймера, повтор после autoplay rejection, очистка и поздний resolve play, ссылки manifest и canonical JSON.
- `jq empty` изменённых JSON — PASS.
- Уникальность ID слайдов и manifest, совпадение всех текстов с гайдом, равенство preview исходному при исключении нового поля music — PASS.
- Полное декодирование аудиодорожки ffmpeg и SHA-256 исходника/runtime — PASS.
- `npm run build` и `npm run build:pages` — PASS, включая typecheck. Сохраняется предупреждение Vite о чанках более 500 kB, ошибок нет.
- Итоговый `dist/assets/prologue-stone-walls-whisper-CNAhTEJq.mp3` совпадает с исходником; JS использует `/DnD/assets/prologue-stone-walls-whisper-CNAhTEJq.mp3` — PASS.

Модельные проверки используют управляемые часы и подставной media player. Они проверяют логику, но не заменяют прослушивание и проверку браузерной политики автозапуска. Новые экранные элементы и стили не добавлялись. Commit, push и deployment не выполнялись.

## Файлы

- `assets/concepts/campaigns/penisuela/audio/soundtrack/prologue-stone-walls-whisper.mp3`
- `assets/concepts/manifest.json`
- `content/README.md`
- `content/campaigns/penisuela-preview.json`
- `content/campaigns/penisuela-preview-guide.md`
- `src/entities/campaign-preview/model/types.ts`
- `src/features/navigate-campaign-preview/model/previewMusicPlayback.ts`
- `src/features/navigate-campaign-preview/model/usePreviewMusic.ts`
- `src/widgets/campaign-preview/ui/CampaignPreview/CampaignPreview.tsx`
- `scripts/test-preview-music.ts`
- `docs/campaigns/penisuela/implementation-plan.md`
- `docs/campaigns/penisuela/workflow.json`
- Этот отчёт.
