#!/usr/bin/env bash
set -euo pipefail

# The model is downloaded directly from Hugging Face into the VM's disk.
exec /usr/bin/docker run --rm \
  --name dnd-qwen38 \
  --gpus all \
  --network host \
  --ipc host \
  --env VLLM_ENABLE_CUDA_COMPATIBILITY=1 \
  --env HF_HOME=/models/huggingface \
  --mount type=bind,src=/srv/dnd-llm/huggingface,dst=/models/huggingface \
  vllm/vllm-openai:v0.28.0 \
  --model Qwen/Qwen3.8-27B \
  --revision 1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0 \
  --tokenizer-revision 1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0 \
  --served-model-name qwen3.8-27b \
  --host 127.0.0.1 \
  --port 8000 \
  --max-model-len 16384 \
  --max-num-seqs 6 \
  --gpu-memory-utilization 0.90 \
  --language-model-only \
  --reasoning-parser qwen3 \
  --enable-auto-tool-choice \
  --tool-call-parser qwen3_xml
