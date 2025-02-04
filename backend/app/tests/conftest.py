from collections.abc import Generator
from io import BytesIO
from pathlib import Path
import tempfile
from unittest.mock import patch

from app import crud
from app.api.deps import get_db
from app.models import Role, RoleCreate
from fastapi import UploadFile
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlmodel import SQLModel, Session

from app.core.config import settings
from app.core.db import init_db
from app.main import app
from app.tests.utils.user import RoleEnum, authentication_token_from_email
from app.tests.utils.utils import get_superuser_token_headers


@pytest.fixture(scope="session")
def test_db_url():
    with tempfile.NamedTemporaryFile(suffix='.db') as f:
        return f"sqlite:///{f.name}"


@pytest.fixture(scope="session")
def test_engine(test_db_url):
    return create_engine(test_db_url, connect_args={"check_same_thread": False})


@pytest.fixture(scope="session", autouse=True)
def db(test_engine) -> Generator[Session, None, None]:
    SQLModel.metadata.create_all(test_engine)
    with Session(test_engine) as session:
        init_db(session)
        yield session
        session.rollback()


@pytest.fixture(scope="session", autouse=True)
def init_test_data(db):
    for role_name in RoleEnum:
        if not db.exec(select(Role).where(Role.name == role_name)).first():
            crud.create_role(db, role_in=RoleCreate(name=role_name))
            

@pytest.fixture(scope='session')
def test_upload_dir():
   with tempfile.TemporaryDirectory() as temp_dir:
       yield Path(temp_dir)


@pytest.fixture(autouse=True)
def override_upload_dir(monkeypatch, test_upload_dir):
   monkeypatch.setattr(settings, 'UPLOAD_DIR', test_upload_dir)


@pytest.fixture
def mock_upload_files() -> list[UploadFile]:
    files = [
        UploadFile(filename="test_file1.pdf", file=BytesIO(b"test content 1")),
        UploadFile(filename="test_file2.pdf", file=BytesIO(b"test content 2")),
    ]
    return files


@pytest.fixture(scope="session")
def client(test_engine) -> Generator[TestClient, None, None]:
   app.dependency_overrides[get_db] = lambda: Session(test_engine)
   with TestClient(app) as c:
       yield c
   app.dependency_overrides.clear()

@pytest.fixture(scope="module")
def superuser_token_headers(client: TestClient) -> dict[str, str]:
    return get_superuser_token_headers(client)


@pytest.fixture(scope="module")
def normal_user_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    return authentication_token_from_email(
        client=client, email=settings.EMAIL_TEST_USER, db=db
    )
