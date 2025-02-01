import uuid
from fastapi import APIRouter, HTTPException
from typing import List
from sqlmodel import and_, select
from app import crud
from app.api.deps import SessionDep, SuperuserRequired, CurrentUser
from app.models import (
    CourseStatusEnum,
    CourseUserLink,
    Message,
    QuizCreate, 
    QuizUpdate, 
    Quiz, 
    QuizPublic , 
    QuizAttempt, 
    QuizAttemptCreate, 
    QuizAttemptPublic
)

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

# ================================
# QUIZ MANAGEMENT
# ================================

@router.post("/", response_model=QuizPublic, dependencies=[SuperuserRequired])
def create_quiz(quiz_in: QuizCreate, session: SessionDep):
    """Create a new quiz. Can be linked to a course or standalone."""
    return crud.create_quiz(session, quiz_in)

@router.get("/", response_model=List[QuizPublic])
def get_quizzes(session: SessionDep):
    """Retrieve all quizzes."""
    return session.exec(select(Quiz)).all()

@router.get("/{quiz_id}", response_model=QuizPublic)
def get_quiz(quiz_id: uuid.UUID, session: SessionDep):
    """Retrieve a quiz by its ID."""
    return crud.get_quiz_by_id(session, quiz_id)

@router.patch("/{quiz_id}", response_model=QuizPublic, dependencies=[SuperuserRequired])
def update_quiz(quiz_id: uuid.UUID, quiz_in: QuizUpdate, session: SessionDep):
    """Update an existing quiz."""
    return crud.update_quiz(session, quiz_id, quiz_in)

@router.delete("/{quiz_id}", response_model=dict, dependencies=[SuperuserRequired])
def delete_quiz(quiz_id: uuid.UUID, session: SessionDep):
    """Delete a quiz by its ID."""
    return crud.delete_quiz(session, quiz_id)

# ================================
# QUIZ ATTEMPTS MANAGEMENT
# ================================

@router.post("/{quiz_id}/attempts", response_model=QuizAttemptPublic)
def submit_quiz_attempt(quiz_id: uuid.UUID, attempt_in: QuizAttemptCreate, session: SessionDep, current_user: CurrentUser):
    """Submit a quiz attempt using the helper function."""
    quiz = crud.get_quiz_by_id(session, quiz_id)
    existing_attempts = session.exec(
        select(QuizAttempt).where(QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == current_user.id)
    ).all()
    
    if len(existing_attempts) >= quiz.max_attempts:
        course_link = session.exec(
            select(CourseUserLink).where(CourseUserLink.course_id == quiz.course_id, CourseUserLink.user_id == current_user.id)
        ).first()
        if course_link:
            course_link.status = CourseStatusEnum.FAILED
            session.add(course_link)
            session.commit()
        raise HTTPException(status_code=400, detail="Max attempts exceeded. Course marked as failed.")
    
    attempt = crud.create_quiz_attempt(session, attempt_in)
    
    if attempt.passed and course_link:
        course_link.status = CourseStatusEnum.COMPLETED
        session.add(course_link)
        session.commit()
    
    return attempt

@router.get("/{quiz_id}/attempts", response_model=List[QuizAttemptPublic], dependencies=[SuperuserRequired])
def list_quiz_attempts(quiz_id: uuid.UUID, session: SessionDep):
    """Retrieve all attempts for a quiz without pagination."""
    stmt = select(QuizAttempt).where(QuizAttempt.quiz_id == quiz_id)
    return session.exec(stmt).all()

@router.get("/{quiz_id}/users/{user_id}/status", response_model=QuizAttemptPublic)
def get_quiz_status(session: SessionDep, quiz_id: uuid.UUID, user_id: uuid.UUID) -> QuizAttemptPublic:
    stmt = (
        select(QuizAttempt)
        .where(and_(QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == user_id))
        .order_by(QuizAttempt.attempt_number.desc())
        .limit(1)
    )

    last_attempt = session.exec(stmt).first()
    if not last_attempt:
        raise HTTPException(status_code=404, detail="No quiz attempts found for the given quiz and user.")

    return QuizAttemptPublic.model_validate(last_attempt)
