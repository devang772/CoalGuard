"""Fallback matcher: which catalogue obligations apply to a mine profile.

The ML engine is the main source of applicable obligations. This simple rule check is
used when the ML engine is not available, and by the seed data generator.

An obligation's `applies_when` is a dict of profile field -> condition:
    {"working_method": ["UG", "MIXED"]}     value must be one of the list
    {"uses_explosives": True}               value must equal this
    {"worker_count": {"min": 100}}          number range (min and/or max)
    {"ec_number": {"present": True}}        the field must be filled in (text or date)
All conditions must hold. Empty / None means "applies to every mine".
All 15 profile fields can be used; the sample catalogue (seed/sample_data.py) uses every one of them.
"""
from collections.abc import Iterable
from typing import Any

from app.models import MineProfile, Obligation

PROFILE_FIELDS = [
    "working_method", "depth_m", "seam_gas_degree", "worker_count", "contract_worker_count",
    "production_capacity_mtpa", "uses_explosives", "has_conveyor", "has_hemm", "has_washery",
    "near_water_body", "forest_land", "ec_number", "cto_valid_till", "state",
]

# How each field reads in a sentence, for the "why it applies" text.
_LABELS = {
    "working_method": "working method",
    "depth_m": "depth (m)",
    "seam_gas_degree": "seam gas degree",
    "worker_count": "number of workers",
    "contract_worker_count": "number of contract workers",
    "production_capacity_mtpa": "production capacity (MTPA)",
    "ec_number": "Environmental Clearance number",
    "cto_valid_till": "Consent to Operate expiry date",
    "state": "state",
}
_TRUE_PHRASES = {
    "uses_explosives": "the mine uses explosives",
    "has_conveyor": "the mine has conveyors",
    "has_hemm": "the mine uses heavy earth-moving machinery",
    "has_washery": "the mine has a washery",
    "near_water_body": "the mine is near a water body",
    "forest_land": "the lease includes forest land",
}
_METHOD_WORDS = {"UG": "underground", "OC": "open-cast", "MIXED": "mixed (UG + OC)"}


def profile_to_dict(profile: MineProfile) -> dict[str, Any]:
    return {field: getattr(profile, field) for field in PROFILE_FIELDS}


def _describe(field: str, value: Any) -> str:
    if field == "working_method":
        return f"the working method is {_METHOD_WORDS.get(value, value)}"
    if field == "depth_m":
        return f"the mine is {value:g} m deep"
    if field == "production_capacity_mtpa":
        return f"the production capacity is {value:g} MTPA"
    if field == "state":
        return f"the mine is in {value}"
    if field == "ec_number":
        return f"Environmental Clearance {value} is on file"
    if field == "cto_valid_till":
        return f"the Consent to Operate expires on {value:%d %b %Y}"
    return f"the {_LABELS.get(field, field.replace('_', ' '))} is {value}"


def evaluate(applies_when: dict | None, profile: dict[str, Any]) -> tuple[bool, str]:
    """Return (applies?, reason in plain English)."""
    if not applies_when:
        return True, "Applies to all coal mines."
    reasons: list[str] = []
    for field, rule in applies_when.items():
        value = profile.get(field)
        if isinstance(rule, dict) and "present" in rule:
            filled = value not in (None, "")
            if filled != bool(rule["present"]):
                return False, (f"The profile has no {_LABELS.get(field, field.replace('_', ' '))}." if rule["present"]
                               else f"Applies only when {field.replace('_', ' ')} is empty.")
            if filled:
                reasons.append(_describe(field, value))
        elif isinstance(rule, dict):
            if value is None:
                return False, f"Profile does not state the {_LABELS.get(field, field)}."
            if "min" in rule and value < rule["min"]:
                return False, f"Needs {_LABELS.get(field, field)} of at least {rule['min']}."
            if "max" in rule and value > rule["max"]:
                return False, f"Needs {_LABELS.get(field, field)} of at most {rule['max']}."
            reasons.append(_describe(field, value))
        elif isinstance(rule, list):
            if value not in rule:
                return False, f"Does not apply when {_describe(field, value)}."
            reasons.append(_describe(field, value))
        else:
            if value != rule:
                return False, f"Needs {field.replace('_', ' ')} = {rule}."
            reasons.append(_TRUE_PHRASES.get(field, _describe(field, value)) if rule is True
                           else _describe(field, value))
    return True, "Applies because " + " and ".join(reasons) + "."


def fallback_recommend(catalogue: Iterable[Obligation], profile: dict[str, Any]) -> list[dict]:
    """Obligations from the catalogue that apply to this profile."""
    result = []
    for obligation in catalogue:
        applies, reason = evaluate(obligation.applies_when, profile)
        if applies:
            result.append({"obligation_id": obligation.id, "code": obligation.code, "reason": reason,
                           "confidence": 1.0, "source": "rules_fallback"})
    return result
