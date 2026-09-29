#!/usr/bin/env bash

set -euo pipefail

bucket_name="${YC_FRONTEND_BUCKET:-}"
yc_bin="${YC_BIN:-yc}"

if [[ -z "$bucket_name" ]]; then
  echo "Set YC_FRONTEND_BUCKET to the target Object Storage bucket." >&2
  exit 2
fi

if ! command -v "$yc_bin" >/dev/null 2>&1; then
  echo "Yandex Cloud CLI is unavailable: $yc_bin" >&2
  exit 2
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

npm run build

# Publish assets first. The entry point changes only after every referenced file exists.
"$yc_bin" storage s3 cp dist/ "s3://$bucket_name/" \
  --recursive \
  --exclude '404.html' \
  --exclude 'index.html' \
  --cache-control 'public, max-age=3600' \
  --only-show-errors

"$yc_bin" storage s3 cp dist/index.html "s3://$bucket_name/index.html" \
  --content-type text/html \
  --cache-control 'no-cache, max-age=0'

echo "Frontend published at https://$bucket_name.website.yandexcloud.net/"
