# app/crud.py

import uuid
from typing import List, Optional, Set, Sequence

from sqlmodel import Session, select
from app.core.security import get_password_hash, verify_password
from app.models import (
    CourseAssign,
    RoleEnum,
    UpdatePassword,
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
    UserUpdateMe,
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
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj

def get_user_by_email(*, session: Session, email: str) -> Optional[User]:
    """Return the user with the given email, or None if not found."""
    return session.exec(select(User).where(User.email == email)).first()

def get_users_by_role(session: Session, role_name: RoleEnum) -> Sequence[User]:
    """Fetch all users assigned to a given role."""
    return session.exec(select(User).where(User.role_name == role_name)).all()

def get_user(session: Session, user_id: uuid.UUID) -> User | None:
    return session.get(User, user_id)

def authenticate_user(*, session: Session, email: str, password: str) -> Optional[User]:
    """
    Check if a user with the given email and password exists.
    Returns the user if valid, else None.
    """
    db_user = get_user_by_email(session=session, email=email)
    if not db_user or not verify_password(password, db_user.hashed_password):
        return None
    return db_user


def update_user_me(session: Session, db_user: User, user_in: UserUpdateMe | UpdatePassword) -> User:
    """Allows a user to update their own profile (name & email & password)."""
    user_data = user_in.model_dump(exclude_unset=True)
    if isinstance(user_in, UpdatePassword):
        user_data["hashed_password"] = get_password_hash(user_data.pop("new_password"))
    
    db_user.sqlmodel_update(user_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> User:
    """
    Partially update an existing User with the fields in UserUpdate.
    If 'password' is present, hash it and store as hashed_password.
    """
    user_data = user_in.model_dump(exclude_unset=True)
    db_user.sqlmodel_update(user_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


#
# =========  Course CRUD  =========
#

# def create_course(session: Session, course_data: CourseCreate) -> Course:
#     """
#     Creates a course with optional user/role assignments and quiz creation.
#     """
#     # ✅ Step 1: Create the Course
#     db_course = Course.model_validate(course_data)
#     session.add(db_course)
#     session.commit()
#     session.refresh(db_course)

#     # ✅ Step 2: Assign Users & Roles (if provided)
#     if course_data.assigned_users or course_data.assigned_roles:
#         user_ids = session.exec(
#             select(User.id).where(User.email.in_(course_data.assigned_user_emails))
#         ).all()

#         assignments = [
#             CourseAssignment(course_id=db_course.id, user_id=user_id)
#             for user_id in user_ids
#         ] + [
#             CourseAssignment(course_id=db_course.id, role_name=role)
#             for role in course_data.assigned_role_names
#         ]

#         session.add_all(assignments)

#     # ✅ Step 3: Create Quiz (if requested)
#     if course_data.create_quiz:
#         new_quiz = Quiz(course_id=db_course.id, questions=[])
#         session.add(new_quiz)
#         session.commit()
#         session.refresh(new_quiz)
#         db_course.quiz_id = new_quiz.id
#         session.add(db_course)

#     session.commit()
#     return db_course




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


def update_course(
    *, session: Session, db_course: Course, course_in: CourseUpdate
) -> Course:
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


def assign_course_to_user(
    *, session: Session, course_id: uuid.UUID, user_id: uuid.UUID
) -> CourseAssignment:
    """
    Create a CourseAssignment linking a user to a course.
    Raises an error if the user is already assigned.
    """
    assignment = CourseAssignment(course_id=course_id, user_id=user_id)
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    return assignment


def assign_course_to_role(
    *, session: Session, course_id: uuid.UUID, role: RoleEnum
) -> CourseAssignment:
    """
    Assigns a course to a specific role.
    """
    role_assignment = CourseAssignment(course_id=course_id, role=role)
    session.add(role_assignment)
    session.commit()
    session.refresh(role_assignment)
    return role_assignment

def bulk_assign_course(*, session: Session, course_id: uuid.UUID, user_ids: list[uuid.UUID] | None = None, roles: list[RoleEnum] | None = None) -> None:
    """Assign a course to multiple users based on their user_ids and/or roles."""
    assigned_users: set[tuple[uuid.UUID, str]] = set()
   
    if user_ids:
        user_stmt = select(User.id, User.role_name).where(User.id.in_(user_ids))  # type: ignore
        assigned_users.update(session.exec(user_stmt).all())

    if roles:
        role_stmt = select(User.id, User.role_name).where(User.role_name.in_([role.value for role in roles]))  # type: ignore
        role_user_ids = set(session.exec(role_stmt).all())
        assigned_users.update(role_user_ids)

    if not assigned_users:
        return

    existing_assignments = {
        (ca.user_id, ca.course_id)
        for ca in session.exec(
            select(CourseAssignment).where(
                CourseAssignment.course_id == course_id,
                CourseAssignment.user_id.in_([user_id for user_id, _ in assigned_users]),  # type: ignore
            )
        ).all()
    }

    new_assignments = [
        CourseAssignment(course_id=course_id, user_id=user_id, role_name=role_name)
        for user_id, role_name in assigned_users
        if (user_id, course_id) not in existing_assignments
    ]

    session.add_all(new_assignments)
    session.commit()

# def reassign_course(
#     *,
#     session: Session,
#     course_id: uuid.UUID,
#     user_ids: List[uuid.UUID] = [],
#     roles: List[Role] = []
# ) -> None:
#     """**Reassigns a course** to a new set of users and roles."""
#     # Remove existing assignments
#     session.exec(select(CourseAssignment).where(CourseAssignment.course_id == course_id)).delete()

#     # Assign new users & roles
#     bulk_assign_course(session=session, course_id=course_id, user_ids=user_ids, roles=roles)
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
