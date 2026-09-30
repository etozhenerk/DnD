"""Check gofmt only for Go paths introduced after the agreed baseline."""

import json
from pathlib import Path, PurePosixPath
import subprocess
import sys


def read_legacy_files(baseline):
    data = json.loads(baseline.read_text())
    if data.get("version") != 1 or not isinstance(data.get("legacyFiles"), list):
        raise ValueError("unsupported code-style baseline")
    paths = data["legacyFiles"]
    for path in paths:
        if not isinstance(path, str):
            raise ValueError("baseline paths must be strings")
        relative = PurePosixPath(path)
        if relative.is_absolute() or ".." in relative.parts or relative.suffix != ".go":
            raise ValueError("baseline paths must be relative Go filenames")
    if len(set(paths)) != len(paths):
        raise ValueError("duplicate baseline path")
    return set(paths)


def tracked_go_files(root):
    result = subprocess.run(
        ["git", "ls-files", "-z", "--", "*.go"],
        cwd=root, check=True, capture_output=True,
    )
    return [path.decode("utf-8") for path in result.stdout.split(b"\0") if path]


def unformatted_files(root, paths):
    if not paths:
        return []
    result = subprocess.run(
        ["gofmt", "-l", *paths], cwd=root,
        check=True, capture_output=True, text=True,
    )
    return result.stdout.splitlines()


def main():
    root = Path(__file__).resolve().parents[1]
    legacy = read_legacy_files(root / "code-style-baseline.json")
    files = [path for path in tracked_go_files(root) if path not in legacy]
    failures = unformatted_files(root, files)
    for path in failures:
        print(f"backend/{path}: run gofmt", file=sys.stderr)
    print(f"Go style: checked {len(files)} new files; legacy paths excluded")
    return bool(failures)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f"Go style check failed: {error}", file=sys.stderr)
        sys.exit(1)
