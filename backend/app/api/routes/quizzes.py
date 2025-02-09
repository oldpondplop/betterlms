from fastapi import APIRouter, HTTPException
from typing import List
from uuid import UUID
from sqlmodel import Session
from app.api.deps import SessionDep, SuperuserRequired, CurrentUser
from app.models import (
    QuizCreate, 
    QuizUpdate, 
    Quiz, 
    QuizPublic, 
    QuizAttempt, 
    QuizAttemptCreate, 
    QuizAttemptPublic,
    Message
)
from app import crud

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

# ================================
# QUIZ MANAGEMENT
# ================================

@router.get("/", response_model=List[QuizPublic], dependencies=[SuperuserRequired])
def get_all_quizzes(session: SessionDep):
    """Retrieve a list of all quizzes."""
    return crud.get_quizzes(session)

@router.post("/", response_model=QuizPublic, dependencies=[SuperuserRequired])
def create_quiz(quiz_in: QuizCreate, session: SessionDep):
    """Create a new quiz."""
    return crud.create_quiz(session, quiz_in)

@router.get("/{quiz_id}", response_model=QuizPublic, dependencies=[SuperuserRequired])
def get_quiz(quiz_id: UUID, session: SessionDep):
    """Retrieve a quiz by its ID."""
    quiz = crud.get_quiz_by_id(session, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz

@router.patch("/{quiz_id}", response_model=QuizPublic, dependencies=[SuperuserRequired])
def update_quiz(quiz_id: UUID, quiz_in: QuizUpdate, session: SessionDep):
    """Update a quiz by its ID."""
    quiz = crud.get_quiz_by_id(session, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return crud.update_quiz(session, quiz_id, quiz_in)

@router.delete("/{quiz_id}", dependencies=[SuperuserRequired])
def delete_quiz(quiz_id: UUID, session: SessionDep):
    """Delete a quiz by its ID."""
    quiz = crud.get_quiz_by_id(session, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    crud.delete_quiz(session, quiz_id)
    return Message(message="Quiz deleted successfully")

# ================================
# QUIZ ATTEMPT MANAGEMENT
# ================================

@router.get("/{quiz_id}/attempts", response_model=List[QuizAttemptPublic], dependencies=[SuperuserRequired])
def get_quiz_attempts(quiz_id: UUID, session: SessionDep):
    """Retrieve all attempts for a specific quiz."""
    return crud.get_attempts_for_quiz(session, quiz_id)

@router.get("/{quiz_id}/users/{user_id}/attempts", response_model=List[QuizAttemptPublic], dependencies=[SuperuserRequired])
def get_user_quiz_attempts(quiz_id: UUID, user_id: UUID, session: SessionDep):
    """Retrieve all attempts for a specific user in a quiz."""
    return crud.get_attempts_for_user(session, quiz_id, user_id)

@router.post("/{quiz_id}/attempts", response_model=QuizAttemptPublic)
def submit_quiz_attempt(quiz_id: UUID, attempt_in: QuizAttemptCreate, session: SessionDep, current_user: CurrentUser):
    """Submit a new quiz attempt."""
    attempt_in.user_id = current_user.id
    attempt_in.quiz_id = quiz_id
    return crud.create_quiz_attempt(session, attempt_in)

@router.delete("/attempts/{attempt_id}", dependencies=[SuperuserRequired])
def delete_quiz_attempt_api(attempt_id: UUID, session: SessionDep):
    """Delete a quiz attempt by its ID."""
    crud.delete_quiz_attempt(session, attempt_id)
    return Message(message="Quiz attempt deleted successfully")