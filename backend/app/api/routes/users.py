import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from app import crud
from app.core.config import settings
from app.core.security import verify_password
from app.utils import generate_new_account_email, send_email
from app.api.deps import CurrentUser, CurrentSuperUser, SessionDep
from app.models import (
    Message,
    UpdatePassword,
    User,
    UserCreate,
    UserPublic,
    UsersPublic,
    UserUpdate,
    UserUpdateMe,
)

router = APIRouter(prefix="/users", tags=["users"])

@router.patch("/me", response_model=UserPublic)
def update_user_me(*, session: SessionDep, current_user: CurrentUser, user_in: UserUpdateMe) -> Any:
    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=409, detail="User with this email already exists")
    crud.update_user_me(session=session, db_user=current_user, user_in=user_in)
    return current_user

@router.patch("/me/password", response_model=Message)
def update_password_me(*, session: SessionDep, body: UpdatePassword, current_user: CurrentUser) -> Any:
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")
    crud.update_user_me(session=session, db_user=current_user, user_in=body)
    return Message(message="Password updated successfully")

@router.get("/me", response_model=UserPublic)
def read_user_me(current_user: CurrentUser) -> Any:
    print("Current User:", current_user)  # Debugging
    return current_user

@router.delete("/me", response_model=Message)
def delete_user_me(session: SessionDep, current_user: CurrentUser) -> Any:
    if current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Super users are not allowed to delete themselves")
    session.delete(current_user)
    session.commit()
    return Message(message="User deleted successfully")

@router.get("/", response_model=UsersPublic)
def read_users(session: SessionDep, admin_user: CurrentSuperUser, skip: int = 0, limit: int = 100) -> Any:
    count = crud.get_total_count(session, User)
    users = crud.get_users(session, skip, limit)
    return UsersPublic(data=users, count=count)

@router.get("/{user_id}", response_model=UserPublic)
def read_user_by_id(user_id: uuid.UUID, session: SessionDep, admin_user: CurrentSuperUser) -> Any:
    if user := session.get(User, user_id):
        return user
    raise HTTPException(status_code=404, detail="User not found")

@router.post("/", response_model=UserPublic)
def create_user(*, session: SessionDep, admin_user: CurrentSuperUser, user_in: UserCreate) -> Any:
    if (user:=crud.get_user_by_email(session=session, email=user_in.email)):
        raise HTTPException(status_code=400, detail="The user with this email already exists in the system.")

    user = crud.create_user(session=session, user_create=user_in)
    # TODO: implement this part
    if settings.emails_enabled and user_in.email:
        email_data = generate_new_account_email(email_to=user_in.email, username=user_in.email, password=user_in.password)
        send_email(email_to=user_in.email, subject=email_data.subject, html_content=email_data.html_content)
    return user


@router.patch("/{user_id}", response_model=UserPublic)
def update_user(*, session: SessionDep, user_id: uuid.UUID, user_in: UserUpdate,) -> Any:
    if not (db_user:=session.get(User, user_id)): 
        raise HTTPException(status_code=404, detail="User not found")
    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(status_code=409, detail="User with this email already exists")
    db_user = crud.update_user(session=session, db_user=db_user, user_in=user_in)
    return db_user

@router.delete("/{user_id}")
def delete_user(session: SessionDep, current_user: CurrentSuperUser, user_id: uuid.UUID) -> Message:
    if not (user := session.get(User, user_id)):
        raise HTTPException(status_code=404, detail="User not found")
    if user == current_user:
        raise HTTPException(status_code=403, detail="Superusers cannot delete themselves")
    session.delete(user)
    session.commit()
    return Message(message="User deleted successfully")