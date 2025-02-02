from typing import Optional, Sequence
import uuid
from sqlmodel import Session, select, delete, func
from fastapi import HTTPException

from app.models import (
    CourseRoleLink,
    CourseUserLink,
    QuizAttempt,
    QuizAttemptCreate,
    UpdatePassword,
    User,
    UserCreate,
    UserUpdate,
    Role,
    RoleCreate,
    RoleUpdate,
    Course,
    CourseCreate,
    CourseUpdate,
    Quiz,
    QuizUpdate,
    QuizCreate,
    Message,
    UserUpdateMe
)
from app.core.security import get_password_hash, verify_password


# ===========================
#  USER CRUD
# ===========================

def get_user_by_email(session: Session, email: str) -> Optional[User]:
    stmt = select(User).where(User.email == email)
    return session.exec(stmt).first()

def get_users(session: Session, skip: int = 0, limit: int = 100) -> Sequence[User]:
    stmt = select(User).offset(skip).limit(limit)
    return session.exec(stmt).all()

def authenticate_user(session: Session, email: str, password: str) -> Optional[User]:
    """Check if a user with the given email/password exists."""
    db_user = get_user_by_email(session=session, email=email)
    if not db_user or not verify_password(password, db_user.hashed_password):
        return None
    return db_user

def create_user(session: Session, user_in: UserCreate) -> User:
    """Create a new User from a UserCreate schema."""
    db_obj = User.model_validate(user_in, update={"hashed_password": get_password_hash(user_in.password)})
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj

def update_user(session: Session, db_user: User, user_in: UserUpdate) -> User:
    """Partially update an existing User with the fields in UserUpdate."""
    user_data = user_in.model_dump(exclude_unset=True)
    db_user.sqlmodel_update(user_data)
    # session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

def update_user_me(session: Session, db_user: User, user_in: UserUpdateMe | UpdatePassword) -> User:
    """Allows a user to update their own profile (name & email & password)."""
    user_data = user_in.model_dump(exclude_unset=True)
    if isinstance(user_in, UpdatePassword):
        user_data["hashed_password"] = get_password_hash(user_data.pop("new_password"))
    db_user.sqlmodel_update(user_data)
    # session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


# ===========================
#  ROLE CRUD
# ===========================

def get_role_by_name(session: Session, name: str) -> Optional[Role]:
    stmt = select(Role).where(Role.name == name)
    return session.exec(stmt).first()

def get_roles(session: Session, skip: int = 0, limit: int = 100) -> Sequence[Role]:
    stmt = select(Role).offset(skip).limit(limit)
    return session.exec(stmt).all()

def create_role(session: Session, role_in: RoleCreate) -> Role:
    if get_role_by_name(session, role_in.name):
        raise HTTPException(status_code=400, detail="Role name already exists")
    db_obj = Role.model_validate(role_in)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj

def update_role(session: Session, db_role: Role, role_in: RoleUpdate) -> Role:
    update_data = role_in.model_dump(exclude_unset=True)
    db_role.sqlmodel_update(update_data)
    session.commit()
    session.refresh(db_role)
    return db_role

# ===========================
#  COURSE CRUD
# ===========================

def get_course_by_id(session: Session, course_id: uuid.UUID) -> Optional[Course]:
    return session.get(Course, course_id)

def get_courses(session: Session, skip: int = 0, limit: int = 100) -> Sequence[Course]:
    stmt = select(Course).offset(skip).limit(limit)
    return session.exec(stmt).all()

def count_courses(session: Session) -> int:
    return session.exec(select(func.count()).select_from(Course)).one()

def assign_users_to_course(session: Session, course_id: uuid.UUID, users: list[uuid.UUID]) -> None:
    """Assign users to a course and handle merging."""
    if not users: 
        return
    existing_users = {link.user_id for link in session.exec(select(CourseUserLink).where(CourseUserLink.course_id == course_id)).all()}
    new_users = set(users)
    users_to_add = new_users - existing_users
    users_to_remove = existing_users - new_users
    
    session.exec(delete(CourseUserLink).where(CourseUserLink.course_id == course_id, CourseUserLink.user_id.in_(users_to_remove)))
    session.add_all([CourseUserLink(course_id=course_id, user_id=user_id) for user_id in users_to_add])

def assign_roles_to_course(session: Session, course_id: str, roles: list[str]) -> None:
    """Assign roles to a course and merge existing assignments."""
    if not roles:
        return
    existing_roles = {link.role_id for link in session.exec(select(CourseRoleLink).where(CourseRoleLink.course_id == course_id)).all()}
    new_roles = set(roles)
    roles_to_add = new_roles - existing_roles
    roles_to_remove = existing_roles - new_roles
    
    session.exec(delete(CourseRoleLink).where(CourseRoleLink.course_id == course_id, CourseRoleLink.role_id.in_(roles_to_remove)))
    session.add_all([CourseRoleLink(course_id=course_id, role_id=role_id) for role_id in roles_to_add])

def create_course(session: Session, course_in: CourseCreate) -> Course:
    course = Course(**course_in.model_dump(exclude={"users", "roles", "quiz"}))
    session.add(course)
    session.commit()
    session.refresh(course)

    assign_users_to_course(session, course.id, course_in.users)
    assign_roles_to_course(session, course.id, course_in.roles)

    if course_in.quiz:
        quiz = Quiz(**course_in.quiz, course_id=course.id)
        session.add(quiz)
    
    session.commit()
    return course

def update_course(session: Session, db_course: Course, course_in: CourseUpdate) -> Course:
    course_data = course_in.model_dump(exclude_unset=True)
    db_course.sqlmodel_update(course_data)
    session.commit()
    session.refresh(db_course)
    return db_course

def delete_course(session: Session, course_id: uuid.UUID) -> Message:
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    session.delete(db_course)
    session.commit()
    return Message(message="Course deleted successfully")


# ===========================
#  ROLE & USER ASSIGNMENT
# ===========================

def assign_role_to_course(session: Session, course_id: uuid.UUID, role_id: uuid.UUID) -> Course:
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    db_role = session.get(Role, role_id)
    if not db_role:
        raise HTTPException(status_code=404, detail="Role not found")

    if db_role not in db_course.roles:
        db_course.roles.append(db_role)
        session.commit()
        session.refresh(db_course)

    return db_course

def unassign_role_from_course(session: Session, course_id: uuid.UUID, role_id: uuid.UUID) -> Message:
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    db_role = session.get(Role, role_id)
    if not db_role or db_role not in db_course.roles:
        raise HTTPException(status_code=404, detail="Role not linked to course")

    db_course.roles.remove(db_role)
    session.commit()
    return Message(message="Role unassigned successfully")

def assign_user_to_course(session: Session, course_id: uuid.UUID, user_id: uuid.UUID) -> Course:
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if db_user not in db_course.users:
        db_course.users.append(db_user)
        session.commit()
        session.refresh(db_course)

    return db_course

def unassign_user_from_course(session: Session, course_id: uuid.UUID, user_id: uuid.UUID) -> Message:
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    db_user = session.get(User, user_id)
    if not db_user or db_user not in db_course.users:
        raise HTTPException(status_code=404, detail="User not linked to course")

    db_course.users.remove(db_user)
    session.commit()
    return Message(message="User unassigned successfully")


# ===========================
#  QUIZ CRUD
# ===========================

def get_quiz_by_course_id(session: Session, course_id: uuid.UUID) -> Optional[Quiz]:
    stmt = select(Quiz).where(Quiz.course_id == course_id)
    return session.exec(stmt).first()

def get_quiz_by_id(session: Session, quiz_id: uuid.UUID) -> Quiz:
    quiz = session.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz

def create_quiz(session: Session, quiz_in: QuizCreate) -> Quiz:
    db_quiz = Quiz.model_validate(quiz_in)
    session.add(db_quiz)
    session.commit()
    session.refresh(db_quiz)
    return db_quiz

def update_quiz(session: Session, quiz_id: uuid.UUID, quiz_in: QuizUpdate) -> Quiz:
    db_quiz = get_quiz_by_id(session, quiz_id)
    update_data = quiz_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_quiz, key, value)
    session.commit()
    session.refresh(db_quiz)
    return db_quiz

def delete_quiz(session: Session, quiz_id: uuid.UUID) -> Message:
    db_quiz = get_quiz_by_id(session, quiz_id)
    session.delete(db_quiz)
    session.commit()
    return Message(message="Quiz deleted successfully")


# ===========================
# QUIZ ATTEMPT CRUD OPERATIONS
# ===========================

def create_quiz_attempt(session: Session, attempt_in: QuizAttemptCreate) -> QuizAttempt:
    """Record a new quiz attempt for a user."""
    quiz_attempt = QuizAttempt.model_validate(attempt_in)
    
    # Ensure user has not exceeded max attempts
    existing_attempts = session.exec(
        select(QuizAttempt).where(QuizAttempt.quiz_id == attempt_in.quiz_id, QuizAttempt.user_id == attempt_in.user_id)
    ).all()

    quiz = get_quiz_by_id(session, attempt_in.quiz_id)
    if len(existing_attempts) >= quiz.max_attempts:
        raise HTTPException(status_code=400, detail="Max attempts exceeded")

    session.add(quiz_attempt)
    session.commit()
    session.refresh(quiz_attempt)
    return quiz_attempt