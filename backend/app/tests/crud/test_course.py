import pytest
from fastapi import HTTPException, UploadFile
from sqlmodel import Session, select
from app import crud
from app.models import Course, CourseCreate, CourseUpdate, StatusEnum, CourseUserLink, CourseRoleLink
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

@pytest.mark.xfail
def test_get_course_analytics(db: Session) -> None:
    """Test retrieving course analytics."""
    user1 = create_random_user(db)
    user2 = create_random_user(db)

    course = crud.create_course(db, CourseCreate(title=random_name(), users=[user1.id, user2.id]))

    db.exec(select(CourseUserLink).where(CourseUserLink.course_id == course.id, CourseUserLink.user_id == user1.id)).first().status = StatusEnum.COMPLETED
    db.exec(select(CourseUserLink).where(CourseUserLink.course_id == course.id, CourseUserLink.user_id == user2.id)).first().status = StatusEnum.FAILED
    db.commit()

    analytics = crud.get_course_analytics(db, course.id)

    assert analytics.total_users == 2
    assert analytics.completed_users == 1
    assert analytics.failed_users == 1

@pytest.mark.xfail
def test_get_course_progress(db: Session) -> None:
    """Test retrieving user progress for a course."""
    user = create_random_user(db)
    course = crud.create_course(db, CourseCreate(title=random_name(), users=[user.id]))

    progress = crud.get_course_progress(db, course.id)

    assert len(progress) == 1
    assert progress[0].user.id == user.id
    assert progress[0].status == StatusEnum.ASSIGNED
    assert progress[0].attempt_count == 0
    assert progress[0].score == 0


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


@pytest.mark.skip
def test_quiz_progress_tracking(db: Session) -> None:
    """Test quiz attempts and progress tracking."""
    user = create_random_user(db)
    course = crud.create_course(db, CourseCreate(title=random_name(), users=[user.id]))

    quiz_data = {
        "max_attempts": 3,
        "passing_threshold": 70,
        "questions": [
            {"question": "What is 2+2?", "choices": ["3", "4", "5"], "correct_index": 1}
        ]
    }
    course = crud.update_course(db, course, CourseUpdate(quiz=quiz_data))

    quiz_attempt = crud.create_quiz_attempt(db, course.quiz.id, user.id, score=80, passed=True)

    assert quiz_attempt.quiz_id == course.quiz.id
    assert quiz_attempt.user_id == user.id
    assert quiz_attempt.passed is True
    assert quiz_attempt.score == 80

    progress = crud.get_course_progress(db, course.id)
    assert progress[0].score == 80
    assert progress[0].attempt_count == 1

@pytest.mark.skip
def test_quiz_max_attempts(db: Session) -> None:
    """Test max quiz attempts and failure handling."""
    user = create_random_user(db)
    course = crud.create_course(db, CourseCreate(title=random_name(), users=[user.id]))

    quiz_data = {
        "max_attempts": 2,
        "passing_threshold": 70,
        "questions": [
            {"question": "What is 10+10?", "choices": ["15", "20", "25"], "correct_index": 1}
        ]
    }
    course = crud.update_course(db, course, CourseUpdate(quiz=quiz_data))

    # First attempt - fail
    quiz_attempt1 = crud.create_quiz_attempt(db, course.quiz.id, user.id, score=50, passed=False)
    assert quiz_attempt1.attempt_number == 1

    # Second attempt - fail
    quiz_attempt2 = crud.create_quiz_attempt(db, course.quiz.id, user.id, score=60, passed=False)
    assert quiz_attempt2.attempt_number == 2

    # Third attempt - should be blocked
    with pytest.raises(HTTPException) as exc_info:
        crud.create_quiz_attempt(db, course.quiz.id, user.id, score=75, passed=True)

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Max attempts reached"

    progress = crud.get_course_progress(db, course.id)
    assert progress[0].status == StatusEnum.FAILED
    assert progress[0].attempt_count == 2