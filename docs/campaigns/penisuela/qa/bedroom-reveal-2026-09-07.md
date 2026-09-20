# Спальня: целевая приёмка 7 сентября 2026

Статус: passed для подключения двух артов и управляемого раскрытия. Авторизация пользователя: «давай» после утверждения спальни v8.

## Изменения

- Публикация bedroom-door-closed-v1 и bedroom-live-reveal-v8 точными копиями в assets/concepts/campaigns/penisuela/scenes/bedroom-door-closed.png и bedroom-live-reveal.png; регистрация в manifest.
- content/campaigns/penisuela-session-preview.json: начальный кадр без личности Игоря, interactionView bedroom-open, общий режим contain для сохранения лица у края.
- content/campaigns/penisuela-gallery-gameplay.json: локальная automatic-команда open-bedroom-door и guard прежнего перехода. Новых бросков, расхода ресурсов и изменений баланса пяти героев нет. igor-revealed остаётся на прежнем graph edge.
- Новый widget BedroomRevealAdventure и выбор его в CampaignPlayPage. Используются CampaignScene, SceneTextPanel с narration/readAloud, общий SceneMasterControl через masterActions, GameMasterConsole и событийный контроллер.
- Синхронизированы гайд, script, gameplay-notes, implementation-plan и art-plan. Новые канонические визуальные детали: принятый интерьер, подарки для распаковки и следы мальчишника.

## Терминал

- npm run typecheck — PASS.
- npm run build — PASS.
- npm run build:pages — PASS; известное предупреждение о крупных chunks.
- node scripts/test-bedroom-reveal.mjs — PASS: guard, отсутствие цены и бросков, replay, undo, старые сохранения, совпадение изображений с утверждёнными файлами и синхронность текста с гайдом.
- node scripts/test-graywise-door.mjs — PASS.
- npm run validate:penisuela-playable — PASS, 737 checks, четыре финала. Smoke-последовательность дополнена обязательным локальным открытием двери.
- JSON parse, уникальность ID manifest/сцен/действий, ссылки nextSceneId и git diff --check затронутых файлов — PASS.

## Встроенный браузер

Маршрут /campaign/penisuela/play/bedroom-reveal. Проверено на 1280×800 и 1024×768. Контрольные скриншоты обеих стадий получены средствами встроенного браузера и показаны в задаче; отдельные файлы снимков не сохранялись.

- До раскрытия только закрытая дверь, Grey Wiese и неспойлерный Рассказчик. В короне только «Открыть дверь спальни», распаковка скрыта.
- Нажатие остаётся на текущем URL, показывает утверждённую спальню v8 и новый текст с единственным заголовком «Рассказчик». Проверка d20 не открывается.
- Reload сохраняет открытый кадр; кнопка открытия исчезает, появляется «Продолжить к распаковке».
- «Шаг назад» отменяет раскрытие и восстанавливает закрытый кадр.
- Переход действительно открывает /campaign/penisuela/play/igor-unboxing. Возврат и последовательная отмена убирают тестовые команды; вкладка оставлена у закрытой двери.
- Обнаруженная обрезка лица при cover на 1024 px устранена штатным backgroundLayout=contain. На обоих размерах кадр целиком, текст не закрывает лицо.
- scrollWidth === clientWidth: 1280 и 1024. Console errors/warnings отсутствуют.

## Границы

Следующая сцена распаковки сохраняет прежнюю реализацию и временный фон: новый арт бодрствующего Игоря ещё не утверждён. Полный browser-регресс карты, книги героев, боёв и финалов не повторялся, поскольку эти интерфейсы не изменены. Commit, push и deployment не выполнялись.
