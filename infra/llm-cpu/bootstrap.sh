#!/usr/bin/env bash
set -Eeuo pipefail

done_file=/srv/dnd-llm/bootstrap-cpu-complete
if [[ -f "$done_file" ]]; then
  if ! cmp -s /opt/dnd-llm/run-qwen35.sh /usr/local/bin/dnd-qwen35; then
    install -m 755 /opt/dnd-llm/run-qwen35.sh /usr/local/bin/dnd-qwen35
    systemctl restart dnd-qwen35.service
  fi
  systemctl restart dnd-trial-ui.service
  echo DND_CPU_UPDATE_APPLIED > /dev/ttyS0
  exit 0
fi

log_file=/var/log/dnd-llm-cpu-bootstrap.log
serial=/dev/ttyS0
report() { printf 'DND_CPU: %s\n' "$1" > "$serial"; }
fail() {
  report 'BOOTSTRAP_FAILED; check /var/log/dnd-llm-cpu-bootstrap.log'
  tail -n 20 "$log_file" > "$serial" || true
}
trap fail ERR

mkdir -p /srv/dnd-llm
exec >> "$log_file" 2>&1
report 'BOOTSTRAP_STARTED'
bash /opt/dnd-llm/install.sh
report 'MODEL_IMAGE_READY; model is downloading on VM'

healthy=false
for _ in {1..120}; do
  if curl --fail --silent http://127.0.0.1:8000/health > /dev/null; then
    healthy=true
    break
  fi
  sleep 15
done
if [[ "$healthy" != true ]]; then
  journalctl -u dnd-qwen35 --no-pager -n 30 >> "$log_file" || true
  false
fi
report 'MODEL_HEALTHY'

curl --fail --silent --show-error --max-time 300 \
  http://127.0.0.1:8000/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen3.5-9b","messages":[{"role":"user","content":"Ответь по-русски одним предложением: кто ведёт нашу игру?"}],"max_tokens":96,"chat_template_kwargs":{"enable_thinking":false}}' \
  > /srv/dnd-llm/smoke-response.json
python3 - <<'PY' > "$serial"
import json
from pathlib import Path
data = json.loads(Path('/srv/dnd-llm/smoke-response.json').read_text())
answer = data['choices'][0]['message']['content']
print('DND_CPU_SMOKE_ANSWER:', answer[:300])
PY
touch "$done_file"
report 'BOOTSTRAP_COMPLETE; VM remains running'
