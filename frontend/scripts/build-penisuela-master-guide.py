#!/usr/bin/env python3
"""Build the private Word game-master guide for the Penisuela campaign.

The document is assembled from the canonical campaign bundle and the approved
scene script. Public read-aloud text remains verbatim; game-master framing and
dialogue presets stay private inside the generated DOCX.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import OrderedDict
from pathlib import Path
from typing import Any, Iterable

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
SESSION_PATH = ROOT / "content/campaigns/penisuela-session-preview.json"
GAMEPLAY_PATH = ROOT / "content/campaigns/penisuela-gallery-gameplay.json"
DIALOGUE_PATH = ROOT / "content/campaigns/penisuela-dialogue.json"
FINAL_BOSS_PATH = ROOT / "content/campaigns/penisuela-final-boss.json"
CHARACTERS_PATH = ROOT / "content/characters.json"
RULES_PATH = ROOT / "content/rules.json"
SCRIPT_PATH = ROOT / "docs/campaigns/penisuela/script.md"
BRACELETS_ICON_PATH = ROOT / "assets/concepts/campaigns/penisuela/items/icons/anonymous-bracelets.png"


COLORS = {
    "ink": "29252B",
    "muted": "706970",
    "burgundy": "67314B",
    "burgundy_dark": "402033",
    "gold": "A66F2C",
    "gold_dark": "7A4F1D",
    "teal": "35666B",
    "teal_dark": "244F55",
    "parchment": "F7F0E3",
    "rose": "F4E9EE",
    "mist": "E8F1F0",
    "stone": "F3F0EC",
    "amber": "FAEFD5",
    "white": "FFFFFF",
    "line": "D8CFC7",
    "line_soft": "E8E1DB",
    "link": "275D73",
}


CHARACTER_NAMES = {
    "lord-krayneplot": "Лорд Крайнеплот",
    "pussy-sultan": "Pussy Sultan",
    "style-sphinx": "Алексис Великолепный",
    "eternal-all-inclusive": "Прохор Оллинклюзив",
    "bungalow-spouse-a": "Стас Хмелебрюх",
    "club-dance-troupe": "Танцевальная труппа",
    "celebrity-decoy-satyr": "Satyr",
    "olga-vasilenko": "Олва Силенна",
    "universal-advice-algorithm": "Алгоритм универсальных советов",
    "bungalow-spouse-b": "Полина Златородная",
    "egorik": "Егорик",
    "nastya": "Настасья Затейница",
    "egor-kreed": "Егор Крид",
    "igor-sinyak": "Игорь Румянец",
    "rail-prop-kraken": "Рельсовый кракен",
    "dressing-room-mirror-doubles": "Гримёрные дублёры",
    "confidentiality-corp-de-ballet": "Кордебалет конфиденциальности",
    "last-take-module": "Модуль «Последний дубль»",
    "kostryulka": "Кострюлька",
}


ACTS = [
    {
        "title": "Акт I. Утро после конца света",
        "range": (1, 14),
        "duration": "≈ 50–90 минут",
        "purpose": "Показать угрозу, собрать первые улики, усилить ошибочную версию об Егорике и добыть маршрут к закрытому бару.",
        "finish": "У партии есть переносной пульт, след Егорика, доступ к архиву и бару; кракен больше не перекрывает путь.",
        "mood": "Похмельная катастрофа → роскошный абсурд → первая реальная опасность.",
    },
    {
        "title": "Акт II. Ложный маршрут и не те молодожёны",
        "range": (15, 30),
        "duration": "≈ 75–120 минут",
        "purpose": "Провести героев через бар, гримёрку и семейное крыло, затем честно разрушить ложную гипотезу и назвать настоящего жениха.",
        "finish": "Егорик оправдан, Крид подтверждён как жених, путь под сцену найден; семейная ветка получила собственный исход.",
        "mood": "Клубная комедия → сценический детектив → спокойный человеческий выбор → ясное раскрытие.",
    },
    {
        "title": "Акт III. Настоящий жених",
        "range": (31, 36),
        "duration": "≈ 60–90 минут",
        "purpose": "Добраться до Крида, получить оба голосовых ключа, решить судьбу записи и выбрать начальную тактику финала.",
        "finish": "Крид и Игорь у алтаря, моральный выбор о записи зафиксирован, стартовый план выбран.",
        "mood": "Хореографическая опасность → личная срочность → тишина перед точкой необратимости.",
    },
    {
        "title": "Акт IV. Последний дубль",
        "range": (37, 40),
        "duration": "до 60 минут боя + эпилог",
        "purpose": "Последовательно закрыть три контура обязательного босса и показать цену выбранного способа победы.",
        "finish": "Остров спасён; последняя закрытая фаза определяет один из трёх эпилогов.",
        "mood": "Большое шоу, честно телеграфируемая опасность, затем короткая эмоциональная развязка.",
    },
]


SCREEN_PARENT = {
    "hotel-overload": "hotel-overload",
    "hotel-overload-search": "hotel-overload",
    "hotel-gallery": "hotel-gallery",
    "hotel-gallery-pussy": "hotel-gallery",
    "hotel-vip-guards": "hotel-gallery",
    "hotel-vip-guards-defeated": "hotel-gallery",
    "vip-prop-room": "hotel-gallery",
    "vip-prop-room-carriers": "hotel-gallery",
    "vip-prop-room-carriers-defeated": "hotel-gallery",
    "hotel-gallery-pussy-return": "hotel-gallery",
    "hotel-archive-alexis": "hotel-gallery",
    "hotel-gallery-kraken": "rail-kraken-fight",
    "hotel-gallery-kraken-linda-disabled": "rail-kraken-fight",
    "hotel-gallery-kraken-defeated": "rail-kraken-fight",
    "closed-bar": "closed-bar",
    "closed-bar-prokhor": "closed-bar",
    "closed-bar-prokhor-payer-identified": "closed-bar",
    "closed-bar-prokhor-work-schedule": "closed-bar",
    "closed-bar-prokhor-phone-call": "closed-bar",
    "closed-bar-stas": "closed-bar",
    "closed-bar-dancers": "bar-module-shutdown",
    "artists-dressing-room": "artists-dressing-room",
    "dressing-room-double-fight": "dressing-room-double-fight",
    "stage-module-shutdown": "stage-module-shutdown",
    "guest-bungalows": "guest-bungalows",
    "show-18-pavilion": "show-18-pavilion",
    "couples-session-stas": "couples-session-stas",
    "couples-session-polina": "couples-session-polina",
    "couples-session-choice": "couples-session-choice",
    "egorik-bungalow-reveal": "egorik-bungalow-reveal",
    "groom-tunnel": "groom-tunnel",
    "corp-de-ballet-fight": "corp-de-ballet-fight",
    "groom-preparation-room": "groom-preparation-room",
    "restore-control-log": "restore-control-log",
    "ceremony-villa": "ceremony-villa",
    "final-choice": "final-choice",
    "last-take-boss": "last-take-boss",
    "wedding-epilogue": "wedding-epilogue",
    "director-epilogue": "director-epilogue",
    "shutdown-epilogue": "shutdown-epilogue",
}


DIALOGUE_ANCHOR = {
    "hotel-overload": "hotel-overload",
    "hotel-gallery": "hotel-gallery-pussy",
    "rail-kraken-fight": "hotel-gallery-kraken",
    "closed-bar": "closed-bar",
    "bar-module-shutdown": "closed-bar-dancers",
    "artists-dressing-room": "artists-dressing-room",
    "dressing-room-double-fight": "dressing-room-double-fight",
    "stage-module-shutdown": "stage-module-shutdown",
    "guest-bungalows": "guest-bungalows",
    "show-18-pavilion": "show-18-pavilion",
    "couples-session-stas": "couples-session-stas",
    "couples-session-polina": "couples-session-polina",
    "couples-session-choice": "couples-session-choice",
    "egorik-bungalow-reveal": "egorik-bungalow-reveal",
    "groom-tunnel": "groom-tunnel",
    "corp-de-ballet-fight": "corp-de-ballet-fight",
    "groom-preparation-room": "groom-preparation-room",
    "ceremony-villa": "ceremony-villa",
    "last-take-boss": "last-take-boss",
    "wedding-epilogue": "wedding-epilogue",
    "director-epilogue": "director-epilogue",
    "shutdown-epilogue": "shutdown-epilogue",
}


def sg(aim: str, mood: str, outcome: str, approaches: Iterable[str], cast: str = "") -> dict[str, Any]:
    return {
        "aim": aim,
        "mood": mood,
        "outcome": outcome,
        "approaches": list(approaches),
        "cast": cast,
    }


SCREEN_GUIDANCE = {
    "hotel-overload": sg(
        "Мгновенно продать катастрофу и заставить таймер ощущаться реальным.",
        "Начните громко и смешно, затем замедлитесь на пульте и красной нити.",
        "Игроки понимают, что нужно осмотреть номер; никаких имён жениха и невесты ещё нет.",
        ["Разбудить Головача и задать вопросы о ночи.", "Сразу схватить пульт или оборвать красную нить.", "Сначала обезопасить комнату и проверить товарищей."],
        "Головач — растерянный участник, а не всезнающий виновник; пульт — автоматика, не злодей.",
    ),
    "hotel-overload-search": sg(
        "Дать группе самой собрать четыре наблюдаемых следа и сформулировать первую гипотезу.",
        "Тихое расследование после первого удара; взгляд идёт от кресла к браслетам, пульту и записи.",
        "Все четыре находки в инвентаре; известны пятичасовая угроза, два голосовых поля и путь в галерею.",
        ["Искать по комнате без броска, если место названо разумно.", "Исследовать пульт, письмо, браслеты и запись в любом порядке.", "Проверить кулон и решить, оставлять ли связь активной.", "Предложить иной способ восстановить запись — свести к той же улике и цене времени."],
    ),
    "hotel-gallery": sg(
        "Показать настоящий выбор порядка исследования, но сохранить общий набор обязательных улик.",
        "Роскошный пустой холл; каждое направление обещает свой вид неприятностей.",
        "Партия свободно выбирает золотую дверь, архив или верхнюю галерею; ни один порядок не ломает маршрут.",
        ["Слушать за дверями, осматривать рельс и лестницу.", "Идти к незнакомцу, архиву или реквизиту в любом порядке.", "Пытаться открыть архив без ключа — показать замок и вернуть к поиску ключа."],
    ),
    "hotel-gallery-pussy": sg(
        "Сыграть социальную сцену с несколькими честными исходами: доверие, давление, кража или бой.",
        "Пышная самоуверенность; не имитировать акцент и не раскрывать имя до знакомства.",
        "Обязательный минимум — воспоминание о Егорике у служебной двери и ключ архива; поручение и Вуманайзер зависят от доверия.",
        ["Представиться и заслужить знакомство.", "Очаровать, надавить или украсть ключ после закрытой вежливой ветки.", "Предложить услугу, подарок или сделку — свести к доверию, не выдавая награду заранее."],
        "Pussy Sultan говорит в третьем лице, ритмично и церемониально; за пышностью всегда стоит конкретное условие.",
    ),
    "hotel-vip-guards": sg(
        "Дать последнюю секунду отступить или сменить тон перед инициативой.",
        "Строго, формально, без злорадства; опасность телеграфирована алебардами и позициями.",
        "Либо конфликт погашен решением мастера в рамках уже выбранного подхода, либо начинается бой с двумя отдельными стражами.",
        ["Сложить оружие и вернуться к разговору, если это не отменяет уже проваленный исход.", "Использовать окружение, балкон и мебель в бою.", "Попытаться обезоружить или удержать стража вместо смертельной атаки."],
    ),
    "hotel-vip-guards-defeated": sg(
        "Сразу вернуть расследование после боя и не наказывать группу потерей обязательной улики.",
        "Резкая тишина после звона алебард; самоуверенность Pussy Sultan впервые даёт трещину.",
        "Pussy Sultan рассказывает про Егорика и отдаёт ключ; поручение и Вуманайзер не появляются.",
        ["Допросить без новых бросков.", "Оказать помощь поверженным стражам.", "Спросить о паланкине — услышать, что подарка за эту аудиенцию не будет."],
    ),
    "vip-prop-room": sg(
        "Превратить поиск скипетра в физическую задачу с видимыми точками приложения силы.",
        "Дорогой реквизит после плохой вечеринки; сначала комизм, затем напряжение механизма.",
        "Скипетр извлечён проверкой или после встречи с носильщиками.",
        ["Сдвинуть паланкин силой.", "Разгрузить фиксатор инженерным способом.", "Осматривать раму, чехлы и рычаги; разумная подготовка может дать преимущество, но не отдельную третью дорожку."],
    ),
    "vip-prop-room-carriers": sg(
        "Сделать последствия двух провалов наглядными, но не запереть предмет.",
        "Заводная засада; реквизит выполняет смену буквально.",
        "После победы или fail-forward носильщики отключены, а скипетр остаётся отдельной находкой.",
        ["Бить носильщиков по одному.", "Сбить синхронизацию Ловкостью или Интеллектом.", "Опрокинуть чехлы, заклинить ключи, удержать паланкин."],
    ),
    "vip-prop-room-carriers-defeated": sg(
        "Дать спокойный момент поднять регалию и понять, что система заметит её перемещение.",
        "Короткая награда после шума; золото становится тревожным сигналом.",
        "Скипетр взят в общий инвентарь; спуск активирует кракена.",
        ["Осмотреть скипетр до подъёма.", "Попытаться спрятать или обернуть его — автоматика всё равно фиксирует перенос, но подготовка может помочь описанию."],
    ),
    "hotel-gallery-pussy-return": sg(
        "Закрыть поручение отдельным добровольным возвращением, а не автоматической выдачей награды.",
        "Торжественная благодарность с бытовой полезностью.",
        "При максимальном доверии Pussy Sultan принимает скипетр, даёт ключ и Вуманайзер; иначе этой сцены нет.",
        ["Передать регалию и спросить о ночи.", "Оставить скипетр себе — награда и доверительная помощь не выдаются."],
        "Pussy Sultan сначала восстанавливает достоинство, затем очень конкретно расплачивается.",
    ),
    "hotel-archive-alexis": sg(
        "Проверить ложную гипотезу документами и направить группу в бар, не назначая свадебные роли.",
        "Взвинченная точность; полезный факт приходит после короткого эстетического вердикта.",
        "Получены барный жетон и сведения об обычном гостевом тарифе; ключ гримёрки связан с линией Прохора.",
        ["Успокоить Алексиса и выслушать сортировку.", "Самостоятельно разобрать счета.", "Спросить о Прохоре, оплате и ключе гримёрки."],
        "Алексис отделяет факт от предположения и не терпит громких выводов без документов.",
    ),
    "hotel-gallery-kraken": sg(
        "Показать угрозу до удара и разрешить бой, аварийный механизм или персональный обход Линды.",
        "Ярмарочная декорация с честной красной линией; смешно до момента разгона.",
        "Кракен отключён, побеждён или аварийно откатан; маршрут в бар открыт при любом исходе.",
        ["Уйти с красной линии.", "Остановить рельс Силой или Интеллектом.", "Линда проходит через сервисный люк и гасит привод без проверки.", "Атаковать фанерное ядро обычным боем."],
        "Кракен не разговаривает как личность: только крупные предупреждающие надписи.",
    ),
    "hotel-gallery-kraken-linda-disabled": sg(
        "Вознаградить точный персональный обход без превращения его в скрытый бросок.",
        "Комическая техническая тишина внутри огромной декорации.",
        "Привод штатно выключен, боевого штрафа времени нет; путь открыт.",
        ["Осмотреть люк и привод.", "Вернуть Линду к группе и проверить сохранность документов."],
    ),
    "hotel-gallery-kraken-defeated": sg(
        "Зафиксировать физическую победу и быстро вернуть движение сюжета.",
        "Обломки, пыль и последняя бессмысленная табличка.",
        "Кракен больше не блокирует лестницу; ключевые предметы и документы сохранены.",
        ["Осмотреть обломки и рельс.", "Помочь раненым и перейти к бару."],
    ),
    "closed-bar": sg(
        "Открыть три независимые линии: свидетельство Стаса, сайд-квест Прохора и обязательную музыкальную петлю.",
        "Сюрреалистическое утро, которое каждый NPC считает нормальным по-своему.",
        "Стас даёт направление и согласие на будущий вызов; танцоры в итоге открывают путь через гримёрку.",
        ["Разговаривать с Прохором, Стасом и труппой в любом порядке.", "Осмотреть схему и музыкальный пульт.", "Игнорировать сайд-квест Прохора — основной путь остаётся."],
    ),
    "closed-bar-prokhor": sg(
        "Дать необязательную детективную комедию о том, кто оплачивает вечный отдых.",
        "Максимально спокойно, будто таймер относится к другому курорту.",
        "Линия может закончиться знанием плательщицы, графиком работы и звонком; она не блокирует танцоров.",
        ["Проверить чек и терминал.", "Спросить Прохора прямо.", "Отказаться заниматься оплатой и вернуться к основному пути."],
        "Прохор начинает с афоризма об отдыхе и заканчивает точным правилом системы.",
    ),
    "closed-bar-prokhor-payer-identified": sg(
        "Подтвердить плательщицу документом, не превращая это в моральный приговор.",
        "Бытовое откровение на фоне катастрофы.",
        "Плательщица установлена; открывается следующий вопрос о первой смене.",
        ["Спросить, что именно оплачено.", "Проверить аудит терминала и не делать выводов о частной жизни сверх документа."],
    ),
    "closed-bar-prokhor-work-schedule": sg(
        "Довести шутку до конкретного правила: отдых закончится, когда начнётся первая смена.",
        "Сухая административная логика.",
        "В расписании обнаружена первая смена в 06:00; можно позвонить Прохору.",
        ["Проверить расписание и время.", "Попытаться изменить запись — показать последствия, но не создавать новый обязательный исход."],
    ),
    "closed-bar-prokhor-phone-call": sg(
        "Закрыть сайд-квест коротким живым колбэком.",
        "Невозмутимый телефонный афоризм.",
        "Прохор получает ответ о работе; основной маршрут остаётся прежним.",
        ["Передать факты без давления.", "Пошутить о переработке и вернуться к танцорам."],
    ),
    "closed-bar-stas": sg(
        "Получить обязательное направление и добровольное разрешение на один будущий разговор.",
        "Усталый юмор, но без насмешки над весом или зависимостью.",
        "Известна закрытая область для пар; установленное согласие позволяет позже позвать Стаса.",
        ["Спросить, куда ушли Егорик и Настасья.", "Спросить, можно ли позвать Стаса позже.", "Давить на возвращение домой — он отделяет разрешение на разговор от согласия на всё."],
        "Стас отвечает коротким «ну да», затем объясняет, почему это ещё не решение.",
    ),
    "closed-bar-dancers": sg(
        "Разорвать музыкальную петлю наблюдением, а не атакой или броском.",
        "Безупречный профессиональный повтор становится всё более абсурдным.",
        "Правильный four-count завершает номер; труппа раскрывает путь в гримёрку.",
        ["Считать четыре удара каблука.", "Пробовать дорожки; неверная исчезает, но не наказывает группу.", "Силовые действия не решают петлю — покажите, как музыка возвращает номер к началу."],
        "До освобождения труппа говорит жестами и ритмом; после — кратко и профессионально.",
    ),
    "artists-dressing-room": sg(
        "Впервые назвать Крида, но только как артиста, и сохранить ложную версию о женихе.",
        "Сценический детектив с идеальным беспорядком и одной раздражённой живой фигурой за ширмой.",
        "Опознана знаменитость, найден путь к бунгало, Satyr освобождён мирно или через бой.",
        ["Сопоставить костюм, райдер и запись.", "Освободить Satyr через окошко или правильную позу.", "Атаковать или срывать маски — перейти к бою, не теряя улики."],
        "Satyr быстро меняет публичные маски, но важную информацию говорит собственным коротким голосом.",
    ),
    "dressing-room-double-fight": sg(
        "Освободить Satyr и зоны расследования через честно читаемую зеркальную механику.",
        "Комедия отражений, которая становится боем только после силового решения.",
        "Дублёры отключены; при победе доступна репетиционная команда, при поражении обязательный маршрут всё равно открыт.",
        ["Сбивать ракурс Ловкостью или Харизмой.", "Каждому герою один раз описать способ зайти за неотражающуюся спину.", "Использовать обычные боевые способности и предметы."],
    ),
    "stage-module-shutdown": sg(
        "Предложить необязательную цену времени за сильную подготовку второй фазы финала.",
        "Техническая ниша, ясная инструкция, растущий таймер.",
        "При успехе получен ключ и сценический модуль выключен; при отказе путь в бунгало всё равно открыт.",
        ["Интеллектом выстроить порядок кабелей.", "Силой удержать рычаг.", "Заменить одну линию магическим шёпотом Линды или палочкой Торина.", "Отказаться от подготовки и спешить дальше."],
    ),
    "guest-bungalows": sg(
        "Дать два равноправных добровольных пути через семейный конфликт.",
        "Спокойно и неловко; не торопить и не объявлять морально правильный вариант.",
        "Либо Полина выбирает самостоятельный вечер с Вуманайзером, либо Стас добровольно приходит на парную сессию.",
        ["Расспросить Полину и Олву о последствиях.", "Предложить Вуманайзер, если он действительно есть.", "Позвать Стаса по ранее данному согласию.", "Давление, чары и взлом купола не заменяют согласие."],
        "Олва отделяет факт от предположения; Полина говорит ласково и договорно; Стас приходит только сам.",
    ),
    "show-18-pavilion": sg(
        "Остановить алгоритм спором, телесуфлёром, боем или аварийным выходом без свадебных спойлеров.",
        "Быстрая, шумная сатира на несовместимые универсальные советы.",
        "Полный успех даёт Красную кнопку 18+; аварийный исход сохраняет переход к Егорику без награды.",
        ["Найти противоречие: три успеха DC 12.", "Переписать телесуфлёр: два успеха DC 12.", "Разбить рампы в бою.", "После двух провалов аварийно завершить эфир."],
        "Три маски перебивают друг друга; Олва гасит камеры, но не зарабатывает успехи за игроков.",
    ),
    "couples-session-stas": sg(
        "Отделить желание свободы от привычки уклоняться от любого решения.",
        "Тихо, с длинными паузами; юмор в идеальном баре без выхода.",
        "Стас признаёт, что хочет права выбрать самому; уважительное слушание всегда приводит к этому результату.",
        ["Спросить, что он выбрал бы без страха реакции.", "Пересказать его желание.", "Показать, что вечный бар тоже решает за него.", "Просто дать договорить; проверка необязательна."],
        "Олва задаёт один вопрос; Стас говорит медленно и защищает право ответить самому.",
    ),
    "couples-session-polina": sg(
        "Отделить реальное желание семьи от попытки гарантировать его контролем.",
        "Начать холодно идеально, затем сделать сцену человеческой и тише.",
        "Полина называет семью, ребёнка и страх неопределённости; честный вопрос не может провалиться навсегда.",
        ["Отделить цель от метода.", "Показать на исчезающего Стаса в портрете.", "Спросить, какое условие Полина готова изменить сама.", "Не превращать приложение в доказанное преступление."],
        "Полина становится вежливее, когда боится; Олва возвращает договорный язык к одному человеческому существительному.",
    ),
    "couples-session-choice": sg(
        "Дать группе поддержать одну потребность, не отнимая финальное слово у супругов.",
        "После вступления выдержать настоящую паузу и разрешить спор игроков.",
        "Стас произносит честное «нет» либо честное «да» на новых условиях; оба исхода дают подтверждение ясного выбора.",
        ["Обсудить не «кто прав», а какую потребность поддержать.", "Предложить формулировку и задать дополнительные вопросы.", "Социальной проверкой смягчить тон, но не выбрать исход.", "Не позволять чарами или угрозой заменить согласие."],
        "Олва держит границы; Стас и Полина сами произносят финальные ответы.",
    ),
    "egorik-bungalow-reveal": sg(
        "В два ясных удара разрушить ложную версию и назвать Крида настоящим женихом.",
        "Сначала комическое недоумение, затем облегчение и срочность.",
        "Голос Егорика отвергнут, запись Настасьи обязательна, путь под сцену найден; помощь паре определяет союз в финале.",
        ["Проверить голос — автоматическое несовпадение.", "Расспросить о конверте и маске.", "Посмотреть запись; при сбое Настасья пересказывает тот же кадр.", "Извиниться и помочь либо немедленно спешить."],
        "Егорик тих и буквателен; Настасья быстро раскладывает спасение на раунды и защищает приватность записи.",
    ),
    "groom-tunnel": sg(
        "Пройти конфиденциальный протокол тремя разными линиями либо честно перейти к бою.",
        "Торжественная хореография постепенно становится физической угрозой.",
        "Три линии отключают кордебалет; два провала оставляют силовой путь, но не лишают жениха.",
        ["Повторить позу: Ловкость или Харизма DC 12.", "Дёрнуть противовес: Сила или Интеллект DC 12.", "Линда проходит вентиляцией автоматически.", "Потратить репетиционную команду Satyr автоматически."],
        "Система допуска говорит по одной чрезмерно торжественной инструкции на позу.",
    ),
    "corp-de-ballet-fight": sg(
        "Отключить две кулисы, сохранив возможность использовать позу и противовес уже в инициативе.",
        "Физическая комедия механического балета с ясно подсвеченным безопасным центром.",
        "Победа или fail-forward аварийно открывает дверь и ведёт к Криду.",
        ["Повторить позу и заморозить механизм.", "Использовать красный противовес.", "Держаться безопасного центра и разделять цели.", "Обычные атаки по двум отдельным противникам."],
    ),
    "groom-preparation-room": sg(
        "Сразу подтвердить Крида как жениха, назвать Игоря и получить первый голосовой ключ.",
        "Сценическая уверенность быстро сменяется личной срочностью.",
        "Голосовой ключ выдаётся при любом исходе; группа выбирает журнал или немедленный путь к вилле.",
        ["Освободить микрофон Интеллектом DC 12.", "Стабилизировать дверь Силой DC 12.", "Спросить о Satyr, маске, Игоре и секретной церемонии без проверки.", "Обвинить Крида — он всё равно помогает, но требует объяснений позже."],
        "Крид отвечает коротко и прямо; при разговоре об Игоре публичная сценическая манера исчезает.",
    ),
    "restore-control-log": sg(
        "Обменять время на доступ к режиссёрскому плану и точной последовательности контуров.",
        "Сжатый монтаж обрывков ночи на фоне таймера.",
        "Два успеха дают чистый журнал; первый провал всё равно восстанавливает сведения, но добавляет время.",
        ["Совместить временные метки Интеллектом DC 12.", "Отделить важные кадры Мудростью DC 12.", "Отказаться от лишнего просмотра невозможно после начала испытания, но fail-forward быстро завершает его."],
    ),
    "ceremony-villa": sg(
        "Получить второй голосовой ключ и дать настоящий выбор о правах на закрытую запись.",
        "Тишина после шума; сухой юмор только про красивое, но бессмысленное шоу.",
        "Запись возвращена, временно разрешена или использована без согласия; голосовой ключ выдаётся во всех трёх случаях.",
        ["Дать паре встретиться и честно объяснить техническую необходимость.", "Вернуть запись без копии.", "Согласовать временное использование с границами.", "Использовать без согласия — возможно, но это закрывает доверительный свадебный исход."],
        "Игорь говорит ровно и коротко; Крид поддерживает его и не отвечает вместо него.",
    ),
    "final-choice": sg(
        "Выбрать стартовую тактику без иллюзии, что она отменяет бой или навсегда связывает группу.",
        "Очень короткая оперативная пауза перед инициативой.",
        "Выбран штатный, режиссёрский или физический старт; менять способ между фазами разрешено.",
        ["Сверить доступность планов по уже принятым решениям.", "Распределить первые роли.", "Выбрать физический план, если социальные или технические условия не собраны."],
    ),
    "last-take-boss": sg(
        "Закрыть грозовой, сценический и огненный контуры, каждый раз позволяя сменить способ решения.",
        "Большое шоу; система торжественна, но не злорадствует, а каждую опасность показывает заранее.",
        "Способ закрытия последнего сегмента выбирает эпилог; полное поражение ведёт к физическому аварийному исходу без смерти.",
        ["Атаковать текущий сегмент обычными атаками.", "Разрывать объявленный канал проверкой DC 12.", "Запускать голосовой сброс при доверии пары.", "Переписывать контур через журнал.", "Защищать NPC и тех, кто держит пульт; переключать план между фазами."],
        "Модуль говорит ровным обратным отсчётом; Крид и Игорь подтверждают только собственные голоса.",
    ),
    "wedding-epilogue": sg(
        "Показать, что добровольный сброс вернул церемонию самой паре.",
        "Тёплое облегчение, один короткий комический колбэк на каждого важного союзника.",
        "Свадьба проходит безопасно; судьба записи и семейного крыла отражает ранее принятые решения.",
        ["Дать героям по одному финальному жесту или тосту.", "Показать ветку семьи, судьбу записи, труппу, Pussy Sultan, Кострюльку и счёт без нового испытания."],
    ),
    "director-epilogue": sg(
        "Закрыть ответственность Головача и границы использования спасённого материала.",
        "Красивый, но теперь контролируемый финальный кадр.",
        "Пара решает судьбу свадьбы и записи; Головач получает символический «Оскар» без права на чужую приватность.",
        ["Дать Головачу признать ответственность.", "Отразить разрешение или запрет на запись.", "Показать короткие реакции Satyr, Алексиса, Прохора и Крайнеплота."],
    ),
    "shutdown-epilogue": sg(
        "Дать честную победу высокой ценой без смерти героев и исчезновения канонических предметов.",
        "Сначала абсолютная тишина, затем абсурд бесконечного счёта.",
        "Остров спасён, свадьба перенесена, сцена разрушена; отношения зависят от решения о записи.",
        ["Показать спасённых NPC и масштаб ремонта.", "Дать каждому герою короткий кадр после аварии.", "Закрыть историю доставкой награды и счёта Крайнеплоту."],
    ),
}


def rgb(hex_color: str) -> RGBColor:
    return RGBColor.from_string(hex_color)


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def set_run_font(run, *, name: str = "Calibri", size: float | None = None, color: str | None = None,
                 bold: bool | None = None, italic: bool | None = None) -> None:
    run.font.name = name
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.rFonts
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.append(rfonts)
    for attr in ("ascii", "hAnsi", "eastAsia"):
        rfonts.set(qn(f"w:{attr}"), name)
    if size is not None:
        run.font.size = Pt(size)
    if color is not None:
        run.font.color.rgb = rgb(color)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic


def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_paragraph_box(paragraph, *, fill: str, border: str, left: int = 240, right: int = 180) -> None:
    ppr = paragraph._p.get_or_add_pPr()
    shd = ppr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        ppr.append(shd)
    shd.set(qn("w:fill"), fill)
    pbdr = ppr.find(qn("w:pBdr"))
    if pbdr is None:
        pbdr = OxmlElement("w:pBdr")
        ppr.append(pbdr)
    left_el = pbdr.find(qn("w:left"))
    if left_el is None:
        left_el = OxmlElement("w:left")
        pbdr.append(left_el)
    left_el.set(qn("w:val"), "single")
    left_el.set(qn("w:sz"), "18")
    left_el.set(qn("w:space"), "8")
    left_el.set(qn("w:color"), border)
    paragraph.paragraph_format.left_indent = Pt(left / 20)
    paragraph.paragraph_format.right_indent = Pt(right / 20)


def set_paragraph_bottom_border(paragraph, *, color: str, size: int = 8, space: int = 4) -> None:
    """Add a restrained full-width rule without using a layout table."""
    ppr = paragraph._p.get_or_add_pPr()
    pbdr = ppr.find(qn("w:pBdr"))
    if pbdr is None:
        pbdr = OxmlElement("w:pBdr")
        ppr.append(pbdr)
    bottom = pbdr.find(qn("w:bottom"))
    if bottom is None:
        bottom = OxmlElement("w:bottom")
        pbdr.append(bottom)
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), str(size))
    bottom.set(qn("w:space"), str(space))
    bottom.set(qn("w:color"), color)


def set_style_bottom_border(style, *, color: str, size: int = 8, space: int = 4) -> None:
    ppr = style._element.get_or_add_pPr()
    pbdr = ppr.find(qn("w:pBdr"))
    if pbdr is None:
        pbdr = OxmlElement("w:pBdr")
        ppr.append(pbdr)
    bottom = pbdr.find(qn("w:bottom"))
    if bottom is None:
        bottom = OxmlElement("w:bottom")
        pbdr.append(bottom)
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), str(size))
    bottom.set(qn("w:space"), str(space))
    bottom.set(qn("w:color"), color)


def add_page_field(paragraph) -> None:
    paragraph.add_run("стр. ")
    run = paragraph.add_run()
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    run._r.append(fld_begin)
    run._r.append(instr)
    run._r.append(fld_end)


def add_bookmark(paragraph, name: str, bookmark_id: int) -> None:
    start = OxmlElement("w:bookmarkStart")
    start.set(qn("w:id"), str(bookmark_id))
    start.set(qn("w:name"), name)
    end = OxmlElement("w:bookmarkEnd")
    end.set(qn("w:id"), str(bookmark_id))
    paragraph._p.insert(0, start)
    paragraph._p.append(end)


def add_internal_link(paragraph, text: str, anchor: str) -> None:
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("w:anchor"), anchor)
    run = OxmlElement("w:r")
    rpr = OxmlElement("w:rPr")
    color = OxmlElement("w:color")
    color.set(qn("w:val"), COLORS["link"])
    underline = OxmlElement("w:u")
    underline.set(qn("w:val"), "single")
    rpr.append(color)
    rpr.append(underline)
    text_el = OxmlElement("w:t")
    text_el.text = text
    run.append(rpr)
    run.append(text_el)
    hyperlink.append(run)
    paragraph._p.append(hyperlink)


def add_numbering_definition(doc: Document, *, kind: str) -> int:
    numbering = doc.part.numbering_part.element
    abstract_ids = [int(el.get(qn("w:abstractNumId"))) for el in numbering.findall(qn("w:abstractNum"))]
    num_ids = [int(el.get(qn("w:numId"))) for el in numbering.findall(qn("w:num"))]
    abstract_id = max(abstract_ids or [0]) + 1
    num_id = max(num_ids or [0]) + 1

    abstract = OxmlElement("w:abstractNum")
    abstract.set(qn("w:abstractNumId"), str(abstract_id))
    multi = OxmlElement("w:multiLevelType")
    multi.set(qn("w:val"), "singleLevel")
    abstract.append(multi)
    lvl = OxmlElement("w:lvl")
    lvl.set(qn("w:ilvl"), "0")
    start = OxmlElement("w:start")
    start.set(qn("w:val"), "1")
    lvl.append(start)
    num_fmt = OxmlElement("w:numFmt")
    num_fmt.set(qn("w:val"), "bullet" if kind == "bullet" else "decimal")
    lvl.append(num_fmt)
    lvl_text = OxmlElement("w:lvlText")
    lvl_text.set(qn("w:val"), "•" if kind == "bullet" else "%1.")
    lvl.append(lvl_text)
    jc = OxmlElement("w:lvlJc")
    jc.set(qn("w:val"), "left")
    lvl.append(jc)
    ppr = OxmlElement("w:pPr")
    tabs = OxmlElement("w:tabs")
    tab = OxmlElement("w:tab")
    tab.set(qn("w:val"), "num")
    tab.set(qn("w:pos"), "540")
    tabs.append(tab)
    ppr.append(tabs)
    ind = OxmlElement("w:ind")
    ind.set(qn("w:left"), "540")
    ind.set(qn("w:hanging"), "270")
    ppr.append(ind)
    spacing = OxmlElement("w:spacing")
    spacing.set(qn("w:after"), "80")
    spacing.set(qn("w:line"), "300")
    spacing.set(qn("w:lineRule"), "auto")
    ppr.append(spacing)
    lvl.append(ppr)
    abstract.append(lvl)
    numbering.append(abstract)

    num = OxmlElement("w:num")
    num.set(qn("w:numId"), str(num_id))
    abs_ref = OxmlElement("w:abstractNumId")
    abs_ref.set(qn("w:val"), str(abstract_id))
    num.append(abs_ref)
    numbering.append(num)
    return num_id


def apply_numbering(paragraph, num_id: int) -> None:
    ppr = paragraph._p.get_or_add_pPr()
    numpr = ppr.find(qn("w:numPr"))
    if numpr is None:
        numpr = OxmlElement("w:numPr")
        ppr.append(numpr)
    ilvl = OxmlElement("w:ilvl")
    ilvl.set(qn("w:val"), "0")
    numid = OxmlElement("w:numId")
    numid.set(qn("w:val"), str(num_id))
    numpr.append(ilvl)
    numpr.append(numid)


def configure_styles(doc: Document) -> None:
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)
    section.header_distance = Inches(0.492)
    section.footer_distance = Inches(0.492)
    section.different_first_page_header_footer = True

    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal._element.rPr.rFonts.set(qn("w:ascii"), "Calibri")
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Calibri")
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    normal.font.size = Pt(11)
    normal.font.color.rgb = rgb(COLORS["ink"])
    normal.paragraph_format.space_before = Pt(0)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.25

    heading_specs = {
        "Heading 1": (16, COLORS["burgundy"], 18, 10),
        "Heading 2": (13, COLORS["gold"], 14, 7),
        "Heading 3": (12, COLORS["teal"], 10, 5),
    }
    for style_name, (size, color, before, after) in heading_specs.items():
        style = doc.styles[style_name]
        style.font.name = "Calibri"
        style._element.rPr.rFonts.set(qn("w:ascii"), "Calibri")
        style._element.rPr.rFonts.set(qn("w:hAnsi"), "Calibri")
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = rgb(color)
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.line_spacing = 1.0
        style.paragraph_format.keep_with_next = True
        style.paragraph_format.keep_together = True

    custom_styles = {
        "Scene Meta": (9, COLORS["muted"], False, False, 0, 6, 1.0),
        "GM Subheading": (10.5, COLORS["teal"], True, False, 10, 4, 1.0),
        "Dialogue Heading": (10.5, COLORS["burgundy"], True, False, 8, 2, 1.0),
        "Dialogue Quote": (10.5, COLORS["ink"], False, True, 0, 3, 1.15),
        "Dialogue Meta": (9, COLORS["muted"], False, False, 0, 5, 1.05),
        "Item Heading": (10.5, COLORS["gold"], True, False, 8, 3, 1.0),
        "TOC 1 Custom": (11, COLORS["burgundy"], True, False, 0, 3, 1.0),
        "TOC 2 Custom": (10, COLORS["ink"], False, False, 0, 2, 1.0),
        "Voice Heading": (10.5, COLORS["burgundy"], True, False, 7, 2, 1.0),
    }
    for name, (size, color, bold, italic, before, after, spacing) in custom_styles.items():
        if name not in doc.styles:
            style = doc.styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH)
        else:
            style = doc.styles[name]
        style.font.name = "Calibri"
        style._element.rPr.rFonts.set(qn("w:ascii"), "Calibri")
        style._element.rPr.rFonts.set(qn("w:hAnsi"), "Calibri")
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
        style.font.size = Pt(size)
        style.font.color.rgb = rgb(color)
        style.font.bold = bold
        style.font.italic = italic
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.line_spacing = spacing

    doc.styles["Dialogue Heading"].paragraph_format.keep_with_next = True
    doc.styles["Item Heading"].paragraph_format.keep_with_next = True
    doc.styles["Voice Heading"].paragraph_format.keep_with_next = True
    doc.styles["TOC 2 Custom"].paragraph_format.left_indent = Inches(0.22)


def configure_header_footer(doc: Document) -> None:
    section = doc.sections[0]
    header = section.header
    p = header.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run("МАЛЬЧИШНИК КОНЦА СВЕТА  ·  КНИГА МАСТЕРА")
    set_run_font(run, size=8.5, color=COLORS["muted"], bold=True)

    footer = section.footer
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    fp.paragraph_format.space_before = Pt(0)
    fp.paragraph_format.space_after = Pt(0)
    add_page_field(fp)
    for run in fp.runs:
        set_run_font(run, size=8.5, color=COLORS["muted"])

    first_footer = section.first_page_footer
    ffp = first_footer.paragraphs[0]
    ffp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = ffp.add_run("Только для мастера · игрокам не показывать")
    set_run_font(run, size=8.5, color=COLORS["muted"], italic=True)


def add_inline_runs(paragraph, text: str, *, base_color: str = COLORS["ink"], base_size: float = 11,
                    italic: bool = False) -> None:
    text = text.replace("\u00a0", " ")
    pieces = re.split(r"(\*\*.+?\*\*|`.+?`)", text)
    for piece in pieces:
        if not piece:
            continue
        if piece.startswith("**") and piece.endswith("**"):
            run = paragraph.add_run(piece[2:-2])
            set_run_font(run, size=base_size, color=base_color, bold=True, italic=italic)
        elif piece.startswith("`") and piece.endswith("`"):
            run = paragraph.add_run(piece[1:-1])
            set_run_font(run, name="Consolas", size=max(8.5, base_size - 1), color=COLORS["teal"], italic=italic)
        else:
            run = paragraph.add_run(piece)
            set_run_font(run, size=base_size, color=base_color, italic=italic)


def add_labeled_line(doc: Document, label: str, text: str, *, color: str = COLORS["ink"], after: float = 4) -> Any:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = 1.15
    r = p.add_run(label + " ")
    set_run_font(r, size=10.5, color=color, bold=True)
    add_inline_runs(p, text, base_size=10.5)
    return p


def add_box(doc: Document, label: str, text: str, *, fill: str, border: str, italic: bool = False,
            label_color: str | None = None) -> None:
    # One cohesive paragraph prevents the label and body from looking like two
    # accidentally stacked strips. The extra outer spacing keeps callouts clear
    # of headings and tables while retaining a compact GM-reference rhythm.
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.line_spacing = 1.18
    p.paragraph_format.keep_together = True
    set_paragraph_box(p, fill=fill, border=border, left=220, right=180)
    r = p.add_run(label.upper())
    set_run_font(r, size=8.6, color=label_color or border, bold=True)
    r.add_break()
    add_inline_runs(p, text.strip(), base_size=10.4, italic=italic)


def add_bullet(doc: Document, text: str, num_id: int, *, color: str = COLORS["ink"]) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.25
    apply_numbering(p, num_id)
    add_inline_runs(p, text, base_color=color)


def add_numbered(doc: Document, text: str, num_id: int) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.25
    apply_numbering(p, num_id)
    add_inline_runs(p, text)


def parse_script(path: Path) -> OrderedDict[str, dict[str, Any]]:
    scenes: OrderedDict[str, dict[str, Any]] = OrderedDict()
    current: dict[str, Any] | None = None
    current_sub: str | None = None
    for raw in path.read_text(encoding="utf-8").splitlines():
        scene_match = re.match(r"^### `([^`]+)` — (.+)$", raw)
        if scene_match:
            scene_id, title = scene_match.groups()
            current = {"id": scene_id, "title": title, "preamble": [], "subsections": OrderedDict()}
            scenes[scene_id] = current
            current_sub = None
            continue
        if current is None:
            continue
        if raw.startswith("## ") or (raw.startswith("### ") and not raw.startswith("### `")):
            current = None
            current_sub = None
            continue
        sub_match = re.match(r"^#### (.+)$", raw)
        if sub_match:
            current_sub = sub_match.group(1)
            current["subsections"][current_sub] = []
            continue
        if current_sub is None:
            current["preamble"].append(raw)
        else:
            current["subsections"][current_sub].append(raw)
    return scenes


def clean_md_line(line: str) -> str:
    line = line.strip()
    if line.startswith(">"):
        line = line[1:].strip()
    return line


def add_markdown_lines(doc: Document, lines: list[str], bullet_num: int, decimal_num: int,
                       *, secret: bool = False) -> None:
    read_phase = False
    for raw in lines:
        line = raw.rstrip()
        if not line.strip():
            continue
        if "Публичные материалы:" in line:
            continue
        if line.startswith("##### readAloud"):
            read_phase = True
            continue
        if line.startswith("##### "):
            read_phase = False
            p = doc.add_paragraph(style="GM Subheading")
            add_inline_runs(p, line[6:].strip(), base_color=COLORS["teal"], base_size=10.5)
            continue
        if read_phase and line.startswith(">"):
            add_box(doc, "Прочитать при смене фазы", clean_md_line(line), fill=COLORS["parchment"], border=COLORS["gold"], italic=True)
            continue
        if line.startswith("- "):
            add_bullet(doc, line[2:].strip(), bullet_num)
            continue
        number = re.match(r"^\d+\.\s+(.+)$", line)
        if number:
            add_numbered(doc, number.group(1), decimal_num)
            continue
        if line.startswith(">"):
            add_box(doc, "Реплика / текст", clean_md_line(line), fill=COLORS["parchment"], border=COLORS["gold"], italic=True)
            continue
        p = doc.add_paragraph()
        if secret:
            set_paragraph_box(p, fill=COLORS["rose"], border=COLORS["burgundy"])
        add_inline_runs(p, clean_md_line(line))


def add_script_frame(doc: Document, script_scene: dict[str, Any], bullet_num: int, decimal_num: int,
                     *, include_read_aloud: bool = False) -> None:
    doc.add_paragraph("Паспорт и канонические рамки", style="GM Subheading")
    add_markdown_lines(doc, script_scene["preamble"], bullet_num, decimal_num)
    for title, lines in script_scene["subsections"].items():
        low = title.lower()
        if "readaloud" in low and not include_read_aloud:
            continue
        p = doc.add_paragraph(style="GM Subheading")
        add_inline_runs(p, title, base_color=COLORS["teal"], base_size=10.5)
        is_secret = any(key in low for key in ("скрытая", "задача мастера"))
        add_markdown_lines(doc, lines, bullet_num, decimal_num, secret=is_secret)


def add_cover(doc: Document) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(98)
    p.paragraph_format.space_after = Pt(18)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("ХРОНИКИ ВОСЬМИ ЗЕМЕЛЬ")
    set_run_font(r, size=10, color=COLORS["gold"], bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(7)
    r = p.add_run("Мальчишник\nконца света")
    set_run_font(r, size=30, color=COLORS["burgundy_dark"], bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(26)
    r = p.add_run("Книга мастера · цельный сценарий по 40 экранам")
    set_run_font(r, size=14, color=COLORS["teal"], italic=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(18)
    set_paragraph_box(p, fill=COLORS["burgundy"], border=COLORS["burgundy_dark"], left=520, right=520)
    r = p.add_run("ТОЛЬКО ДЛЯ МАСТЕРА")
    set_run_font(r, size=11, color=COLORS["white"], bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(58)
    p.paragraph_format.space_after = Pt(3)
    r = p.add_run("4 акта  ·  5 героев  ·  3 финала")
    set_run_font(r, size=10.5, color=COLORS["muted"], bold=True)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Версия для авторской вычитки · август 2026")
    set_run_font(r, size=9.5, color=COLORS["muted"], italic=True)


def add_chapter_heading(doc: Document, text: str, headings: list[tuple[int, str, str]],
                        bookmark_counter: list[int], *, page_break: bool = True) -> Any:
    p = doc.add_heading(text, level=1)
    if page_break:
        p.paragraph_format.page_break_before = True
    anchor = f"h{bookmark_counter[0]:03d}"
    add_bookmark(p, anchor, bookmark_counter[0])
    bookmark_counter[0] += 1
    headings.append((1, text, anchor))
    return p


def add_screen_heading(doc: Document, text: str, headings: list[tuple[int, str, str]],
                       bookmark_counter: list[int], *, page_break: bool = True) -> Any:
    p = doc.add_heading(text, level=2)
    if page_break:
        p.paragraph_format.page_break_before = True
    anchor = f"h{bookmark_counter[0]:03d}"
    add_bookmark(p, anchor, bookmark_counter[0])
    bookmark_counter[0] += 1
    headings.append((2, text, anchor))
    return p


def add_front_matter(doc: Document, rules: dict[str, Any], characters: list[dict[str, Any]],
                     voices: list[dict[str, Any]], bullet_num: int, headings: list[tuple[int, str, str]],
                     bookmark_counter: list[int]) -> None:
    add_chapter_heading(doc, "Как вести кампанию", headings, bookmark_counter)
    add_box(
        doc,
        "Главный принцип",
        "Игроки выбирают способ. Этот документ фиксирует драматический результат сцены, границы канона и цену провала — но не требует нажать «правильную кнопку» или произнести заранее написанную реплику.",
        fill=COLORS["mist"],
        border=COLORS["teal"],
    )
    doc.add_paragraph("Рабочий цикл мастера", style="GM Subheading")
    for item in (
        "Опишите состояние мира и остановитесь: спросите «Что вы делаете?», а не перечисляйте варианты.",
        "Уточните намерение и метод. Характеристику выбирайте по методу игрока, а не по желаемому результату.",
        "Не требуйте бросок для очевидного, безопасного и свободно повторяемого действия.",
        "Если идея правдоподобна, сопоставьте её с ближайшей канонической дорожкой. Новый способ допустим; новый обязательный исход — нет.",
        "После результата верните инициативу группе. NPC не принимает решение за игроков, а реплика не закрывает разговор автоматически.",
    ):
        add_bullet(doc, item, bullet_num)

    doc.add_paragraph("Домашняя d20-система", style="GM Subheading")
    add_labeled_line(doc, "Проверка:", rules["core"]["check"] + ".")
    add_labeled_line(doc, "Сложность:", "DC 8 — легко; DC 12 — обычно; DC 15 — сложно; DC 18 — героически.")
    add_labeled_line(doc, "Преимущество:", rules["core"]["advantage"] + ".")
    add_labeled_line(doc, "Бой:", rules["core"]["turnActions"] + ". " + rules["core"]["downed"])
    add_labeled_line(doc, "Передышка:", rules["core"]["rest"])

    doc.add_paragraph("Fail-forward: провал меняет цену, а не стирает путь", style="GM Subheading")
    for item in (
        "Обязательную улику всё равно выдать — с помехами, задержкой, уроном или ухудшением отношений.",
        "После полного поражения вернуть героев с 1 HP и применить прямо описанный аварийный исход; смерти без решения мастера нет.",
        "Опасную атаку сначала показать: линия, прожектор, кабель, поза или предупреждение должны появиться до урона.",
        "Социальная проверка может прояснить или смягчить формулировку, но не заменяет согласие, отказ или право на приватность.",
    ):
        add_bullet(doc, item, bullet_num)

    add_box(
        doc,
        "Если игроки обходят подготовленную сцену",
        "Сначала признайте удачную идею и дайте ей ощутимый эффект. Затем спросите, какой канонический результат она реально обеспечивает: улику, открытый проход, снятый модуль, доверие или урон текущему контуру. Если идея пропускает целый узел, перенесите обязательную улику в новый способ получения и назначьте честную цену. Финальный «Последний дубль» остаётся обязательным.",
        fill=COLORS["amber"],
        border=COLORS["gold"],
    )

    add_chapter_heading(doc, "Карта раскрытий и темпа", headings, bookmark_counter)
    for act in ACTS:
        p = doc.add_paragraph(style="Voice Heading")
        add_inline_runs(p, act["title"], base_color=COLORS["burgundy"], base_size=11)
        add_labeled_line(doc, "Темп:", act["duration"] + ". " + act["mood"])
        add_labeled_line(doc, "Задача:", act["purpose"])
        add_labeled_line(doc, "К концу:", act["finish"])

    doc.add_paragraph("Лестница спойлеров", style="GM Subheading")
    for item in (
        "До гримёрки не называть Крида.",
        "В гримёрке Крид раскрывается только как артист; Егорик остаётся рабочей гипотезой.",
        "До соседнего бунгало Егорик и Настасья не опровергают версию; после проверки голоса Крид раскрывается как жених.",
        "Имя Игоря и его свадебная роль впервые появляются в комнате подготовки жениха.",
        "В вилле новых личностей уже нет: конфликт строится вокруг доверия и прав на запись.",
    ):
        add_bullet(doc, item, bullet_num)

    doc.add_paragraph("Как вовлекать пятерых героев", style="GM Subheading")
    hero_prompts = {
        "bubsilda": "Предлагайте замечать цикл, момент повтора и факты среди красивой подачи. Не назначайте её лидером автоматически — пусть лидерство будет выбором игрока.",
        "linda": "Показывайте маленькие люки, магические объекты и труднодоступные каналы. Её размер и шёпот открывают способы, но не отменяют согласие NPC.",
        "lambert": "Давайте схемы, рельсы, фиксаторы и журналы. Хорошее техническое объяснение определяет характеристику и может дать преимущество.",
        "golovach-lena": "Кулон, свет, камеры и огненный контур дают личную связь с аварией. Играть ответственность, не превращая героя в постоянную мишень для обвинений.",
        "thorin-pukoshchit": "Показывайте физические рычаги, простые нужные предметы и направления поиска. Его сила — в конкретной помощи, а не только в уроне.",
    }
    by_id = {c["id"]: c for c in characters}
    for hero_id, prompt in hero_prompts.items():
        hero = by_id[hero_id]
        p = doc.add_paragraph(style="Voice Heading")
        add_inline_runs(p, f"{hero['name']} · {hero['role']}", base_color=COLORS["burgundy"], base_size=10.5)
        add_inline_runs(doc.add_paragraph(), prompt, base_size=10.5)

    add_chapter_heading(doc, "Карточки голосов персонажей", headings, bookmark_counter)
    add_box(
        doc,
        "Как использовать",
        "Карточка задаёт ритм и границы, а не требует актёрского подражания. Для знаменитостей используйте вымышленный образ кампании: не копируйте реальный голос и не добавляйте утверждений о частной жизни.",
        fill=COLORS["stone"],
        border=COLORS["muted"],
    )
    for voice in voices:
        name = CHARACTER_NAMES.get(voice["characterId"], voice["characterId"])
        p = doc.add_paragraph(style="Voice Heading")
        add_inline_runs(p, name, base_color=COLORS["burgundy"], base_size=10.5)
        add_labeled_line(doc, "Голос:", voice["voice"], after=2)
        add_labeled_line(doc, "Темп:", voice["tempo"], after=2)
        if voice.get("vocabulary"):
            add_labeled_line(doc, "Опорные слова:", ", ".join(voice["vocabulary"]) + ".", after=2)
        add_labeled_line(doc, "Жест:", voice["gesture"], after=2)
        if voice.get("forbidden"):
            add_labeled_line(doc, "Не играть:", "; ".join(voice["forbidden"]) + ".", color=COLORS["burgundy"], after=6)


def add_dialogue_bank(doc: Document, scene_id: str, dialogue: dict[str, Any], bullet_num: int) -> None:
    presets = [preset for preset in dialogue["presets"] if scene_id in preset["sceneIds"]]
    if not presets:
        return
    voices_by_id = {voice["characterId"]: voice for voice in dialogue["voices"]}
    doc.add_paragraph("Подсказки по голосам и возможные ответы", style="GM Subheading")
    used_ids: list[str] = []
    for preset in presets:
        if preset["characterId"] not in used_ids:
            used_ids.append(preset["characterId"])
    for character_id in used_ids:
        voice = voices_by_id.get(character_id)
        if voice is None:
            continue
        name = CHARACTER_NAMES.get(character_id, character_id)
        add_box(
            doc,
            f"Голос · {name}",
            f"{voice['voice']} {voice['tempo']} Жест: {voice['gesture']}",
            fill=COLORS["stone"],
            border=COLORS["teal"],
        )
    for preset in presets:
        name = CHARACTER_NAMES.get(preset["characterId"], preset["characterId"])
        p = doc.add_paragraph(style="Dialogue Heading")
        add_inline_runs(p, f"{name} · {preset['label']}", base_color=COLORS["burgundy"], base_size=10.5)
        meta = doc.add_paragraph(style="Dialogue Meta")
        add_inline_runs(meta, f"Интонация: {preset['tone']}. Намерение: {preset['intent']}", base_color=COLORS["muted"], base_size=9)
        quote = doc.add_paragraph(style="Dialogue Quote")
        set_paragraph_box(quote, fill=COLORS["parchment"], border=COLORS["gold"])
        add_inline_runs(quote, f"«{preset['text']}»", base_size=10.5, italic=True)
        if preset.get("gmNote"):
            note = doc.add_paragraph(style="Dialogue Meta")
            r = note.add_run("Мастеру: ")
            set_run_font(r, size=9, color=COLORS["burgundy"], bold=True)
            add_inline_runs(note, preset["gmNote"], base_color=COLORS["muted"], base_size=9)


def add_inspectables(doc: Document, inspectables: list[dict[str, Any]]) -> None:
    if not inspectables:
        return
    doc.add_paragraph("Предметы и точки осмотра", style="GM Subheading")
    for item in sorted(inspectables, key=lambda obj: obj.get("order", 0)):
        p = doc.add_paragraph(style="Item Heading")
        add_inline_runs(p, item["label"], base_color=COLORS["gold"], base_size=10.5)
        add_labeled_line(doc, "Где:", item.get("locationHint", "Место определяется сценой."), after=2)
        add_labeled_line(doc, "Вид:", item.get("summary", ""), after=2)
        if item.get("revealText"):
            add_box(doc, "При внимательном осмотре", item["revealText"], fill=COLORS["parchment"], border=COLORS["gold"], italic=True)
        if item.get("useText"):
            add_box(doc, "К чему ведёт", item["useText"], fill=COLORS["mist"], border=COLORS["teal"])


def add_act_intro(doc: Document, act: dict[str, Any], headings: list[tuple[int, str, str]],
                  bookmark_counter: list[int]) -> None:
    add_chapter_heading(doc, act["title"], headings, bookmark_counter)
    add_labeled_line(doc, "Оценка времени:", act["duration"])
    add_labeled_line(doc, "Драматическая задача:", act["purpose"])
    add_labeled_line(doc, "Настроение:", act["mood"])
    add_box(doc, "К чему должен прийти акт", act["finish"], fill=COLORS["mist"], border=COLORS["teal"])


def add_prologue(doc: Document, scripts: dict[str, Any], dialogue: dict[str, Any], bullet_num: int,
                 decimal_num: int, headings: list[tuple[int, str, str]], bookmark_counter: list[int]) -> None:
    add_chapter_heading(doc, "Пролог. Пять браслетов без имён", headings, bookmark_counter)
    add_box(
        doc,
        "Формат",
        "Это постановочная вступительная сцена до первого игрового экрана. Прочитайте её коротко и без остановки на дорогу или вечеринку; игроки впервые получают управление уже в разгромленном люксе.",
        fill=COLORS["mist"],
        border=COLORS["teal"],
    )
    add_script_frame(doc, scripts["tavern-invitation"], bullet_num, decimal_num, include_read_aloud=True)
    add_dialogue_bank(doc, "tavern-invitation", dialogue, bullet_num)


def add_screen(doc: Document, index: int, scene: dict[str, Any], parent_id: str, scripts: dict[str, Any],
               dialogue: dict[str, Any], bullet_num: int, decimal_num: int,
               frame_seen: set[str], headings: list[tuple[int, str, str]], bookmark_counter: list[int],
               *, page_break: bool) -> None:
    title = f"Экран {index:02d}. {scene['title']}"
    add_screen_heading(doc, title, headings, bookmark_counter, page_break=page_break)
    meta = doc.add_paragraph(style="Scene Meta")
    add_inline_runs(meta, f"{scene['eyebrow']}  ·  экран: {scene['id']}  ·  узел: {parent_id}", base_color=COLORS["muted"], base_size=9)

    guide = SCREEN_GUIDANCE[scene["id"]]
    add_labeled_line(doc, "Задача экрана:", guide["aim"])
    add_labeled_line(doc, "Настроение и ритм:", guide["mood"])
    if guide.get("cast"):
        add_labeled_line(doc, "Персонажи:", guide["cast"])

    read_text = scene["readAloud"]
    if scene.get("roomLegend"):
        read_text += "\n\n" + scene["roomLegend"]
    add_box(doc, "Прочитать игрокам", read_text, fill=COLORS["parchment"], border=COLORS["gold"], italic=True)

    if scene["id"] == "hotel-archive-alexis":
        add_box(
            doc,
            "Редакторская несверенность канона",
            "В приоритетном публичном экранном тексте для Алексиса используются женские формы («неё», «сама», «поставила»), а паспорт персонажа и банк реплик используют «он/его» и мужские формы. Здесь экранный текст сохранён дословно, без молчаливой правки; перед игрой выберите единый вариант.",
            fill=COLORS["amber"],
            border=COLORS["gold"],
        )

    add_inspectables(doc, scene.get("inspectables", []))

    if parent_id not in frame_seen:
        frame_seen.add(parent_id)
        add_box(
            doc,
            "Скрытая рамка узла",
            "Следующие заметки описывают весь игровой узел и могут относиться к нескольким последовательным экранам. Игрокам их не показывать.",
            fill=COLORS["rose"],
            border=COLORS["burgundy"],
        )
        add_script_frame(doc, scripts[parent_id], bullet_num, decimal_num)

    doc.add_paragraph("Если игроки действуют свободно", style="GM Subheading")
    for approach in guide["approaches"]:
        add_bullet(doc, approach, bullet_num)
    add_box(doc, "Точка, к которой нужно прийти", guide["outcome"], fill=COLORS["mist"], border=COLORS["teal"])

    if DIALOGUE_ANCHOR.get(parent_id) == scene["id"]:
        add_dialogue_bank(doc, parent_id, dialogue, bullet_num)

    exit_info = scene.get("exit")
    if exit_info:
        requirements = exit_info.get("availableAfter", [])
        requirement_text = ""
        if requirements:
            requirement_text = " После раскрытия: " + ", ".join(requirements) + "."
        add_labeled_line(doc, "Переход на экране:", f"«{exit_info['label']}» → {exit_info['nextSceneId']}.{requirement_text}", color=COLORS["teal"])
    else:
        add_labeled_line(doc, "Переход:", "Определяется решением, проверкой или боем внутри игрового узла; не переводите экран раньше зафиксированного исхода.", color=COLORS["teal"])


def materialize_toc(doc: Document, placeholder, headings: list[tuple[int, str, str]]) -> None:
    for level, title, anchor in headings:
        p = doc.add_paragraph(style="TOC 1 Custom" if level == 1 else "TOC 2 Custom")
        add_internal_link(p, title, anchor)
        placeholder._p.addprevious(p._p)
    placeholder._element.getparent().remove(placeholder._element)


def preset_audit(doc: Document) -> None:
    section = doc.sections[0]
    assert round(section.page_width.inches, 2) == 8.5
    assert round(section.page_height.inches, 2) == 11.0
    for margin in (section.top_margin, section.right_margin, section.bottom_margin, section.left_margin):
        assert round(margin.inches, 2) == 1.0
    assert doc.styles["Normal"].font.name == "Calibri"
    assert round(doc.styles["Normal"].font.size.pt, 1) == 11.0
    assert round(doc.styles["Normal"].paragraph_format.space_after.pt, 1) == 6.0
    assert doc.styles["Heading 1"].font.size.pt == 16
    assert doc.styles["Heading 2"].font.size.pt == 13
    assert doc.styles["Heading 3"].font.size.pt == 12


def build_legacy(output_path: Path) -> None:
    session = load_json(SESSION_PATH)
    gameplay = load_json(GAMEPLAY_PATH)
    dialogue = load_json(DIALOGUE_PATH)
    final_boss = load_json(FINAL_BOSS_PATH)
    characters = load_json(CHARACTERS_PATH)
    rules = load_json(RULES_PATH)
    scripts = parse_script(SCRIPT_PATH)

    scenes = session["scenes"]
    assert len(scenes) == 40
    assert len({scene["id"] for scene in scenes}) == 40
    assert set(SCREEN_PARENT) == {scene["id"] for scene in scenes}
    assert set(SCREEN_GUIDANCE) == {scene["id"] for scene in scenes}
    assert set(SCREEN_PARENT.values()) <= set(scripts)
    assert len(dialogue["voices"]) == 19
    assert len(dialogue["presets"]) == 111
    assert len(gameplay["checks"]) == 18
    assert len(gameplay["storyScenes"]) == 16
    assert len(final_boss["phases"]) == 3
    party_ids = [item["characterId"] for item in session["party"]]
    assert party_ids == ["bubsilda", "linda", "lambert", "golovach-lena", "thorin-pukoshchit"]

    doc = Document()
    configure_styles(doc)
    configure_header_footer(doc)
    doc.core_properties.title = "Мальчишник конца света — книга мастера"
    doc.core_properties.subject = "Частный сценарий мастера по 40 игровым экранам"
    doc.core_properties.author = "Хроники Восьми Земель"
    doc.core_properties.keywords = "D&D, Пенисуэла, книга мастера, сценарий"
    doc.core_properties.comments = "Собрано из канонического content bundle кампании."

    bullet_num = add_numbering_definition(doc, kind="bullet")
    decimal_num = add_numbering_definition(doc, kind="decimal")
    headings: list[tuple[int, str, str]] = []
    bookmark_counter = [1]

    add_cover(doc)
    doc.add_page_break()
    toc_heading = doc.add_heading("Содержание", level=1)
    add_bookmark(toc_heading, "toc", bookmark_counter[0])
    bookmark_counter[0] += 1
    toc_note = doc.add_paragraph(style="Scene Meta")
    add_inline_runs(toc_note, "Оглавление кликабельно в Word. Для печатной навигации используйте номер экрана в каждом заголовке.", base_color=COLORS["muted"], base_size=9)
    toc_placeholder = doc.add_paragraph("[[TOC]]")

    party_characters = [character for character in characters if character["id"] in party_ids]
    add_front_matter(doc, rules, party_characters, dialogue["voices"], bullet_num, headings, bookmark_counter)
    add_prologue(doc, scripts, dialogue, bullet_num, decimal_num, headings, bookmark_counter)

    frame_seen: set[str] = set()
    for act in ACTS:
        add_act_intro(doc, act, headings, bookmark_counter)
        first, last = act["range"]
        for index in range(first, last + 1):
            scene = scenes[index - 1]
            parent_id = SCREEN_PARENT[scene["id"]]
            add_screen(
                doc,
                index,
                scene,
                parent_id,
                scripts,
                dialogue,
                bullet_num,
                decimal_num,
                frame_seen,
                headings,
                bookmark_counter,
                page_break=index != first,
            )

    materialize_toc(doc, toc_placeholder, headings)
    preset_audit(doc)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(output_path)
    print(json.dumps({
        "output": str(output_path),
        "screens": len(scenes),
        "acts": len(ACTS),
        "scriptNodesUsed": len(frame_seen) + 1,
        "dialoguePresets": len(dialogue["presets"]),
        "voices": len(dialogue["voices"]),
    }, ensure_ascii=False, indent=2))


# The Word guide is organized by playable locations, not by technical UI states.
# The screen ids stay here only as an integrity map back to canonical content.
COMPACT_SCENES = [
    {
        "id": "hotel-investigation",
        "act": 1,
        "title": "Сцена 1. Гостиница: от разгромленного люкса до бара",
        "minutes": "50–90 минут",
        "screen_ids": [
            "hotel-overload", "hotel-overload-search", "hotel-gallery", "hotel-gallery-pussy",
            "hotel-vip-guards", "hotel-vip-guards-defeated", "vip-prop-room",
            "vip-prop-room-carriers", "vip-prop-room-carriers-defeated",
            "hotel-gallery-pussy-return", "hotel-archive-alexis", "hotel-gallery-kraken",
            "hotel-gallery-kraken-linda-disabled", "hotel-gallery-kraken-defeated",
        ],
        "goal": "Показать угрозу, дать группе самой собрать след Егорика и открыть дверь закрытого бара.",
        "tone": "Похмельная комедия → роскошный абсурд → первая настоящая опасность.",
        "read_aloud": (
            "Утро обрушивается грохотом разгромленного люкса. Потолочный фонтан бьёт вверх, "
            "кровать стоит вертикально, а Головач Лена спит, обнимая маленькую золотую награду. "
            "На его груди мигает чёрно-золотой пульт; от кулона к разъёму тянется красная нить. "
            "На экране: «ПРЕСЕТ: КОНЕЦ СВЕТА. ЗАЩИТА: СНЯТА», пять часов и два пустых поля — "
            "«Основной жених» и «Невеста»."
        ),
        "beats": [
            ("Люкс", "Осмотреть пульт и решить судьбу связи кулона. Оба решения сохраняют сюжет, но разрыв портит технический путь."),
            ("Следы", "Без бросков найти письмо, браслеты, запись «Для Егорика» и маршрут служебной двери. Егорик пока только зацепка."),
            ("Галерея", "Дать свободно менять порядок: Pussy Sultan, архив Алексиса, верхняя реквизиторская. Ничего не закрывать из-за порядка."),
            ("Pussy Sultan", "Через доверие, давление, кражу или бой выдать ключ и воспоминание. Только доверие открывает поручение со скипетром и будущую награду."),
            ("Архив", "Алексис отделяет факт от догадки: Егорик и Настасья жили по обычному гостевому тарифу; заказ пришёл из бара."),
            ("Скипетр и кракен", "Скипетр достают из-под паланкина; провалы будят носильщиков. На обратном пути рельсовый кракен перекрывает путь, но любой исход открывает бар."),
        ],
        "objects": [
            ("Режиссёрский пульт", "Горячий, размером со старую книгу; показывает пять часов и два голосовых поля.", "Не знает личностей жениха и невесты; остаётся с группой."),
            ("Письмо", "Чёрный конверт без подписи, след золотого кольца.", "Их заранее поставили туда, где чужой замысел встретит сопротивление; память восстанавливать не нужно."),
            ("Пять браслетов", "Стрелки на внутреннем ободе ищут друг друга.", "Если свести руки вместе, показывают служебную дверь из люкса."),
            ("Запись «Для Егорика»", "Треснувшая пластина без лиц.", "Конверт передают человеку в зелёном рукаве у служебной двери. Это улика, а не доказательство роли жениха."),
            ("Золотой скипетр", "Тяжёлый сценический микрофон под паланкином.", "Нужен только для добровольного поручения Pussy Sultan; вне этой ветки не тащить предмет в другие сцены."),
        ],
        "voices": [
            ("Pussy Sultan", "Церемониально, ритмично, о себе в третьем лице. За пышностью всегда одно конкретное условие."),
            ("Алексис Великолепный", "Быстро и точно. Отделяет документы от красивых предположений; не подтверждает свадебные роли."),
            ("Системы гостиницы", "Короткие надписи без эмоций. Сообщают функции, но не объясняют, кто всё запустил."),
        ],
        "qa": [
            ("Что произошло ночью?", "«Активирован пресет “Конец света”. Защита снята. До запуска — пять часов.»", "Причина пока неизвестна; не возвращать память готовым флэшбэком."),
            ("Кто жених? Егорик?", "«Пульт ждёт два голоса, но имён не показывает. “Для Егорика” — единственная подпись на записи.»", "Егорик остаётся рабочей гипотезой, не подтверждённым женихом."),
            ("Можно вспомнить вечеринку?", "«Память не отвечает. Зато вещи в номере выглядят гораздо разговорчивее.»", "Перевести внимание на четыре обязательных следа без броска."),
            ("Кто такой Pussy Sultan?", "«Перед вами Pussy Sultan — гость, чьё имя уже является рекомендацией.»", "Сначала попросить героев достойно представиться."),
            ("Что Pussy Sultan видел ночью?", "«Егорик, Настасья, чёрный конверт и служебная дверь. Этого достаточно, чтобы продолжить расследование.»", "При доверии добавить поручение; при давлении выдать только улику и ключ."),
            ("Мы крадём ключ / угрожаем / дерёмся", "«Берите ключ и истину. Но не называйте это доверием.»", "Обязательный путь остаётся; скипетр, Вуманайзер и союзная награда закрываются."),
            ("Что знает Алексис?", "«Общий номер, цветы и торт — эффектно. Обычный гостевой тариф — факт. Заказ пришёл из бара.»", "Выдать жетон или служебный код бара."),
            ("Как достать скипетр?", "«Паланкин держат перекошенная рама и фиксатор: можно сдвинуть силой или разгрузить механизм.»", "Два провала запускают носильщиков; после боя предмет всё равно доступен."),
            ("Как пройти кракена?", "«Красная линия показывает разгон. Можно остановить рельс, погасить привод через люк или разбить фанерное ядро.»", "Любой честный подход открывает путь; Линда может пройти через сервисный люк автоматически."),
        ],
        "freedom": [
            "Порядок галереи полностью свободный; переносите обязательные сведения в тот контакт, которого группа добилась первой.",
            "Не требуйте бросок для осмотра очевидного предмета. Бросок нужен только там, где есть цена провала.",
            "Полное поражение от охраны, носильщиков или кракена не закрывает путь: 1 HP, улика сохранена, цена — время или потерянная награда.",
            "Вуманайзер существует только как награда добровольной ветки Pussy Sultan и пригодится только в семейном крыле; не добавляйте его в другие сцены и изображения.",
        ],
        "end": "У группы есть пульт, след Егорика, ключ/код бара и понимание, что обычный тариф не подтверждает свадьбу. Дверь бара открыта.",
    },
    {
        "id": "closed-bar",
        "act": 2,
        "title": "Сцена 2. Закрытый бар",
        "minutes": "30–45 минут",
        "screen_ids": [
            "closed-bar", "closed-bar-prokhor", "closed-bar-prokhor-payer-identified",
            "closed-bar-prokhor-work-schedule", "closed-bar-prokhor-phone-call",
            "closed-bar-stas", "closed-bar-dancers",
        ],
        "goal": "Получить свидетельство Стаса, закрыть комедийную линию Прохора и освободить танцоров, которые укажут путь в гримёрку.",
        "tone": "Ночной клуб, который отказывается признать, что утро уже наступило.",
        "read_aloud": (
            "Дверь отступает в темноту закрытого бара. Слева Стас обеими руками держит кружку у трёх цветных кранов. "
            "Справа Прохор лежит на синем диване рядом со счётом, терминалом и телефоном, словно катастрофа входит в пакет услуг. "
            "За стеклом одна и та же мелодия снова и снова возвращает танцевальную труппу к первому движению номера."
        ),
        "beats": [
            ("Свободный порядок", "Стас, Прохор и танцпол доступны сразу; разрешить группе ходить между ними."),
            ("Прохор", "Через счёт или терминал установить Любовь Успенскую. Если он уклоняется, автоматика назначает первую рабочую смену и вынуждает позвонить."),
            ("Стас", "Он видел Егорика и Настасью: они ушли в закрытое семейное крыло, но прямого прохода из бара нет."),
            ("Труппа", "Четыре удара каблука — подсказка к последнему счёту. Правильный ритм освобождает танцоров; они показывают служебный путь через гримёрку."),
        ],
        "voices": [
            ("Прохор Оллинклюзив", "Предельно расслабленно; любую угрозу превращает в вопрос условий тарифа."),
            ("Стас Хмелебрюх", "Медленно, короткими «ну да». Под давлением соглашается слишком быстро — это не настоящее согласие."),
            ("Танцевальная труппа", "До освобождения отвечает только ритмом и позой; после — коротко и профессионально."),
        ],
        "qa": [
            ("Почему Прохор не уходит?", "«Конец света — не повод прерывать отдых. Особенно если написано “безлимитно до закрытия”.»", "Он не злодей и не хранитель тайны; это комедийная бухгалтерская ветка."),
            ("Кто всё оплачивает?", "«Любовь Залмановна Успенская. Номер, бар, спа и кабриолет. Только не говорите “содержит”.»", "Если ответ не добыт разговором, терминал раскрывает его через график работы."),
            ("Можно просто заставить Прохора сказать?", "«Деньги любят тишину, а я люблю отдых.»", "Давление ускоряет терминал, но не создаёт новый сюжетный секрет."),
            ("Стас видел Егорика?", "«Тихий маленький парень и весёлая девушка ушли в закрытую область для пар. Из бара туда напрямую не пройти.»", "Это подтверждает маршрут, а не свадебную роль."),
            ("Стас пойдёт к Полине?", "«Позвать можете. На один разговор, где мой ответ тоже считается.»", "Зафиксировать разрешение на приглашение, но не согласие вернуться."),
            ("Почему танцоры молчат?", "«На последней позе музыка сбрасывает номер. Руководитель успевает отбить четыре доли.»", "Игрокам нужно заметить ритм; бросок не обязателен."),
            ("Мы ломаем пульт / бьём танцоров", "«Музыка возвращает всех к первой доле; силой петля не заканчивается.»", "Показать последствия, затем снова дать четыре счёта как доступную улику."),
            ("Куда дальше?", "«Служебный проход к семейному крылу начинается в артистической гримёрке.»", "Освобождённая труппа открывает дверь и обещает один раз помочь со светом в финале."),
        ],
        "freedom": [
            "Ни Прохор, ни Стас, ни танцоры не обязательны в фиксированном порядке.",
            "Комедийные импровизации не должны прятать две опоры: Стас видел пару, а маршрут идёт через гримёрку.",
            "Если группа угадывает четыре счёта по описанию, не требуйте бросок ради броска.",
        ],
        "end": "Стас разрешил один прямой разговор, труппа освобождена, служебная дверь в гримёрку открыта.",
    },
    {
        "id": "dressing-room",
        "act": 2,
        "title": "Сцена 3. Артистическая гримёрка",
        "minutes": "30–50 минут",
        "screen_ids": ["artists-dressing-room", "dressing-room-double-fight", "stage-module-shutdown"],
        "goal": "Впервые назвать Крида как артиста, узнать маршрут Егорика и решить, тратить ли время на отключение сценического модуля.",
        "tone": "Сценический детектив → комедия отражений → короткая техническая подготовка.",
        "read_aloud": (
            "Гримёрка выглядит как идеальный беспорядок после большого шоу: костюмы, маски, световые метки и три зеркальных манекена. "
            "Из-за ширмы раздаётся раздражённый голос: «Если это мой дубль, он ужасен. Если ваш — заберите его и верните маски на стойки»."
        ),
        "beats": [
            ("Улики артиста", "Костюм, райдер и запись подтверждают: на сцене выступал Крид. Пока не называть его женихом."),
            ("Satyr", "Он изображал публичный выход Крида, чтобы настоящий артист мог уйти незаметно. Егорика и Настасью видел по дороге к бунгало."),
            ("Дублёры", "Правильная поза/окошко освобождают Satyr без боя; срыв масок или атака запускают три зеркальных дубля."),
            ("Модуль", "После гримёрки можно потратить время на две разные проверки и отключить сценический контур финала либо сразу идти к бунгало."),
        ],
        "objects": [
            ("Концертный костюм", "Повреждённый сценический образ Крида.", "Подтверждает артиста, но не свадебную роль."),
            ("Маски Satyr", "Набор публичных образов и отметка финальной позы.", "Объясняют подмену после выступления; удачное освобождение даёт одноразовую репетиционную команду."),
            ("Сценическая консоль", "Кабели и рычаг аварийного питания.", "Две разные проверки отключают модуль; провал добавляет время, но не закрывает путь."),
        ],
        "voices": [
            ("Satyr", "Демонстративно меняет маски; важные факты говорит коротким собственным голосом. Не имитировать реального артиста."),
            ("Зеркальные дублёры", "Не разговаривают: указывают на пустую четвёртую отметку и повторяют движения."),
        ],
        "qa": [
            ("Кто выступал?", "«Да, выступал Крид. После номера перед гостями выходил уже я — маска, свет, правильная походка.»", "Крид раскрыт только как артист."),
            ("Зачем была подмена?", "«Публике нужен был красивый финал. Оригинал после подмены в гримёрку не вернулся.»", "Полный мотив приватной церемонии раскрывает позже сам Крид."),
            ("Крид — жених?", "«Я подтверждаю выступление и подмену. Свадебных ролей мне никто не выдавал.»", "Не подталкивать к правильному ответу раньше Егорика."),
            ("Где Егорик и Настасья?", "«Пока я изображал выход, они ушли к гостевым бунгало — обычным маршрутом, без охраны.»", "Выдать направление в семейное крыло."),
            ("Как освободить Satyr?", "«Три фигуры ждут четвёртую позу; за ширмой есть сервисное окошко.»", "Разумная поза или обход решают сцену; атака честно запускает бой."),
            ("Что дают дублёры после победы?", "«Не импровизируйте: левая нога, взгляд в прожектор — и замерли на последнем счёте.»", "При хорошем исходе сохранить одноразовую команду для тоннеля или финала."),
            ("Зачем отключать модуль?", "«Это не открывает путь, а делает второй контур финала слабее.»", "Сказать цену заранее: две проверки и время; отказ не наказывать."),
        ],
        "freedom": [
            "Любая убедительная работа с отражением может заменить буквальную позу, если решает ту же задачу.",
            "Бой не стирает улики Крида и маршрут к бунгало.",
            "Отключение модуля — осознанно необязательная подготовка, а не скрытая обязательная кнопка.",
        ],
        "end": "Крид известен как артист, Егорик и Настасья найдены в направлении бунгало; сценический модуль отключён либо сознательно оставлен активным.",
    },
    {
        "id": "family-wing",
        "act": 2,
        "title": "Сцена 4. Семейное крыло и Павильон 18+",
        "minutes": "45–75 минут",
        "screen_ids": [
            "guest-bungalows", "show-18-pavilion", "couples-session-stas",
            "couples-session-polina", "couples-session-choice",
        ],
        "goal": "Снять семейную блокировку добровольным решением и открыть соседнее бунгало Егорика, не превращая мастера в судью отношений.",
        "tone": "Сначала неловкая комедия, затем спокойный человеческий разговор; решения принадлежат NPC, не героям.",
        "read_aloud": (
            "Семейное крыло встречает тишиной и стеклянным куполом. Под ним Полина держит папку премиальной программы, "
            "а рядом Олва Силенна — обычного роста, собранная и совершенно не впечатлённая автоматикой — пытается остановить протокол, "
            "который требует отсутствующего Стаса. За соседней дверью виден номер ваших знакомых, но блокировка снимется только после ясного добровольного решения."
        ),
        "beats": [
            ("Два пути", "Олва формулирует: самостоятельный вечер Полины либо один добровольный разговор со Стасом. Оба исхода допустимы."),
            ("Ветка самостоятельного вечера", "Только если у группы есть Вуманайзер: Полина сама подтверждает отказ от парной программы. Предмет не является универсальным сюжетным ключом."),
            ("Ветка разговора", "Стас приходит только по ранее данному разрешению. Сначала коротко услышать каждого отдельно, затем дать паре самой сказать «нет» или новое «да»."),
            ("Павильон 18+", "Необязательная просьба Олвы. Алгоритм можно поймать на противоречиях, переписать телесуфлёр или оборвать силой; дверь к Егорику не зависит от согласия помочь."),
        ],
        "voices": [
            ("Олва Силенна", "Ровно, профессионально, без диагнозов. Проверяет добровольность конкретного решения и гасит камеры."),
            ("Полина Златородная", "Чем страшнее неопределённость, тем вежливее и договорнее речь. Под контролем скрывается реальное желание семьи."),
            ("Стас Хмелебрюх", "Паузы, «ну да», попытка исчезнуть из разговора. Настоящий ответ звучит медленнее и конкретнее."),
        ],
        "qa": [
            ("Какие вообще есть варианты?", "«Полина добровольно выбирает самостоятельный вечер — или Стас добровольно приходит и отвечает сам. Ни один путь не экзамен на нравственность.»", "Сказать это прямо; не прятать базовый выбор за проверкой."),
            ("Можно применить Вуманайзер?", "«Полина, вы выбираете самостоятельный вечер добровольно, а не потому, что вас торопят?»", "Только при наличии предмета и явном «да» Полины; после этого он исчезает из сюжета."),
            ("Можно заставить Стаса прийти?", "«Я отправлю приглашение, не приказ. Его отсутствие не превращается в согласие.»", "Чары, угрозы и взлом купола не заменяют добровольность."),
            ("Чего на самом деле хочет Стас?", "«Я хочу один раз выбрать сам — остаться, уйти, вернуться или не вернуться.»", "Не спасать Стаса вместо него и не считать первое быстрое «ну да» решением."),
            ("Чего на самом деле хочет Полина?", "«Я хочу семью и ребёнка. Я пыталась превратить страх неопределённости в договор.»", "Не делать из неё карикатурного злодея; отделить цель от метода."),
            ("Кто из них прав?", "«Скажите не кто прав, а какой честный ответ вы готовы поддержать. Финальное слово останется за ними.»", "Группа выбирает, какую потребность поддержать, но NPC произносят итог сами."),
            ("Если Стас говорит «нет»", "Олва: «Прямой отказ не является приглашением улучшить предложение.» Полина: «Услышала. Договор закрыт.»", "Брак завершается без унижения Полины; блокировка снята."),
            ("Если они хотят попробовать снова", "Стас: «Молчание больше не считается согласием». Полина: «“Нет” останавливает процесс; приложение уничтожаю».", "Олва отдельно перепроверяет оба ответа; блокировка снята."),
            ("Что такое Павильон 18+?", "«Три маски, слишком много камер и очень мало права на собственный ответ. Помощь необязательна.»", "Успех даёт одноразовую Красную кнопку; отказ или аварийный исход не блокируют сюжет."),
        ],
        "freedom": [
            "Социальный бросок может помочь сформулировать вопрос или смягчить тон, но не выбирает итог за Стаса и Полину.",
            "Не строить юмор на диагнозах, гендере или принуждении; юмор здесь — в бюрократической автоматике.",
            "Если игроки предложат третий путь, принять его только при явном добровольном решении обоих и сохранить ту же драматическую развязку.",
            "Красная кнопка 18+ — бонус за помощь, не плата за обязательный проход.",
        ],
        "end": "Семейная программа остановлена одним из честных исходов; дверь соседнего бунгало открыта. При успехе павильона группа получает Красную кнопку 18+.",
    },
    {
        "id": "egorik-reveal",
        "act": 2,
        "title": "Сцена 5. Бунгало Егорика: не те молодожёны",
        "minutes": "15–25 минут",
        "screen_ids": ["egorik-bungalow-reveal"],
        "goal": "Двумя фактами разрушить ложную версию: голос Егорика не подходит, запись Настасьи показывает Крида.",
        "tone": "Комическое недоумение → облегчение → срочность.",
        "read_aloud": (
            "Купол распадается розовой пылью, а за ним — обычная дверь, подпёртая столом. "
            "Появляется помятый Егорик, не понимающий, почему на него смотрят как на жениха. "
            "За его плечом Настасья делит спасение на короткие задачи и останавливает декоративную стену воды."
        ),
        "beats": [
            ("Первый факт", "Егорик поправляет героев; проверка голоса без броска отвечает: «КЛЮЧ НЕ СОВПАДАЕТ»."),
            ("Второй факт", "Запись Настасьи: Крид без музыки репетирует клятву и уходит под сцену."),
            ("Выбор темпа", "Помочь паре — получить союз ценой времени; сразу уйти с уликой — сохранить темп."),
        ],
        "voices": [
            ("Егорик", "Тихо, буквально, после паузы; сначала проверяет, в безопасности ли Настасья."),
            ("Настасья Затейница", "Быстро делит хаос на раунды и защищает приватность записи."),
        ],
        "qa": [
            ("Ты жених?", "«Вообще-то, я не жених. Мы с Настей гости. Я пытался сказать это ещё до проверки голоса.»", "Не растягивать раскрытие и не высмеивать игроков за гипотезу."),
            ("Почему конверт был у тебя и кому ты его отдал?", "«Меня попросили донести его “основному жениху”. Я отдал человеку в маске; он ушёл под сцену.»", "Снять привязку имени к роли; жетон подтверждает маршрут."),
            ("Изобрази голос жениха ещё раз", "«Нет. Голос уже не подошёл. Второй раз изображать чужую свадьбу я не буду.»", "Граница Егорика не блокирует обязательную улику."),
            ("Что на записи? Можно её скопировать?", "«Крид репетирует клятву и уходит под сцену. Маршрут покажу, копию не дам.»", "Повреждённую запись Настасья пересказывает; улика сохраняется."),
            ("Мы ошиблись, извини", "«Главное, что теперь ищем нужного Егора. Это уже прогресс.»", "Если герои помогают выбраться, пара становится союзником в финале."),
        ],
        "freedom": [
            "Любая проверка быстро подтверждает невиновность Егорика; помощь с водой решается описанием без мини-игры.",
            "Насмешки закрывают союзную помощь, но не маршрут: сюжет всё равно идёт под сцену.",
        ],
        "end": "Егорик исключён, Крид назван настоящим женихом, путь под сцену найден; отношение пары к героям зафиксировано.",
    },
    {
        "id": "under-stage",
        "act": 3,
        "title": "Сцена 6. Под сценой: путь к настоящему жениху",
        "minutes": "50–80 минут",
        "screen_ids": ["groom-tunnel", "corp-de-ballet-fight", "groom-preparation-room", "restore-control-log"],
        "goal": "Пройти протокол конфиденциальности, освободить Крида, получить первый голосовой ключ и решить, нужен ли полный журнал.",
        "tone": "Торжественная хореография → физическая угроза → личная срочность.",
        "read_aloud": (
            "Под сценой нет тайного храма — только очень дорогой технический тоннель. Две механические кулисы перекрывают путь и показывают первую из трёх торжественных поз. "
            "Над ними висят красные противовесы «АВАРИЙНОЕ РАСКРЫТИЕ», а за дверью голосовая система в сотый раз просит кого-то повторить клятву."
        ),
        "beats": [
            ("Протокол", "Закрыть любые три разные линии: поза, противовес, вентиляция Линды, сохранённая команда Satyr. Два общих провала оставляют только бой."),
            ("Кордебалет", "Даже после инициативы поза замораживает одну кулису, а противовес лишает её отталкивания. Поражение аварийно открывает дверь."),
            ("Комната Крида", "Голос автоматически совпадает. Крид прямо подтверждает роль жениха, называет Игоря и даёт первый ключ при любом исходе."),
            ("Журнал Головача", "Остаться ради двух проверок — открыть режиссёрский план ценой времени; уйти сразу — сохранить темп и перейти к Игорю."),
        ],
        "voices": [
            ("Кордебалет", "Чрезмерно торжественная инструкция на одну позу; опасность всегда телеграфируется заранее."),
            ("Егор Крид", "Коротко и чётко; при разговоре об Игоре сценическая манера исчезает."),
        ],
        "qa": [
            ("Что требует система?", "«КОНФИДЕНЦИАЛЬНЫЙ ДОПУСК. ПОВТОРИТЕ ПОЗУ. Аплодисменты при несовпадении могут быть физическими.»", "Показать позу и красный противовес до первого урона."),
            ("Можно пройти иначе?", "«Нужны три разные линии: сыграть позу, раскрыть кулисы, пройти вентиляцией или дать репетиционную команду.»", "Творческую заявку сопоставить с ближайшей линией, не создавать бесконечные новые кнопки."),
            ("Мы атакуем", "«Кулисы кланяются и начинают аплодировать вами друг об друга; безопасный центр остаётся подсвечен.»", "Начать бой, сохранив позу и противовес как действия."),
            ("Крид действительно жених?", "«Да, я выступал. И да, я жених. Вы нашли правильного Егора примерно на одну гримёрку позже.»", "Подтвердить сразу, без новой загадки."),
            ("Зачем Satyr изображал тебя?", "«Мне нужно было уйти к закрытой церемонии так, чтобы никто не пошёл следом.»", "Это секретность свадьбы, не признание в аварии."),
            ("Кто невеста?", "«Невеста — Игорь Румянец. Он ждёт в церемониальной вилле и думает, что это репетиция.»", "Имя Игоря впервые звучит здесь."),
            ("Ты запустил катастрофу?", "«Я скрывал церемонию, не систему безопасности. Сначала вытащим Игоря, потом выясним остальное.»", "Крид не знает причины аварии."),
            ("Что если микрофон не починить?", "«Аварийный канал принимает голос, но таймер съедает ещё немного времени.»", "Ключ обязателен; провал повышает давление времени на 1."),
            ("Зачем восстанавливать журнал?", "«Он покажет точную последовательность контуров и откроет режиссёрский способ их переписать.»", "До броска сказать цену: время и необязательность."),
        ],
        "freedom": [
            "Провал в тоннеле или полном бою не лишает группу жениха: дверь открывается аварийно, герои возвращаются с 1 HP.",
            "Первый провал журнала уже выдаёт сведения, но добавляет время; не заставлять повторять ради обязательной улики.",
            "Если кулон разорван в первой сцене, журнал можно прочитать, но режиссёрский план остаётся недоступен.",
        ],
        "end": "Крид свободен, Игорь назван, первый голосовой ключ получен; журнал восстановлен либо группа сознательно выбрала скорость.",
    },
    {
        "id": "ceremony-villa",
        "act": 3,
        "title": "Сцена 7. Церемониальная вилла: доверие и финальный план",
        "minutes": "25–40 минут",
        "screen_ids": ["ceremony-villa", "final-choice"],
        "goal": "Получить второй голосовой ключ, решить судьбу записи и выбрать старт финала.",
        "tone": "Тишина после шума; сухой юмор только про красивое, но бессмысленное шоу.",
        "read_aloud": (
            "Вилла стоит в тихом саду за стеной сценического ветра. За стеклом маленькая светящаяся фея в церемониальном костюме ждёт окончания «репетиции». "
            "Рядом появляется Крид, их голоса одновременно касаются барьера. Ветер гаснет, а над алтарём загорается последний час программы."
        ),
        "beats": [
            ("Встреча", "Пара убеждается, что оба целы. Игорь спрашивает об аварии и записи на кулоне."),
            ("Запись", "Вернуть, временно использовать с разрешением или взять без согласия. Ключ есть всегда; доверие различается."),
            ("Финальный план", "Голосовой, режиссёрский или физический. Выбор задаёт первый ход; между фазами его можно менять."),
        ],
        "voices": [
            ("Игорь Румянец", "Ровно, образно, коротко; быстро принимает решение после ясных ответов."),
            ("Егор Крид", "Поддерживает Игоря и не отвечает вместо него."),
        ],
        "qa": [
            ("Разве спасение не даёт нам право на запись?", "«Красиво — не значит ваше. Спасти свадьбу можно вместе. Решать судьбу записи будем мы с Кридом.»", "Не превращать согласие в проверку Харизмы."),
            ("Какие честные варианты с записью?", "«Верните её сразу или временно используйте как ключ без личных фрагментов. Голос для спасения получите в любом случае.»", "Оба пути сохраняют доверие; при временном использовании отметить разрешение."),
            ("Мы всё равно используем её", "«Я помогу остановить систему. После этого кулон и разговор о доверии идут разными маршрутами.»", "Ключ сохраняется, доверительный свадебный эпилог закрывается."),
            ("Можно вообще избежать финального боя?", "«Нет. Пульт уже собирает три контура. Ваш выбор определит, как вы будете закрывать их, а не появятся ли они.»", "Честно обозначить обязательный финал."),
            ("Какие планы доступны? Выбор навсегда?", "«Два голоса и доверие — сброс; кулон, журнал и время — монтаж; сила доступна всегда. Между фазами способ можно менять.»", "Открыто назвать условия и снять страх единственного выбора."),
        ],
        "freedom": [
            "Харизма DC 12 проясняет объяснение, но не добывает согласие; Крид не говорит за Игоря.",
            "Решение о записи закрывает возврат к необязательным локациям: это честная точка необратимости.",
        ],
        "end": "Оба голосовых ключа у алтаря, судьба записи зафиксирована, выбран первый план; группа подходит к «Последнему дублю».",
    },
    {
        "id": "last-take",
        "act": 4,
        "title": "Сцена 8. Последний дубль и эпилог",
        "minutes": "до 60 минут боя + 10 минут эпилога",
        "screen_ids": ["last-take-boss", "wedding-epilogue", "director-epilogue", "shutdown-epilogue"],
        "goal": "Последовательно закрыть грозовой, сценический и огненный контуры; способ закрытия последней фазы выбирает эпилог.",
        "tone": "Большое шоу с честно показанной опасностью; после победы — короткая человеческая развязка.",
        "read_aloud": (
            "Свадебный алтарь раскрывается, как огромная механическая диафрагма. Внутри вращаются три кольца: грозовое, сценическое и огненное. "
            "Пульт произносит: «ДВА ГОЛОСОВЫХ КЛЮЧА ОБНАРУЖЕНЫ. ЗАПУСКАЮ ПОСЛЕДНИЙ ДУБЛЬ». Над островом собирается гроза, декорации поднимаются из пола, а по кабелям Головача ползёт драконье пламя."
        ),
        "beats": [
            ("Фаза 1 — гроза", "Подсветить активный кабель до удара. Канал можно сорвать действием/проверкой, закрыть планом или добить физически до 85 HP."),
            ("Фаза 2 — сцена", "Декорации разделяют героев и отталкивают от пульта. Отключённый ранее модуль снижает AC и убирает часть реакций; порог 45 HP."),
            ("Фаза 3 — огонь", "Линия драконьего пламени показывается за раунд. Последний способ закрытия фазы определяет один из трёх эпилогов."),
            ("Эпилог", "Показать последствия записи, семейной ветки и союзников в нескольких коротких кадрах; новых испытаний не добавлять."),
        ],
        "voices": [
            ("Модуль «Последний дубль»", "Ровный обратный отсчёт без злорадства; всегда заранее называет активный канал."),
            ("Крид и Игорь", "Подтверждают только собственные голоса; не командуют героями."),
        ],
        "qa": [
            ("Что можно делать в свой ход?", "«Атаковать ядро, сорвать объявленный канал, защитить NPC/пульт или переключить способ закрытия.»", "Не требовать одной правильной роли от конкретного героя."),
            ("Как отменить следующую атаку канала?", "«Опишите действие по подсвеченному кабелю и пройдите подходящую проверку DC 12.»", "Один раз за сцену особенно сильная идея может сработать без броска по решению мастера."),
            ("Можно менять план?", "«После закрытия каждой фазы — да. Уже потраченная фаза не возвращается.»", "Позволить перейти от голосов к монтажу или физическому пути."),
            ("Что говорят голоса?", "Крид: «Голос жениха подтверждаю». Игорь: «Голос невесты подтверждаю. Красивый финал оставьте на потом».", "При доверии и удержанном канале штатный сброс закрывает фазу."),
            ("Что если все упали?", "«Система аварийно продолжает отсчёт; герои приходят в себя с 1 HP у физического рубильника.»", "Смерти без решения мастера нет; финал переходит к разрушению."),
            ("Что завершает кампанию?", "«Закрытие третьего контура. Именно способ последнего закрытия выбирает эпилог.»", "Предупредить об этом перед финальным действием, если игроки сомневаются."),
        ],
        "freedom": [
            "Базовые параметры: HP 125, AC 15; AC 13 при заранее отключённом сценическом модуле. Пороги фаз — 85 и 45 HP; лишний урон не переносится.",
            "В начале раунда объявляйте активный канал и показывайте линию опасности. Сначала телеграф, потом урон.",
            "Подготовка даёт конкретные разовые преимущества: труппа гасит прожекторы, Satyr отменяет реакцию, Егорик и Настасья дают повтор, Красная кнопка снимает навязанную роль/реакцию.",
            "При 0 HP герой теряет сознание по домашним правилам; финал не должен случайно убить персонажа.",
        ],
        "mechanics": [
            ("Штатный сброс", "Нужны оба голоса и доверие пары. Один герой удерживает канал и проходит DC 12; успех закрывает текущую фазу."),
            ("Режиссёрский монтаж", "Нужны связанный кулон, восстановленный журнал и давление времени не выше 4. Интеллект DC 12, в третьей фазе DC 15; журнал может снизить её до 12."),
            ("Физическое отключение", "Доступно всегда: обычный урон и работа с подсвеченным каналом до порога текущей фазы."),
            ("Смена способа", "Разрешена между фазами; стартовый выбор не связывает группу навсегда."),
        ],
        "epilogues": [
            ("Последняя фаза закрыта голосами", "Безопасная свадьба. Пара получает запись/границы согласно решению в вилле; герои могут остаться на церемонии при сохранённом доверии."),
            ("Последняя фаза закрыта монтажом", "«Конец света» становится названием фильма, а не инструкцией. Головач признаёт ответственность; судьбу личных кадров всё равно решает пара."),
            ("Последняя фаза закрыта физически", "Остров спасён, сцена разрушена, свадьба перенесена. Никто не погиб; финальная шутка — счёт, который Кострюлька приносит Крайнеплоту."),
        ],
        "end": "Остров спасён. Коротко показать цену последнего решения, судьбу записи и по одному кадру важных союзников; затем поставить точку.",
    },
]


COMPACT_ACTS = [
    {
        "number": 1,
        "title": "Акт I. Утро после конца света",
        "purpose": "Собрать следы в гостинице и войти в закрытый бар.",
    },
    {
        "number": 2,
        "title": "Акт II. Ложный маршрут",
        "purpose": "Пройти бар, гримёрку и семейное крыло; честно снять ошибку с Егорика.",
    },
    {
        "number": 3,
        "title": "Акт III. Настоящий жених",
        "purpose": "Найти Крида, получить оба голоса и определить границы использования записи.",
    },
    {
        "number": 4,
        "title": "Акт IV. Последний дубль",
        "purpose": "Закрыть три контура и показать последствия выбранного способа победы.",
    },
]


def configure_compact_styles(doc: Document) -> None:
    """A4 dark-fantasy quick-reference system for a printed GM guide.

    Named override of compact_reference_guide: A4, 0.72/0.70-inch side
    margins, 10.5-point body, semantic wine/teal callouts, and 6.75-inch
    fixed tables. Values are kept explicit so Word and LibreOffice agree.
    """
    configure_styles(doc)
    section = doc.sections[0]
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    section.top_margin = Inches(0.76)
    section.bottom_margin = Inches(0.70)
    section.left_margin = Inches(0.72)
    section.right_margin = Inches(0.72)
    section.header_distance = Inches(0.32)
    section.footer_distance = Inches(0.32)

    normal = doc.styles["Normal"]
    normal.font.size = Pt(10.5)
    normal.paragraph_format.space_after = Pt(5)
    normal.paragraph_format.line_spacing = 1.15

    compact_headings = {
        "Heading 1": (19, COLORS["burgundy_dark"], 15, 9),
        "Heading 2": (15.5, COLORS["teal_dark"], 13, 7),
        "Heading 3": (11.5, COLORS["burgundy"], 9, 4),
    }
    for style_name, (size, color, before, after) in compact_headings.items():
        style = doc.styles[style_name]
        heading_font = "Georgia" if style_name in ("Heading 1", "Heading 2") else "Calibri"
        style.font.name = heading_font
        style._element.rPr.rFonts.set(qn("w:ascii"), heading_font)
        style._element.rPr.rFonts.set(qn("w:hAnsi"), heading_font)
        style._element.rPr.rFonts.set(qn("w:eastAsia"), heading_font)
        style.font.size = Pt(size)
        style.font.color.rgb = rgb(color)
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.keep_with_next = True
        style.paragraph_format.keep_together = True

    set_style_bottom_border(doc.styles["Heading 1"], color=COLORS["gold"], size=8, space=5)

    overrides = {
        "Scene Meta": (8.6, COLORS["muted"], False, False, 0, 5, 1.0),
        "GM Subheading": (11, COLORS["teal_dark"], True, False, 9, 4, 1.0),
        "TOC 1 Custom": (10.7, COLORS["burgundy_dark"], True, False, 0, 3, 1.05),
        "TOC 2 Custom": (9.8, COLORS["ink"], False, False, 0, 2, 1.05),
    }
    for name, (size, color, bold, italic, before, after, spacing) in overrides.items():
        style = doc.styles[name]
        style.font.size = Pt(size)
        style.font.color.rgb = rgb(color)
        style.font.bold = bold
        style.font.italic = italic
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.line_spacing = spacing
        if name == "GM Subheading":
            style.paragraph_format.keep_with_next = True


def configure_compact_header_footer(doc: Document) -> None:
    section = doc.sections[0]
    header = section.header
    p = header.paragraphs[0]
    p.clear()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.paragraph_format.space_after = Pt(2)
    set_paragraph_bottom_border(p, color=COLORS["gold"], size=4, space=2)
    run = p.add_run("ХРОНИКИ ВОСЬМИ ЗЕМЕЛЬ  ·  МАЛЬЧИШНИК КОНЦА СВЕТА")
    set_run_font(run, size=7.8, color=COLORS["muted"], bold=True)

    footer = section.footer
    fp = footer.paragraphs[0]
    fp.clear()
    fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    fp.paragraph_format.space_before = Pt(0)
    fp.paragraph_format.space_after = Pt(0)
    add_page_field(fp)
    for run in fp.runs:
        set_run_font(run, size=8, color=COLORS["muted"], bold=True)

    first_footer = section.first_page_footer
    ffp = first_footer.paragraphs[0]
    ffp.clear()
    ffp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = ffp.add_run("Только для мастера · игрокам не показывать")
    set_run_font(run, size=8, color=COLORS["burgundy"], italic=True)


def set_cell_margins(cell, *, top: int = 100, start: int = 120, bottom: int = 100, end: int = 120) -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for edge, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{edge}"))
        if node is None:
            node = OxmlElement(f"w:{edge}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_cell_width(cell, width_inches: float) -> None:
    width = Inches(width_inches)
    cell.width = width
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_w = tc_pr.first_child_found_in("w:tcW")
    if tc_w is None:
        tc_w = OxmlElement("w:tcW")
        tc_pr.append(tc_w)
    tc_w.set(qn("w:w"), str(width.twips))
    tc_w.set(qn("w:type"), "dxa")


def prevent_row_split(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    if tr_pr.find(qn("w:cantSplit")) is None:
        tr_pr.append(OxmlElement("w:cantSplit"))


def repeat_table_header(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    if tr_pr.find(qn("w:tblHeader")) is None:
        tr_pr.append(OxmlElement("w:tblHeader"))


def set_table_fixed(table, widths: tuple[float, float]) -> None:
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    table.autofit = False
    tbl_pr = table._tbl.tblPr
    layout = tbl_pr.find(qn("w:tblLayout"))
    if layout is None:
        layout = OxmlElement("w:tblLayout")
        tbl_pr.append(layout)
    layout.set(qn("w:type"), "fixed")
    tbl_w = tbl_pr.find(qn("w:tblW"))
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        tbl_pr.append(tbl_w)
    tbl_w.set(qn("w:w"), str(Inches(sum(widths)).twips))
    tbl_w.set(qn("w:type"), "dxa")
    tbl_ind = tbl_pr.find(qn("w:tblInd"))
    if tbl_ind is None:
        tbl_ind = OxmlElement("w:tblInd")
        tbl_pr.append(tbl_ind)
    tbl_ind.set(qn("w:w"), "120")
    tbl_ind.set(qn("w:type"), "dxa")

    # LibreOffice and Word both consult tblGrid when laying out fixed tables.
    # Rebuild it explicitly so narrow prompt columns do not fall back to 50/50.
    tbl_grid = table._tbl.tblGrid
    for child in list(tbl_grid):
        tbl_grid.remove(child)
    for width in widths:
        grid_col = OxmlElement("w:gridCol")
        grid_col.set(qn("w:w"), str(Inches(width).twips))
        tbl_grid.append(grid_col)

    borders = tbl_pr.find(qn("w:tblBorders"))
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        element = borders.find(qn(f"w:{edge}"))
        if element is None:
            element = OxmlElement(f"w:{edge}")
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), "4" if edge in ("top", "left", "bottom", "right") else "3")
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), COLORS["line"] if edge in ("top", "left", "bottom", "right") else COLORS["line_soft"])

    for row in table.rows:
        prevent_row_split(row)
        for cell, width in zip(row.cells, widths):
            set_cell_width(cell, width)
            set_cell_margins(cell)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER


def clear_cell(cell) -> Any:
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.paragraph_format.space_before = Pt(0)
    paragraph.paragraph_format.space_after = Pt(0.5)
    paragraph.paragraph_format.line_spacing = 1.10
    return paragraph


def add_header_cell(cell, text: str, *, fill: str = COLORS["teal_dark"]) -> None:
    set_cell_shading(cell, fill)
    p = clear_cell(cell)
    r = p.add_run(text.upper())
    set_run_font(r, size=8.7, color=COLORS["white"], bold=True)


def add_pair_table(doc: Document, headers: tuple[str, str], rows: Iterable[tuple[str, str]],
                   *, left_width: float = 1.75, header_fill: str = COLORS["teal_dark"],
                   label_fill: str = COLORS["mist"], label_color: str = COLORS["teal_dark"]) -> None:
    # A4 content width is 9835 DXA. A 120-DXA table indent plus this
    # 9714-DXA grid keeps the full table inside the text frame.
    width_total = 6.7458
    table = doc.add_table(rows=1, cols=2)
    add_header_cell(table.rows[0].cells[0], headers[0], fill=header_fill)
    add_header_cell(table.rows[0].cells[1], headers[1], fill=header_fill)
    repeat_table_header(table.rows[0])
    for left, right in rows:
        cells = table.add_row().cells
        set_cell_shading(cells[0], label_fill)
        lp = clear_cell(cells[0])
        add_inline_runs(lp, left, base_color=label_color, base_size=9.4)
        for run in lp.runs:
            run.bold = True
        rp = clear_cell(cells[1])
        add_inline_runs(rp, right, base_size=9.5)
    set_table_fixed(table, (left_width, width_total - left_width))
    after = doc.add_paragraph()
    after.paragraph_format.space_after = Pt(0)
    after.paragraph_format.line_spacing = 0.5


def add_object_table(doc: Document, objects: Iterable[tuple[str, str, str]]) -> None:
    rows = []
    for name, visible, reveal in objects:
        rows.append((name, f"**Видно:** {visible}\n**Даёт:** {reveal}"))
    add_pair_table(doc, ("Объект", "Как описать и что он даёт"), rows, left_width=1.65)


def add_qa_table(doc: Document, rows: Iterable[tuple[str, str, str]]) -> None:
    widths = (2.12, 4.6258)
    table = doc.add_table(rows=1, cols=2)
    add_header_cell(table.rows[0].cells[0], "Если игроки спрашивают / делают", fill=COLORS["burgundy_dark"])
    add_header_cell(table.rows[0].cells[1], "Быстрый ответ мастера", fill=COLORS["burgundy_dark"])
    repeat_table_header(table.rows[0])
    for prompt, answer, note in rows:
        cells = table.add_row().cells
        set_cell_shading(cells[0], COLORS["rose"])
        lp = clear_cell(cells[0])
        add_inline_runs(lp, prompt, base_color=COLORS["burgundy_dark"], base_size=9.5)
        for run in lp.runs:
            run.bold = True

        ap = clear_cell(cells[1])
        add_inline_runs(ap, answer, base_size=9.6)
        np = cells[1].add_paragraph()
        np.paragraph_format.space_before = Pt(3)
        np.paragraph_format.space_after = Pt(0)
        np.paragraph_format.line_spacing = 1.05
        nr = np.add_run("Мастеру: ")
        set_run_font(nr, size=8.6, color=COLORS["teal_dark"], bold=True)
        add_inline_runs(np, note, base_color=COLORS["muted"], base_size=8.6)
    set_table_fixed(table, widths)
    after = doc.add_paragraph()
    after.paragraph_format.space_after = Pt(0)
    after.paragraph_format.line_spacing = 0.5


def add_compact_bullet(doc: Document, text: str, num_id: int) -> Any:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.12
    apply_numbering(p, num_id)
    add_inline_runs(p, text, base_size=9.9)
    return p


def add_compact_cover(doc: Document) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(68)
    p.paragraph_format.space_after = Pt(14)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    set_paragraph_bottom_border(p, color=COLORS["gold"], size=6, space=5)
    r = p.add_run("ХРОНИКИ ВОСЬМИ ЗЕМЕЛЬ")
    set_run_font(r, size=9.5, color=COLORS["gold_dark"], bold=True)

    if BRACELETS_ICON_PATH.exists():
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(12)
        picture = p.add_run().add_picture(str(BRACELETS_ICON_PATH), width=Inches(1.28))
        picture._inline.docPr.set("descr", "Пять золотых браслетов приглашения на Пенисуэлу")

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(10)
    set_paragraph_box(p, fill=COLORS["burgundy_dark"], border=COLORS["gold"], left=320, right=320)
    r = p.add_run("Мальчишник\nконца света")
    set_run_font(r, name="Georgia", size=28, color=COLORS["white"], bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(22)
    r = p.add_run("Шпаргалка мастера · 4 акта · 8 игровых сцен")
    set_run_font(r, size=12.5, color=COLORS["teal_dark"], italic=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(18)
    set_paragraph_box(p, fill=COLORS["rose"], border=COLORS["burgundy"], left=620, right=620)
    r = p.add_run("ТОЛЬКО ДЛЯ МАСТЕРА")
    set_run_font(r, size=10.5, color=COLORS["burgundy_dark"], bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(34)
    r = p.add_run("Короткие описания · быстрые ответы · свобода игроков · обязательные исходы")
    set_run_font(r, size=9.4, color=COLORS["muted"], italic=True)


def add_compact_front_matter(doc: Document, rules: dict[str, Any], bullet_num: int,
                             headings: list[tuple[int, str, str]], bookmark_counter: list[int]) -> None:
    add_chapter_heading(doc, "Как пользоваться этой книгой", headings, bookmark_counter, page_break=False)
    add_box(
        doc,
        "Главное",
        "Одна крупная сцена здесь объединяет несколько технических экранов приложения. Не переключайте экран после каждого действия: оставайтесь в сцене, пока группа не достигла указанного обязательного выхода.",
        fill=COLORS["mist"],
        border=COLORS["teal"],
    )

    doc.add_paragraph("Цикл мастера", style="GM Subheading")
    add_pair_table(
        doc,
        ("Шаг", "Что делать"),
        [
            ("1. Описать", "Прочитайте только короткий золотой блок и спросите: «Что вы делаете?»"),
            ("2. Уточнить", "Выясните намерение и способ. Не перечисляйте заранее все подготовленные варианты."),
            ("3. Ответить", "Найдите ближайшую строку в таблице быстрых ответов; скажите реплику и сразу верните инициативу игрокам."),
            ("4. Разрешить", "Очевидное действие проходит автоматически. Рискованное — по d20; провал меняет цену, но не стирает путь."),
            ("5. Закрыть", "Переходите дальше только когда выполнен бирюзовый блок «Куда привести сцену»."),
        ],
        left_width=1.25,
    )

    doc.add_paragraph("Минимум правил", style="GM Subheading")
    add_labeled_line(doc, "Проверка:", rules["core"]["check"] + ".", after=2)
    add_labeled_line(doc, "DC:", "8 легко · 12 обычно · 15 сложно · 18 героически.", after=2)
    add_labeled_line(doc, "Провал:", "выдать обязательную улику с ценой: время, HP, ресурс, активный модуль или ухудшение отношений.", after=2)
    add_labeled_line(doc, "Поражение:", "по описанному fail-forward вернуть героев с 1 HP; смерти без отдельного решения мастера нет.", after=2)

    doc.add_paragraph("Лестница раскрытий", style="GM Subheading")
    reveal_steps = (
        "До гримёрки Крида не называть.",
        "В гримёрке Крид — только артист; Егорик остаётся рабочей гипотезой.",
        "В бунгало Егорика его голос отвергается, а запись раскрывает Крида как жениха.",
        "Имя Игоря впервые говорит сам Крид под сценой.",
        "В вилле новых личностей нет: конфликт — только о доверии, записи и способе спасения.",
    )
    for index, text in enumerate(reveal_steps):
        p = add_compact_bullet(doc, text, bullet_num)
        p.paragraph_format.keep_with_next = index < len(reveal_steps) - 1

    add_box(
        doc,
        "Если игроки придумали непредусмотренный способ",
        "Разрешите эффект, если идея правдоподобна. Затем сопоставьте его с ближайшим результатом сцены: получить улику, открыть проход, снять модуль, заслужить доверие или нанести урон текущему контуру. Обязательный исход сохраняется, форма пути — свободна.",
        fill=COLORS["amber"],
        border=COLORS["gold"],
    )


def add_compact_prologue(doc: Document, headings: list[tuple[int, str, str]],
                         bookmark_counter: list[int]) -> None:
    add_chapter_heading(doc, "Пролог. Пять браслетов", headings, bookmark_counter, page_break=False)
    add_labeled_line(doc, "Задача:", "За минуту отправить пятерых героев на Пенисуэлу. Решений и проверок здесь нет.")
    add_box(
        doc,
        "Прочитать",
        "В таверне Лорда Крайнеплота появляется чёрный конверт без подписи. Внутри — пять золотых браслетов и пять мест на закрытом мальчишнике. Лорд считает приглашение не загадкой, а очередным подтверждением собственных связей.",
        fill=COLORS["parchment"],
        border=COLORS["gold"],
        italic=True,
    )
    add_pair_table(
        doc,
        ("Кто", "Реплика"),
        [
            ("Крайнеплот", "«Пять браслетов. Пять мест. Разумеется, у меня есть ровно пять подходящих людей.»"),
            ("Крайнеплот — Кострюльке", "«Найдёшь пятерых. Если спросят, кто женится, — значит, приглашение составлено правильно.»"),
            ("Кострюлька", "«Курлык.»"),
        ],
        left_width=1.8,
    )
    add_box(
        doc,
        "Переход",
        "Не разыгрывайте дорогу и вечеринку. Передайте управление уже утром в разгромленном люксе.",
        fill=COLORS["mist"],
        border=COLORS["teal"],
    )


def add_compact_scene(doc: Document, scene: dict[str, Any], bullet_num: int,
                      headings: list[tuple[int, str, str]], bookmark_counter: list[int],
                      *, page_break: bool) -> None:
    add_screen_heading(doc, scene["title"], headings, bookmark_counter, page_break=page_break)
    meta = doc.add_paragraph(style="Scene Meta")
    add_inline_runs(meta, f"Оценка времени: {scene['minutes']}", base_color=COLORS["muted"], base_size=8.5)
    add_labeled_line(doc, "Цель:", scene["goal"], after=2)
    add_labeled_line(doc, "Интонация:", scene["tone"], after=3)
    add_box(doc, "Прочитать игрокам", scene["read_aloud"], fill=COLORS["parchment"], border=COLORS["gold"], italic=True)

    doc.add_paragraph("Ход сцены", style="GM Subheading")
    add_pair_table(doc, ("Эпизод", "Что держит мастер"), scene["beats"], left_width=1.55)

    if scene.get("objects"):
        doc.add_paragraph("Предметы и улики", style="GM Subheading")
        add_object_table(doc, scene["objects"])

    doc.add_paragraph("Как играть персонажей", style="GM Subheading")
    add_pair_table(doc, ("Персонаж", "Голос и граница знаний"), scene["voices"], left_width=1.65)

    doc.add_paragraph("Быстрые ответы мастера", style="GM Subheading")
    add_qa_table(doc, scene["qa"])

    doc.add_paragraph("Свобода игроков и fail-forward", style="GM Subheading")
    for text in scene["freedom"]:
        add_compact_bullet(doc, text, bullet_num)

    if scene.get("mechanics"):
        doc.add_paragraph("Три способа закрывать фазы", style="GM Subheading")
        add_pair_table(doc, ("Способ", "Как работает"), scene["mechanics"], left_width=1.65)

    if scene.get("epilogues"):
        doc.add_paragraph("Как выбрать эпилог", style="GM Subheading")
        add_pair_table(doc, ("Последнее действие", "Финальный кадр"), scene["epilogues"], left_width=2.2)

    add_box(doc, "Куда привести сцену", scene["end"], fill=COLORS["mist"], border=COLORS["teal"])


def compact_audit(doc: Document, session: dict[str, Any]) -> None:
    flattened = [screen_id for scene in COMPACT_SCENES for screen_id in scene["screen_ids"]]
    canonical = [scene["id"] for scene in session["scenes"]]
    assert len(COMPACT_SCENES) == 8
    assert len(flattened) == 40
    assert len(flattened) == len(set(flattened))
    assert set(flattened) == set(canonical)
    assert [scene["act"] for scene in COMPACT_SCENES] == sorted(scene["act"] for scene in COMPACT_SCENES)
    section = doc.sections[0]
    assert round(section.page_width.inches, 2) == 8.27
    assert round(section.page_height.inches, 2) == 11.69
    assert doc.styles["Normal"].font.name == "Calibri"
    assert round(doc.styles["Normal"].font.size.pt, 1) == 10.5
    for scene in COMPACT_SCENES:
        assert 3 <= len(scene["beats"]) <= 6
        assert 5 <= len(scene["qa"]) <= 9
        assert 2 <= len(scene["voices"]) <= 3
        assert len(scene["read_aloud"].split()) <= 120


def build(output_path: Path) -> None:
    session = load_json(SESSION_PATH)
    gameplay = load_json(GAMEPLAY_PATH)
    dialogue = load_json(DIALOGUE_PATH)
    final_boss = load_json(FINAL_BOSS_PATH)
    rules = load_json(RULES_PATH)

    assert len(session["scenes"]) == 40
    assert len(gameplay["checks"]) == 18
    assert len(dialogue["presets"]) == 111
    assert len(final_boss["phases"]) == 3

    doc = Document()
    configure_compact_styles(doc)
    configure_compact_header_footer(doc)
    doc.core_properties.title = "Мальчишник конца света — шпаргалка мастера"
    doc.core_properties.subject = "Частный мастерский сценарий по восьми крупным игровым сценам"
    doc.core_properties.author = "Хроники Восьми Земель"
    doc.core_properties.keywords = "D&D, Пенисуэла, книга мастера, сценарий, шпаргалка"
    doc.core_properties.comments = "Собрано из канонического content bundle кампании."

    bullet_num = add_numbering_definition(doc, kind="bullet")
    headings: list[tuple[int, str, str]] = []
    bookmark_counter = [1]

    add_compact_cover(doc)
    doc.add_page_break()
    toc_heading = doc.add_heading("Содержание", level=1)
    add_bookmark(toc_heading, "toc", bookmark_counter[0])
    bookmark_counter[0] += 1
    toc_note = doc.add_paragraph(style="Scene Meta")
    add_inline_runs(toc_note, "В Word оглавление кликабельно. В печатной версии ориентируйтесь по актам и восьми крупным сценам.", base_color=COLORS["muted"], base_size=8.5)
    toc_placeholder = doc.add_paragraph("[[TOC]]")

    add_compact_front_matter(doc, rules, bullet_num, headings, bookmark_counter)
    add_compact_prologue(doc, headings, bookmark_counter)

    for act in COMPACT_ACTS:
        act_scenes = [scene for scene in COMPACT_SCENES if scene["act"] == act["number"]]
        add_chapter_heading(
            doc,
            act["title"],
            headings,
            bookmark_counter,
            page_break=act["number"] == 1,
        )
        add_box(doc, "Задача акта", act["purpose"], fill=COLORS["rose"], border=COLORS["burgundy"])
        for scene in act_scenes:
            add_compact_scene(
                doc,
                scene,
                bullet_num,
                headings,
                bookmark_counter,
                page_break=False,
            )

    materialize_toc(doc, toc_placeholder, headings)
    compact_audit(doc, session)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(output_path)
    print(json.dumps({
        "output": str(output_path),
        "acts": len(COMPACT_ACTS),
        "playableScenes": len(COMPACT_SCENES),
        "coveredUiScreens": sum(len(scene["screen_ids"]) for scene in COMPACT_SCENES),
        "quickAnswers": sum(len(scene["qa"]) for scene in COMPACT_SCENES),
    }, ensure_ascii=False, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "docs/campaigns/penisuela/penisuela-gm-master-guide.docx",
    )
    args = parser.parse_args()
    build(args.output.resolve())


if __name__ == "__main__":
    main()
