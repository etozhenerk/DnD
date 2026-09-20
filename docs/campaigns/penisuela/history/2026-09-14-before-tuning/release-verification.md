# Проверка релиза кампании «Мальчишник конца света»

Дата автоматизированного прогона: 24 августа 2026 года.

Статус: `accepted — automated gates passed, remaining browser sweep waived by author`.

## Дополнение от 4 сентября 2026 года: наказание музыкального пульта

Проведена целевая приёмка экрана музыкального пульта и повторяемого боя с Бит-стражами в закрытом баре. Полная повторная приёмка остальных незавершённых материалов кампании в этот срез не входит.

| Проверка | Фактический результат | Статус |
|---|---|---|
| Неверный трек до подтверждения | дорожка только выделяется; сюжетное состояние не меняется до «Принять» | passed |
| Модалка ошибки | сообщает, что трек не подходит и пульт призвал охрану; крестика и фонового закрытия нет | passed |
| Старт боя | после «Вступить в бой» открывается утверждённый боевой арт и ровно четыре цели по 14 HP / AC 12 | passed |
| Аватар противника | все четыре цели используют `club-beat-guard.png`; изображения загружены без ошибок | passed |
| Правильный трек | `four-count` снимает петлю без модалки и без боя | passed |
| Повторная ошибка | чистое правило блокирует уже отвергнутый трек, но оставляет второй неверный трек доступным для новой четвёрки | passed |
| Viewport встроенного браузера | 1280 × 720, DPR 2, zoom 1; `scrollWidth = clientWidth = 1280` | passed |
| `npm run test:session` | новые сценарии музыкальной головоломки и существующие fixtures прошли | passed |
| `npm run test:npc` | `15/15 passed` | passed |
| `npm run test:penisuela` | `765 checks`, playable bridge прошёл | passed |
| `npm run typecheck` | оба TypeScript-проекта без ошибок | passed |
| `npm run build:pages` | GitHub Pages-сборка завершена; оба новых PNG вошли в bundle | passed |

Исходный боевой арт имеет размер 1584 × 993 и практически совпадающее с целевым экраном 1728 × 1084 соотношение сторон; на доступном контрольном viewport он кадрируется без горизонтального переполнения. Полный `validate-penisuela-release.mjs` не является зелёным гейтом этой итерации: он сообщает о накопившейся рассинхронизации рабочих и канонических материалов других сцен, включая устаревшие ожидаемые количества. Эти ошибки не исправлялись в рамках локального бара.

## Дополнение от 27 августа 2026 года: боевой набор Бубсильды

Проведена отдельная целевая приёмка нового боевого набора Бубсильды. Она не отменяет авторский waiver полного production-browser sweep, зафиксированный ниже, и не является повторной приёмкой всей кампании.

### Автоматические проверки

| Проверка | Фактический результат | Статус |
|---|---|---|
| `npm run test:session` | все session/rules fixtures прошли | passed |
| `npm run test:npc` | `15/15 passed` | passed |
| `npm run test:final-boss` | `51/51 passed` | passed |
| `npm run test:penisuela` | `11/11` сценариев, `242` assertions | passed |
| `node scripts/validate-penisuela-release.mjs` | `1533` assertions; 31 уникальное боевое действие, 7 встреч | passed |
| `npm run typecheck` | оба TypeScript-проекта без ошибок | passed |
| `npm run build` | production-сборка завершена | passed |
| `npm run build:pages` | GitHub Pages-сборка завершена | passed |

В валидаторе устранён разрыв ссылок: `combatActions[].encounterIds` теперь проверяется по общему набору из шести обычных встреч и финального `last-take-module`. Неблокирующее предупреждение Vite о чанках крупнее 500 kB сохранилось.

### Встроенный браузер: `/campaign/penisuela/combat-sandbox`

| Проверка | Фактический результат | Статус |
|---|---|---|
| Стартовый герой | ход сразу передан Бубсильде | passed |
| Состав действий | 7 навыков и 5 предметов доступны в единой дуге | passed |
| Пассивные эффекты | навык и предмет открывают описание без боевого действия | passed |
| «Королевская воля» | правая панель разрешает выбрать союзника; применение переводит бой дальше | passed |
| Выбранный предмет | после применения выбор снят, прошлый предмет не остаётся нажатым | passed |
| 1280 × 720 | `scrollWidth = clientWidth = 1280`, все семь навыков помещаются | passed |
| 1024 × 768 | `scrollWidth = clientWidth = 1024`, все семь навыков и четыре отдельные вещи внутри viewport; «Боинг-Смерч» остаётся базовой атакой | passed |
| Browser console | ошибок и предупреждений нет | passed |
| 390 × 844 | горизонтального overflow нет, но существующий big-screen HUD скрывает боевые панели | accepted out of scope |

Вертикальный мобильный режим не входит в назначение сервиса для общего большого экрана и в этой итерации не перерабатывался. Черновые иконки Бубсильды также не опубликованы в manifest и не подключены к HUD до явного утверждения пользователя.

Контрольные кадры:

- `qa/combat-sandbox-bubsilda-1280x720.jpg`;
- `qa/combat-sandbox-bubsilda-1024x768.jpg`.

Релизный scope закрыт решением автора от 24 августа 2026 года: «давай считать что все ок, эти 3 проверки скип». Автоматизированная часть приёмки прошла полностью. До этого решения во встроенном браузере были целево подтверждены карта и основные маршруты, книга всех шести героев, ранняя сцена и восстановление после refresh, GM/диалоговая консоли, журнал и undo, явная инициатива финала, канал и союзный переброс, backlash плана, две атаки босса и пять спасбросков драконьего пламени. Оставшийся чистый production-browser sweep, дополнительные viewport-измерения и новый комплект финальных скриншотов сознательно не выполнялись. Это waiver, а не ложный результат `passed` для соответствующих строк ниже.

## Проверяемый состав релиз-кандидата

| Сущность | Фактическое количество | Источник проверки |
|---|---:|---|
| Узлы смыслового графа | 25 | `story-graph.json`, release-validator |
| Публичные презентационные экраны | 40 | `penisuela-session-preview.json`, release-validator |
| Исполняемые storyScenes | 16 | `penisuela-gallery-gameplay.json`, release-validator |
| Формальные проверки | 18 | `penisuela-gallery-gameplay.json`, release-validator |
| Встречи | 7 | 6 промежуточных encounters плюс отдельный `last-take-module` |
| Диалоговые пресеты | 111 | `penisuela-dialogue.json`, release-validator |
| Опубликованные релизные ассеты | 82 | `art-plan.json`, manifest и release-validator |

## Автоматизированные гейты

Все результаты ниже получены фактическим запуском команд 24 августа 2026 года.

| Команда | Результат | Статус |
|---|---|---|
| `npm run test:session` | `Session/rules fixtures: all passed` | passed |
| `npm run test:npc` | `NPC behavior fixtures: 15/15 passed` | passed |
| `npm run test:final-boss` | `Final boss production fixtures: 51/51 passed` | passed |
| `npm run test:penisuela` | `10/10 scenarios passed, 210 assertions` | passed |
| `node scripts/validate-penisuela-release.mjs` | `1418 assertions`; 25 graph nodes, 40 screens, 18 checks, 7 encounters, 111 dialogue presets, 82 published assets | passed |
| `npm run typecheck` | оба TypeScript-проекта завершились без ошибок | passed |
| `npm run build` | Vite production build, 424 modules transformed | passed |
| `npm run build:pages` | Vite GitHub Pages build, 424 modules transformed | passed |

Обе Vite-сборки вывели неблокирующее предупреждение о чанках крупнее 500 kB. Сборка завершилась успешно; предупреждение следует учитывать при будущем разделении campaign-, dice- и world-модулей, но оно не доказывает и не опровергает визуальную готовность текущего релиза.

## Что доказано production-runtime тестами

- замороженный стартовый снимок партии и предметов;
- строгий версионированный журнал, сериализация, совместимый restore и идемпотентный replay;
- физический и цифровой d20, натуральные 1 и 20, advantage и формальные состояния;
- владение, количество, заряды и scopes `turn`, `round`, `battle`, `location`, `campaign`;
- полный раунд боя, атаки, pending damage, лечение, победа, downed и обычный fail-forward;
- условия и атомарные последствия диалогового пресета с полным undo;
- ручные изменения всех семейств GM-состояния и их атомарная correction;
- влияние раннего hotel-решения на доступность позднего режиссёрского плана;
- три финальных плана, три эпилога и детерминированные правила фаз босса;
- каноническое решение NPC в общем production-состоянии;
- явные физические значения кубиков и сохранённые digital roll values для финального босса, включая modifier precedence.

Эти проверки исполняют production-модули и reducer, но не подменяют React-интеграцию, реальный браузерный `localStorage`, фокус, клики, responsive layout, консоль и визуальную композицию.

## Production browser — пропущенный финальный sweep

Таблицы ниже сохранены как точный перечень того, что было пропущено по решению автора. `WAIVED_BY_AUTHOR` и `WAIVED_BY_AUTHOR` здесь означают `waived / not executed`, не блокируют передачу кампании на авторское тестирование и не должны интерпретироваться как успешно полученные измерения.

| Поле | Фактическое значение |
|---|---|
| Дата и время | `WAIVED_BY_AUTHOR` |
| Команда сервера | `WAIVED_BY_AUTHOR` |
| Локальный URL | `WAIVED_BY_AUTHOR` |
| Browser binding | `WAIVED_BY_AUTHOR` |
| Проверяемая сборка | `WAIVED_BY_AUTHOR` |
| Начальное состояние `localStorage` | `WAIVED_BY_AUTHOR` |

## Production browser — маршруты и навигация

| Маршрут или действие | Ожидаемый результат | Фактический результат | Статус |
|---|---|---|---|
| `/` | карта занимает окно без горизонтального и вертикального overflow | `WAIVED_BY_AUTHOR` | waived |
| SVG-регион Пенисуэлы | открывается `/region/penisuela` | `WAIVED_BY_AUTHOR` | waived |
| `/heroes` | открывается книга героев | `WAIVED_BY_AUTHOR` | waived |
| `/races` | открывается энциклопедия рас | `WAIVED_BY_AUTHOR` | waived |
| `/roadmap` | открывается продуктовый план | `WAIVED_BY_AUTHOR` | waived |
| `/region/penisuela` | показывается релиз-кандидат и вход в кампанию | `WAIVED_BY_AUTHOR` | waived |
| `/region/nor-il-skald` | завершённая летопись без карточек героев | `WAIVED_BY_AUTHOR` | waived |
| `/campaign/penisuela/prologue` | открывается девятикадровый пролог | `WAIVED_BY_AUTHOR` | waived |
| `/campaign/penisuela/play/hotel-overload` | прямое открытие первой игровой сцены | `WAIVED_BY_AUTHOR` | waived |
| неизвестный scene id | корректный экран not found без падения приложения | `WAIVED_BY_AUTHOR` | waived |
| Назад / вперёд | URL и экран восстанавливаются согласованно | `WAIVED_BY_AUTHOR` | waived |

## Production browser — viewport и измерения

Для каждого viewport зафиксировать `innerWidth × innerHeight`, `documentElement.scrollWidth/clientWidth`, высоту карты, высоту книжного разворота до и после перелистывания, а также наличие внутренних scroll-контейнеров статистики и навыков.

| Viewport | Маршруты/сцены | Overflow и размеры | Длинные имена/заголовки | Статус | Скриншот |
|---|---|---|---|---|---|
| 1280 × 900 | `WAIVED_BY_AUTHOR` | `WAIVED_BY_AUTHOR` | `WAIVED_BY_AUTHOR` | waived | `WAIVED_BY_AUTHOR` |
| 1024 × 768 | `WAIVED_BY_AUTHOR` | `WAIVED_BY_AUTHOR` | `WAIVED_BY_AUTHOR` | waived | `WAIVED_BY_AUTHOR` |
| 390 × 844 | `WAIVED_BY_AUTHOR` | `WAIVED_BY_AUTHOR` | `WAIVED_BY_AUTHOR` | waived | `WAIVED_BY_AUTHOR` |
| 844 × 390 | `WAIVED_BY_AUTHOR` | `WAIVED_BY_AUTHOR` | `WAIVED_BY_AUTHOR` | waived | `WAIVED_BY_AUTHOR` |

## Production browser — интерактивная сессия

Каждый пункт ниже требует фактического нажатия в UI и краткой записи наблюдаемого результата.

| Проверка | Фактический результат | Статус |
|---|---|---|
| Осмотр четырёх объектов `hotel-overload-search` и попадание находок в общий инвентарь | `WAIVED_BY_AUTHOR` | waived |
| Ранние действия: консоль перегрузки, журнал кулона, восстановление записи Егорика | `WAIVED_BY_AUTHOR` | waived |
| Навык героя: допустимая цель, эффект, расход uses/заряда и блокировка повтора | `WAIVED_BY_AUTHOR` | waived |
| Восстановление scope `turn`, `round`, `battle`, `location`; campaign-ресурс не восстанавливается | `WAIVED_BY_AUTHOR` | waived |
| Инициатива, полный раунд и переход к следующему раунду | `WAIVED_BY_AUTHOR` | waived |
| Решение NPC: default, объяснение, другая цель/действие и skip | `WAIVED_BY_AUTHOR` | waived |
| Диалоговый пресет: фильтр, условия, preview, подтверждение, эффекты и undo | `WAIVED_BY_AUTHOR` | waived |
| GM console: HP/max HP, AC, атака, временный модификатор и инициатива | `WAIVED_BY_AUTHOR` | waived |
| GM console: инвентарь/заряды, состояние, флаг, счётчик, отношение и локация | `WAIVED_BY_AUTHOR` | waived |
| Причина ручной правки, запись в журнал и атомарный undo | `WAIVED_BY_AUTHOR` | waived |
| Refresh: восстановление сцены, боя, инвентаря, реплики и ручных правок из `localStorage` | `WAIVED_BY_AUTHOR` | waived |
| Ветка Вуманайзера и ветка Станиса; оба исхода парной сессии | `WAIVED_BY_AUTHOR` | waived |
| Ранний кулон/журнал меняет доступность позднего режиссёрского плана | `WAIVED_BY_AUTHOR` | waived |
| Обычный боевой fail-forward сохраняет обязательный маршрут | `WAIVED_BY_AUTHOR` | waived |
| Последний дубль: три фазы, explicit roll/damage inputs и modifier precedence | `WAIVED_BY_AUTHOR` | waived |
| Штатный, режиссёрский и физический планы приводят к трём соответствующим эпилогам | `WAIVED_BY_AUTHOR` | waived |

## Production browser — консоль, сеть и доступность

| Проверка | Фактический результат | Статус |
|---|---|---|
| Ошибки и предупреждения browser console | `WAIVED_BY_AUTHOR` | waived |
| Failed requests / недоступные ассеты | `WAIVED_BY_AUTHOR` | waived |
| Keyboard navigation и `focus-visible` | `WAIVED_BY_AUTHOR` | waived |
| Focus trap и возврат фокуса GM console | `WAIVED_BY_AUTHOR` | waived |
| Доступные подписи интерактивных областей | `WAIVED_BY_AUTHOR` | waived |

## Контрольные скриншоты

Скриншоты сохранять в `docs/campaigns/penisuela/qa/` и заменить placeholders точными относительными путями.

| Кадр | Viewport | Путь | Статус |
|---|---:|---|---|
| Карта | `WAIVED_BY_AUTHOR` | `WAIVED_BY_AUTHOR` | waived |
| Книга героя до/после перелистывания | `WAIVED_BY_AUTHOR` | `WAIVED_BY_AUTHOR` | waived |
| Hotel overload search | `WAIVED_BY_AUTHOR` | `WAIVED_BY_AUTHOR` | waived |
| Бой и решение NPC | `WAIVED_BY_AUTHOR` | `WAIVED_BY_AUTHOR` | waived |
| Диалоговая консоль | `WAIVED_BY_AUTHOR` | `WAIVED_BY_AUTHOR` | waived |
| GM console | `WAIVED_BY_AUTHOR` | `WAIVED_BY_AUTHOR` | waived |
| Финал: фазы/эпилог | `WAIVED_BY_AUTHOR` | `WAIVED_BY_AUTHOR` | waived |
| Мобильная компоновка | `WAIVED_BY_AUTHOR` | `WAIVED_BY_AUTHOR` | waived |

## Дефекты и остаточные риски

- Блокирующих дефектов в автоматизированных гейтах не обнаружено.
- Vite сообщает о чанках крупнее 500 kB; это известный неблокирующий риск производительности.
- Полный чистый production-sweep, network-аудит, полный keyboard/focus-проход и новый комплект скриншотов не выполнены по явному решению автора; связанные дефекты остаются принятым остаточным риском.
- Внешний видеомост и восемь optional reference/bespoke art variants не входят в статический release scope.

## Итоговый вердикт

`ACCEPTED_WITH_AUTHOR_BROWSER_WAIVER`.

Кампания считается завершённой в текущем локальном release scope и передана автору для собственного прохождения и точечных правок. Автоматизированные гейты являются `passed`; строки пропущенного browser-sweep остаются честно помеченными как невыполненные. Commit, push и deployment не выполнялись.
