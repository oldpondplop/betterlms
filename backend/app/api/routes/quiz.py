import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select

from app import crud
from app.api.deps import (
    CurrentUser,
    SessionDep,
    get_current_active_superuser,
)
from app.models import (
    Course,
    Quiz,
    QuizCreate,
    QuizBase,
    QuizAttempt,
    QuizAttempt,
    QuizPublic,
    Message,
    User,
)

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


# ✅ Retrieve all quizzes
@router.get("/", response_model=list[QuizBase])
def read_quizzes(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    """
    Retrieve all quizzes.
    """
    statement = select(Quiz).offset(skip).limit(limit)
    quizzes = session.exec(statement).all()
    return quizzes


# ✅ Create a new quiz
@router.post("/{course_id}/quizzes", response_model=QuizPublic)
def create_quiz(
    *,
    course_id: uuid.UUID,
    session: SessionDep,
    quiz_in: QuizCreate
) -> Any:
    """
    Create a new quiz for a course.
    """
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    db_quiz = Quiz(**quiz_in.dict(), course_id=course_id)
    session.add(db_quiz)
    session.commit()
    session.refresh(db_quiz)
    return db_quiz




# ✅ Get a single quiz by ID
@router.get("/{quiz_id}", response_model=QuizBase)
def read_quiz_by_id(
    quiz_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Get a specific quiz by ID.
    """
    quiz = session.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


# ✅ Update a quiz
@router.patch("/{quiz_id}", dependencies=[Depends(get_current_active_superuser)], response_model=QuizBase)
def update_quiz(
    *,
    session: SessionDep,
    quiz_id: uuid.UUID,
    quiz_in: QuizCreate
) -> Any:
    """
    Update a quiz (Admin Only).
    """
    db_quiz = session.get(Quiz, quiz_id)
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    quiz_data = quiz_in.dict(exclude_unset=True)
    for key, value in quiz_data.items():
        setattr(db_quiz, key, value)

    session.add(db_quiz)
    session.commit()
    session.refresh(db_quiz)
    return db_quiz


# ✅ Delete a quiz
@router.delete("/{quiz_id}", dependencies=[Depends(get_current_active_superuser)])
def delete_quiz(session: SessionDep, quiz_id: uuid.UUID) -> Message:
    """
    Delete a quiz (Admin Only).
    """
    db_quiz = session.get(Quiz, quiz_id)
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    session.delete(db_quiz)
    session.commit()
    return Message(message="Quiz deleted successfully")


# ✅ Submit a quiz attempt
@router.post("/{quiz_id}/attempts", response_model=QuizAttempt)
def submit_quiz_attempt(
    *,
    session: SessionDep,
    quiz_id: uuid.UUID,
    user: CurrentUser,
    score: int
) -> Any:
    """
    Submit a quiz attempt.
    """
    db_quiz = session.get(Quiz, quiz_id)
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    attempt_count = session.exec(
        select(QuizAttempt).where(
            (QuizAttempt.quiz_id == quiz_id) & (QuizAttempt.user_id == user.id)
        )
    ).count()

    if attempt_count >= db_quiz.max_attempts:
        raise HTTPException(status_code=400, detail="Max attempts reached")

    passed = score >= db_quiz.passing_threshold
    attempt = QuizAttempt(
        quiz_id=quiz_id,
        user_id=user.id,
        score=score,
        attempt_number=attempt_count + 1,
        passed=passed,
    )

    session.add(attempt)
    session.commit()
    session.refresh(attempt)
    return attempt


# ✅ Get all attempts for a quiz
@router.get("/{quiz_id}/attempts", response_model=list[QuizAttempt])
def get_quiz_attempts(
    *,
    session: SessionDep,
    quiz_id: uuid.UUID,
    current_user: CurrentUser
) -> Any:
    """
    Get all attempts for a quiz.
    """
    quiz = session.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    attempts = session.exec(select(QuizAttempt).where(QuizAttempt.quiz_id == quiz_id)).all()
    return attempts
