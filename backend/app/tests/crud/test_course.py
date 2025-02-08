import pytest
from fastapi import HTTPException, UploadFile
from sqlmodel import Session, select
from app import crud
from app.models import Course, CourseCreate, CourseUpdate, QuizAttemptCreate, QuizCreate, StatusEnum, CourseUserLink, CourseRoleLink
from app.tests.utils.utils import random_name, random_role 
from app.tests.utils.user import RoleEnum, create_random_user

@pytest.fixture
def course_with_materials(db: Session, mock_upload_files: list[UploadFile]) -> tuple[Course, list[UploadFile]]:
   course = crud.create_course(db, CourseCreate(title="Test Course"))
   updated_course = crud.upload_course_materials(db, course.id, mock_upload_files)
   return updated_course, mock_upload_files

def test_create_course(db: Session) -> None:
    """Test creating a new course."""
    course_data = CourseCreate(title=random_name())
    course = crud.create_course(db, course_data)

    assert course is not None
    assert course.title == course_data.title


def test_create_course_with_users(db: Session) -> None:
    """Test creating a course and assigning users."""
    user1 = create_random_user(db)
    user2 = create_random_user(db)

    course_data = CourseCreate(
        title=random_name(),
        users=[user1.id, user2.id]
    )
    course = crud.create_course(db, course_data)
    
    assert len(course.users) == 2
    assert user1 in course.users
    assert user2 in course.users


def test_create_course_with_roles(db: Session) -> None:
    """Test creating a course and assigning roles."""
    role1 = crud.get_role_by_name(db, RoleEnum.INFIRMIERA.value).id
    role2 = crud.get_role_by_name(db, RoleEnum.MASAJ.value).id

    course_data = CourseCreate(
        title=random_name(),
        roles=[role1, role2]
    )
    course = crud.create_course(db, course_data)
    assert len(course.roles) == 2
    assert role1 in [r.id for r in course.roles]
    assert role2 in [r.id for r in course.roles]


def test_update_course(db: Session) -> None:
    """Test updating a course's details."""
    course = crud.create_course(db, CourseCreate(title=random_name()))

    new_title = "Updated Course Name"
    update_data = CourseUpdate(title=new_title)

    updated_course = crud.update_course(db, course, update_data)

    assert updated_course.title == new_title


def test_update_course_assign_users(db: Session) -> None:
    """Test adding users to an existing course."""
    user0 = create_random_user(db)
    course = crud.create_course(db, CourseCreate(title=random_name(), users=[user0.id]))
    user1 = create_random_user(db)
    user2 = create_random_user(db)

    update_data = CourseUpdate(users_to_add=[user1.id, user2.id])
    updated_course = crud.update_course(db, course, update_data)

    assert user0 in updated_course.users
    assert user1 in updated_course.users
    assert user2 in updated_course.users
    assert len(updated_course.users) == 3


def test_update_course_remove_users(db: Session) -> None:
    """Test removing users from a course."""
    course = crud.create_course(db, CourseCreate(title=random_name()))
    user1 = create_random_user(db)
    user2 = create_random_user(db)

    # First, add users
    crud.update_course(db, course, CourseUpdate(users_to_add=[user1.id, user2.id]))

    # Now, remove one user
    update_data = CourseUpdate(users_to_remove=[user1.id])
    updated_course = crud.update_course(db, course, update_data)

    assert user1 not in updated_course.users
    assert user2 in updated_course.users
    assert len(updated_course.users) == 1


def test_update_course_assign_roles(db: Session) -> None:
    """Test adding roles to an existing course."""
    course = crud.create_course(db, CourseCreate(title=random_name()))
    role1 = crud.get_role_by_name(db, RoleEnum.INFIRMIERA.value).id
    role2 = crud.get_role_by_name(db, RoleEnum.MASAJ.value).id

    update_data = CourseUpdate(roles_to_add=[role1, role2])
    updated_course = crud.update_course(db, course, update_data)
    assert role1 in [r.id for r in updated_course.roles]
    assert role2 in [r.id for r in updated_course.roles]
    assert len(updated_course.roles) == 2


def test_update_course_remove_roles(db: Session) -> None:
    """Test removing roles from a course."""
    course = crud.create_course(db, CourseCreate(title=random_name()))
    role1 = crud.get_role_by_name(db, RoleEnum.INFIRMIERA.value).id
    role2 = crud.get_role_by_name(db, RoleEnum.MASAJ.value).id

    crud.update_course(db, course, CourseUpdate(roles_to_add=[role1, role2]))
    update_data = CourseUpdate(roles_to_remove=[role1])
    updated_course = crud.update_course(db, course, update_data)

    assert role1 not in [r.id for r in updated_course.roles]
    assert role2 in [r.id for r in updated_course.roles]
    assert len(updated_course.roles) == 1


def test_update_course_increment_cycle(db: Session) -> None:
    """Test incrementing the course cycle."""
    course = crud.create_course(db, CourseCreate(title=random_name()))

    update_data = CourseUpdate(increment_cycle=True)
    updated_course = crud.update_course(db, course, update_data)

    assert updated_course.current_cycle == 2


def test_update_course_increment_cycle_with_other_fields(db: Session) -> None:
    """Test that increment_cycle does not affect other fields."""
    # Create a course with an initial cycle
    course = crud.create_course(db, CourseCreate(title=random_name(), current_cycle=1))

    # Update the course with increment_cycle=True and a new title
    new_title = "Updated Course Title"
    update_data = CourseUpdate(title=new_title, increment_cycle=True)
    updated_course = crud.update_course(db, course, update_data)

    # Assert that the cycle has incremented and the title is updated
    assert updated_course.current_cycle == 2
    assert updated_course.title == new_title


def test_delete_course(db: Session) -> None:
    """Test deleting a course from the database."""
    course = crud.create_course(db, CourseCreate(title=random_name()))
    db.delete(course)
    db.commit()
    deleted_course = db.get(Course, course.id)
    assert deleted_course is None


def test_course_role_link_removal(db: Session) -> None:
    """Ensure course-role links are removed when a course is deleted."""
    role = random_role(db)
    course = crud.create_course(db, CourseCreate(title=random_name(), roles=[role]))
    assert len(course.roles) == 1
    db.delete(course)
    db.commit()
    role_link = db.exec(select(CourseRoleLink).where(CourseRoleLink.course_id == course.id)).first()
    assert role_link is None


def test_course_user_link_removal(db: Session) -> None:
    """Ensure course-user links are removed when a course is deleted."""
    user = create_random_user(db)
    course = crud.create_course(db, CourseCreate(title=random_name(), users=[user.id]))
    assert len(course.users) == 1
    db.delete(course)
    db.commit()
    user_link = db.exec(select(CourseUserLink).where(CourseUserLink.course_id == course.id)).first()
    assert user_link is None

@pytest.mark.skip
def test_create_course_with_quiz(db: Session) -> None:
    """Test creating a course with a quiz."""
    quiz_data = {
        "max_attempts": 3,
        "passing_threshold": 70,
        "questions": [
            {"question": "What is 2+2?", "choices": ["3", "4", "5"], "correct_index": 1}
        ]
    }

    course_data = CourseCreate(
        title=random_name(),
        is_active=True,
        quiz=quiz_data
    )

    course = crud.create_course(db, course_data)
    assert course.quiz is not None
    assert course.quiz.max_attempts == quiz_data["max_attempts"]
    assert len(course.quiz.questions) == 1

@pytest.mark.skip
def test_update_course_with_quiz(db: Session) -> None:
    """Test updating a course by adding a quiz."""
    course = crud.create_course(db, CourseCreate(title=random_name()))

    quiz_data = {
        "max_attempts": 5,
        "passing_threshold": 80,
        "questions": [
            {"question": "What is 10+10?", "choices": ["15", "20", "25"], "correct_index": 1}
        ]
    }

    update_data = CourseUpdate(quiz=quiz_data)
    updated_course = crud.update_course(db, course, update_data)

    assert updated_course.quiz is not None
    assert updated_course.quiz.max_attempts == quiz_data["max_attempts"]
    assert updated_course.quiz.passing_threshold == quiz_data["passing_threshold"]


def test_get_course_analytics(db: Session) -> None:
    """Test retrieving course analytics."""
    user1 = create_random_user(db)
    user2 = create_random_user(db)

    course = crud.create_course(db, CourseCreate(title=random_name(), users=[user1.id, user2.id]))
    quiz_data = {
        "max_attempts": 3,
        "passing_threshold": 80,
        "questions": [
            {"question": "What is 10+5?", "options": ["15", "20", "25"], "correct_index": 0},
            {"question": "What is 10+10?", "options": ["15", "20", "25"], "correct_index": 1},
        ]
    }

    quiz = crud.create_quiz(db, QuizCreate(course_id=course.id, **quiz_data))
    crud.create_quiz_attempt(db, QuizAttemptCreate(quiz_id=quiz.id, user_id=user1.id, selected_indexes=[0, 1]))
    # user 2 fails with max attempts
    crud.create_quiz_attempt(db, QuizAttemptCreate(quiz_id=quiz.id, user_id=user2.id, selected_indexes=[1, 2]))
    crud.create_quiz_attempt(db, QuizAttemptCreate(quiz_id=quiz.id, user_id=user2.id, selected_indexes=[1, 2]))
    crud.create_quiz_attempt(db, QuizAttemptCreate(quiz_id=quiz.id, user_id=user2.id, selected_indexes=[1, 2]))

    analytics = crud.get_course_analytics(db, course.id)

    assert analytics.total_users == 2
    assert analytics.passed_users == 1  # user1 passed
    assert analytics.failed_users == 1  # user2 failed
    assert analytics.in_progress_users == 0  # No one is in progress
    assert analytics.course_completed is True  # All users either passed or failed
    assert analytics.completion_rate == 100.0  # Everyone has finished the quiz
    assert analytics.pass_rate == 50.0  # 1/2 users passed
    assert analytics.fail_rate == 50.0  # 1/2 users failed
    assert analytics.average_attempts == 2 
    assert analytics.average_score == 50.0


def test_get_course_progress(db: Session) -> None:
    """Test retrieving user progress for a course."""
    user1 = create_random_user(db)
    user2 = create_random_user(db)

    course = crud.create_course(db, CourseCreate(title=random_name(), users=[user1.id, user2.id]))

    quiz_data = {
        "max_attempts": 3,
        "passing_threshold": 80.0, 
        "questions": [
            {"question": "What is 10+5?", "options": ["15", "20", "25"], "correct_index": 0},
            {"question": "What is 10+10?", "options": ["15", "20", "25"], "correct_index": 1}
        ]
    }

    quiz = crud.create_quiz(db, QuizCreate(course_id=course.id, **quiz_data))
    # User1 answers both questions correctly
    crud.create_quiz_attempt(db, QuizAttemptCreate(quiz_id=quiz.id, user_id=user1.id, selected_indexes=[0, 1]))
    # User2 answers one question correctly and one incorrectly
    crud.create_quiz_attempt(db, QuizAttemptCreate(quiz_id=quiz.id, user_id=user2.id, selected_indexes=[1, 1]))
    # Retrieve course progress
    progress = crud.get_course_progress(db, course.id)
    # Assertions
    assert len(progress) == 2  # Two users should have progress records

    # Check User1's progress
    user1_progress = next(p for p in progress if p.user.id == user1.id)
    assert user1_progress.user.id == user1.id
    assert user1_progress.status == StatusEnum.PASSED  # User1 passed the quiz
    assert user1_progress.attempt_count == 1  # User1 made 1 attempt
    assert user1_progress.score == 100.0  # User1 scored 100%

    # Check User2's progress
    user2_progress = next(p for p in progress if p.user.id == user2.id)
    assert user2_progress.user.id == user2.id
    assert user2_progress.status == StatusEnum.IN_PROGRESS  # User2 failed the quiz but has attempts left
    assert user2_progress.attempt_count == 1  # User2 made 1 attempt
    assert user2_progress.score == 50.0  # User2 scored 50%


def test_list_course_materials(db: Session, course_with_materials):
   course, files = course_with_materials
   materials = crud.list_course_materials(db, course.id)
   assert len(materials) == 2 


def test_upload_course_materials(course_with_materials):
   course, files = course_with_materials
   assert course.id is not None
   assert len(course.materials) == len(files)


def test_delete_course_material(db: Session, mock_upload_files):
   course = crud.create_course(db, CourseCreate(title="Test Course"))
   updated_course = crud.upload_course_materials(db, course.id, [mock_upload_files[0]])
   
   result = crud.delete_course_material(db, course.id, updated_course.materials[0])
   assert len(crud.list_course_materials(db, course.id)) == 0
   assert result.message == "Course material deleted successfully."


def test_delete_all_course_materials(db: Session, course_with_materials):
   course, files = course_with_materials    
   result = crud.delete_all_course_materials(db, course.id)
   assert len(crud.list_course_materials(db, course.id)) == 0
   assert result.message == "All course materials deleted successfully."


def test_quiz_attempts_reset_after_cycle_increment(db: Session) -> None:
    """Test that users can create new quiz attempts after cycle increment."""
    # Create a user and a course
    user = create_random_user(db)
    course = crud.create_course(db, CourseCreate(title=random_name(), users=[user.id], current_cycle=1))

    # Create a quiz with max_attempts=1
    quiz_data = {
        "max_attempts": 1,
        "passing_threshold": 80.0,
        "questions": [
            {"question": "What is 10+5?", "options": ["15", "20", "25"], "correct_index": 0}
        ]
    }
    quiz = crud.create_quiz(db, QuizCreate(course_id=course.id, **quiz_data))

    # User exhausts their attempts in the current cycle
    crud.create_quiz_attempt(db, QuizAttemptCreate(quiz_id=quiz.id, user_id=user.id, selected_indexes=[0]))

    # Verify that the user cannot create another attempt in the same cycle
    with pytest.raises(HTTPException) as exc_info:
        crud.create_quiz_attempt(db, QuizAttemptCreate(quiz_id=quiz.id, user_id=user.id, selected_indexes=[0]))
    
    assert exc_info.value.status_code == 400
    assert "Max attempts exceeded" in str(exc_info.value.detail)

    # Increment the course cycle
    update_data = CourseUpdate(increment_cycle=True)
    updated_course = crud.update_course(db, course, update_data)
    assert updated_course.current_cycle == 2

    # Verify that the user can now create a new attempt in the new cycle
    attempt = crud.create_quiz_attempt(db, QuizAttemptCreate(quiz_id=quiz.id, user_id=user.id, selected_indexes=[0]))
    assert attempt is not None

