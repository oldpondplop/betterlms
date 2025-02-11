import shutil
from typing import Optional, Sequence
import uuid
from app.api.deps import CurrentSuperUser
from sqlmodel import Session, or_, select, delete, func
from fastapi import HTTPException, UploadFile

from app.models import (
    CourseAnalytics,
    CourseRoleLink,
    CourseUserLink,
    CourseUserProgress,
    Notification,
    NotificationCreate,
    QuizAttempt,
    QuizAttemptCreate,
    QuizAttemptResult,
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

def get_courses_for_user(session: Session, current_user: User) -> Sequence[Course]:
    stmt = (
        select(Course)
        .outerjoin(CourseUserLink, Course.id == CourseUserLink.course_id)
        .outerjoin(CourseRoleLink, Course.id == CourseRoleLink.course_id)
    )

    conditions = [CourseUserLink.user_id == current_user.id]
    if current_user.role_id is not None:
        conditions.append(CourseRoleLink.role_id == current_user.role_id)

    stmt = stmt.where(or_(*conditions)).distinct()
    return session.exec(stmt).all()

def get_course_users(session: Session, course_id: uuid.UUID) -> Sequence[User]:
    stmt = (
        select(User)
        .outerjoin(CourseUserLink, CourseUserLink.user_id == User.id)  
        .outerjoin(CourseRoleLink, CourseRoleLink.role_id == User.role_id)
        .where(
            (CourseUserLink.course_id == course_id) |  
            ((CourseRoleLink.course_id == course_id) & (User.role_id.isnot(None)))
        )
        .distinct()
    )
    return session.exec(stmt).all()

def get_course_roles(session: Session, course_id: uuid.UUID) -> list[Role]:
    if not (db_course := session.get(Course, course_id)):
        raise HTTPException(status_code=404, detail="Course not found")
    return list(db_course.roles)

def create_course(session: Session, course_in: CourseCreate) -> Course:
    """Create a new course and handle user/role assignments."""
    course = Course(**course_in.model_dump(exclude_unset=True, exclude={"users", "roles", "quiz"}))
    session.add(course)
    session.commit()
    session.refresh(course)
    
    if course_in.users or course_in.roles:
        assign_users_and_roles(session, course.id, users_to_add=course_in.users, roles_to_add=course_in.roles)
    
    session.commit()
    session.refresh(course)
    return course

def update_course(session: Session, db_course: Course, course_in: CourseUpdate) -> Course:
    """Update course details, users, roles, and quiz assignments."""
    course_data = course_in.model_dump(exclude_unset=True, exclude={"users_to_add", "users_to_remove", "roles_to_add", "roles_to_remove", "quiz", "increment_cycle"})
    for key, value in course_data.items():
        setattr(db_course, key, value)
    
    if course_in.increment_cycle:
        db_course.current_cycle += 1
 
    assign_users_and_roles(
        session,
        db_course.id,
        users_to_add=course_in.users_to_add,
        users_to_remove=course_in.users_to_remove,
        roles_to_add=course_in.roles_to_add,
        roles_to_remove=course_in.roles_to_remove
    )

    session.commit()
    session.refresh(db_course)
    return db_course

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

# =========================================================
#  QUIZ CRUD
# =========================================================

def get_quizzes(session: Session, skip: int = 0, limit: int = 100) -> Sequence[Quiz]:
    stmt = select(Quiz).offset(skip).limit(limit)
    return session.exec(stmt).all()

def get_quiz_by_id(session: Session, quiz_id: uuid.UUID) -> Optional[Quiz]:
    stmt = select(Quiz).where(Quiz.id == quiz_id)
    return session.exec(stmt).first()

def get_quiz_by_course(session: Session, course_id: uuid.UUID) -> Optional[Quiz]:
    stmt = select(Quiz).where(Quiz.course_id == course_id)
    return session.exec(stmt).first()

def create_quiz(session: Session, quiz_in: QuizCreate) -> Quiz:
    db_course = session.get(Course, quiz_in.course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    existing_quiz = get_quiz_by_course(session, quiz_in.course_id)
    if existing_quiz:
        raise HTTPException(status_code=400, detail="A quiz already exists for this course")
    
    quiz = Quiz(**quiz_in.model_dump())
    session.add(quiz)
    session.commit()
    session.refresh(quiz)
    return quiz

def update_quiz(session: Session, quiz_id: uuid.UUID, quiz_in: QuizUpdate) -> Quiz:
    quiz = get_quiz_by_id(session, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    for key, value in quiz_in.model_dump(exclude_unset=True).items():
        setattr(quiz, key, value)
    session.commit()
    session.refresh(quiz)
    return quiz

def delete_quiz(session: Session, quiz_id: uuid.UUID) -> None:
    quiz = get_quiz_by_id(session, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    session.exec(delete(QuizAttempt).where(QuizAttempt.quiz_id == quiz_id))
    session.delete(quiz)
    session.commit()

# =========================================================
#  QUIZ ATTEMPT CRUD
# =========================================================

def calculate_attempt_results(attempt: QuizAttempt) -> list[QuizAttemptResult]:
    """Calculate the results for a quiz attempt."""
    quiz = attempt.quiz
    results = []
    for i, question in enumerate(quiz.questions):
        selected_index = attempt.selected_indexes[i] if i < len(attempt.selected_indexes) else None
        results.append(QuizAttemptResult(
            question=question["question"],
            options=question["options"],
            correct_index=question["correct_index"],
            selected_index=selected_index,
            is_correct=selected_index == question["correct_index"]
        ))
    return results


def get_attempts_for_quiz(session: Session, quiz_id: uuid.UUID, cycle: Optional[int] = None) -> Sequence[QuizAttempt]:
    """Return all attempts for a quiz, optionally filtered by assignment cycle."""
    stmt = select(QuizAttempt).where(QuizAttempt.quiz_id == quiz_id)
    if cycle is not None:
        stmt = stmt.where(QuizAttempt.assignment_cycle == cycle)
    return session.exec(stmt).all()

def get_attempts_for_user(session: Session, quiz_id: uuid.UUID, user_id: uuid.UUID, cycle: Optional[int] = None) -> Sequence[QuizAttempt]:
    """Return all attempts for a user in a quiz, optionally filtered by cycle."""
    stmt = select(QuizAttempt).where(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.user_id == user_id
    )
    if cycle is not None:
        stmt = stmt.where(QuizAttempt.assignment_cycle == cycle)
    return session.exec(stmt).all()

def get_attempts_for_user_in_course(session: Session, course_id: uuid.UUID, user_id: uuid.UUID, cycle: Optional[int] = None) -> Sequence[QuizAttempt]:
    """Return all attempts for a user in a course, optionally filtered by cycle."""
    stmt = select(QuizAttempt).join(Quiz).where(
        Quiz.course_id == course_id,
        QuizAttempt.user_id == user_id
    )
    if cycle is not None:
        stmt = stmt.where(QuizAttempt.assignment_cycle == cycle)
    return session.exec(stmt).all()

def get_attempts_for_course(session: Session, course_id: uuid.UUID, cycle: Optional[int] = None) -> Sequence[QuizAttempt]:
    """Return all attempts for a course, optionally filtered by cycle."""
    stmt = select(QuizAttempt).join(Quiz).where(Quiz.course_id == course_id)
    if cycle is not None:
        stmt = stmt.where(QuizAttempt.assignment_cycle == cycle)
    return session.exec(stmt).all()

def create_quiz_attempt(session: Session, attempt_in: QuizAttemptCreate, admin_user: CurrentSuperUser,) -> QuizAttempt:
    """Create a new quiz attempt, ensuring cycle limits are respected."""
    quiz = get_quiz_by_id(session, attempt_in.quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    course = quiz.course
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    existing_cycle_attempts = get_attempts_for_user(session, attempt_in.quiz_id, attempt_in.user_id, course.current_cycle)
    if len(existing_cycle_attempts) >= quiz.max_attempts:
        notify_admins_about_quiz_attempts(session, quiz.id, attempt_in.user_id)
        raise HTTPException(status_code=400, detail="Max attempts exceeded")
    
    attempt = QuizAttempt(**attempt_in.model_dump())
    attempt.assignment_cycle = course.current_cycle
    session.add(attempt)
    session.commit()
    session.refresh(attempt)
    return attempt

def delete_quiz_attempt(session: Session, attempt_id: uuid.UUID) -> None:
    """Delete a specific quiz attempt."""
    attempt = session.get(QuizAttempt, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Quiz attempt not found")
    session.delete(attempt)
    session.commit()

def get_last_attempts(session: Session, quiz_id: uuid.UUID, cycle: int) -> dict[uuid.UUID, QuizAttempt]:
    """
    Retrieves the last (most recent) attempt per user for a given quiz and assignment cycle.
    """
    subq = (select(QuizAttempt.user_id, func.max(QuizAttempt.created_at).label("max_created_at"))
            .where(QuizAttempt.quiz_id == quiz_id, QuizAttempt.assignment_cycle == cycle)
            .group_by(QuizAttempt.user_id)
            .subquery())

    stmt = (select(QuizAttempt)
            .join(subq, (QuizAttempt.user_id == subq.c.user_id) & (QuizAttempt.created_at == subq.c.max_created_at)))
    
    return {attempt.user_id: attempt for attempt in session.exec(stmt).all()}

def get_course_analytics(session: Session, course_id: uuid.UUID) -> CourseAnalytics:
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    users = get_course_users(session, course_id)
    total_users = len(users)
    current_cycle = db_course.current_cycle

    quiz = session.exec(select(Quiz).where(Quiz.course_id == course_id)).first()
    if not quiz:
        return CourseAnalytics(
            total_users=total_users,
            passed_users=0,
            failed_users=0,
            in_progress_users=total_users,
            course_completed=False,
            completion_rate=0.0,
            pass_rate=0.0,
            fail_rate=0.0,
            average_attempts=0.0,
            average_score=0.0,
        )

    all_attempts: Sequence[QuizAttempt] = session.exec(
        select(QuizAttempt)
        .where(
            QuizAttempt.quiz_id == quiz.id,
            QuizAttempt.assignment_cycle == current_cycle
        )
        .order_by(QuizAttempt.user_id, QuizAttempt.created_at.asc())
    ).all()

    user_attempts_map = {user.id: [attempt for attempt in all_attempts if attempt.user_id == user.id] for user in users}

    last_attempts = {user_id: attempts[-1] for user_id, attempts in user_attempts_map.items() if attempts}

    passed_users = sum(1 for attempt in last_attempts.values() if attempt.passed)
    failed_users = sum(1 for attempt in last_attempts.values() if not attempt.passed and len(user_attempts_map[attempt.user_id]) >= quiz.max_attempts)
    in_progress_users = total_users - (passed_users + failed_users)

    total_attempts = len(all_attempts)
    
    last_attempt_scores = [attempt.score for attempt in last_attempts.values()]

    avg_attempts = total_attempts / total_users if total_users > 0 else 0.0
    avg_score = sum(last_attempt_scores) / len(last_attempt_scores) if last_attempt_scores else 0.0

    completion_rate = ((passed_users + failed_users) / total_users * 100) if total_users > 0 else 0.0
    pass_rate = (passed_users / total_users * 100) if total_users > 0 else 0.0
    fail_rate = (failed_users / total_users * 100) if total_users > 0 else 0.0
    course_completed = in_progress_users == 0  # Course is fully completed when no one is "in progress"

    return CourseAnalytics(
        total_users=total_users,
        passed_users=passed_users,
        failed_users=failed_users,
        in_progress_users=in_progress_users,
        course_completed=course_completed,
        completion_rate=completion_rate,
        pass_rate=pass_rate,
        fail_rate=fail_rate,
        average_attempts=avg_attempts,
        average_score=avg_score,
    )

def get_course_progress(session: Session, course_id: uuid.UUID) -> list[CourseUserProgress]:
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    quiz = db_course.quiz
    if not quiz:
        raise HTTPException(status_code=404, detail="No quizz assigned")
 
    users = get_course_users(session, course_id)
    last_attempts = get_last_attempts(session, quiz.id, db_course.current_cycle)

    users_progress = []
    for user in users:
        attempts = get_attempts_for_user(session, quiz.id, user.id, db_course.current_cycle)
        last_attempt = last_attempts.get(user.id)
        if not last_attempt:
            status = StatusEnum.ASSIGNED
            score = 0.0
        else:
            score = last_attempt.score
            if last_attempt.passed:
                status = StatusEnum.PASSED 
            elif len(attempts) >= quiz.max_attempts:
                status = StatusEnum.FAILED 
            else:
                status = StatusEnum.IN_PROGRESS 
        users_progress.append(CourseUserProgress(user=user, status=status, attempt_count=len(attempts), max_attempts=quiz.max_attempts, score=score))
    
    return users_progress

# =========================================================
#  Notification CRUD
# =========================================================

def create_notification(session: Session, notification_in: NotificationCreate) -> Notification:
    notification = Notification(**notification_in.model_dump())
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification

def get_notifications(session: Session, user_id: uuid.UUID) -> Sequence[Notification]:
    statement = select(Notification).where(Notification.user_id == user_id)
    return session.exec(statement).all()

def delete_notification(session: Session, notification_id: uuid.UUID) -> None:
    notification = session.get(Notification, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    session.delete(notification)
    session.commit()

def notify_admins_about_quiz_attempts(session: Session, quiz_id: uuid.UUID, user_id: uuid.UUID) -> None:
    admins = session.exec(select(User).where(User.is_superuser == True)).all()
    for admin in admins:
        notification = NotificationCreate(
            user_id=admin.id,
            message=f"User {user_id} exceeded max attempts for quiz {quiz_id}."
        )
        create_notification(session=session, notification_in=notification)