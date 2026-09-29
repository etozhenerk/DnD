#!/usr/bin/env bash
set -Eeuo pipefail

done_file=/srv/dnd-llm/bootstrap-ui-complete
if [[ -f "$done_file" ]]; then
  exit 0
fi

log_file=/var/log/dnd-llm-bootstrap.log
serial=/dev/ttyS0
report() { printf 'DND_LLM: %s\n' "$1" > "$serial"; }
fail() {
  report 'BOOTSTRAP_FAILED; check /var/log/dnd-llm-bootstrap.log'
  tail -n 20 "$log_file" > "$serial" || true
}
trap fail ERR

systemctl disable --now dnd-llm-autostop.timer || true
/sbin/shutdown -c || true
mkdir -p /srv/dnd-llm
exec >> "$log_file" 2>&1
report 'BOOTSTRAP_STARTED'
nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader > "$serial"

bash /opt/dnd-llm/install.sh
report 'VLLM_IMAGE_READY; model is downloading on VM'

healthy=false
for _ in {1..180}; do
  if curl --fail --silent http://127.0.0.1:8000/health > /dev/null; then
    healthy=true
    break
  fi
  sleep 20
done
if [[ "$healthy" != true ]]; then
  journalctl -u dnd-qwen38 --no-pager -n 30 >> "$log_file" || true
  false
fi
report 'VLLM_HEALTHY'

curl --fail --silent --show-error http://127.0.0.1:8000/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen3.8-27b","messages":[{"role":"user","content":"Ответь по-русски одним предложением: кто ведёт нашу игру?"}],"max_tokens":96,"chat_template_kwargs":{"enable_thinking":false}}' \
  > /srv/dnd-llm/smoke-response.json
python3 - <<'PY' > "$serial"
import json
from pathlib import Path
data = json.loads(Path('/srv/dnd-llm/smoke-response.json').read_text())
answer = data['choices'][0]['message']['content']
print('DND_LLM_SMOKE_ANSWER:', answer[:300])
PY
touch "$done_file"
report 'BOOTSTRAP_COMPLETE; VM remains running'
