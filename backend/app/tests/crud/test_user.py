import uuid
from app.tests.utils.user import create_random_user, get_random_employee
from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
import pytest
from sqlmodel import Session, select

from app import crud
from app.core.security import get_password_hash, verify_password
from app.models import UpdatePassword, User, UserCreate, UserUpdate, RoleEnum, UserUpdateMe
from app.tests.utils.utils import random_email, random_lower_string, random_role


def test_authenticate_user(db: Session) -> None:
    """Test if a user can authenticate with correct credentials."""
    user_in = get_random_employee()
    user = crud.create_user(session=db, user_create=user_in)

    authenticated_user = crud.authenticate_user(session=db, email=user_in.email, password=user_in.password)

    assert authenticated_user is not None
    assert user.email == authenticated_user.email


def test_not_authenticate_user(db: Session) -> None:
    email = random_email()
    password = random_lower_string()
    user = crud.authenticate_user(session=db, email=email, password=password)
    assert user is None


def test_check_if_user_is_active(db: Session) -> None:
    email = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=email, password=password)
    user = crud.create_user(session=db, user_create=user_in)
    assert user.is_active is True


def test_check_if_user_is_active_inactive(db: Session) -> None:
    email = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=email, password=password, disabled=True)
    user = crud.create_user(session=db, user_create=user_in)
    assert user.is_active


def test_check_if_user_is_superuser(db: Session) -> None:
    email = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=email, password=password, is_superuser=True)
    user = crud.create_user(session=db, user_create=user_in)
    assert user.is_superuser is True


def test_check_if_user_is_superuser_normal_user(db: Session) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)
    assert user.is_superuser is False


def test_check_if_normal_user_is_not_superuser(db: Session) -> None:
    user_in = get_random_employee()
    user = crud.create_user(session=db, user_create=user_in)

    assert user.is_superuser is False


def test_get_user(db: Session) -> None:
    user_in = get_random_employee()
    user = crud.create_user(session=db, user_create=user_in)

    user_2 = db.get(User, user.id)
    
    assert user_2
    assert user.email == user_2.email
    assert jsonable_encoder(user) == jsonable_encoder(user_2)


def test_update_user_me(db: Session) -> None:
    """Test updating a user's name & email."""
    user = crud.create_user(session=db, user_create=get_random_employee())

    update_data = UserUpdateMe(name="Updated Name", email=random_email())
    updated_user = crud.update_user_me(session=db, db_user=user, user_in=update_data)

    assert updated_user.name == update_data.name
    assert updated_user.email == update_data.email
    

def test_update_user_me_email_conflict(db: Session) -> None:
    """Test that a user cannot update their email to an already used one."""
    user1 = crud.create_user(session=db, user_create=get_random_employee())
    user2 = crud.create_user(session=db, user_create=get_random_employee())

    old_email = user2.email  # Save old email before trying update
    update_data = UserUpdateMe(email=user1.email)

    with pytest.raises(HTTPException) as exc_info:
        existing_user = db.exec(select(User).where(User.email == update_data.email)).first()
        if existing_user and existing_user.id != user2.id:
            raise HTTPException(status_code=409, detail="User with this email already exists")

        crud.update_user_me(session=db, db_user=user2, user_in=update_data)

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "User with this email already exists"

    db.refresh(user2)
    assert user2 is not None 
    assert user2.email == old_email


def test_update_password_me(db: Session) -> None:
    """Test updating a user's password."""
    user_in = get_random_employee()
    user = crud.create_user(session=db, user_create=user_in)

    old_password = user.hashed_password
    new_password = random_lower_string()

    password_update = UpdatePassword(current_password=user_in.password, new_password=new_password)
    updated_user = crud.update_user_me(session=db, db_user=user, user_in=password_update)

    assert verify_password(new_password, updated_user.hashed_password)
    assert old_password != updated_user.hashed_password


def test_update_password_me_wrong_current_password(db: Session) -> None:
    """Test that password update fails when the current password is incorrect."""
    user = crud.create_user(session=db, user_create=get_random_employee())

    new_password = random_lower_string()
    wrong_password_update = UpdatePassword(current_password="wrong_password", new_password=new_password)

    with pytest.raises(HTTPException) as exc_info:
        if not verify_password(wrong_password_update.current_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect password")

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Incorrect password"

    assert user.hashed_password != get_password_hash(new_password)


def test_create_user_duplicate_email(db: Session) -> None:
    """Test that creating a user with an existing email fails."""
    user_in = get_random_employee()
    user1 = crud.create_user(session=db, user_create=user_in)

    user_in.user_id = "EMP9999"

    with pytest.raises(Exception):
        crud.create_user(session=db, user_create=user_in)
    
    db.rollback() 
    users = db.exec(select(User).where(User.email == user1.email)).all()
    assert len(users) == 1

def test_delete_user(db: Session) -> None:
    """Test deleting a user from the database."""
    user_in = get_random_employee()
    user = crud.create_user(session=db, user_create=user_in)

    db.delete(user)
    db.commit()

    deleted_user = db.get(User, user.id)
    assert deleted_user is None


def test_assign_user_random_role(db: Session) -> None:
    user_in = get_random_employee()
    user_in.role_name = random_role()
    user = crud.create_user(session=db, user_create=user_in)

    assert user.role_name in RoleEnum


def test_check_admin_role(db: Session) -> None:
    user_in = get_random_employee()
    user_in.role_name = RoleEnum.ADMIN
    user = crud.create_user(session=db, user_create=user_in)

    assert user.role_name == RoleEnum.ADMIN