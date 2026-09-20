# Удаление старых игровых URL — 8 сентября 2026

Статус: passed-scoped. Проверка удаления маршрутов, не полная приёмка кампании.

## Изменения

Удалена поддержка 38 старых URL: таблица interfaceRedirects из канона и его snapshot, тип, экспорт и обработчик в CampaignPlayPage. Неизвестные, архивные и отложенные сцены показывают стандартную страницу «Не найдено». Текущие сцены продолжают проходить через фильтр playableCampaign.

27 действующих записей сцен сохранены. Вариант alexis-room-after-pussy используется при посещении Pussy Sultan до Алексиса; hotel-overload-search — отдельный действующий экран поиска. Они не являются неиспользуемыми адресами. Архивные данные и стабильные ID остаются для истории событий, но не открываются через игровые URL.

Затронуты src/pages/campaign-play, src/entities/campaign-session/model/{playableCampaign,playableData,galleryGameplay}, scripts/test-penisuela-active-interface.mjs, канонический gameplay и snapshot, content/README.md, мастерский гайд, docs/campaigns/penisuela/{README,outline,implementation-plan,script,workflow}. Новых сюжетных фактов нет.

## Проверки

- test-penisuela-active-interface: PASS; 27 сцен, отсутствие поддержки редиректов и архивных переходов, реплики, отложенный квест Олвы, равенство воспроизведения старого журнала.
- test-penisuela-story-sync: PASS; канон, пять думов, пропуска, гайд.
- test:penisuela-navigation: PASS, 12 проверок.
- validate:penisuela-playable: PASS, 774 проверки. Его архивные smoke-пути проверяют исходные данные для истории, а не доступность URL.
- npm run build и npm run build:pages: PASS, обе включают typecheck. Остаётся существующее предупреждение Vite о размере чанков.
- jq empty: изменённые JSON валидны.

## Встроенный браузер

Прямое открытие final-choice, restore-control-log, couples-session-entry и director-epilogue показало «404 — Этой земли пока нет на карте»; конечный адрес /not-found. Ни один адрес не открыл игровую сцену.

Возврат в hotel-gallery: сцена, рассказчик и три дверных/проходных hotspot доступны. На 1280×800 и 1024×768 scrollWidth равен clientWidth. Контрольные снимки просмотрены inline во встроенном браузере, отдельные файлы не сохранялись. Ошибок и предупреждений в консоли нет. Вкладка возвращена в hotel-gallery, исходный размер восстановлен; игровых действий и сброса сохранения не выполнялось.

Полный игровой цикл повторно не проходился, квест Олвы остаётся отложенным. Старый монолитный runtime-тест не запускался: ранее зафиксирована его зависимость от удалённой встречи rail-prop-kraken.
