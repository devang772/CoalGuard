"""Request and response shapes (what the API accepts and returns)."""
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=15, examples=["9000000001"])
    password: str = Field(min_length=1, examples=["demo123"])


class UserOut(BaseModel):
    id: int
    name: str
    phone: str
    role: str
    language: str
    org_unit_id: int
    org_name: str
    org_type: str
    mine_id: int | None = None
    mine_name: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
