from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.constants import OrgType
from app.db import get_db
from app.models import OrgUnit, User
from app.schemas import LoginRequest, TokenResponse, UserOut
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])


def to_user_out(db: Session, user: User) -> UserOut:
    unit = db.get(OrgUnit, user.org_unit_id)
    is_mine = unit.type == OrgType.MINE
    return UserOut(
        id=user.id, name=user.name, phone=user.phone, role=user.role, language=user.language,
        org_unit_id=unit.id, org_name=unit.name, org_type=unit.type,
        mine_id=unit.id if is_mine else None, mine_name=unit.name if is_mine else None,
    )


def _authenticate(db: Session, phone: str, password: str) -> User:
    user = db.scalar(select(User).where(User.phone == phone.strip()))
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Wrong phone number or password.")
    return user


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Log in with phone + password (JSON). Used by the web and mobile apps."""
    user = _authenticate(db, body.phone, body.password)
    return TokenResponse(access_token=create_access_token(user.id, user.role), user=to_user_out(db, user))


@router.post("/token", include_in_schema=False)
def token(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Same as /login but in the form format used by the Swagger 'Authorize' button.
    Put the phone number in the 'username' field."""
    user = _authenticate(db, form.username, form.password)
    return {"access_token": create_access_token(user.id, user.role), "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return to_user_out(db, user)
