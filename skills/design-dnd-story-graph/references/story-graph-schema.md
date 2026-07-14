# Контракт сюжетного графа

## Корень

```json
{
  "version": 1,
  "campaignId": "example-campaign",
  "recommendedDurationMinutes": {"min": 180, "max": 360},
  "criticalClues": [
    {"id": "true-name", "sourceSceneIds": ["archive", "witness"]}
  ],
  "nodes": []
}
```

## Узел

Обязательные поля: `id`, `title`, `type`, `expectedMinutes`, `transitions`.

Необязательные поля:

- `start: true` — допустимый старт;
- `ending: true` — финал;
- `optional: true` — необязательная сцена;
- `allowCycle: true` — цикл отдельно утверждён пользователем;
- `clueIds` — получаемые улики;
- `transitions` — исходящие переходы.

## Переход

```json
{
  "to": "next-scene",
  "label": "Пойти в архив",
  "condition": {
    "all": [
      {"flag": "archive-open", "equals": true},
      {"counter": "suspicion", "lt": 3}
    ]
  },
  "effects": [
    {"type": "set-flag", "flag": "visited-archive", "value": true}
  ]
}
```

Допустимые условия: `all`, `any`, `not`, `flag` с `equals`, `counter` с `eq`, `gt`, `gte`, `lt` или `lte`, а также `{ "otherwise": true }`. Произвольный JavaScript запрещён.

Если узел содержит условные переходы, предусмотреть безусловный переход или `otherwise`.

## Улики

Каждая критическая улика должна иметь минимум две разные сцены-источника. Потеря одной проверки не должна останавливать кампанию.
