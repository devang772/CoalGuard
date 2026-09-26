"""Ingest a regulation PDF into numbered regulations for the obligation engine.

    python -m app.ai.ingest_regulations "../model/regulations/Coal Mines Regulation 2017.pdf"

Writes app/ai/data/cmr2017.json: [{"n": 75, "title": "...", "page": 41, "text": "..."}]. The engine reads this
file at runtime, so the (slow, ~15 s) PDF parsing happens once, not on every profile save.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pdfplumber

DATA_DIR = Path(__file__).resolve().parent / "data"
OUTPUT = DATA_DIR / "cmr2017.json"
DEFAULT_PDF = Path(__file__).resolve().parents[3] / "model" / "regulations" / "Coal Mines Regulation 2017.pdf"

# "75. Periodic examination of shaft, incline and other outlets.— (1) Every shaft ..."
HEADING = re.compile(r"^(\d{1,3})\.\s+([A-Z][^—\-–�]{3,160}?)[.\s]*[—\-–�]")
NOISE = ("GAZETTE OF INDIA", "Hkkx II", "[PART II", "[Hkkx")


def parse_regulations(pdf_path: Path) -> list[dict]:
    lines: list[tuple[int, str]] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_no, page in enumerate(pdf.pages, start=1):
            for line in (page.extract_text() or "").split("\n"):
                if not any(mark in line for mark in NOISE):
                    lines.append((page_no, line))
    regulations: list[dict] = []
    current: dict | None = None
    for page_no, line in lines:
        match = HEADING.match(line)
        # a heading must continue the numbering (1, 2, 3 ...), so numbered list items inside a regulation don't
        # start a new one
        if match and (current is None or int(match.group(1)) in (current["n"] + 1, current["n"] + 2)):
            current = {"n": int(match.group(1)), "title": match.group(2).strip(" .,"), "page": page_no, "text": line}
            regulations.append(current)
        elif current is not None:
            current["text"] += " " + line
    for regulation in regulations:
        regulation["text"] = re.sub(r"\s+", " ", regulation["text"].replace("�", "—")).strip()
    return regulations


def main() -> None:
    pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF
    regulations = parse_regulations(pdf_path)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({"source": pdf_path.name, "short_name": "CMR 2017", "regulations": regulations},
                                 ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"{len(regulations)} regulations from {pdf_path.name} -> {OUTPUT}")


if __name__ == "__main__":
    main()
