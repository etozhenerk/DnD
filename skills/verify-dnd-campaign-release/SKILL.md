---
name: verify-dnd-campaign-release
description: Verify a D&D campaign release with terminal checks and Codex's built-in in-app browser. Use when validating content links, typecheck, production builds, routes, console errors, responsive layout, campaign interaction, abilities, initiative, NPC behavior, dialogue presets, manual stat edits, localStorage recovery, global consequences, and screenshots without standalone Playwright.
---

# Проверка релиза кампании

Провести техническую, интерактивную и визуальную приёмку. Для браузерной части использовать только встроенный браузер Codex.

## Подготовка

1. Прочитать `AGENTS.md`, [браузерный чеклист](references/browser-checklist.md) и затронутые документы кампании.
2. Применить `$maintain-dnd-world` и устранить контентные блокеры.
3. Запустить `npm run typecheck`, `npm run build` и `npm run build:pages`.
4. Запустить локальный dev или preview server без Playwright.

## Встроенный браузер

Перед любым браузерным действием загрузить и полностью соблюдать `browser:control-in-app-browser`. Пользователь явно выбрал in-app browser, поэтому открыть отдельное persistent in-app binding и не подменять его Chrome, standalone Playwright, `playwright-cli` или `$playwright-interactive`.

Открыть локальное приложение, пройти весь чеклист, инспектировать видимое и интерактивное состояние, консоль и размеры документа, а контрольные скриншоты делать средствами встроенного браузера.

## Fallback

Если встроенный браузер недоступен или не подключается, остановить браузерную часть, сообщить блокер и попросить отдельное разрешение на другой инструмент. Не запускать standalone Playwright автоматически даже при долгой или неудачной проверке.

## Результат

Выдать команды и их результаты, проверенные маршруты и сценарии, размеры viewport, ошибки консоли, найденные дефекты, скриншоты и непроверенные пункты. Не объявлять релиз готовым при блокирующей ошибке или неполной обязательной проверке.
