from sqlmodel import Session, create_engine, SQLModel, select
from app.core.config import settings
from app.models import User, UserCreate
from app import crud

engine = create_engine(
    str(settings.SQLALCHEMY_DATABASE_URI),
    connect_args={"check_same_thread": False}, 
    echo=True
)

def init_db(session: Session| None = None) -> None:
    """Initialize the database."""
    if session is None:  
        session = Session(engine)  
        SQLModel.metadata.create_all(engine)

    admin = session.exec(select(User).where(User.email == settings.FIRST_SUPERUSER)).first()
    if not admin:
        admin_in = UserCreate(
            user_id="ADMIN001",
            name="Admin",
            role_id=None,
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
            is_active=True,
        )
        admin = crud.create_user(session=session, user_in=admin_in)

    session.commit()  
    print("✅ Database initialized successfully!")


if __name__ == "__main__":
    with Session(engine) as session:
        init_db(session)
