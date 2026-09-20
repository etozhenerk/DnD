# Четыре новые песни — 14 сентября 2026

Статус: passed-scoped; браузерные проверки пропущены по сохранённому указанию пользователя.

Добавлены локальные MP3 13–16: Элджей / Atomic Heart — Russian Heart Roulette, SQWOZ BAB — Правило буравчика, Rihanna — Bitch Better Have My Money, Cardi B — Money. Всего 16 уникальных треков. Правильный ответ остаётся шестым (`four-count-vogue`), SQWOZ BAB INDIAN — первым, Wildways — пятым. Остальные ID и порядок сохранены.

Изменены `assets/concepts/campaigns/penisuela/audio/dance-track-13.mp3` … `dance-track-16.mp3`, manifest, канонический и рабочий gameplay JSON, синхронный гайд и gameplay-notes. Новые файлы добавлены без перекодирования аудио; удалены обложки и метаданные. ffprobe подтвердил по одному MP3-потоку и длительности 123.74, 102.32, 219.35 и 183.53 с.

Проверены уникальность всех ID и файлов, существование канонических ссылок, единственный правильный трек на шестой позиции. `jq empty`, `git diff --check`, test-dance-player.mjs, test-dance-backtracking.mjs, `npm run build` и `npm run build:pages` успешны. Обе сборки включают typecheck. Браузер не запускался. Механики и UI не изменялись; новые песни используют существующие обработчики. Commit, push и deployment не выполнялись.
