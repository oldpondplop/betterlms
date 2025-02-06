from typing import List, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
import logging

from app import crud
from app.models import NotificationCreate

from app.api.deps import SessionDep, CurrentUser, CurrentSuperUser
from app.models import (
    Course, Quiz, QuizCreate, QuizPublic, QuizUpdate,
    QuizAttempt, QuizAttemptCreate, QuizAttemptPublic, QuizzesPublic,
    Message, User
)
from app import crud

router = APIRouter(prefix="/quizzes", tags=["quizzes"])
logger = logging.getLogger(__name__)

@router.post("/", response_model=QuizPublic)
def create_quiz(
    *,
    session: SessionDep,
    quiz_create: QuizCreate,
    admin_user: CurrentSuperUser,
) -> Any:
    """Create a new quiz. Only accessible by superusers."""

    # Ensure the course exists before creating the quiz
    course = session.get(Course, quiz_create.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    return crud.create_quiz(session=session, quiz_create=quiz_create)

@router.get("/", response_model=QuizzesPublic)
def read_quizzes(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Get all quizzes with pagination."""
    data = crud.get_quizzes(session=session, skip=skip, limit=limit)
    count = crud.count_quizzes(session=session)
    return QuizzesPublic(data=data, count=count)

@router.get("/{quiz_id}", response_model=QuizPublic)
def read_quiz(
    *,
    session: SessionDep,
    quiz_id: UUID,
    current_user: CurrentUser,
) -> Any:
    """Get quiz details."""
    quiz = crud.get_quiz_by_id(session=session, quiz_id=quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz

@router.patch("/{quiz_id}", response_model=QuizPublic)
def update_quiz(
    *,
    session: SessionDep,
    quiz_id: UUID,
    quiz_update: QuizUpdate,
    admin_user: CurrentSuperUser,
) -> Any:
    quiz = crud.get_quiz_by_id(session=session, quiz_id=quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    if quiz_update.course_id is not None:
        quiz.course_id = quiz_update.course_id
    
    if quiz_update.questions is not None:
        # Convert QuizQuestion objects to dictionaries
        quiz.questions = [
            {
                "question": q.question,
                "choices": q.choices,
                "correct_index": q.correct_index
            } 
            for q in quiz_update.questions
        ]
    
    if quiz_update.max_attempts is not None:
        quiz.max_attempts = quiz_update.max_attempts
        
    if quiz_update.passing_threshold is not None:
        quiz.passing_threshold = quiz_update.passing_threshold
    
    session.commit()
    session.refresh(quiz)
    return quiz

@router.delete("/{quiz_id}", response_model=Message)
def delete_quiz(
    *,
    session: SessionDep,
    quiz_id: UUID,
    admin_user: CurrentSuperUser,
) -> Any:
    """Delete a quiz. Only accessible by superusers."""
    quiz = crud.get_quiz_by_id(session=session, quiz_id=quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    crud.delete_quiz(session=session, db_quiz=quiz)
    return Message(message="Quiz deleted successfully")

@router.post("/{quiz_id}/attempt", response_model=QuizAttemptPublic)
def submit_quiz_attempt(
    *,
    session: SessionDep,
    quiz_id: UUID,
    answers: List[int],
    current_user: CurrentUser,
    admin_user: CurrentSuperUser,  # Use the superuser dependency
) -> Any:
    """Submit a quiz attempt."""
    try:
        logger.info(f"Received quiz attempt for quiz_id: {quiz_id}, answers: {answers}")

        quiz = crud.get_quiz_by_id(session=session, quiz_id=quiz_id)
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")
        
        # Calculate the quiz result
        quiz_attempt = crud.create_quiz_attempt(
            session=session,
            quiz=quiz,
            user=current_user,
            answers=answers
        )

        logger.info(f"Quiz attempt result: {quiz_attempt}")

        # Check if the user failed the quiz
        if not quiz_attempt.passed:
            # Use the admin_user from the dependency
            notification_message = f"Employee {current_user.name} didn't pass the quiz."
            print("333",admin_user.id)
            crud.create_notification(
                session,
                NotificationCreate(
                    user_id=admin_user.id,  # Use admin_user.id
                    message=notification_message,
                ),
            )

        return quiz_attempt

    except Exception as e:
        logger.error(f"Error submitting quiz attempt: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{quiz_id}/attempts", response_model=List[QuizAttemptPublic])
def get_quiz_attempts(
    *,
    session: SessionDep,
    quiz_id: UUID,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Get all attempts for a quiz by the current user."""
    quiz = crud.get_quiz_by_id(session=session, quiz_id=quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    return crud.get_quiz_attempts(
        session=session,
        quiz_id=quiz_id,
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )

@router.get("/{quiz_id}/stats", response_model=dict)
def get_quiz_stats(
    *,
    session: SessionDep,
    quiz_id: UUID,
    current_user: CurrentUser,
) -> Any:
    """Get quiz statistics for the current user."""
    quiz = crud.get_quiz_by_id(session=session, quiz_id=quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    return crud.get_user_quiz_stats(
        session=session,
        quiz_id=quiz_id,
        user_id=current_user.id
    )

@router.get("/course/{course_id}", response_model=QuizPublic)
@router.get("/{quiz_id}/analytics", response_model=dict)
def get_quiz_analytics(
    *,
    session: SessionDep,
    quiz_id: UUID,
    admin_user: CurrentSuperUser,
) -> Any:
    """Get comprehensive analytics for a quiz. Admin only."""
    quiz = crud.get_quiz_by_id(session=session, quiz_id=quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    return crud.get_quiz_overall_stats(session=session, quiz_id=quiz_id)

@router.get("/{quiz_id}/questions/analysis", response_model=List[dict])
def get_questions_analysis(
    *,
    session: SessionDep,
    quiz_id: UUID,
    admin_user: CurrentSuperUser,
) -> Any:
    """Get analysis for each question in the quiz. Admin only."""
    return crud.get_question_analysis(session=session, quiz_id=quiz_id)

@router.get("/course/{course_id}/progress", response_model=dict)
def get_course_quiz_progress(
    *,
    session: SessionDep,
    course_id: UUID,
    admin_user: CurrentSuperUser,
) -> Any:
    """Get quiz progress statistics for a course. Admin only."""
    return crud.get_course_quiz_progress(session=session, course_id=course_id)

def get_course_quiz(
    *,
    session: SessionDep,
    course_id: UUID,
    current_user: CurrentUser,
) -> Any:
    """Get quiz for a specific course."""
    quiz = crud.get_quiz_by_course_id(session=session, course_id=course_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="No quiz found for this course")
    return quiz