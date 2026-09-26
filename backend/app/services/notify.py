"""Create notifications for the right people and push them live after the database commit."""
from sqlalchemy import event, select
from sqlalchemy.orm import Session

from app.constants import Role
from app.models import Notification, OrgUnit, User
from app.services.realtime import broadcaster

SOS_CHAIN = {Role.MINE_MANAGER, Role.SAFETY_OFFICER, Role.AREA_GM, Role.SUBSIDIARY_ADMIN, Role.CIL_ADMIN}
MANAGER_AND_GM = {Role.MINE_MANAGER, Role.SAFETY_OFFICER, Role.AREA_GM, Role.SUBSIDIARY_ADMIN, Role.CIL_ADMIN}


def _ancestors(db: Session, mine_id: int) -> list[int]:
    ids, unit = [], db.get(OrgUnit, mine_id)
    while unit is not None:
        ids.append(unit.id)
        unit = db.get(OrgUnit, unit.parent_id) if unit.parent_id else None
    return ids


def people_for_mine(db: Session, mine_id: int, roles: set[str], exclude: set[int | None] = frozenset()) -> list[int]:
    """Active users with these roles at the mine or above it (area, subsidiary, CIL)."""
    ids = db.scalars(select(User.id).where(User.org_unit_id.in_(_ancestors(db, mine_id)), User.role.in_(roles),
                                           User.is_active.is_(True)).order_by(User.id))
    return [i for i in ids if i not in exclude]


def payload(n: Notification) -> dict:
    return {"id": n.id, "title": n.title, "body": n.body, "level": n.level, "kind": n.kind, "link": n.link,
            "read": n.read, "created_at": n.created_at.isoformat()}


def notify(db: Session, user_ids, title: str, body: str = "", *, level: str = "info", kind: str = "general",
           link: str | None = None) -> int:
    """Save one notification per user; they are pushed live once the transaction commits."""
    created = []
    for uid in dict.fromkeys(u for u in user_ids if u):          # unique, keep order
        n = Notification(user_id=uid, title=title[:200], body=body, level=level, kind=kind, link=link)
        db.add(n)
        created.append(n)
    if created:
        db.flush()
        db.info.setdefault("pending_push", []).extend((n.user_id, payload(n)) for n in created)
    return len(created)


@event.listens_for(Session, "after_commit")
def _push_after_commit(session: Session) -> None:
    for user_id, data in session.info.pop("pending_push", []):
        broadcaster.publish(user_id, {"type": "notification", "notification": data})


@event.listens_for(Session, "after_rollback")
def _drop_after_rollback(session: Session) -> None:
    session.info.pop("pending_push", None)
