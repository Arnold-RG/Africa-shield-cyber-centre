"""Fail if old public names are present in project files.

The names are stored as code points so this file does not contain them.
Cached feed output is skipped: a public indicator can contain any substring,
and altering it would change the evidence.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv"}
SKIP_FILES = {Path("public/data/snapshot.json")}


def forbidden() -> list[str]:
    def word(*codes: int) -> str:
        return "".join(chr(code) for code in codes)

    return [
        word(97, 114, 110, 111, 118, 97),
        word(97, 116, 101, 99, 107),
        word(107, 105, 110, 103, 32, 119, 104, 105, 115, 112, 101, 114),
    ]


def scan(root: Path = ROOT) -> list[str]:
    needles = forbidden()
    hits = []
    for path in root.rglob("*"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if not path.is_file():
            continue
        relative = path.relative_to(root)
        if relative in SKIP_FILES:
            continue
        folded = path.name.casefold()
        for needle in needles:
            if needle in folded:
                hits.append(f"{relative}: filename")
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        lowered = text.casefold()
        for needle in needles:
            if needle in lowered:
                hits.append(f"{relative}: contains a forbidden public name")
                break
    return hits


def main() -> int:
    hits = scan()
    if hits:
        print("privacy scan failed:", file=sys.stderr)
        for hit in hits:
            print(hit, file=sys.stderr)
        return 1
    print("privacy scan: no forbidden public names")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
