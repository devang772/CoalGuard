"""In-app notifications + live push over WebSocket."""
import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import SessionLocal, get_db
from app.deps import Pagination
from app.models import Notification, User
from app.schemas import NotificationOut, NotificationPage
from app.security import decode_access_token
from app.services.realtime import broadcaster

router = APIRouter(tags=["Notifications"])


def _unread(db: Session, user_id: int) -> int:
    return db.scalar(select(func.count()).select_from(Notification).where(
        Notification.user_id == user_id, Notification.read.is_(False)))


@router.get("/notifications", response_model=NotificationPage)
def my_notifications(unread: bool | None = Query(None, description="true = only unread"),
                     level: str | None = Query(None, description="info / warning / critical"),
                     paging: Pagination = Depends(), user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    """The user's own notifications, newest first, plus the unread count for the bell."""
    query = select(Notification).where(Notification.user_id == user.id)
    if unread:
        query = query.where(Notification.read.is_(False))
    if level:
        query = query.where(Notification.level == level)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = list(db.scalars(query.order_by(Notification.created_at.desc(), Notification.id.desc())
                            .offset(paging.offset).limit(paging.page_size)))
    return {"items": items, "total": total, "page": paging.page, "page_size": paging.page_size,
            "unread": _unread(db, user.id)}


@router.get("/notifications/unread-count")
def unread_count(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"unread": _unread(db, user.id)}


@router.post("/notifications/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.get(Notification, notification_id)
    if n is None or n.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    n.read = True
    db.commit()
    return n


@router.post("/notifications/read-all")
def mark_all_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Notifications are not part of the audit chain, so a bulk update is fine here.
    result = db.execute(update(Notification).where(Notification.user_id == user.id, Notification.read.is_(False))
                        .values(read=True))
    db.commit()
    return {"marked_read": result.rowcount or 0}


@router.websocket("/ws/notifications")
async def notifications_socket(websocket: WebSocket, token: str = Query(...)):
    """Live feed. Connect with ws://<host>/ws/notifications?token=<access_token>.
    Server sends {"type": "hello", "unread": n} first, then {"type": "notification", "notification": {...}}
    for every new notification. Send any text (e.g. "ping") to keep the connection alive; "pong" comes back."""
    try:
        user_id = int(decode_access_token(token)["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        await websocket.close(code=4401)
        return
    with SessionLocal() as db:
        user = db.get(User, user_id)
        if user is None or not user.is_active:
            await websocket.close(code=4401)
            return
        unread = _unread(db, user_id)
    await broadcaster.connect(user_id, websocket)
    try:
        await websocket.send_json({"type": "hello", "unread": unread})
        while True:
            message = await websocket.receive_text()
            if message.strip().lower() == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        broadcaster.disconnect(user_id, websocket)
