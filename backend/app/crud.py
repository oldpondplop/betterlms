import shutil
from typing import Optional, Sequence
import uuid
from sqlmodel import Session, select, delete, func
from fastapi import HTTPException, UploadFile

from app.models import (
    CourseAnalytics,
    CourseRoleLink,
    CourseUserLink,
    CourseUserProgress,
    QuizAttempt,
    QuizAttemptCreate,
    StatusEnum,
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
from app.core.config import settings

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

def get_course_users(session: Session, course_id: uuid.UUID) -> list[User]:
    if not (db_course := session.get(Course, course_id)):
        raise HTTPException(status_code=404, detail="Course not found")
    return list(set(db_course.users) | {user for role in db_course.roles for user in role.users})

def get_course_roles(session: Session, course_id: uuid.UUID) -> list[Role]:
    if not (db_course := session.get(Course, course_id)):
        raise HTTPException(status_code=404, detail="Course not found")
    return list(db_course.roles)

def create_course(session: Session, course_in: CourseCreate) -> Course:
    """Create a new course and handle user/role assignments."""
    course = Course(**course_in.model_dump(exclude_unset=True, exclude={"users", "roles", "quiz"}))
    session.add(course)
    # session.flush()
    session.commit()
    session.refresh(course)
    
    if course_in.users or course_in.roles:
        assign_users_and_roles(session, course.id, users_to_add=course_in.users, roles_to_add=course_in.roles)

    if course_in.quiz:
        session.add(Quiz(**course_in.quiz, course_id=course.id))
    
    session.commit()
    session.refresh(course)
    return course

def update_course(session: Session, db_course: Course, course_in: CourseUpdate) -> Course:
    """Update course details, users, roles, and quiz assignments."""
    course_data = course_in.model_dump(exclude_unset=True, exclude={"users_to_add", "users_to_remove", "roles_to_add", "roles_to_remove", "quiz"})
    for key, value in course_data.items():
        setattr(db_course, key, value)
    
    assign_users_and_roles(
        session,
        db_course.id,
        users_to_add=course_in.users_to_add,
        users_to_remove=course_in.users_to_remove,
        roles_to_add=course_in.roles_to_add,
        roles_to_remove=course_in.roles_to_remove
    )

    if course_in.quiz:
        existing_quiz = session.exec(select(Quiz).where(Quiz.course_id == db_course.id)).first()
        if existing_quiz:
            for key, value in course_in.quiz.items():
                setattr(existing_quiz, key, value)
        else:
            session.add(Quiz(**course_in.quiz, course_id=db_course.id))
    
    session.commit()
    session.refresh(db_course)
    return db_course

# NOTE: same as assign but orm.
def orm_assign_users_and_roles(
    session: Session, 
    course_id: uuid.UUID,
    users_to_add: list[uuid.UUID] | None = None,
    users_to_remove: list[uuid.UUID] | None = None,
    roles_to_add: list[uuid.UUID] | None = None,
    roles_to_remove: list[uuid.UUID] | None = None
) -> None:
    """Assign users and roles to a course while maintaining explicit user assignments."""

    # Get course object (ORM)
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Current users and roles in the course
    existing_users = {user.id for user in course.users}
    existing_roles = {role.id for role in course.roles}

    # Validate users & roles exist before adding
    valid_users = {user.id for user in session.exec(select(User).where(User.id.in_(users_to_add or []))).all()}
    valid_roles = {role.id for role in session.exec(select(Role).where(Role.id.in_(roles_to_add or []))).all()}

    # Remove invalid IDs (safety check)
    users_to_add = set(users_to_add or []) & valid_users
    roles_to_add = set(roles_to_add or []) & valid_roles
    users_to_remove = set(users_to_remove or []) & existing_users
    roles_to_remove = set(roles_to_remove or []) & existing_roles

    # 📌 Assign users explicitly
    for user_id in users_to_add - existing_users:
        user = session.get(User, user_id)
        if user:
            course.users.append(user)

    for user_id in users_to_remove:
        user = session.get(User, user_id)
        if user and user in course.users:
            course.users.remove(user)

    # 📌 Assign roles
    for role_id in roles_to_add - existing_roles:
        role = session.get(Role, role_id)
        if role:
            course.roles.append(role)
            # Add users from this role explicitly
            # for user in role.users:
            #     if user.id not in existing_users:
            #         course.users.append(user)

    for role_id in roles_to_remove:
        role = session.get(Role, role_id)
        if role and role in course.roles:
            course.roles.remove(role)
            # Remove users from this role (if they were assigned only via this role)
            # for user in role.users:
            #     if not any(user in other_role.users for other_role in course.roles):
            #         if user in course.users:
            #             course.users.remove(user)

    session.commit()
    session.refresh(course)

def assign_users_and_roles(
    session: Session, 
    course_id: uuid.UUID,
    users_to_add: list[uuid.UUID] | None = None,
    users_to_remove: list[uuid.UUID] | None = None,
    roles_to_add: list[uuid.UUID] | None = None,
    roles_to_remove: list[uuid.UUID] | None = None
) -> None:
    existing_users = {user.id for user in session.exec(select(User).join(CourseUserLink).where(CourseUserLink.course_id == course_id)).all()}
    existing_roles = {role.id for role in session.exec(select(Role).join(CourseRoleLink).where(CourseRoleLink.course_id == course_id)).all()}

    # Validate users and roles exist before adding
    valid_users = {user.id for user in session.exec(select(User).where(User.id.in_(users_to_add or []))).all()}
    valid_roles = {role.id for role in session.exec(select(Role).where(Role.id.in_(roles_to_add or []))).all()}

    # Remove invalid users and roles
    users_to_add = set(users_to_add or []) & valid_users
    roles_to_add = set(roles_to_add or []) & valid_roles

    # Identify users/roles to add and remove
    users_to_add = users_to_add - existing_users
    users_to_remove = set(users_to_remove or []) & existing_users
    roles_to_add = roles_to_add - existing_roles
    roles_to_remove = set(roles_to_remove or []) & existing_roles

    # Remove users and roles
    if users_to_remove:
        session.exec(delete(CourseUserLink).where(CourseUserLink.course_id == course_id, CourseUserLink.user_id.in_(users_to_remove)))
    if roles_to_remove:
        session.exec(delete(CourseRoleLink).where(CourseRoleLink.course_id == course_id, CourseRoleLink.role_id.in_(roles_to_remove)))

    # Add users and roles
    if users_to_add:
        session.add_all([CourseUserLink(course_id=course_id, user_id=user_id) for user_id in users_to_add])
    if roles_to_add:
        session.add_all([CourseRoleLink(course_id=course_id, role_id=role_id) for role_id in roles_to_add])

    session.commit()

def upload_course_materials(session: Session, course_id: uuid.UUID, files: list[UploadFile]) -> Course:
    """Upload multiple materials to a course."""
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    for file in files:
        file_path = settings.UPLOAD_DIR / f"{uuid.uuid4().hex}_{file.filename}"
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        db_course.materials.append(file_path.name)

    session.commit()
    session.refresh(db_course)
    return db_course


def list_course_materials(session: Session, course_id: uuid.UUID) -> list[str]:
    """List all materials attached to a course."""
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    return db_course.materials

def delete_course_material(session: Session, course_id: uuid.UUID, filename: str) -> Message:
    """Delete a specific material from a course."""
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    if filename not in db_course.materials:
        raise HTTPException(status_code=404, detail="Material not found in this course")
    
    db_course.materials.remove(filename)
    session.add(db_course)
    session.commit()
    session.refresh(db_course)

    file_path = settings.UPLOAD_DIR / filename
    if file_path.exists():
        file_path.unlink()
    return Message(message="Course material deleted successfully.")

def delete_all_course_materials(session: Session, course_id: uuid.UUID) -> Message:
    """Delete all materials for a course."""
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    for filename in db_course.materials:
        file_path = settings.UPLOAD_DIR / filename
        if file_path.exists():
            file_path.unlink()

    db_course.materials = []
    session.commit()
    return Message(message="All course materials deleted successfully.")


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

def get_course_analytics(session: Session, course_id: uuid.UUID) -> CourseAnalytics:
    if not session.get(Course, course_id):
        raise HTTPException(status_code=404, detail="Course not found")
    
    total_users = session.exec(select(func.count()).where(CourseUserLink.course_id == course_id)).one()
    completed_users = session.exec(select(func.count()).where(CourseUserLink.course_id == course_id, CourseUserLink.status == StatusEnum.COMPLETED)).one()
    failed_users = session.exec(select(func.count()).where(CourseUserLink.course_id == course_id, CourseUserLink.status == StatusEnum.FAILED)).one()
    avg_attempts = session.exec(select(func.avg(CourseUserLink.attempt_count)).where(CourseUserLink.course_id == course_id)).one()
    avg_score = session.exec(select(func.avg(CourseUserLink.score)).where(CourseUserLink.course_id == course_id, CourseUserLink.score.isnot(None))).one()  # type: ignore
    
    return CourseAnalytics(
        total_users=total_users,
        completed_users=completed_users,
        failed_users=failed_users,
        average_attempts=avg_attempts or 0,
        average_score=avg_score or 0
    )

def get_course_progress(session: Session, course_id: uuid.UUID) -> list[CourseUserProgress]:
    """Retrieve user progress for a course."""
    if not session.get(Course, course_id):
        raise HTTPException(status_code=404, detail="Course not found")
    
    users_progress = session.exec(
        select(User, CourseUserLink.status, CourseUserLink.attempt_count, CourseUserLink.score)
        .join(CourseUserLink, CourseUserLink.user_id == User.id)  # type: ignore
        .where(CourseUserLink.course_id == course_id)
    ).all()
    
    return [
        CourseUserProgress(
            user=user,
            status=status,
            attempt_count=attempts or 0,
            score=score or 0
        ) for user, status, attempts, score in users_progress
    ]


