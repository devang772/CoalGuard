from __future__ import annotations

import difflib
import hashlib
import re
from pathlib import Path
from typing import Any

import pdfplumber
from pydantic import BaseModel, Field, ValidationError

from app.ai.inspection_types import INSPECTION_TYPES, VALID_MINE_TYPES
from app.ai.llm import llm_json


# -------------------------------------------------------------------
# Pydantic schema
# -------------------------------------------------------------------

ALLOWED_CATEGORIES = {
    "safety",
    "environment",
    "labour",
    "production",
}

ALLOWED_FREQUENCIES = {
    "daily",
    "weekly",
    "monthly",
    "quarterly",
    "yearly",
}

ALLOWED_SEVERITIES = {
    "low",
    "medium",
    "high",
    "critical",
}


class ExtractedRule(BaseModel):
    title: str = Field(min_length=3)
    obligation_text: str = Field(min_length=3)

    law_ref: str | None = None

    category: str | None = None
    frequency: str | None = None

    responsible_role: str | None = None

    mine_types: list[str] = []
    inspection_types: list[str] = []

    evidence_needed: list[str] = []

    severity: str | None = None

    source_text: str = Field(min_length=10)


class ExtractionResponse(BaseModel):
    obligations: list[ExtractedRule]


# -------------------------------------------------------------------
# Text extraction
# -------------------------------------------------------------------

def extract_pdf_pages(pdf_path: str) -> list[dict[str, Any]]:
    """
    Extract text page-by-page so we can preserve source page number.
    """

    pages = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):

            text = page.extract_text() or ""

            text = text.strip()

            if not text:
                continue

            pages.append(
                {
                    "page": page_number,
                    "text": text,
                }
            )

    return pages


# -------------------------------------------------------------------
# Chunking
# -------------------------------------------------------------------

def chunk_text(
    text: str,
    max_chars: int = 6000,
) -> list[str]:

    paragraphs = re.split(r"\n\s*\n", text)

    chunks = []
    current = ""

    for paragraph in paragraphs:

        paragraph = paragraph.strip()

        if not paragraph:
            continue

        candidate = (
            f"{current}\n\n{paragraph}"
            if current
            else paragraph
        )

        if len(candidate) <= max_chars:
            current = candidate

        else:
            if current:
                chunks.append(current)

            # Extremely long paragraph
            if len(paragraph) > max_chars:

                for i in range(0, len(paragraph), max_chars):
                    chunks.append(
                        paragraph[i:i + max_chars]
                    )

                current = ""

            else:
                current = paragraph

    if current:
        chunks.append(current)

    return chunks


# -------------------------------------------------------------------
# Source validation
# -------------------------------------------------------------------

def normalize_text(text: str) -> str:

    text = text.lower()

    text = re.sub(r"\s+", " ", text)

    return text.strip()


def source_text_supported(
    source_text: str,
    source_chunk: str,
) -> bool:

    source_norm = normalize_text(source_text)
    chunk_norm = normalize_text(source_chunk)

    # Best case: exact normalized substring
    if source_norm in chunk_norm:
        return True

    # Fuzzy fallback
    similarity = difflib.SequenceMatcher(
        None,
        source_norm,
        chunk_norm,
    ).ratio()

    return similarity >= 0.80


# -------------------------------------------------------------------
# Validation
# -------------------------------------------------------------------

def validate_rule(
    rule: ExtractedRule,
    source_chunk: str,
) -> ExtractedRule | None:

    # Category
    if rule.category is not None:
        if rule.category not in ALLOWED_CATEGORIES:
            return None

    # Frequency
    if rule.frequency is not None:
        if rule.frequency not in ALLOWED_FREQUENCIES:
            return None

    # Severity
    if rule.severity is not None:
        if rule.severity not in ALLOWED_SEVERITIES:
            return None

    # Mine types
    for mine_type in rule.mine_types:
        if mine_type not in VALID_MINE_TYPES:
            return None

    # Inspection types
    for inspection_type in rule.inspection_types:
        if inspection_type not in INSPECTION_TYPES:
            return None

    # Most important hallucination check
    if not source_text_supported(
        rule.source_text,
        source_chunk,
    ):
        return None

    return rule


# -------------------------------------------------------------------
# Deduplication
# -------------------------------------------------------------------

def normalize_title(title: str) -> str:

    title = title.lower()

    title = re.sub(r"[^a-z0-9]+", " ", title)

    return re.sub(r"\s+", " ", title).strip()


def deduplicate_rules(
    rules: list[tuple[ExtractedRule, int]],
) -> list[tuple[ExtractedRule, int]]:

    seen = set()

    unique = []

    for rule, page in rules:

        title_key = normalize_title(rule.title)

        inspection_key = tuple(
            sorted(rule.inspection_types)
        )

        key = (
            title_key,
            inspection_key,
        )

        if key in seen:
            continue

        seen.add(key)

        unique.append((rule, page))

    return unique


# -------------------------------------------------------------------
# Rule ID
# -------------------------------------------------------------------

def generate_rule_id(
    document_name: str,
    page: int,
    title: str,
) -> str:

    raw = (
        f"{document_name}|{page}|{title}"
    ).encode("utf-8")

    digest = hashlib.sha1(raw).hexdigest()[:12]

    return f"AI-RULE-{digest}"


# -------------------------------------------------------------------
# Main ingestion
# -------------------------------------------------------------------

def extract_rules_from_pdf(
    pdf_path: str,
) -> list[dict[str, Any]]:

    pdf_path = str(Path(pdf_path))

    document_name = Path(pdf_path).name

    pages = extract_pdf_pages(pdf_path)

    extracted: list[
        tuple[ExtractedRule, int]
    ] = []

    system_prompt = Path(
        __file__
    ).parent.joinpath(
        "prompts",
        "regulatory_extraction.txt",
    ).read_text(
        encoding="utf-8"
    )

    schema_hint = """
{
  "obligations": [
    {
      "title": "...",
      "obligation_text": "...",
      "law_ref": "...",
      "category": "safety",
      "frequency": "daily",
      "responsible_role": "...",
      "mine_types": ["opencast"],
      "inspection_types": ["haul_road"],
      "evidence_needed": ["photo"],
      "severity": "high",
      "source_text": "..."
    }
  ]
}
"""

    for page_info in pages:

        page_number = page_info["page"]

        chunks = chunk_text(
            page_info["text"]
        )

        for chunk in chunks:

            response = llm_json(
                system=system_prompt,
                user=chunk,
                schema_hint=schema_hint,
            )

            try:
                parsed = ExtractionResponse.model_validate(
                    response
                )

            except ValidationError:
                continue

            for rule in parsed.obligations:

                validated = validate_rule(
                    rule,
                    chunk,
                )

                if validated:
                    extracted.append(
                        (
                            validated,
                            page_number,
                        )
                    )

    extracted = deduplicate_rules(
        extracted
    )

    result = []

    for rule, page in extracted:

        result.append(
            {
                "rule_id": generate_rule_id(
                    document_name,
                    page,
                    rule.title,
                ),
                "source_document": document_name,
                "source_page": page,
                "law_ref": rule.law_ref,
                "title": rule.title,
                "obligation_text": rule.obligation_text,
                "category": rule.category,
                "frequency": rule.frequency,
                "responsible_role": rule.responsible_role,
                "mine_types": rule.mine_types,
                "inspection_types": rule.inspection_types,
                "evidence_needed": rule.evidence_needed,
                "severity": rule.severity,
                "source_text": rule.source_text,
                "status": "draft",
                "created_by_ai": True,
            }
        )

    return result
