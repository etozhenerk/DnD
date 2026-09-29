#!/usr/bin/env python3
"""Package the small setup scripts as Yandex Cloud user-data; no model files."""

import base64
import pathlib
import sys


ROOT = pathlib.Path(__file__).resolve().parent
FILES = (
    "bootstrap.sh",
    "install.sh",
    "run-qwen38.sh",
    "trial-ui.py",
    "trial-ui.html",
    "dnd-qwen38.service",
    "dnd-trial-ui.service",
    "dnd-llm-autostop.service",
    "dnd-llm-autostop.timer",
)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: make-boothook.py OUTPUT_FILE")

    lines = [
        "#cloud-boothook",
        "#!/bin/sh",
        "set -eu",
        "mkdir -p /opt/dnd-llm /var/lib/cloud/scripts/per-boot",
    ]
    for name in FILES:
        encoded = base64.b64encode((ROOT / name).read_bytes()).decode("ascii")
        lines.extend(
            (
                f"base64 -d > /opt/dnd-llm/{name} <<'DND_FILE_{name.replace('.', '_').replace('-', '_')}'",
                encoded,
                f"DND_FILE_{name.replace('.', '_').replace('-', '_')}",
            )
        )
    lines.extend(
        (
            "rm -f /opt/dnd-llm/trial-ui-token",
            "chmod 755 /opt/dnd-llm/bootstrap.sh /opt/dnd-llm/install.sh /opt/dnd-llm/run-qwen38.sh",
            "cp /opt/dnd-llm/bootstrap.sh /var/lib/cloud/scripts/per-boot/90-dnd-bootstrap",
            "chmod 755 /var/lib/cloud/scripts/per-boot/90-dnd-bootstrap",
            "echo DND_LLM_BOOTHOOK_READY > /dev/ttyS0",
        )
    )
    pathlib.Path(sys.argv[1]).write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
