# GPU-сервер ИИ-мастера

Пилот: официальный [Qwen3.8-27B](https://huggingface.co/Qwen/Qwen3.8-27B), Apache 2.0, BF16. Зафиксирован commit модели `1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0`. Сервер использует официальный контейнер vLLM `v0.28.0`; веса скачиваются **на диск ВМ**, локальная машина их не получает.

Профиль ВМ: Yandex Cloud `gpu-standard-v3`, 1 × A100 80 ГБ, 28 vCPU, 119 ГБ RAM, SSD 150 ГБ, образ `ubuntu-2204-lts-cuda-12-2`, зона `ru-central1-a`. Модель обслуживает текст; распознавание и синтез речи пока не подключены. Для игры нужен отдельный бэкенд, который будет передавать состояние и разрешённые действия, а проверять правила и броски сам.

`install.sh` запускается **на ВМ** через cloud-init boothook и модуль `scripts-per-boot`: локально упаковываются только небольшие скрипты и страница UI, а контейнер и веса загружает сама ВМ. Скрипт проверяет драйвер, Docker и NVIDIA container runtime, сохраняет сервисы в systemd и запускает vLLM. API слушает только `127.0.0.1:8000`. Отдельный пробный чат на порту `8080` открыт без входа, имеет несколько текстовых режимов и не получает данные кампании. ВМ остановлена 28 сентября 2026 года по просьбе владельца; таймер автоматического выключения отключён, остановка выполняется вручную. Пока ВМ остановлена, GPU и vCPU не оплачиваются, диск и зарезервированный IP продолжают тарифицироваться.

Созданные ресурсы: ВМ `dnd-llm-qwen38` (`fhmf0kvjr3cgit7j5eg0`) в каталоге `b1g8siv8ve2si1qp04nm`, группа безопасности `dnd-llm-ssh` (`enpcdfodrmjnev3lfn36`). Публичный IP `89.169.133.106` зарезервирован. Правило SSH допускает только согласованный IPv4; при смене внешнего адреса его потребуется обновить.

Первичная установка через метаданные ВМ, когда прямой SSH недоступен:

```bash
python3 infra/llm/make-boothook.py /tmp/dnd-llm-boothook.sh
yc compute instance add-metadata dnd-llm-qwen38 \
  --folder-id b1g8siv8ve2si1qp04nm \
  --metadata-from-file user-data=/tmp/dnd-llm-boothook.sh
yc compute instance start dnd-llm-qwen38 --folder-id b1g8siv8ve2si1qp04nm
yc compute instance get-serial-port-output dnd-llm-qwen38 \
  --folder-id b1g8siv8ve2si1qp04nm --port 1 | grep DND_LLM
```

После установки локальный SSH-туннель к API: `ssh -i ~/.ssh/dnd-yc-gpu -L 8000:127.0.0.1:8000 yc-user@<IP-ВМ>`.

Пробный чат: `http://89.169.133.106:8080/`. Вход не требуется. Режимы «Свободный чат», «Мастер», «Персонаж», «Враги», «Идеи мира» и «Разбор текста» используют разные системные инструкции. Ответ приходит потоком и отображается с базовым Markdown-форматированием. У каждого режима своя история в `localStorage` браузера. Enter отправляет сообщение, Shift+Enter добавляет строку. Это временная публичная HTTP-страница без TLS; не вводите в неё приватные данные.

```bash
# На ВМ, из каталога с этими файлами:
bash install.sh
sudo journalctl -u dnd-qwen38 -f

# После старта модели, на ВМ:
curl --fail --silent http://127.0.0.1:8000/health
curl --fail --silent http://127.0.0.1:8000/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen3.8-27b","messages":[{"role":"user","content":"Ответь по-русски одним предложением: где мы?"}],"max_tokens":128,"chat_template_kwargs":{"enable_thinking":false}}'
```

Расчёт по [тарифам Compute Cloud](https://github.com/yandex-cloud/docs/blob/master/md-docs/compute/pricing.md): A100 + CPU + RAM ≈472,37 ₽ за час работы, SSD 150 ГБ ≈2 149 ₽ за 30 дней. Калькулятор показывает около **342 тыс. ₽/мес**, если держать эту ВМ включённой круглосуточно. Это не подходит под общий лимит 18 000 ₽ в месяц. С учётом отдельной ВМ для фронта, бэкенда и БД, а также резерва на речь, [смета пилота](../../docs/llm-gm-yandex-cloud-plan.md) отводит примерно **20 часов работы A100 в месяц** на установку, тесты и партии. Три часа работы одной ВМ — примерно 1 417 ₽ вычислений. Проверяйте статус и счёт: отключённый таймер сейчас не ограничивает расходы.

```bash
yc compute instance start dnd-llm-qwen38 --folder-id b1g8siv8ve2si1qp04nm
yc compute instance stop dnd-llm-qwen38 --folder-id b1g8siv8ve2si1qp04nm
```
