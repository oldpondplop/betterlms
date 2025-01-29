from uuid import UUID
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import SessionDep, CurrentUser, CurrentSuperUser
from app.models import (
    Course,
    CourseCreate,
    CoursePublic,
    CourseUpdate,
    CourseDetailed,
    RolePublic,
    UserPublic,
    QuizPublic,
    Message,
)
from app import crud

router = APIRouter(prefix="/courses", tags=["courses"])


# Helper function to get course by ID
def get_course_by_id(session: SessionDep, course_id: UUID) -> Course:
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


# Create Course
@router.post("/", response_model=CoursePublic)
def create_course(
    *, session: SessionDep, admin_user: CurrentSuperUser, course_in: CourseCreate
) -> Any:
    """
    Create a new course. Only accessible by superusers.
    """
    course = crud.create_course(session=session, course_in=course_in)
    return course


# Read Course by ID
@router.get("/{course_id}", response_model=CourseDetailed)
def read_course(
    *, session: SessionDep, course_id: UUID, current_user: CurrentUser
) -> Any:
    """
    Retrieve a course by its ID. Accessible by any authenticated user.
    """
    course = get_course_by_id(session, course_id)
    return CourseDetailed(
        id=course.id,
        title=course.title,
        description=course.description,
        materials=course.materials,
        is_active=course.is_active,
        start_date=course.start_date,
        end_date=course.end_date,
        roles=[RolePublic.model_validate(role) for role in course.roles],
        users=[UserPublic.model_validate(user) for user in course.users],
        quiz=QuizPublic.model_validate(course.quiz) if course.quiz else None,
    )


# Read All Courses
@router.get("/", response_model=List[CoursePublic])
def read_courses(
    *, session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve a list of courses. Accessible by any authenticated user.
    """
    courses = crud.get_courses(session=session, skip=skip, limit=limit)
    return courses


# Update Course
@router.patch("/{course_id}", response_model=CoursePublic)
def update_course(
    *,
    session: SessionDep,
    course_id: UUID,
    course_in: CourseUpdate,
    admin_user: CurrentSuperUser,
) -> Any:
    """
    Update a course by its ID. Only accessible by superusers.
    """
    course = get_course_by_id(session, course_id)
    course = crud.update_course(session=session, db_course=course, course_in=course_in)
    return course


# Delete Course
@router.delete("/{course_id}", response_model=Message)
def delete_course(
    *, session: SessionDep, course_id: UUID, admin_user: CurrentSuperUser
) -> Any:
    """
    Delete a course by its ID. Only accessible by superusers.
    """
    course = get_course_by_id(session, course_id)
    crud.delete_course(session=session, db_course=course)
    return Message(message="Course deleted successfully")


# Attach Quiz to Course
@router.post("/{course_id}/attach-quiz", response_model=CoursePublic)
def attach_quiz_to_course(
    *,
    session: SessionDep,
    course_id: UUID,
    quiz_id: UUID,
    admin_user: CurrentSuperUser,
) -> Any:
    """
    Attach a quiz to a course. Only accessible by superusers.
    """
    course = get_course_by_id(session, course_id)
    course = crud.attach_quiz_to_course(session=session, db_course=course, quiz_id=quiz_id)
    return course