import uuid
from fastapi import APIRouter, HTTPException
from typing import List
from sqlmodel import and_, select
from app import crud
from app.api.deps import SessionDep, SuperuserRequired, CurrentUser
from app.models import (
    Course,
    StatusEnum,
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

@router.get("/{quiz_id}/attempts", response_model=List[QuizAttemptPublic])
def get_quiz_attempts(quiz_id: uuid.UUID, session: SessionDep):
    return crud.get_attempts_for_quiz(session, quiz_id)

@router.get("/{quiz_id}/users/{user_id}/attempts", response_model=List[QuizAttemptPublic])
def get_user_quiz_attempts(quiz_id: uuid.UUID, user_id: uuid.UUID, session: SessionDep):
    return crud.get_attempts_for_user(session, quiz_id, user_id)

@router.post("/{quiz_id}/attempts", response_model=QuizAttemptPublic)
def submit_quiz_attempt(quiz_id: uuid.UUID, attempt_in: QuizAttemptCreate, session: SessionDep, current_user: CurrentUser):
    # attempt_in.quiz_id = quiz_id
    attempt_in.user_id = current_user.id
    return crud.create_quiz_attempt(session, attempt_in)

@router.delete("/attempts/{attempt_id}", dependencies=[SuperuserRequired])
def delete_quiz_attempt_api(attempt_id: uuid.UUID, session: SessionDep):
    crud.delete_quiz_attempt(session, attempt_id)
    return Message(message="Quiz attempt deleted successfully")
