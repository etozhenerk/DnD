#!/usr/bin/env bash
set -Eeuo pipefail

if ! command -v docker >/dev/null; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y docker.io ca-certificates curl
fi

systemctl enable --now docker
install -d -m 755 /srv/dnd-llm/cache /opt/dnd-llm
install -m 755 /opt/dnd-llm/run-qwen35.sh /usr/local/bin/dnd-qwen35
install -m 644 /opt/dnd-llm/dnd-qwen35.service /etc/systemd/system/
install -m 644 /opt/dnd-llm/dnd-trial-ui.service /etc/systemd/system/

systemctl daemon-reload
docker pull ghcr.io/ggml-org/llama.cpp:server
systemctl enable --now dnd-qwen35.service dnd-trial-ui.service
