# Общие контракты

[`api/openapi.yaml`](api/openapi.yaml) — источник истины для HTTP-контракта между фронтендом и Go-бэкендом. Здесь хранятся спецификации, а не общий TypeScript-код. Создаваемые по спецификации файлы должны находиться внутри соответствующего проекта.

`api/proposals/` содержит будущие изменения контракта: `draft` до утверждения и `approved-design` после него, до реализации в API. [Навыки конструктора v1](api/proposals/character-abilities-v1.yaml) утверждены 30 сентября 2026 года вместе с [правилами и примерами](../docs/architecture/character-abilities-v1/gameplay-notes.md). Канонические числа находятся в [content/character-abilities.json](../content/character-abilities.json); перенос схем в основной контракт выполняется при серверной реализации.
