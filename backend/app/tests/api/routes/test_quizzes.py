import uuid
from unittest.mock import patch

from app.tests.utils.user import create_random_user
from fastapi.testclient import TestClient
import pytest
from sqlmodel import Session, select

from app import crud
from app.core.config import settings
from app.core.security import verify_password
from app.models import CourseCreate, QuizAttemptCreate, QuizCreate, User, UserCreate
from app.tests.utils.utils import random_email, random_lower_string, random_name


def test_get_quiz_attempts(client: TestClient, superuser_token_headers: dict[str, str], db: Session) -> None:
    """Test retrieving quiz attempts for a specific quiz."""
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
    crud.create_quiz_attempt(db, attempt_data)

    # Retrieve quiz attempts
    r = client.get(
        f"{settings.API_V1_STR}/quizzes/{quiz.id}/attempts",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    attempts = r.json()
    assert len(attempts) == 1
    assert attempts[0]["quiz_id"] == str(quiz.id)
    assert attempts[0]["user_id"] == str(user.id)


def test_get_user_quiz_attempts(client: TestClient, superuser_token_headers: dict[str, str], db: Session) -> None:
    """Test retrieving quiz attempts for a specific user in a quiz."""
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
    crud.create_quiz_attempt(db, attempt_data)

    # Retrieve user quiz attempts
    r = client.get(
        f"{settings.API_V1_STR}/quizzes/{quiz.id}/users/{user.id}/attempts",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    attempts = r.json()
    assert len(attempts) == 1
    assert attempts[0]["quiz_id"] == str(quiz.id)
    assert attempts[0]["user_id"] == str(user.id)


def test_submit_quiz_attempt(client: TestClient, normal_user_token_headers: dict[str, str], db: Session) -> None:
    """Test submitting a quiz attempt."""
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
    user = create_random_user(db)

    # Submit a quiz attempt
    attempt_data = {
        "quiz_id": str(quiz.id),
        "user_id": str(user.id),
        "selected_indexes": [0]
    }
    r = client.post(
        f"{settings.API_V1_STR}/quizzes/{quiz.id}/attempts",
        headers=normal_user_token_headers,
        json=attempt_data,
    )
    assert r.status_code == 200
    attempt = r.json()
    assert attempt["quiz_id"] == str(quiz.id)
    assert attempt["selected_indexes"] == [0]


def test_delete_quiz_attempt(client: TestClient, superuser_token_headers: dict[str, str], db: Session) -> None:
    """Test deleting a quiz attempt."""
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

    # Delete the quiz attempt
    r = client.delete(
        f"{settings.API_V1_STR}/quizzes/attempts/{attempt.id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    response = r.json()
    assert response["message"] == "Quiz attempt deleted successfully"

    # Verify the attempt is deleted
    deleted_attempt = crud.get_attempts_for_user(db, quiz.id, user.id)
    assert len(deleted_attempt) == 0


def test_exceed_max_attempts(client: TestClient, normal_user_token_headers: dict[str, str], db: Session) -> None:
    """Test that a user cannot exceed the maximum number of quiz attempts."""
    # Create a course and a quiz with max_attempts=1
    course = crud.create_course(db, CourseCreate(title=random_name()))
    quiz_data = {
        "max_attempts": 1,
        "passing_threshold": 80.0,
        "questions": [
            {"question": "What is 10+5?", "options": ["15", "20", "25"], "correct_index": 0}
        ]
    }
    quiz = crud.create_quiz(db, QuizCreate(course_id=course.id, **quiz_data))
    user = create_random_user(db)
    # Submit the first attempt
    attempt_data = {
        "quiz_id": str(quiz.id),
        "user_id": str(user.id),
        "selected_indexes": [0]
    }
    r = client.post(
        f"{settings.API_V1_STR}/quizzes/{quiz.id}/attempts",
        headers=normal_user_token_headers,
        json=attempt_data,
    )
    assert r.status_code == 200

    # Attempt to submit a second attempt (should fail)
    r = client.post(
        f"{settings.API_V1_STR}/quizzes/{quiz.id}/attempts",
        headers=normal_user_token_headers,
        json=attempt_data,
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "Max attempts exceeded"


def test_get_all_quizzes(client: TestClient, superuser_token_headers: dict[str, str], db: Session) -> None:
    """Test retrieving a list of all quizzes."""
    # Retrieve all quizzes
    r = client.get(f"{settings.API_V1_STR}/quizzes/", headers=superuser_token_headers)
    for q in r.json():
        r = client.delete(
        f"{settings.API_V1_STR}/quizzes/{q["id"]}",
        headers=superuser_token_headers,
    )

    # Create a course
    course1 = crud.create_course(db, CourseCreate(title=random_name()))
    course2 = crud.create_course(db, CourseCreate(title=random_name()))

    # Create two quizzes
    quiz_data1 = {
        "course_id": str(course1.id),
        "max_attempts": 3,
        "passing_threshold": 80.0,
        "questions": [
            {"question": "What is 10+5?", "options": ["15", "20", "25"], "correct_index": 0}
        ]
    }
    quiz_data2 = {
        "course_id": str(course2.id),
        "max_attempts": 5,
        "passing_threshold": 90.0,
        "questions": [
            {"question": "What is 10+10?", "options": ["15", "20", "25"], "correct_index": 1}
        ]
    }
    crud.create_quiz(db, QuizCreate(**quiz_data1))
    crud.create_quiz(db, QuizCreate(**quiz_data2))
    
    # Retrieve all quizzes
    r = client.get(
        f"{settings.API_V1_STR}/quizzes/",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    quizzes = r.json()
    assert len(quizzes) == 2
    assert quizzes[0]["max_attempts"] == quiz_data1["max_attempts"]
    assert quizzes[1]["max_attempts"] == quiz_data2["max_attempts"]