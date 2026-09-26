"""ML obligation engine: mine profile -> obligations, grounded in the ingested law (Coal Mines Regulations 2017).

Called by app.services.obligation_sync as `recommend_obligations(profile)`. Three steps:

1. Law index. The regulations ingested by app.ai.ingest_regulations (app/ai/data/cmr2017.json) are turned into
   TF-IDF vectors (words + word pairs), so any duty can be matched to the regulation that says it.
2. Catalogue duties. Every approved obligation in the catalogue is checked against the profile (its legal
   conditions, e.g. "underground only", "uses explosives"). Each one that applies is matched to its regulation by
   cosine similarity; the regulation number, page and wording are added to the explanation.
3. Duties found in the law. Sentences of the regulations that set a recurring duty ("... shall be examined once
   at least in every seven days ...") are extracted, their scope (underground / open-cast / explosives /
   conveyors / surface water) is read from the text, and those that fit the profile and are not already covered
   by a catalogue duty are recommended as new obligations (code CMR-<reg>-<sub-regulation>).

Returns items in the format obligation_sync expects: code, title, category, frequency, severity, law_ref,
evidence_needed, source_text, reason, confidence, due_rule.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import select

LAW_FILE = Path(__file__).resolve().parent / "data" / "cmr2017.json"
GROUND_MIN_SIM = 0.08        # the best regulation must be at least this similar ...
GROUND_MARGIN = 0.02         # ... and clearly better than the runner-up; otherwise no regulation is cited
FOUND_CONFIDENCE = 0.8       # law duties are matched by pattern + scope, not checked by a person yet

# ---------------------------------------------------------------- recurring-duty extraction
_FREQUENCIES = [  # (pattern in the law, how the law says it, task frequency we schedule)
    (r"\b(every|each) shift\b|once in every shift", "every shift", "daily"),
    (r"every twenty-four hours|every day\b|\bdaily\b", "every day", "daily"),
    (r"every seven days|every week\b|once a week", "every seven days", "weekly"),
    (r"every (fourteen|fifteen) days|fortnight", "every fourteen days", "weekly"),
    (r"every (calendar )?month\b|every thirty days|once a month", "every thirty days", "monthly"),
    (r"every three (calendar )?months|every ninety days", "every three months", "quarterly"),
    (r"every six months", "every six months", "quarterly"),
    (r"every (twelve months|year)\b|once a year|annually", "every year", "yearly"),
]
_DUTY = re.compile(r"\bshall(?: at least once[^,]{0,40})?(?: be)? (?:\w+ ){0,3}?(examined|inspected|tested|checked|measured|"
                   r"sampled|calibrated|cleaned|overhauled|surveyed|analysed|analyzed|made|carried out|taken|"
                   r"determined|examine|inspect|test|check|measure|visit)\b", re.I)
# (scope name, words in the law, profile test, reason when it applies)
_SCOPES = [
    ("methane_extraction", r"methane (exploration|extraction)|coal bed methane|gas transportation pipe",
     lambda p: False, ""),
    ("underground", r"belowground|below ground|\bshafts?\b|winding|\bcages?\b|galler|district|depillar|ventilat|"
                    r"safety lamp|firedamp|inflammable gas|\broof\b|haulage|\btubs?\b|brattice|stopping|sirdar|"
                    r"spontaneous heating|stone dust|incombustible dust|wet bulb|outlets?\b",
     lambda p: p.get("working_method") in ("UG", "MIXED"), "the mine has underground workings"),
    ("opencast", r"opencast|open cast|\bbench|dumper|heavy earth moving",
     lambda p: p.get("working_method") in ("OC", "MIXED"), "the mine has open-cast workings"),
    ("explosives", r"explosive|shot-?fir|blasting|magazine|detonator",
     lambda p: bool(p.get("uses_explosives")), "the mine uses explosives"),
    ("conveyor", r"conveyor", lambda p: bool(p.get("has_conveyor")), "the mine has conveyors"),
    ("surface_water", r"surface water|inundation|flood level|rainy season",
     lambda p: bool(p.get("near_water_body")), "the mine is near a water body"),
]
_CRITICAL = r"shaft|winding|cage|inflammable gas|firedamp|explosive|fire|inundation|flood|roof|spontaneous heating"


@lru_cache(maxsize=1)
def _law() -> dict:
    data = json.loads(LAW_FILE.read_text(encoding="utf-8"))
    regulations = data["regulations"]
    documents = [f"{r['title']}. {r['title']}. {r['text']}" for r in regulations]
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english", sublinear_tf=True, min_df=1)
    matrix = vectorizer.fit_transform(documents)
    return {"name": data.get("short_name", "CMR 2017"), "regulations": regulations,
            "vectorizer": vectorizer, "matrix": matrix, "duties": _extract_duties(regulations)}


def _sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.;:])\s+(?=\(\d+\)|\([a-z]\)|[A-Z])", text) if s.strip()]


def _extract_duties(regulations: list[dict]) -> list[dict]:
    duties = []
    for reg in regulations:
        for sentence in _sentences(reg["text"]):
            if not _DUTY.search(sentence):
                continue
            freq = next(((said, scheduled) for pattern, said, scheduled in _FREQUENCIES
                         if re.search(pattern, sentence, re.I)), None)
            if freq is None:
                continue
            sub = re.match(r"^(?:[^()]*?[—–]\s*)?\((\d+)\)", sentence)
            subject = re.split(r"\bshall\b", re.sub(r"^[^()]*?[—–]\s*", "", sentence), maxsplit=1)[0]
            subject = re.sub(r"^(\(\w+\)\s*)+", "", subject).strip(" ,-")
            # a clean noun phrase ("Every mechanised outlet") names the duty; otherwise the title + reference do
            if not re.match(r"^(Every|All|Each|The|Any)\b", subject) or len(subject) > 90:
                subject = ""
            scope_text = f"{reg['title']} {sentence}"
            duties.append({
                "n": reg["n"], "sub": sub.group(1) if sub else None, "title": reg["title"], "page": reg["page"],
                "sentence": sentence, "subject": subject[:90], "said": freq[0], "frequency": freq[1],
                "scopes": [name for name, words, _, _ in _SCOPES if re.search(words, scope_text, re.I)],
                "critical": bool(re.search(_CRITICAL, scope_text, re.I)),
            })
    # keep one duty per regulation + sub-regulation (the first, usually the main requirement)
    unique: dict[tuple, dict] = {}
    for duty in duties:
        unique.setdefault((duty["n"], duty["sub"]), duty)
    return list(unique.values())


def _scope_check(scopes: list[str], profile: dict) -> tuple[bool, list[str]]:
    reasons = []
    for name, _, test, why in _SCOPES:
        if name in scopes:
            if not test(profile):
                return False, []
            reasons.append(why)
    return True, reasons


def _catalogue() -> list:
    from app.db import SessionLocal
    from app.models import Obligation
    with SessionLocal() as db:
        rows = list(db.scalars(select(Obligation).where(Obligation.status == "approved",
                                                        Obligation.source != "ml_engine")))
        db.expunge_all()
    return rows


def _ground(law: dict, texts: list[str]) -> list[int | None]:
    """Index of the regulation each text comes from, or None when no regulation is clearly the source."""
    sims = cosine_similarity(law["vectorizer"].transform(texts), law["matrix"])
    found: list[int | None] = []
    for row in sims:
        first, second = np.sort(row)[::-1][:2]
        found.append(int(row.argmax()) if first >= GROUND_MIN_SIM and first - second >= GROUND_MARGIN else None)
    return found


def recommend_obligations(profile: dict) -> list[dict]:
    from app.services.applicability import evaluate

    law = _law()
    regs = law["regulations"]
    items: list[dict] = []

    # 1-2. catalogue duties that apply, each tied to the regulation that says it
    catalogue = [ob for ob in _catalogue()]
    applicable = [(ob, reason) for ob in catalogue for applies, reason in [evaluate(ob.applies_when, profile)] if applies]
    covered_regs: set[int] = set()
    if applicable:
        # query = the duty's title + the topic in its law reference, e.g. "CMR 2017 (inundation precautions)"
        queries = [f"{ob.title}. " + " ".join(re.findall(r"\(([^)]*)\)", ob.law_ref or "") * 2)
                   for ob, _ in applicable]
        for (ob, reason), index in zip(applicable, _ground(law, queries)):
            law_ref, source_text = ob.law_ref, ob.source_text
            # only duties from the Coal Mines Regulations are cited from this law (EPA, CLRA ... are other Acts)
            if index is not None and "cmr" in (ob.law_ref or "").lower():
                reg = regs[index]
                law_ref = f"{law['name']}, Reg {reg['n']} ({reg['title']})"[:200]
                source_text = reg["text"][:1500]
                reason = f"{reason} Law: {law['name']} Reg {reg['n']} \"{reg['title']}\" (page {reg['page']})."
                covered_regs.add(reg["n"])
            items.append({"code": ob.code, "title": ob.title, "category": ob.category, "frequency": ob.frequency,
                          "severity": ob.severity, "law_ref": law_ref, "evidence_needed": ob.evidence_needed,
                          "source_text": source_text, "reason": reason, "confidence": 1.0, "due_rule": ob.due_rule})

    # 3. recurring duties written in the law that fit this mine and no catalogue duty covers yet
    for duty in law["duties"]:
        if duty["n"] in covered_regs:
            continue
        fits, why = _scope_check(duty["scopes"], profile)
        if not fits:
            continue
        ref = f"Reg {duty['n']}" + (f"({duty['sub']})" if duty["sub"] else "")
        schedule = "" if duty["said"] in ("every seven days", "every thirty days", "every three months", "every year",
                                          "every day") else f" (the law says {duty['said']}; scheduled {duty['frequency']})"
        items.append({
            "code": f"CMR-{duty['n']}" + (f"-{duty['sub']}" if duty["sub"] else ""),
            "title": (f"{duty['title']}: {duty['subject']}" if duty["subject"] else f"{duty['title']} ({ref})")[:300],
            "category": "safety",
            "frequency": duty["frequency"],
            "severity": "critical" if duty["critical"] else "high",
            "law_ref": f"{law['name']}, {ref}",
            "evidence_needed": "Examination report entered in the statutory register + photo",
            "source_text": duty["sentence"][:1500],
            "reason": (f"Found in {law['name']} {ref} \"{duty['title']}\" (page {duty['page']}): required "
                       f"{duty['said']}{schedule}. "
                       + ("Applies because " + " and ".join(why) + "." if why else "Applies to all coal mines.")),
            "confidence": FOUND_CONFIDENCE,
        })
    return items
