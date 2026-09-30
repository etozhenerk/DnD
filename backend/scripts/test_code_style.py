"""Verify that the format gate catches new code and exempts existing code."""

import json
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import unittest

from check_code_style import read_legacy_files, tracked_go_files, unformatted_files


class CodeStyleTests(unittest.TestCase):
    def setUp(self):
        self.directory = TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        subprocess.run(["git", "init", "-q"], cwd=self.root, check=True)

    def add_file(self, name, source):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(source)
        subprocess.run(["git", "add", "--", name], cwd=self.root, check=True)

    def test_legacy_remains_exempt_after_changes(self):
        self.add_file("legacy.go", "package main\nfunc old( ) {}\n")
        self.add_file("new.go", "package main\n\nfunc fresh() {}\n")
        legacy_path = self.root / "baseline.json"
        legacy_path.write_text(json.dumps({"version": 1, "legacyFiles": ["legacy.go"]}))
        legacy = read_legacy_files(legacy_path)
        paths = [path for path in tracked_go_files(self.root) if path not in legacy]
        self.assertEqual(paths, ["new.go"])
        self.assertEqual(unformatted_files(self.root, paths), [])
        (self.root / "legacy.go").write_text("package main\nfunc old( ){ println(1) }\n")
        self.assertEqual(unformatted_files(self.root, paths), [])

    def test_new_unformatted_file_is_reported(self):
        self.add_file("internal/new.go", "package example\nfunc fresh( ) {}\n")
        self.assertEqual(
            unformatted_files(self.root, tracked_go_files(self.root)),
            ["internal/new.go"],
        )

    def test_invalid_go_is_not_silently_accepted(self):
        self.add_file("broken.go", "package example\nfunc {\n")
        with self.assertRaises(subprocess.CalledProcessError):
            unformatted_files(self.root, tracked_go_files(self.root))

    def test_empty_new_file_set_never_runs_formatter(self):
        self.assertEqual(unformatted_files(self.root, []), [])

    def test_invalid_baseline_path_is_rejected(self):
        path = self.root / "baseline.json"
        path.write_text(json.dumps({"version": 1, "legacyFiles": ["../other.go"]}))
        with self.assertRaises(ValueError):
            read_legacy_files(path)


if __name__ == "__main__":
    unittest.main()
