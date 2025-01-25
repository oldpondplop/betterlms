import json
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, delete, func

from app import crud
from app.api.deps import (
    CurrentUser,
    SessionDep,
    get_current_active_superuser,
)
from app.models import (
    Course,
    CourseCreate,
    CoursePublic,
    CourseUpdate,
    CourseAssignment,
    Message,
    User,
    Role,  # ✅ Import Role Enum
)

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get(
    "/",
    response_model=list[CoursePublic],
)
def read_courses(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    """
    Retrieve all courses.
    """
    statement = select(Course).offset(skip).limit(limit)
    courses = session.exec(statement).all()
    return courses


@router.post("/", dependencies=[Depends(get_current_active_superuser)], response_model=CoursePublic)
def create_course(
    *,
    session: SessionDep,
    course_in: CourseCreate
) -> Any:
    """
    Create a new course and assign it to multiple roles and/or a specific user.
    """
    # Convert Role Enum to string list
    role_values = [role.value if isinstance(role, Role) else role for role in (course_in.assign_to_roles or [])]

    # Ensure we exclude `assign_to_roles` before passing the remaining fields
    course_data = course_in.model_dump(exclude={"assign_to_roles", "assign_to_user_id"})

    # ✅ Now create the course with valid fields
    db_course = Course(**course_data)  # ✅ Assign fields dynamically

    # ✅ Store `assign_to_roles` separately
    db_course.assign_to_roles = role_values  # ✅ Store as a list of strings

    session.add(db_course)
    session.commit()
    session.refresh(db_course)

    # Assign Users Based on Roles
    if role_values:
        users = session.exec(select(User).where(User.role.in_(role_values))).all()
        for user in users:
            crud.assign_course_to_user(session=session, course_id=db_course.id, user_id=user.id)

    # Assign to Specific User
    if course_in.assign_to_user_id:
        user = session.get(User, course_in.assign_to_user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        crud.assign_course_to_user(session=session, course_id=db_course.id, user_id=user.id)

    return db_course


@router.get("/{course_id}", response_model=CoursePublic)
def read_course_by_id(
    course_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Get a specific course by ID.
    """
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.patch(
    "/{course_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=CoursePublic,
)
def update_course(
    *,
    session: SessionDep,
    course_id: uuid.UUID,
    course_in: CourseUpdate,
) -> Any:
    """
    Update a course (Admin Only).
    """
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    # ✅ Fix: Update fields safely
    course_data = course_in.model_dump(exclude_unset=True)
    for key, value in course_data.items():
        setattr(db_course, key, value)

    session.add(db_course)
    session.commit()
    session.refresh(db_course)
    return db_course


@router.delete("/{course_id}", dependencies=[Depends(get_current_active_superuser)])
def delete_course(session: SessionDep, course_id: uuid.UUID) -> Message:
    """
    Delete a course (Admin Only).
    """
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    session.delete(db_course)
    session.commit()
    return Message(message="Course deleted successfully")


@router.post("/{course_id}/assign/{user_id}", response_model=CourseAssignment)
def assign_course(
    course_id: uuid.UUID,
    user_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """
    Assign a course to a user (Only Admins can assign).
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Insufficient privileges")

    return crud.assign_course_to_user(session=session, course_id=course_id, user_id=user_id)
