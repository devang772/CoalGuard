"""Reference data every deployment needs (not demo data):
- the obligation catalogue used when the ML engine is not available (source="catalogue"),
- inspection checklists,
- escalation rules (hours to fix, reminders, ladder).

Installed at every startup if missing (safe to run many times: existing rows are kept, missing ones added).
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.constants import Role
from app.models import Checklist, EscalationRule, Obligation
from app.utils import utcnow
from seed import sample_data as S

ESCALATION_DEFAULTS = {"critical": (24, [6]), "high": (72, [24]), "medium": (168, [72, 24]), "low": (360, [72, 24])}
ESCALATION_LADDER = [Role.MINE_MANAGER, Role.AREA_GM, Role.SUBSIDIARY_ADMIN, Role.CIL_ADMIN]
CATALOGUE_DOCUMENT = "Sample obligation catalogue (replace with the ML engine / official list)"


def ensure_reference_data(db: Session) -> dict[str, int]:
    added = {"obligations": 0, "checklists": 0, "escalation_rules": 0}
    now = utcnow()
    if settings.load_sample_catalogue:
        have = set(db.scalars(select(Obligation.code).where(Obligation.code.is_not(None))))
        for code, title, law_ref, category, frequency, severity, evidence_needed, applies_when in S.OBLIGATIONS:
            if code in have:
                continue
            db.add(Obligation(code=code, source="catalogue", applies_when=applies_when, due_rule=S.DUE_RULES.get(code),
                              title=title, law_ref=law_ref, category=category, frequency=frequency, severity=severity,
                              evidence_needed=evidence_needed, status="approved", created_by_ai=False,
                              source_text=f"{law_ref}: {title}.", source_document=CATALOGUE_DOCUMENT, approved_at=now))
            added["obligations"] += 1
    have_lists = set(db.scalars(select(Checklist.name)))
    for name, mine_type, items in S.CHECKLISTS:
        if name not in have_lists:
            db.add(Checklist(name=name, mine_type=mine_type,
                             items=[{"id": i, "text": t, "category": c} for i, t, c in items]))
            added["checklists"] += 1
    have_rules = set(db.scalars(select(EscalationRule.severity)))
    for severity, (sla_hours, reminders) in ESCALATION_DEFAULTS.items():
        if severity not in have_rules:
            db.add(EscalationRule(severity=severity, sla_hours=sla_hours, levels=ESCALATION_LADDER,
                                  reminder_hours=reminders))
            added["escalation_rules"] += 1
    db.commit()
    return added
