from app import crud
from app.models import CourseCreate, QuizAttemptCreate, QuizCreate, QuizUpdate

from app.tests.utils.utils import random_name, random_role 
from app.tests.utils.user import RoleEnum, create_random_user
from fastapi import HTTPException
import pytest
from sqlmodel import Session


def test_create_quiz(db: Session) -> None:
    """Test creating a new quiz for a course."""
    # Create a course
    course = crud.create_course(db, CourseCreate(title=random_name()))

    # Define quiz data
    quiz_data = {
        "max_attempts": 3,
        "passing_threshold": 80.0,
        "questions": [
            {"question": "What is 10+5?", "options": ["15", "20", "25"], "correct_index": 0},
            {"question": "What is 10+10?", "options": ["15", "20", "25"], "correct_index": 1}
        ]
    }

    # Create the quiz
    quiz = crud.create_quiz(db, QuizCreate(course_id=course.id, **quiz_data))

    # Assertions
    assert quiz is not None
    assert quiz.course_id == course.id
    assert quiz.max_attempts == quiz_data["max_attempts"]
    assert quiz.passing_threshold == quiz_data["passing_threshold"]
    assert len(quiz.questions) == len(quiz_data["questions"])
  

def test_update_quiz(db: Session) -> None:
    """Test updating a quiz."""
    # Create a course and a quiz
    course = crud.create_course(db, CourseCreate(title=random_name()))
    quiz_data = {
        "max_attempts": 3,
        "passing_threshold": 80.0,
        "questions": [
            {"question": "What is 10+5?", "options": ["15", "20", "25"], "correct_index": 0}
        ]
    }
    quiz = crud.create_quiz(db, QuizCreate(course_id=course.id, **quiz_data))

    # Update the quiz
    update_data = QuizUpdate(max_attempts=5, passing_threshold=90.0)
    updated_quiz = crud.update_quiz(db, quiz.id, update_data)

    # Assertions
    assert updated_quiz.max_attempts == update_data.max_attempts
    assert updated_quiz.passing_threshold == update_data.passing_threshold
  

def test_delete_quiz(db: Session) -> None:
    """Test deleting a quiz."""
    # Create a course and a quiz
    course = crud.create_course(db, CourseCreate(title=random_name()))
    quiz_data = {
        "max_attempts": 3,
        "passing_threshold": 80.0,
        "questions": [
            {"question": "What is 10+5?", "options": ["15", "20", "25"], "correct_index": 0}
        ]
    }
    quiz = crud.create_quiz(db, QuizCreate(course_id=course.id, **quiz_data))

    # Delete the quiz
    crud.delete_quiz(db, quiz.id)

    # Verify the quiz is deleted
    deleted_quiz = crud.get_quiz_by_id(db, quiz.id)
    assert deleted_quiz is None


def test_create_quiz_attempt(db: Session) -> None:
    """Test creating a quiz attempt."""
    # Create a course, a quiz, and a user
    course = crud.create_course(db, CourseCreate(title=random_name()))
    quiz_data = {
        "max_attempts": 3,
        "passing_threshold": 80.0,
        "questions": [
            {"question": "What is 10+5?", "options": ["15", "20", "25"], "correct_index": 0}
        ]
    }
    quiz = crud.create_quiz(db, QuizCreate(course_id=course.id, **quiz_data))
    user = create_random_user(db)

    # Create a quiz attempt
    attempt_data = QuizAttemptCreate(quiz_id=quiz.id, user_id=user.id, selected_indexes=[0])
    attempt = crud.create_quiz_attempt(db, attempt_data)

    # Assertions
    assert attempt is not None
    assert attempt.quiz_id == quiz.id
    assert attempt.user_id == user.id
    assert attempt.selected_indexes == [0]


def test_exceed_max_attempts(db: Session) -> None:
    """Test that a user cannot exceed the maximum number of quiz attempts."""
    # Create a course, a quiz, and a user
    course = crud.create_course(db, CourseCreate(title=random_name()))
    quiz_data = {
        "max_attempts": 1,  # Only 1 attempt allowed
        "passing_threshold": 80.0,
        "questions": [
            {"question": "What is 10+5?", "options": ["15", "20", "25"], "correct_index": 0}
        ]
    }
    quiz = crud.create_quiz(db, QuizCreate(course_id=course.id, **quiz_data))
    user = create_random_user(db)

    # Create the first attempt
    attempt_data = QuizAttemptCreate(quiz_id=quiz.id, user_id=user.id, selected_indexes=[0])
    crud.create_quiz_attempt(db, attempt_data)

    # Attempt to create a second attempt (should fail)
    with pytest.raises(HTTPException) as exc_info:
        crud.create_quiz_attempt(db, attempt_data)
    assert exc_info.value.status_code == 400
    assert "Max attempts exceeded" in str(exc_info.value.detail)
  

def test_get_attempts_for_user(db: Session) -> None:
    """Test retrieving quiz attempts for a user."""
    # Create a course, a quiz, and a user
    course = crud.create_course(db, CourseCreate(title=random_name()))
    quiz_data = {
        "max_attempts": 3,
        "passing_threshold": 80.0,
        "questions": [
            {"question": "What is 10+5?", "options": ["15", "20", "25"], "correct_index": 0}
        ]
    }
    quiz = crud.create_quiz(db, QuizCreate(course_id=course.id, **quiz_data))
    user = create_random_user(db)

    # Create two attempts for the user
    attempt_data = QuizAttemptCreate(quiz_id=quiz.id, user_id=user.id, selected_indexes=[0])
    crud.create_quiz_attempt(db, attempt_data)
    crud.create_quiz_attempt(db, attempt_data)

    # Retrieve attempts for the user
    attempts = crud.get_attempts_for_user(db, quiz.id, user.id)

    # Assertions
    assert len(attempts) == 2
    assert all(attempt.user_id == user.id for attempt in attempts)


def test_get_last_attempts(db: Session) -> None:
    """Test retrieving the last attempts for a quiz."""
    # Create a course, a quiz, and two users
    course = crud.create_course(db, CourseCreate(title=random_name()))
    quiz_data = {
        "max_attempts": 3,
        "passing_threshold": 80.0,
        "questions": [
            {"question": "What is 10+5?", "options": ["15", "20", "25"], "correct_index": 0}
        ]
    }
    quiz = crud.create_quiz(db, QuizCreate(course_id=course.id, **quiz_data))
    user1 = create_random_user(db)
    user2 = create_random_user(db)

    # Create attempts for both users
    attempt_data1 = QuizAttemptCreate(quiz_id=quiz.id, user_id=user1.id, selected_indexes=[0])
    attempt_data2 = QuizAttemptCreate(quiz_id=quiz.id, user_id=user2.id, selected_indexes=[1])
    crud.create_quiz_attempt(db, attempt_data1)
    crud.create_quiz_attempt(db, attempt_data2)

    # Retrieve the last attempts
    last_attempts = crud.get_last_attempts(db, quiz.id, course.current_cycle)

    # Assertions
    assert len(last_attempts) == 2
    assert user1.id in last_attempts
    assert user2.id in last_attempts