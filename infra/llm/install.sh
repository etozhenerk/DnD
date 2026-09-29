#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v nvidia-smi >/dev/null; then
  echo 'NVIDIA driver is missing' >&2
  exit 1
fi
if ! command -v docker >/dev/null; then
  echo 'Docker is missing from the GPU image' >&2
  exit 1
fi
if ! sudo docker info --format '{{json .Runtimes}}' | grep -q 'nvidia'; then
  echo 'NVIDIA container runtime is missing' >&2
  exit 1
fi

sudo install -d -m 755 /srv/dnd-llm/huggingface
sudo install -m 755 "$script_dir/run-qwen38.sh" /usr/local/bin/dnd-qwen38
sudo install -d -m 755 /opt/dnd-llm
if [[ "$script_dir/trial-ui.py" != /opt/dnd-llm/trial-ui.py ]]; then
  sudo install -m 644 "$script_dir/trial-ui.py" /opt/dnd-llm/trial-ui.py
fi
if [[ "$script_dir/trial-ui.html" != /opt/dnd-llm/trial-ui.html ]]; then
  sudo install -m 644 "$script_dir/trial-ui.html" /opt/dnd-llm/trial-ui.html
fi
sudo install -m 644 "$script_dir/dnd-qwen38.service" /etc/systemd/system/
sudo install -m 644 "$script_dir/dnd-trial-ui.service" /etc/systemd/system/
sudo install -m 644 "$script_dir/dnd-llm-autostop.service" /etc/systemd/system/
sudo install -m 644 "$script_dir/dnd-llm-autostop.timer" /etc/systemd/system/

sudo systemctl daemon-reload
sudo docker pull vllm/vllm-openai:v0.28.0
sudo systemctl enable dnd-qwen38.service
sudo systemctl restart dnd-qwen38.service
sudo systemctl enable --now dnd-trial-ui.service

echo 'vLLM is starting. Check: sudo journalctl -u dnd-qwen38 -f'
