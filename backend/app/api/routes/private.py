from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.deps import SessionDep
from app.core.security import get_password_hash
from app.models import (
    User,
    UserPublic,
)
from app import crud

router = APIRouter(tags=["private"], prefix="/private")


class PrivateUserCreate(BaseModel):
    email: str
    password: str
    name: str
    is_active: bool = True
    is_superuser: bool = False

@router.post("/users/", response_model=UserPublic)
def create_user(user_in: PrivateUserCreate, session: SessionDep) -> Any:
    """Create a new user."""
    if (existing_user:=crud.get_user_by_email(session=session, email=user_in.email)):
        print(f"{existing_user}")
        return existing_user

    user = User(
        email=user_in.email,
        name=user_in.name,
        hashed_password=get_password_hash(user_in.password),
        is_active=user_in.is_active,
        is_superuser=user_in.is_superuser
    )
 
    session.add(user)
    session.commit()
    session.refresh(user)

    return user