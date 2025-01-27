import uuid
import shutil
from typing import Any, List
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlmodel import select, func
from app.api.deps import (
    SessionDep,
    CurrentUser,
    CurrentSuperUser
)
from app.models import (
    AttachQuizToCourse,
    Course,
    CourseAssign,
    CourseCreate,
    CourseUpdate,
    CoursePublic,
    CoursesPublic,
    CourseAssignment,
    Message,
    Quiz,
    User,
    UserPublic
)
from app import crud
from app.core.config import settings

router = APIRouter(prefix="/courses", tags=["courses"])


@router.post("/upload-material/", response_model=str)
def upload_material(admin_user: CurrentSuperUser, file: UploadFile = File(...)):
    """Upload a single course material file and return the file path."""
    file_path = settings.UPLOAD_DIR / f"{uuid.uuid4().hex}_{file.filename}" 
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return str(file_path)

@router.get("/materials/{filename}")
def get_material(admin_user: CurrentSuperUser, filename: str):
    """Retrieve a course material by filename."""
    file_path = settings.UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


@router.get("/", response_model=CoursesPublic)
def read_courses(
    current_user: CurrentUser,
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve courses. 
    - If current_user is superuser, return all courses.
    - Otherwise, return only courses assigned to current_user.
    """
    base_query = (
        select(Course)
        if current_user.is_superuser 
        else select(Course).join(CourseAssignment).where(CourseAssignment.user_id == current_user.id)
    )
    count = session.exec(select(func.count()).select_from(base_query.subquery())).one()
    courses = session.exec(base_query.offset(skip).limit(limit)).all()

    public_courses = [
        CoursePublic(
            id=course.id,
            title=course.title,
            description=course.description,
            assigned_users=[a.user_id for a in course.assignments],
            assigned_roles=list(set(a.role_name for a in course.assignments))  
        )
        for course in courses
    ]

    return CoursesPublic(data=public_courses, count=count)
    # return CoursesPublic(data=courses, count=count)

@router.post("/", response_model=Message)
def create_course(
    *,
    session: SessionDep,
    course_in: CourseCreate,
    admin_user: CurrentSuperUser
) -> Any:
    """Create a course with optional user/role assignment and quiz."""
    for file_path in course_in.materials:
        if not Path(file_path).exists():
            raise HTTPException(status_code=400, detail=f"File not found: {file_path}")

    db_course = crud.create_course(session=session, course_create=course_in)
    if course_in.assigned_users or course_in.assigned_roles:
        crud.bulk_assign_course(
            session=session, 
            course_id=db_course.id, 
            user_ids=course_in.assigned_users, 
            roles=course_in.assigned_roles
        )
    return Message(message="Bulk assignment completed.")

# @router.post("/", response_model=CoursePublic)
# def create_course_api(
#     *,
#     session: SessionDep,
#     course_in: CourseCreate,
#     admin_user: CurrentSuperUser
# ) -> Any:
#     """Create a new course (admin-only)."""
#     db_course = crud.create_course(session=session, course_create=course_in)

#     if course_in.create_quiz:
#         new_quiz = Quiz(course_id=db_course.id, questions=[])
#         session.add(new_quiz)
#         session.commit()
#         session.refresh(new_quiz)
#         db_course.quiz_id = new_quiz.id
#         session.add(db_course)
#         session.commit()

#     return db_course




@router.get("/{course_id}", response_model=CoursePublic)
def read_course_by_id(
    course_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    Get a specific course by ID.
    - If admin, can read any course.
    - If normal user, must be assigned to the course or raise 403.
    """
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.is_superuser:
        return db_course

    # Check if user is assigned to this course
    statement = (
        select(CourseAssignment)
        .where(
            CourseAssignment.course_id == db_course.id,
            CourseAssignment.user_id == current_user.id
        )
    )
    assignment = session.exec(statement).first()
    if not assignment:
        raise HTTPException(status_code=403, detail="You are not assigned to this course")
    return db_course

@router.patch("/{course_id}", response_model=CoursePublic)
def update_course(
    *,
    course_id: uuid.UUID,
    course_in: CourseUpdate,
    session: SessionDep,
    admin_user: CurrentSuperUser
) -> Any:
    """
    Update an existing course (admin-only).
    """
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    updated_course = crud.update_course(
        session=session,
        db_course=db_course,
        course_in=course_in
    )
    return updated_course

@router.delete("/{course_id}", response_model=Message)
def delete_course(
    *,
    course_id: uuid.UUID,
    session: SessionDep,
    admin_user: CurrentSuperUser
) -> Message:
    """
    Delete a course (admin-only).
    """
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    session.delete(db_course)
    session.commit()
    return Message(message="Course deleted successfully")


#
#  -- assignmentents
#

@router.post("/{course_id}/assign-bulk", response_model=Message)
def bulk_assign_course(
    course_id: uuid.UUID,
    payload: CourseAssignment,
    session: SessionDep,
    admin_user: CurrentSuperUser
) -> Message:
    """
    Bulk assign a course to multiple user_ids or roles.
    (admin-only).
    """
    crud.bulk_assign_course(session=session, course_id=course_id, user_ids=payload.user_ids, roles=payload.roles)
    return Message(message="Bulk assignment completed.")

@router.post("/{course_id}/assign/{user_id}", response_model=Message)
def assign_user_to_course(
    course_id: uuid.UUID,
    user_id: uuid.UUID,
    session: SessionDep,
    admin_user: CurrentSuperUser
) -> Any:
    """
    Assign a course to a specific user (admin-only).
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check if assignment exists
    statement = (
        select(CourseAssignment)
        .where(CourseAssignment.user_id == user_id, CourseAssignment.course_id == course_id)
    )
    existing_assignment = session.exec(statement).first()
    if existing_assignment:
        raise HTTPException(status_code=400, detail="User already assigned to this course")

    # Reuse the CRUD function
    crud.assign_course_to_user(session=session, course_id=course_id, user_id=user_id)
    return Message(message=f"Course {course_id} assigned to user {user_id} successfully.")

@router.get("/user/{user_id}", response_model=CoursesPublic)
def get_assigned_courses_for_user(
    user_id: uuid.UUID,
    session: SessionDep,
    admin_user: CurrentSuperUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Get courses assigned to a specific user by user_id.
    If current_user is a superuser, they can see *any* user's assigned courses.
    Returns a list of courses + a count in the 'CoursesPublic' schema.
    """
    base_query = (
        select(Course)
        .join(CourseAssignment)
        .where(CourseAssignment.user_id == user_id)
    )
    count = session.exec(select(func.count()).select_from(base_query.subquery())).one()
    courses = session.exec(base_query.offset(skip).limit(limit)).all()
    
    return CoursesPublic(data=courses, count=count)

@router.get("/{course_id}/users", response_model=List[UserPublic])
def get_assigned_users_for_course(
    course_id: uuid.UUID,
    session: SessionDep,
    admin_user: CurrentSuperUser
) -> Any:
    """
    Get users assigned to a specific course by course_id.
    (Admin-only)
    """
    base_query = (
        select(User)
        .join(CourseAssignment)
        .where(CourseAssignment.course_id == course_id)
    )
    users = session.exec(base_query).all()

    return users

@router.post("/{course_id}/quiz", response_model=Message)
def attach_quiz_to_course(
    payload: AttachQuizToCourse,
    session: SessionDep,
    admin_user: CurrentSuperUser
) -> Message:
    """Attach an existing quiz to a course (admin-only)."""
    course = session.get(Course, payload.course_id)
    quiz = session.get(Quiz, payload.quiz_id)
    if not course or not quiz:
        raise HTTPException(status_code=404, detail="Course or Quiz not found")

    course.quiz_id = quiz.id
    session.commit()
    return Message(message="Quiz attached to course successfully.")


@router.get("/{course_id}/details", response_model=CoursePublic)
def get_course_details(
    course_id: uuid.UUID,
    session: SessionDep,
    admin_user: CurrentSuperUser
) -> Any:
    """
    Get full course details (admin-only).
    - Includes assigned users, roles, and quiz info.
    """
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    assigned_users = session.exec(
        select(User).join(CourseAssignment).where(CourseAssignment.course_id == course_id)
    ).all()

    return CoursePublic(
        id=db_course.id,
        title=db_course.title,
        description=db_course.description,
        is_active=db_course.is_active,
        start_date=db_course.start_date,
        end_date=db_course.end_date,
        assigned_roles=db_course.assigned_roles,  # Fetch roles
        assigned_users=assigned_users,  # Fetch users
        quiz=db_course.quiz
    )


# @router.post("/{course_id}/assign", response_model=CoursePublic)
# def assign_users_roles_to_course(
#     course_id: uuid.UUID,
#     assign_data: CourseAssign,
#     session: SessionDep,
#     admin_user: CurrentSuperUser
# ):
#     """Assign users and roles to an existing course."""
#     course = session.get(Course, course_id)
#     if not course:
#         raise HTTPException(status_code=404, detail="Course not found")

#     user_ids = session.exec(
#         select(User.id).where(User.email.in_(assign_data.assigned_user_emails))  # type: ignore
#     ).all()

#     crud.bulk_assign_course(session=session, course_id=course_id, assign_data=assign_data)

#     return course
