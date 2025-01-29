from enum import Enum
from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import RoleCreate, User, UserCreate, UserUpdate
from app.tests.utils.utils import random_email, random_employee_id, random_lower_string, random_name, random_role

class RoleEnum(str, Enum):
    """Enum representing possible user roles."""
    ADMIN = "admin"
    USER = "user"
    INFIRMIERA = "infirmiera"
    OFICIANTA = "oficianta"
    BRANCARDIER = "brancardier"
    ASISTENT_MEDICAL = "asistent medical"
    FEMEIE_DE_SERVICIU = "femeie de serviciu"
    MASAJ = "masaj"
    KINETOTERAPIE = "kinetoterapie"
    RECEPTIE = "receptie"
    CONTABILITATE = "contabilitate"
    INFORMATICA = "informatica"
    RESURSE_UMANE = "resurse umane"
    EPIDEMIOLOG = "epidemiolog"
    MANAGEMENTUL_CALITATII = "managementul calitatii"
    FARMACIST = "farmacist"
    BIROU_INTERNARI_EXTERNARI = "birou internari/externari"

def create_roles(db: Session):
    for role_name in RoleEnum:
        crud.create_role(db, role_in=RoleCreate(name=role_name))

def user_authentication_headers(
    *, client: TestClient, email: str, password: str
) -> dict[str, str]:
    data = {"username": email, "password": password}

    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=data)
    response = r.json()
    auth_token = response["access_token"]
    headers = {"Authorization": f"Bearer {auth_token}"}
    return headers


def create_random_user(db: Session) -> User:
    user_in = get_random_employee(db)
    user = crud.create_user(session=db, user_in=user_in)
    return user

def get_random_employee(db: Session) -> UserCreate:
    return UserCreate(
        email=random_email(),
        user_id=random_employee_id(),
        name=random_name(),
        role_id=random_role(db),
        password=random_lower_string(12),
    )

def authentication_token_from_email(
    *, client: TestClient, email: str, db: Session
) -> dict[str, str]:
    """
    Return a valid token for the user with given email.

    If the user doesn't exist it is created first.
    """
    password = random_lower_string()
    user = crud.get_user_by_email(session=db, email=email)
    if not user:
        user_in_create = UserCreate(email=email, password=password)
        user = crud.create_user(session=db, user_in=user_in_create)
    else:
        user_in_update = UserUpdate(password=password)
        if not user.id:
            raise Exception("User id not set")
        user = crud.update_user(session=db, db_user=user, user_in=user_in_update)

    return user_authentication_headers(client=client, email=email, password=password)
