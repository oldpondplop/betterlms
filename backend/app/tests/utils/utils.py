import random
import string
import uuid

from fastapi.testclient import TestClient
from faker import Faker

from app.core.config import settings
from app import crud
from sqlmodel import Session

fake = Faker()

def get_superuser_token_headers(client: TestClient) -> dict[str, str]:
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = r.json()
    a_token = tokens["access_token"]
    headers = {"Authorization": f"Bearer {a_token}"}
    return headers

def random_email() -> str: return fake.email()
def random_name() -> str: return fake.name()
def random_employee_id() -> str: return f"EMP{random.randint(100000, 999999)}"
def random_lower_string(length: int = 10) -> str: return ''.join(random.choices(string.ascii_lowercase, k=length))
def random_role(db: Session) -> uuid.UUID: return random.choice([role.id for role in crud.get_roles(db)])
