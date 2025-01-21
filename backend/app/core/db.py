from sqlmodel import Session, create_engine, SQLModel, select
from app.core.config import settings
from app.models import User, UserCreate
from app import crud

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI),  connect_args={"check_same_thread": False}, echo=True)

def init_db() -> None:
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        admin: User | None = session.exec(select(User).where(User.email == settings.FIRST_SUPERUSER)).first()
        if not admin:
            admin_in = UserCreate(
                email=settings.FIRST_SUPERUSER,
                password=settings.FIRST_SUPERUSER_PASSWORD,
                name="Admin User",
                role="admin",
                is_superuser=True,
                is_active=True,
                user_id="ADMIN001"
            )
            admin = crud.create_user(session=session, user_create=admin_in)

    print("Database initialized successfully!")
