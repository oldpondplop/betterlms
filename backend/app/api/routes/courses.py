import shutil
from uuid import UUID
from typing import Any, List
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, delete, or_, select
from sqlalchemy.orm import Session

from app.api.deps import SessionDep, CurrentUser, CurrentSuperUser, SuperuserRequired
from app.models import (
    Course,
    CourseCreate,
    CourseMaterialPublic,
    CourseMaterialUpdate,
    CoursePublic,
    CourseRoleLink,
    CourseUpdate,
    CourseDetailed,
    CoursesPublic,
    Quiz,
    QuizUpdate,
    Role,
    RolePublic,
    UserPublic,
    QuizPublic,
    Message,
    CourseUserLink,
    User,
)
from app import crud
from app.core.config import settings

router = APIRouter(prefix="/courses", tags=["courses"])

#user stuff /me/courses
@router.get("/me", response_model=List[CourseDetailed])
def get_user_courses(session: SessionDep, current_user: CurrentUser) -> Any:
    stmt = (
        select(Course)
        .join(CourseUserLink, Course.id == CourseUserLink.course_id, isouter=True)  # type: ignore
        .join(CourseRoleLink, Course.id == CourseRoleLink.course_id, isouter=True)  # type: ignore
        .where(
            or_(
                CourseUserLink.user_id == current_user.id,  # type: ignore
                CourseRoleLink.role_id == current_user.role_id,  # type: ignore
            )
        )
        .distinct()
    )
    courses = session.exec(stmt).all()
    
    return [
        CourseDetailed(
            id=course.id,
            title=course.title,
            description=course.description,
            materials=course.materials,  # Ensure this is a list of strings
            is_active=course.is_active,
            start_date=course.start_date,
            end_date=course.end_date,
            roles=[RolePublic.model_validate(role) for role in course.roles],
            users=[UserPublic.model_validate(user) for user in course.users],
            quiz=QuizPublic.model_validate(course.quiz) if course.quiz else None,
        )
        for course in courses
    ]

# Helper function to get course by ID
def get_course_by_id(session: SessionDep, course_id: UUID) -> Course:
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


# Create Course
@router.post("/", response_model=CoursePublic)
def create_course(
    *, session: SessionDep, admin_user: CurrentSuperUser, course_create: CourseCreate
) -> Any:
    """
    Create a new course. Only accessible by superusers.
    """
    course = crud.create_course(session=session, course_create=course_create)
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
        materials=course.materials,  # Include materials
        is_active=course.is_active,
        start_date=course.start_date,
        end_date=course.end_date,
        roles=[RolePublic.model_validate(role) for role in course.roles],
        users=[UserPublic.model_validate(user) for user in course.users],
        quiz=QuizPublic.model_validate(course.quiz) if course.quiz else None,
    )


# Read All Courses
@router.get("/", response_model=CoursesPublic, dependencies=[SuperuserRequired])
def read_courses(session: SessionDep, skip: int = 0, limit: int = 100):
    """Retrieve all courses with pagination."""
    total = crud.count_courses(session)
    data = crud.get_courses(session, skip=skip, limit=limit)
    return CoursesPublic(data=data, count=total)


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
@router.delete("/{course_id}", response_model=Message, dependencies=[SuperuserRequired])
async def delete_course(course_id: uuid.UUID, session: SessionDep):
    """Delete a course and all its related data."""
    # Get the course with its relationships loaded
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    try:
        # Explicitly delete related quiz if it exists
        if db_course.quiz:
            session.delete(db_course.quiz)
        
        # Delete the course (this should cascade to other relationships)
        session.delete(db_course)
        session.commit()
        
        return Message(message="Course deleted successfully")
    except SQLAlchemyError as e:
        session.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Database error occurred while deleting course: {str(e)}"
        )


# Attach Quiz to Course
def attach_quiz_to_course(session: Session, db_course: Course, quiz_id: UUID) -> Course:
    """
    Attach a quiz to a course. If the course already has a quiz or the quiz is 
    already attached to another course, raise an error.
    """
    # Check if the quiz exists
    quiz = session.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Check if the quiz is already attached to another course
    if quiz.course_id and quiz.course_id != db_course.id:
        raise HTTPException(
            status_code=400, 
            detail="Quiz is already attached to another course"
        )
    
    # Check if the course already has a quiz
    if db_course.quiz and db_course.quiz.id != quiz_id:
        raise HTTPException(
            status_code=400, 
            detail="Course already has a quiz attached"
        )
    
    # Attach the quiz
    quiz.course_id = db_course.id
    session.add(quiz)
    session.commit()
    session.refresh(db_course)
    
    return db_course


# Assign Role to Course
@router.post("/{course_id}/assign-role/{role_id}", response_model=Message)
def assign_role_to_course(
    *,
    session: SessionDep,
    course_id: uuid.UUID,
    role_id: uuid.UUID,
    admin_user: CurrentSuperUser,
) -> Message:
    """
    Assign a role to a course. Only accessible by superusers.
    """
    # Check if the course exists
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check if the role exists
    role = session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Check if the role is already assigned to the course
    existing_link = session.exec(
        select(CourseRoleLink).where(
            CourseRoleLink.course_id == course_id,
            CourseRoleLink.role_id == role_id,
        )
    ).first()
    if existing_link:
        raise HTTPException(status_code=400, detail="Role already assigned to this course")

    # Create the link
    link = CourseRoleLink(course_id=course_id, role_id=role_id)
    session.add(link)
    session.commit()

    return Message(message="Role assigned to course successfully")


# Remove Role from Course
@router.delete("/{course_id}/remove-role/{role_id}", response_model=Message, dependencies=[SuperuserRequired])
def unassign_role_from_course(course_id: UUID, role_id: UUID, session: SessionDep) -> Any:
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    db_role = session.get(Role, role_id)
    if not db_role or db_role not in db_course.roles:
        raise HTTPException(status_code=404, detail="Role not linked to course")

    db_course.roles.remove(db_role)
    session.add(db_course)
    session.commit()
    session.refresh(db_course)
    return Message(message="Role removed from course successfully")

# Assign User to Course
@router.post("/{course_id}/assign-user/{user_id}", response_model=Message)
def assign_user_to_course(
    *,
    session: SessionDep,
    course_id: uuid.UUID,
    user_id: uuid.UUID,
    admin_user: CurrentSuperUser,
) -> Message:
    """
    Assign a user to a course. Only accessible by superusers.
    """
    # Check if the course exists
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check if the user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if the user is already assigned to the course
    existing_link = session.exec(
        select(CourseUserLink).where(
            CourseUserLink.course_id == course_id,
            CourseUserLink.user_id == user_id,
        )
    ).first()
    if existing_link:
        raise HTTPException(status_code=400, detail="User already assigned to this course")

    # Create the link
    link = CourseUserLink(course_id=course_id, user_id=user_id)
    session.add(link)
    session.commit()

    return Message(message="User assigned to course successfully")


# Remove User from Course
@router.delete("/{course_id}/remove-user/{user_id}", response_model=Message, dependencies=[SuperuserRequired])
def unassign_user_from_course(course_id: UUID, user_id: UUID, session: SessionDep) -> Any:
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    db_user = session.get(User, user_id)
    if not db_user or db_user not in db_course.users:
        raise HTTPException(status_code=404, detail="User not linked to course")

    db_course.users.remove(db_user)
    session.add(db_course)
    session.commit()
    session.refresh(db_course)
    return Message(message="User removed from course successfully")

# ================================
# FILE UPLOADS & MATERIALS
# ================================

@router.post("/{course_id}/materials/", response_model=CoursePublic, dependencies=[SuperuserRequired])
def upload_materials(course_id: uuid.UUID, session: SessionDep, files: List[UploadFile] = File(...)):
    """Upload multiple files and attach them to a course."""
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    for file in files:
        new_file_path = settings.UPLOAD_DIR / f"{uuid.uuid4().hex}_{file.filename}"
        with new_file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        db_course.materials.append(new_file_path.name)

    session.commit()
    session.refresh(db_course)
    return db_course

@router.put("/{course_id}/materials/", response_model=CourseMaterialPublic)
def update_materials(course_id: uuid.UUID,
    session: SessionDep,
    materials_update: CourseMaterialUpdate,  
    files: List[UploadFile] = File([])
):
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Remove
    for filename in materials_update.remove_files:
        if filename not in db_course.materials:
            raise HTTPException(status_code=400, detail=f"Material '{filename}' not found")
        file_path = settings.UPLOAD_DIR / filename
        if file_path.exists():
            file_path.unlink()
        db_course.materials.remove(filename)

    # Upload
    for file in files:
        new_file_path = settings.UPLOAD_DIR / f"{uuid.uuid4().hex}_{file.filename}"
        with new_file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        db_course.materials.append(new_file_path.name)

    session.commit()
    session.refresh(db_course)
    
    return CourseMaterialPublic(course_id=course_id, materials=db_course.materials)

@router.get("/{course_id}/materials/", response_model=List[str])
def list_materials(course_id: uuid.UUID, session: SessionDep):
    """List all materials for a course."""
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    return db_course.materials  # Ensure this is a list of strings




@router.get("/materials/{filename}")
def download_material(filename: str) -> Any:
    """Download or view a material."""
    file_path = settings.UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="application/pdf", filename=filename)
@router.get("/materials/url/{filename}")
def get_material_url(filename: str, request: Request):
    """Return the URL of the PDF file."""
    file_path = settings.UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    file_url = str(request.url_for("download_material", filename=filename))
    
    return JSONResponse(content={"url": file_url})



@router.delete("/{course_id}/materials/{filename}", response_model=Message, dependencies=[SuperuserRequired])
def delete_material(session: SessionDep, course_id: uuid.UUID, filename: str) -> Any:
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    if filename not in db_course.materials:
        raise HTTPException(status_code=404, detail="Material not found in this course")
    
    db_course.materials.remove(filename)
    session.add(db_course)
    session.commit()
    session.refresh(db_course)

    file_path = settings.UPLOAD_DIR / filename
    if file_path.exists():
        file_path.unlink()
    return Message(message="Course material deleted sucessfuly.")