#!/usr/bin/env bash
set -Eeuo pipefail

mkdir -p /srv/dnd-llm/cache
cache_root=/srv/dnd-llm/cache
model_file=$(find "$cache_root/models--unsloth--Qwen3.5-9B-GGUF/blobs" -maxdepth 1 -type f -size +4G -print -quit 2>/dev/null || true)
if [[ -n "$model_file" ]]; then
  model_arg=(-m "/root/.cache/llama.cpp${model_file#"$cache_root"}")
else
  model_arg=(-hf unsloth/Qwen3.5-9B-GGUF:Q4_K_M)
fi

exec /usr/bin/docker run --rm \
  --name dnd-qwen35 \
  --network host \
  --memory 13g \
  --cpus "$(nproc)" \
  -v /srv/dnd-llm/cache:/root/.cache/llama.cpp \
  -e LLAMA_CACHE=/root/.cache/llama.cpp \
  ghcr.io/ggml-org/llama.cpp:server \
  "${model_arg[@]}" \
  --no-mmproj \
  --alias qwen3.5-9b \
  --host 127.0.0.1 \
  --port 8000 \
  --ctx-size 16384 \
  --parallel 2 \
  --threads 4 \
  --threads-batch 4
