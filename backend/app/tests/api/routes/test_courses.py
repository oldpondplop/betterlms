import uuid
from unittest.mock import patch
from fastapi.testclient import TestClient
import pytest
from sqlmodel import Session, select
from app import crud
from app.core.config import settings
from app.models import Course, CourseCreate, CourseUpdate, QuizCreate, User, QuizAttemptCreate, StatusEnum
from app.tests.utils.utils import random_name, random_email, random_lower_string
from app.tests.utils.user import create_random_user
from app.api.deps import CurrentUser

# ================================
# COURSE MANAGEMENT TESTS
# ================================

def test_get_my_courses(client: TestClient, normal_user_token_headers: dict[str, str], db: Session) -> None:
    """Test retrieving courses for the current user."""
    # Create a user and a course
    user = crud.get_user_by_email(session=db, email=settings.EMAIL_TEST_USER)
    if not user:
        raise ValueError("Test user not found")
    course = crud.create_course(db, CourseCreate(title=random_name(), users=[user.id]))

    # Retrieve courses for the current user
    r = client.get(
        f"{settings.API_V1_STR}/courses/me",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 200
    courses = r.json()
    assert len(courses) == 1
    assert courses[0]["id"] == str(course.id)

def test_get_courses(client: TestClient, superuser_token_headers: dict[str, str], db: Session) -> None:
    """Test retrieving all courses (superuser only)."""
    # Create two courses
    course1 = crud.create_course(db, CourseCreate(title=random_name()))
    course2 = crud.create_course(db, CourseCreate(title=random_name()))

    # Retrieve all courses
    r = client.get(
        f"{settings.API_V1_STR}/courses/",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    courses = r.json()
    assert len(courses) >= 2
    assert any(c["id"] == str(course1.id) for c in courses)
    assert any(c["id"] == str(course2.id) for c in courses)

def test_create_course(client: TestClient, superuser_token_headers: dict[str, str], db: Session) -> None:
    """Test creating a new course."""
    # Define course data
    course_data = {
        "title": random_name(),
        "description": "Test course description",
    }

    # Create the course
    r = client.post(
        f"{settings.API_V1_STR}/courses/",
        headers=superuser_token_headers,
        json=course_data,
    )
    assert r.status_code == 200
    created_course = r.json()
    assert created_course["title"] == course_data["title"]
    assert created_course["description"] == course_data["description"]

def test_get_course(client: TestClient, superuser_token_headers: dict[str, str], db: Session) -> None:
    """Test retrieving a specific course by its ID."""
    # Create a course
    course = crud.create_course(db, CourseCreate(title=random_name()))

    # Retrieve the course
    r = client.get(
        f"{settings.API_V1_STR}/courses/{course.id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    retrieved_course = r.json()
    assert retrieved_course["id"] == str(course.id)
    assert retrieved_course["title"] == course.title

def test_update_course(client: TestClient, superuser_token_headers: dict[str, str], db: Session) -> None:
    """Test updating a course."""
    # Create a course
    course = crud.create_course(db, CourseCreate(title=random_name()))

    # Update the course
    update_data = {
        "title": "Updated Course Title",
        "description": "Updated course description",
    }
    r = client.patch(
        f"{settings.API_V1_STR}/courses/{course.id}",
        headers=superuser_token_headers,
        json=update_data,
    )
    assert r.status_code == 200
    updated_course = r.json()
    assert updated_course["title"] == update_data["title"]
    assert updated_course["description"] == update_data["description"]

def test_delete_course(client: TestClient, superuser_token_headers: dict[str, str], db: Session) -> None:
    """Test deleting a course."""
    # Create a course
    course = crud.create_course(db, CourseCreate(title=random_name()))

    # Delete the course
    r = client.delete(
        f"{settings.API_V1_STR}/courses/{course.id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    response = r.json()
    assert response["message"] == "Course deleted successfully"

    # Verify the course is deleted
    result = db.exec(select(Course).where(Course.id == course.id)).first()
    assert result is None

# =========================================================
# QUIZ ATTEMPTS TESTS
# =========================================================

def test_get_course_attempts(client: TestClient, superuser_token_headers: dict[str, str], db: Session) -> None:
    """Test retrieving all quiz attempts for a course."""
    # Create a course, a quiz, and a user
    course = crud.create_course(db, CourseCreate(title=random_name()))
    quiz_data = {
        "course_id": str(course.id),
        "max_attempts": 3,
        "passing_threshold": 80.0,
        "questions": [
            {"question": "What is 10+5?", "options": ["15", "20", "25"], "correct_index": 0}
        ]
    }
    quiz = crud.create_quiz(db, QuizCreate(**quiz_data))
    user = create_random_user(db)

    # Create a quiz attempt
    attempt_data = QuizAttemptCreate(quiz_id=quiz.id, user_id=user.id, selected_indexes=[0])
    crud.create_quiz_attempt(db, attempt_data)

    # Retrieve quiz attempts for the course
    r = client.get(
        f"{settings.API_V1_STR}/courses/{course.id}/attempts",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    attempts = r.json()
    assert len(attempts) == 1
    assert attempts[0]["quiz_id"] == str(quiz.id)
    assert attempts[0]["user_id"] == str(user.id)

def test_get_user_course_attempts(client: TestClient, superuser_token_headers: dict[str, str], db: Session) -> None:
    """Test retrieving quiz attempts for a specific user in a course."""
    # Create a course, a quiz, and a user
    course = crud.create_course(db, CourseCreate(title=random_name()))
    quiz_data = {
        "course_id": str(course.id),
        "max_attempts": 3,
        "passing_threshold": 80.0,
        "questions": [
            {"question": "What is 10+5?", "options": ["15", "20", "25"], "correct_index": 0}
        ]
    }
    quiz = crud.create_quiz(db, QuizCreate(**quiz_data))
    user = create_random_user(db)

    # Create a quiz attempt
    attempt_data = QuizAttemptCreate(quiz_id=quiz.id, user_id=user.id, selected_indexes=[0])
    crud.create_quiz_attempt(db, attempt_data)

    # Retrieve quiz attempts for the user in the course
    r = client.get(
        f"{settings.API_V1_STR}/courses/{course.id}/users/{user.id}/attempts",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    attempts = r.json()
    assert len(attempts) == 1
    assert attempts[0]["quiz_id"] == str(quiz.id)
    assert attempts[0]["user_id"] == str(user.id)

# =========================================================
# COURSE ANALYTICS & PROGRESS TESTS
# =========================================================

def test_get_course_analytics(client: TestClient, superuser_token_headers: dict[str, str], db: Session) -> None:
    """Test retrieving course analytics."""
    # NOTE: allow attempts only if user is assigned to the course?
    user = create_random_user(db)
    course = crud.create_course(db, CourseCreate(title=random_name(), users=[user.id]))
    quiz_data = {
        "course_id": str(course.id),
        "max_attempts": 3,
        "passing_threshold": 80.0,
        "questions": [
            {"question": "What is 10+5?", "options": ["15", "20", "25"], "correct_index": 0}
        ]
    }
    quiz = crud.create_quiz(db, QuizCreate(**quiz_data))

    # Create a quiz attempt
    attempt_data = QuizAttemptCreate(quiz_id=quiz.id, user_id=user.id, selected_indexes=[0])
    crud.create_quiz_attempt(db, attempt_data)

    # Retrieve course analytics
    r = client.get(
        f"{settings.API_V1_STR}/courses/{course.id}/analytics",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    analytics = r.json()
    assert analytics["total_users"] == 1
    assert analytics["passed_users"] == 1
    assert analytics["failed_users"] == 0
    assert analytics["in_progress_users"] == 0
    assert analytics["course_completed"] == True
    assert analytics["completion_rate"] == 100.0
    assert analytics["pass_rate"] == 100.0
    assert analytics["fail_rate"] == 0.0
    assert analytics["average_attempts"] == 1.0
    assert analytics["average_score"] == 100.0

def test_get_course_progress(client: TestClient, superuser_token_headers: dict[str, str], db: Session) -> None:
    """Test retrieving course progress for all users."""
    # Create a course, a quiz, and a user
    user = create_random_user(db)
    course = crud.create_course(db, CourseCreate(title=random_name(), users=[user.id]))
    quiz_data = {
        "course_id": str(course.id),
        "max_attempts": 3,
        "passing_threshold": 80.0,
        "questions": [
            {"question": "What is 10+5?", "options": ["15", "20", "25"], "correct_index": 0}
        ]
    }
    quiz = crud.create_quiz(db, QuizCreate(**quiz_data))
    # Create a quiz attempt
    attempt_data = QuizAttemptCreate(quiz_id=quiz.id, user_id=user.id, selected_indexes=[0])
    crud.create_quiz_attempt(db, attempt_data)

    # Retrieve course progress
    r = client.get(
        f"{settings.API_V1_STR}/courses/{course.id}/progress",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    progress = r.json()
    assert len(progress) == 1
    assert progress[0]["user"]["id"] == str(user.id)
    assert progress[0]["status"] == StatusEnum.PASSED
    assert progress[0]["attempt_count"] == 1
    assert progress[0]["score"] == 100.0

# ================================
# FILE UPLOADS & MATERIALS TESTS
# ================================

def test_upload_materials(client: TestClient, superuser_token_headers: dict[str, str], db: Session, mock_upload_files) -> None:
    """Test uploading materials to a course."""
    # Create a course
    course = crud.create_course(db, CourseCreate(title=random_name()))

    # Upload materials
    files = [("files", ("test_file1.pdf", mock_upload_files[0].file))]
    r = client.post(
        f"{settings.API_V1_STR}/courses/{course.id}/materials/",
        headers=superuser_token_headers,
        files=files,
    )
    assert r.status_code == 200
    materials: list[str] = r.json()
    assert len(materials) == 1
    assert materials[0].endswith("test_file1.pdf")

def test_list_materials(client: TestClient, normal_user_token_headers: dict[str, str], superuser_token_headers: dict[str, str], db: Session, mock_upload_files) -> None:
    """Test listing materials for a course."""
    # Create a course and upload materials
    course = crud.create_course(db, CourseCreate(title=random_name()))
    files = [("files", ("test_file1.pdf", mock_upload_files[0].file))]
    client.post(
        f"{settings.API_V1_STR}/courses/{course.id}/materials/",
        headers=superuser_token_headers,
        files=files,
    )

    # List materials
    r = client.get(
        f"{settings.API_V1_STR}/courses/{course.id}/materials/",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 200
    materials = r.json()
    assert len(materials) == 1
    assert materials[0].endswith("test_file1.pdf")

def test_download_material(client: TestClient, normal_user_token_headers: dict[str, str], superuser_token_headers: dict[str, str], db: Session, mock_upload_files) -> None:
    """Test downloading a material."""
    # Create a course and upload materials
    course = crud.create_course(db, CourseCreate(title=random_name()))
    files = [("files", ("test_file1.pdf", mock_upload_files[0].file))]
    r0 = client.post(
        f"{settings.API_V1_STR}/courses/{course.id}/materials/",
        headers=superuser_token_headers,
        files=files,
    )
    materials = r0.json()
    # Download the material
    r = client.get(
        f"{settings.API_V1_STR}/courses/materials/{materials[0]}",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.headers["content-disposition"] == f'attachment; filename="{materials[0]}"'

def test_delete_material(client: TestClient, superuser_token_headers: dict[str, str], db: Session, mock_upload_files) -> None:
    """Test deleting a material from a course."""
    # Create a course and upload materials
    course = crud.create_course(db, CourseCreate(title=random_name()))
    files = [("files", ("test_file1.pdf", mock_upload_files[0].file))]
    r0 = client.post(
        f"{settings.API_V1_STR}/courses/{course.id}/materials/",
        headers=superuser_token_headers,
        files=files,
    )
    materials = r0.json()

    # Delete the material
    r = client.delete(
        f"{settings.API_V1_STR}/courses/{course.id}/materials/{materials[0]}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    response = r.json()
    assert response["message"] == "Course material deleted successfully."

    # Verify the material is deleted
    materials = crud.list_course_materials(db, course.id)
    assert len(materials) == 0

def test_delete_all_materials(client: TestClient, superuser_token_headers: dict[str, str], db: Session, mock_upload_files) -> None:
    """Test deleting all materials from a course."""
    # Create a course and upload materials
    course = crud.create_course(db, CourseCreate(title=random_name()))
    files = [("files", ("test_file1.pdf", mock_upload_files[0].file)), ("files", ("test_file2.pdf", mock_upload_files[1].file))]
    r0 = client.post(
        f"{settings.API_V1_STR}/courses/{course.id}/materials/",
        headers=superuser_token_headers,
        files=files,
    )
    materials = r0.json()
    assert len(materials) == 2
    # Delete all materials
    r = client.delete(
        f"{settings.API_V1_STR}/courses/{course.id}/materials/",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    response = r.json()
    assert response["message"] == "All course materials deleted successfully."

    # Verify all materials are deleted
    materials = crud.list_course_materials(db, course.id)
    assert len(materials) == 0