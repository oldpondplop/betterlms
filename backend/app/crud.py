from typing import List, Optional, Sequence
from uuid import UUID
from sqlmodel import Session, select
from fastapi import HTTPException
from sqlalchemy import Connection, func

from app.models import (
    CourseUserLink,
    Notification,
    NotificationCreate,
    Quiz,
    QuizAttempt,
    QuizCreate,
    QuizUpdate,
    User,
    UserCreate,
    UserUpdate,
    UserUpdateMe,
    UpdatePassword,
    Role,
    RoleCreate,
    RoleUpdate,
    Course,
    CourseCreate,
    CourseUpdate
)
from app.core.security import verify_password, get_password_hash 


# ===========================
#  USER CRUD
# ===========================

def get_user_by_id(session: Session, user_id: UUID) -> Optional[User]:
    return session.get(User, user_id)

def get_user_by_email(session: Session, email: str) -> Optional[User]:
    stmt = select(User).where(User.email == email)
    return session.exec(stmt).first()

def get_users(session: Session, skip: int = 0, limit: int = 100) -> Sequence[User]:
    stmt = select(User).offset(skip).limit(limit)
    return session.exec(stmt).all()

def count_users(session: Session) -> int:
    """Return the total number of users."""
    return session.exec(select(func.count()).select_from(User)).one()

def authenticate_user(session: Session, email: str, password: str) -> Optional[User]:
    """Check if a user with the given email/password exists."""
    db_user = get_user_by_email(session=session, email=email)
    if not db_user or not verify_password(password, db_user.hashed_password):
        return None
    return db_user

def create_user(session: Session, user_in: UserCreate) -> User:
    """Create a new User from a UserCreate schema."""
    db_obj = User.model_validate(
        user_in, update={"hashed_password": get_password_hash(user_in.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj

def update_user(session: Session, db_user: User, user_in: UserUpdate) -> User:
    """Partially update an existing User with the fields in UserUpdate."""
    user_data = user_in.model_dump(exclude_unset=True)
    db_user.sqlmodel_update(user_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
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

def delete_user(session: Session, user_id: UUID) -> User:
    """Delete a User by ID."""
    db_user = get_user_by_id(session, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    session.delete(db_user)
    session.commit()
    return db_user


#
# ===========================
#  ROLE CRUD
# ===========================
#

def get_role_by_id(session: Session, role_id: UUID) -> Optional[Role]:
    return session.get(Role, role_id)

def get_role_by_name(session: Session, name: str) -> Optional[Role]:
    stmt = select(Role).where(Role.name == name)
    return session.exec(stmt).first()

def get_roles(session: Session, skip: int = 0, limit: int = 100) -> Sequence[Role]:
    stmt = select(Role).offset(skip).limit(limit)
    return session.exec(stmt).all()

def count_roles(session: Session) -> int:
    return session.exec(select(func.count()).select_from(Role)).one()

def create_role(session: Session, role_in: RoleCreate) -> Role:
    existing = get_role_by_name(session, role_in.name)
    if existing:
        raise HTTPException(status_code=400, detail="Role name already exists")

    db_obj = Role.model_validate(role_in)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj

def update_role(session: Session, db_role: Role, role_in: RoleUpdate) -> Role:
    update_data = role_in.model_dump(exclude_unset=True)
    for field_name, value in update_data.items():
        setattr(db_role, field_name, value)
    session.add(db_role)
    session.commit()
    session.refresh(db_role)
    return db_role

def delete_role(session: Session, role_id: UUID) -> Role:
    db_role = get_role_by_id(session, role_id)
    if not db_role:
        raise HTTPException(status_code=404, detail="Role not found")
    session.delete(db_role)
    session.commit()
    return db_role


# ===========================
#  Example: COURSE CRUD
# ===========================

def get_course_by_id(session: Session, course_id: UUID) -> Optional[Course]:
    return session.get(Course, course_id)

def get_courses(session: Session, skip: int = 0, limit: int = 100) -> Sequence[Course]:
    stmt = select(Course).offset(skip).limit(limit)
    return session.exec(stmt).all()

def count_courses(session: Session) -> int:
    return session.exec(select(func.count()).select_from(Course)).one()

def create_course(session: Session, course_create: CourseCreate) -> Course:
    db_course = Course.model_validate(course_create)
    session.add(db_course)
    session.commit()
    session.refresh(db_course)
    return db_course

def update_course(session: Session, db_course: Course, course_in: CourseUpdate) -> Course:
    """Partially update an existing Course."""
    course_data = course_in.model_dump(exclude_unset=True)
    db_course.sqlmodel_update(course_data)

    session.add(db_course)
    session.commit()
    session.refresh(db_course)
    return db_course
    
# ===========================
#  QUIZ CRUD
# ===========================

def get_quiz_by_id(session: Session, quiz_id: UUID) -> Optional[Quiz]:
    return session.get(Quiz, quiz_id)

def get_quiz_by_course_id(session: Session, course_id: UUID) -> Optional[Quiz]:
    stmt = select(Quiz).where(Quiz.course_id == course_id)
    return session.exec(stmt).first()

def get_quizzes(session: Session, skip: int = 0, limit: int = 100) -> Sequence[Quiz]:
    stmt = select(Quiz).offset(skip).limit(limit)
    return session.exec(stmt).all()

def count_quizzes(session: Session) -> int:
    return session.exec(select(func.count()).select_from(Quiz)).one()

def create_quiz(session: Session, quiz_create: QuizCreate) -> Quiz:
    """Create a new Quiz from QuizCreate schema."""
    # Check if course exists
    course = session.get(Course, quiz_create.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check if course already has a quiz
    existing_quiz = get_quiz_by_course_id(session, quiz_create.course_id)
    if existing_quiz:
        raise HTTPException(
            status_code=400,
            detail="Course already has a quiz assigned"
        )

    db_quiz = Quiz.model_validate(quiz_create)
    session.add(db_quiz)
    session.commit()
    session.refresh(db_quiz)
    return db_quiz

def update_quiz(session: Session, db_quiz: Quiz, quiz_in: QuizUpdate) -> Quiz:
    """Partially update an existing Quiz."""
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    quiz_data = quiz_in.model_dump(exclude_unset=True)
    db_quiz.sqlmodel_update(quiz_data)
    session.add(db_quiz)
    session.commit()
    session.refresh(db_quiz)
    return db_quiz


def delete_quiz(session: Session, db_quiz: Quiz) -> Quiz:
    """Delete a Quiz."""
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    session.delete(db_quiz)
    session.commit()
    return db_quiz


# ===========================
#  QUIZ ATTEMPT CRUD
# ===========================

def get_quiz_attempt_by_id(session: Session, attempt_id: UUID) -> Optional[QuizAttempt]:
    return session.get(QuizAttempt, attempt_id)

def get_quiz_attempts(
    session: Session,
    quiz_id: Optional[UUID] = None,
    user_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100
) -> Sequence[QuizAttempt]:
    """Get quiz attempts with optional filtering by quiz_id and/or user_id."""
    stmt = select(QuizAttempt)
    
    if quiz_id:
        stmt = stmt.where(QuizAttempt.quiz_id == quiz_id)
    if user_id:
        stmt = stmt.where(QuizAttempt.user_id == user_id)
    
    stmt = stmt.offset(skip).limit(limit)
    return session.exec(stmt).all()

def count_quiz_attempts(
    session: Session,
    quiz_id: Optional[UUID] = None,
    user_id: Optional[UUID] = None
) -> int:
    """Count quiz attempts with optional filtering."""
    stmt = select(func.count()).select_from(QuizAttempt)
    
    if quiz_id:
        stmt = stmt.where(QuizAttempt.quiz_id == quiz_id)
    if user_id:
        stmt = stmt.where(QuizAttempt.user_id == user_id)
    
    return session.exec(stmt).one()

def create_quiz_attempt(
    session: Session,
    quiz: Quiz,
    user: User,
    answers: List[int]
) -> QuizAttempt:
    """Create a new quiz attempt with score calculation."""
    # Verify user is enrolled in the course
    # course_enrollment = session.exec(
    #     select(CourseUserLink).where(
    #         CourseUserLink.course_id == quiz.course_id,
    #         CourseUserLink.user_id == user.id
    #     )
    # ).first()
    
    # if not course_enrollment:
    #     raise HTTPException(
    #         status_code=403,
    #         detail="User not enrolled in this course"
    #     )
    
    # Check attempt limit
    attempt_count = count_quiz_attempts(
        session=session,
        quiz_id=quiz.id,
        user_id=user.id
    )
    
    if attempt_count >= quiz.max_attempts:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum attempts ({quiz.max_attempts}) reached"
        )
    
    # Validate answers
    if len(answers) != len(quiz.questions):
        raise HTTPException(
            status_code=400,
            detail="Number of answers doesn't match number of questions"
        )
    print(quiz.questions[0]) 
    # Calculate score
    correct_answers = sum(
        1 for i, answer in enumerate(answers)
        if answer == quiz.questions[i].get('correct_index')
    )
    score = int((correct_answers / len(quiz.questions)) * 100)
    
    # Create attempt
    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=user.id,
        score=score,
        passed=score >= quiz.passing_threshold,
        attempt_number=attempt_count + 1
    )
    session.add(attempt)
    session.commit()
    session.refresh(attempt)
    return attempt

def get_user_quiz_stats(
    session: Session,
    quiz_id: UUID,
    user_id: UUID
) -> dict:
    """Get quiz statistics for a specific user."""
    attempts = get_quiz_attempts(session, quiz_id=quiz_id, user_id=user_id)
    
    if not attempts:
        return {
            "total_attempts": 0,
            "highest_score": 0,
            "latest_score": 0,
            "has_passed": False,
            "remaining_attempts": None  # Will be set below
        }
    
    # Get quiz max attempts
    quiz = get_quiz_by_id(session, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    scores = [attempt.score for attempt in attempts]
    
    return {
        "total_attempts": len(attempts),
        "highest_score": max(scores),
        "latest_score": scores[-1],
        "has_passed": any(attempt.passed for attempt in attempts),
        "remaining_attempts": max(0, quiz.max_attempts - len(attempts))
    }

# ===========================
#  QUIZ ANALYTICS
# ===========================

def get_quiz_overall_stats(
    session: Session,
    quiz_id: UUID,
) -> dict:
    """Get overall statistics for a quiz."""
    attempts = get_quiz_attempts(session, quiz_id=quiz_id)
    if not attempts:
        return {
            "total_attempts": 0,
            "average_score": 0,
            "pass_rate": 0,
            "highest_score": 0,
            "lowest_score": 0,
            "total_students": 0,
            "students_completed": 0,
            "students_passed": 0
        }
    
    scores = [attempt.score for attempt in attempts]
    unique_students = len(set(attempt.user_id for attempt in attempts))
    students_passed = len(set(
        attempt.user_id for attempt in attempts 
        if attempt.passed
    ))
    
    return {
        "total_attempts": len(attempts),
        "average_score": sum(scores) / len(scores),
        "pass_rate": (students_passed / unique_students * 100) if unique_students > 0 else 0,
        "highest_score": max(scores),
        "lowest_score": min(scores),
        "total_students": unique_students,
        "students_completed": len(set(attempt.user_id for attempt in attempts)),
        "students_passed": students_passed
    }

def get_course_quiz_progress(
    session: Session,
    course_id: UUID,
) -> dict:
    """Get quiz progress statistics for an entire course."""
    quiz = get_quiz_by_course_id(session, course_id)
    if not quiz:
        return {
            "total_enrolled": 0,
            "not_started": 0,
            "in_progress": 0,
            "completed": 0,
            "failed": 0,
            "pass_rate": 0
        }
    
    # Get all course enrollments
    stmt = select(CourseUserLink).where(CourseUserLink.course_id == course_id)
    enrollments = session.exec(stmt).all()
    
    total = len(enrollments)
    if total == 0:
        return {
            "total_enrolled": 0,
            "not_started": 0,
            "in_progress": 0,
            "completed": 0,
            "failed": 0,
            "pass_rate": 0
        }
    
    completed = sum(1 for e in enrollments if e.status == "completed")
    failed = sum(1 for e in enrollments if e.status == "failed")
    in_progress = sum(1 for e in enrollments if e.attempt_count > 0 and e.status == "assigned")
    
    return {
        "total_enrolled": total,
        "not_started": total - (completed + failed + in_progress),
        "in_progress": in_progress,
        "completed": completed,
        "failed": failed,
        "pass_rate": (completed / total * 100) if total > 0 else 0
    }

def get_question_analysis(
    session: Session,
    quiz_id: UUID,
) -> List[dict]:
    """Analyze performance for each question in a quiz."""
    quiz = get_quiz_by_id(session, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Get all attempts for this quiz with their answers
    attempts = get_quiz_attempts(session, quiz_id=quiz_id)
    
    # Initialize question stats
    question_stats = []
    for i, question in enumerate(quiz.questions):
        correct_answers = 0
        total_attempts = len(attempts)
        
        if total_attempts > 0:
            # Here you would need to add logic to track answers per question
            # This would require modifying the QuizAttempt model to store answers
            pass
        
        question_stats.append({
            "question_number": i + 1,
            "question_text": question.question,
            "total_attempts": total_attempts,
            "correct_answers": correct_answers,
            "success_rate": (correct_answers / total_attempts * 100) if total_attempts > 0 else 0
        })
    
    return question_stats

def get_user_quiz_stats(
    session: Session,
    quiz_id: UUID,
    user_id: UUID
) -> dict:
    """Get quiz statistics for a specific user."""
    attempts = get_quiz_attempts(session, quiz_id=quiz_id, user_id=user_id)
    
    if not attempts:
        return {
            "total_attempts": 0,
            "highest_score": 0,
            "latest_score": 0,
            "has_passed": False,
            "remaining_attempts": None  # Will be set below
        }
    
    # Get quiz max attempts
    quiz = get_quiz_by_id(session, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    scores = [attempt.score for attempt in attempts]
    
    return {
        "total_attempts": len(attempts),
        "highest_score": max(scores),
        "latest_score": scores[-1],
        "has_passed": any(attempt.passed for attempt in attempts),
        "remaining_attempts": max(0, quiz.max_attempts - len(attempts))
    }
# NOTIFICATION REE
def create_notification(db: Session, notification: NotificationCreate) -> Notification:
    """Create a new notification."""
    db_notification = Notification(**notification.dict())
    db.add(db_notification)  # Add the notification to the session
    db.commit()  # Commit the transaction
    db.refresh(db_notification)  # Refresh the instance to get the updated data
    return db_notification

def get_notifications(db: Session, user_id: UUID) -> List[Notification]:
    """Get all notifications for a specific user."""
    return db.query(Notification).filter(Notification.user_id == user_id).all()

def mark_notification_as_read(
    db: Session, 
    notification_id: UUID,  # Change from int to UUID
    user_id: UUID  # Add user ownership check
) -> Notification:
    """Mark a notification as read (only allowed for the notification owner)."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id  # Ensure the user owns the notification
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification

def create_notifications_for_superusers(db: Session, message: str) -> None:
    """Create notifications for all superusers."""
    superusers = db.query(User).filter(User.is_superuser == True).all()
    for superuser in superusers:
        notification = NotificationCreate(
            user_id=superuser.id,
            message=message,
        )
        create_notification(db, notification)

def get_all_quiz_attempts(session: Session, skip: int = 0, limit: int = 100) -> List[QuizAttempt]:
    stmt = (
        select(
            QuizAttempt,
            User.name.label("user_name"),
            User.email.label("user_email"),
            Course.title.label("course_name"),
        )
        .join(User)
        .join(Quiz)
        .join(Course)
        .order_by(QuizAttempt.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    results = session.exec(stmt).all()
    return [{
        **attempt.QuizAttempt.dict(),
        "user_name": attempt.user_name,
        "user_email": attempt.user_email,
        "course_name": attempt.course_name
    } for attempt in results]