import uuid
from sqlmodel import Session, select
from app.core.security import get_password_hash, verify_password
from app.models import User, UserCreate, UserUpdate, Course, CourseCreate, CourseAssignment, Quiz, QuizCreate, QuizAttempt

def create_user(*, session: Session, user_create: UserCreate) -> User:
    db_obj = User.model_validate(user_create, update={"hashed_password": get_password_hash(user_create.password)})
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj

def get_user_by_email(*, session: Session, email: str) -> User | None:
    return session.exec(select(User).where(User.email == email)).first()

def authenticate_user(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    if not db_user or not verify_password(password, db_user.hashed_password):
        return None
    return db_user

def create_course(session: Session, course_create: CourseCreate) -> Course:
    db_course = Course(**course_create.dict(exclude={"assign_to_roles", "assign_to_user_id"}))
    db_course.assigned_roles = course_create.assign_to_roles or []  # ✅ Ensure roles are assigned
    session.add(db_course)
    session.commit()
    session.refresh(db_course)
    return db_course


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> User:
    user_data = user_in.model_dump(exclude_unset=True)
    if "password" in user_data:
        user_data["hashed_password"] = get_password_hash(user_data.pop("password"))
    db_user.sqlmodel_update(user_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

def assign_course_to_user(*, session: Session, course_id: uuid.UUID, user_id: uuid.UUID) -> CourseAssignment:
    assignment = CourseAssignment(course_id=course_id, user_id=user_id)
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    return assignment

def create_quiz(*, session: Session, quiz_create: QuizCreate, course_id: uuid.UUID) -> Quiz:
    db_quiz = Quiz.model_validate(quiz_create, update={"course_id": course_id})
    session.add(db_quiz)
    session.commit()
    session.refresh(db_quiz)
    return db_quiz

def record_quiz_attempt(*, session: Session, quiz_id: uuid.UUID, user_id: uuid.UUID, score: int, attempt_number: int) -> QuizAttempt:
    attempt = QuizAttempt(quiz_id=quiz_id, user_id=user_id, score=score, attempt_number=attempt_number)
    session.add(attempt)
    session.commit()
    session.refresh(attempt)
    return attempt
