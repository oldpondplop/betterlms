# app/crud.py

import uuid
from typing import Optional

from sqlmodel import Session, select
from app.core.security import get_password_hash, verify_password
from app.models import (
    User,
    UserCreate,
    UserUpdate,
    Course,
    CourseCreate,
    CourseUpdate,
    CourseAssignment,
    Quiz,
    QuizCreate,
    QuizUpdate,
    QuizAttempt,
)

#
# =========  User CRUD  =========
#

def create_user(*, session: Session, user_create: UserCreate) -> User:
    """
    Create a new User from a UserCreate schema.
    Hashes the plain-text password before storing.
    """
    db_obj = User.model_validate(
        user_create, 
        update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj

def get_user_by_email(*, session: Session, email: str) -> Optional[User]:
    """Return the user with the given email, or None if not found."""
    return session.exec(select(User).where(User.email == email)).first()

def authenticate_user(*, session: Session, email: str, password: str) -> Optional[User]:
    """
    Check if a user with the given email and password exists.
    Returns the user if valid, else None.
    """
    db_user = get_user_by_email(session=session, email=email)
    if not db_user or not verify_password(password, db_user.hashed_password):
        return None
    return db_user

def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> User:
    """
    Partially update an existing User with the fields in UserUpdate.
    If 'password' is present, hash it and store as hashed_password.
    """
    user_data = user_in.model_dump(exclude_unset=True)
    if "password" in user_data and user_data["password"]:
        user_data["hashed_password"] = get_password_hash(user_data.pop("password"))
    db_user.sqlmodel_update(user_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


#
# =========  Course CRUD  =========
#

def create_course(*, session: Session, course_create: CourseCreate) -> Course:
    """
    Create a new Course from CourseCreate schema.
    Validates date constraints via model validators.
    """
    db_course = Course.model_validate(course_create)
    session.add(db_course)
    session.commit()
    session.refresh(db_course)
    return db_course

def update_course(*, session: Session, db_course: Course, course_in: CourseUpdate) -> Course:
    """Partially update an existing Course."""
    course_data = course_in.model_dump(exclude_unset=True)
    db_course.sqlmodel_update(course_data)

    session.add(db_course)
    session.commit()
    session.refresh(db_course)
    return db_course


#
# =========  Assignments  =========
#

def assign_course_to_user(*, session: Session, course_id: uuid.UUID, user_id: uuid.UUID) -> CourseAssignment:
    """
    Create a CourseAssignment linking a user to a course.
    Raises an error if the user is already assigned.
    """
    assignment = CourseAssignment(course_id=course_id, user_id=user_id)
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    return assignment

#
# =========  Quiz CRUD  =========
#

def create_quiz(*, session: Session, quiz_create: QuizCreate) -> Quiz:
    """
    Create a new Quiz from QuizCreate schema.
    The 'course_id' is required in the QuizCreate model.
    """
    db_quiz = Quiz.model_validate(quiz_create)
    session.add(db_quiz)
    session.commit()
    session.refresh(db_quiz)
    return db_quiz

def update_quiz(*, session: Session, db_quiz: Quiz, quiz_in: QuizUpdate) -> Quiz:
    """
    Partially update an existing Quiz with QuizUpdate.
    Fields like 'course_id', 'max_attempts', 'passing_threshold', 'questions' 
    can be changed if your business logic allows.
    """
    quiz_data = quiz_in.model_dump(exclude_unset=True)
    db_quiz.sqlmodel_update(quiz_data)
    session.add(db_quiz)
    session.commit()
    session.refresh(db_quiz)
    return db_quiz


#
# =========  Quiz Attempts  =========
#

def record_quiz_attempt(
    *,
    session: Session,
    quiz_id: uuid.UUID,
    user_id: uuid.UUID,
    score: int,
    attempt_number: int,
    passed: bool = False
) -> QuizAttempt:
    """
    Create a new QuizAttempt record for a user & quiz.
    If you need extra checks (max attempts, user assignment),
    implement them in routes or a specialized logic function.
    """
    attempt = QuizAttempt(
        quiz_id=quiz_id,
        user_id=user_id,
        score=score,
        attempt_number=attempt_number,
        passed=passed,
    )
    session.add(attempt)
    session.commit()
    session.refresh(attempt)
    return attempt
