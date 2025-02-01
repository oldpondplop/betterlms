import shutil
import uuid
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from typing import List, Any
# from sqlalchemy import or _
from sqlmodel import select, func, or_
from app.api.deps import SessionDep, SuperuserRequired, CurrentUser
from app.models import (
    CourseAnalyticsPublic, CourseCreate, CourseMaterialPublic, CourseMaterialUpdate, CourseProgressPublic, CourseStatusEnum, CourseUpdate, Course, CoursePublic, CoursesProgressPublic, CoursesPublic, Message, QuizAttemptCreate, QuizAttemptPublic, QuizPublic, 
    Role, RolesPublic, User, UserPublic, UsersPublic, QuizCreate, QuizUpdate, Quiz, CourseUserLink, CourseRoleLink
)
from app import crud
from app.core.config import settings

router = APIRouter(prefix="/courses", tags=["courses"])


# ================================
# COURSE MANAGEMENT
# ================================

@router.get("/me", response_model=CoursesPublic)
def get_my_courses(session: SessionDep, current_user: CurrentUser) -> CoursesPublic:
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
    return CoursesPublic(data=list(courses), count=len(courses))

@router.get("/", response_model=CoursesPublic, dependencies=[SuperuserRequired])
def get_courses(session: SessionDep, skip: int = 0, limit: int = 100):
    """Retrieve all courses with pagination."""
    total = crud.count_courses(session)
    data = crud.get_courses(session, skip=skip, limit=limit)
    return CoursesPublic(data=data, count=total)

@router.post("/", response_model=CoursePublic, dependencies=[SuperuserRequired])
def create_course(course_in: CourseCreate, session: SessionDep):
    """Create a new course."""
    return crud.create_course(session, course_in)

@router.get("/{course_id}", response_model=CoursePublic)
def get_course(course_id: uuid.UUID, session: SessionDep):
    """Retrieve a specific course."""
    if course := crud.get_course_by_id(session, course_id):
        return course
    raise HTTPException(status_code=404, detail="Course not found")

@router.patch("/{course_id}", response_model=CoursePublic, dependencies=[SuperuserRequired])
def update_course(course_id: uuid.UUID, course_in: CourseUpdate, session: SessionDep):
    """Update course details."""
    if db_course := crud.get_course_by_id(session, course_id):
        return crud.update_course(session, db_course, course_in)
    raise HTTPException(status_code=404, detail="Course not found")

@router.delete("/{course_id}", response_model=Message, dependencies=[SuperuserRequired])
def delete_course(course_id: uuid.UUID, session: SessionDep):
    """Delete a course."""
    if db_course := session.get(Course, course_id):
        session.delete(db_course)
        session.commit()
        return Message(message="Course deleted successfully")
    raise HTTPException(status_code=404, detail="Course not found")


# ================================
# USER & ROLE MANAGEMENT
# ================================

@router.get("/{course_id}/roles", response_model=RolesPublic, dependencies=[SuperuserRequired])
def get_course_roles(course_id: uuid.UUID, session: SessionDep):
    """Retrieve roles assigned to a course."""
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    return RolesPublic(data=db_course.roles, count=len(db_course.roles))

@router.post("/{course_id}/roles/{role_id}", response_model=CoursePublic, dependencies=[SuperuserRequired])
def assign_role(course_id: uuid.UUID, role_id: uuid.UUID, session: SessionDep):
    """Assign a role to a course."""
    return crud.assign_role_to_course(session, course_id, role_id)

@router.delete("/{course_id}/roles/{role_id}", response_model=Message, dependencies=[SuperuserRequired])
def unassign_role(course_id: uuid.UUID, role_id: uuid.UUID, session: SessionDep):
    """Remove a role from a course."""
    return crud.unassign_role_from_course(session, course_id, role_id)

@router.get("/{course_id}/users", response_model=UsersPublic, dependencies=[SuperuserRequired])
def get_course_users(course_id: uuid.UUID, session: SessionDep):
    """Retrieve users assigned to a course."""
    if not session.get(Course, course_id):
        raise HTTPException(status_code=404, detail="Course not found")

    users_query = (
        select(User)
        .join(CourseUserLink, CourseUserLink.user_id == User.id)  # type: ignore
        .where(CourseUserLink.course_id == course_id)
    )
    users = session.exec(users_query).all()

    total_count = session.exec(
        select(func.count()).select_from(CourseUserLink).where(CourseUserLink.course_id == course_id)
    ).one()

    return UsersPublic(data=[UserPublic.model_validate(user) for user in users], count=total_count)

@router.post("/{course_id}/users/{user_id}", response_model=CoursePublic, dependencies=[SuperuserRequired])
def assign_user(course_id: uuid.UUID, user_id: uuid.UUID, session: SessionDep):
    """Assign a user to a course."""
    return crud.assign_user_to_course(session, course_id, user_id)

@router.delete("/{course_id}/users/{user_id}", response_model=Message, dependencies=[SuperuserRequired])
def unassign_user(course_id: uuid.UUID, user_id: uuid.UUID, session: SessionDep):
    """Remove a user from a course."""
    return crud.unassign_user_from_course(session, course_id, user_id)


# ================================
# QUIZ MANAGEMENT
# ================================

@router.post("/{course_id}/quiz", response_model=QuizPublic)
def attach_quiz(course_id: uuid.UUID, quiz_in: QuizCreate, session: SessionDep):
    existing_quiz = crud.get_quiz_by_course_id(session, course_id)
    if existing_quiz:
        raise HTTPException(status_code=400, detail="A quiz already exists for this course")

    quiz_in.course_id = course_id
    quiz = crud.create_quiz(session, quiz_in)
    return quiz

@router.get("/{course_id}/quiz", response_model=QuizPublic)
def get_course_quiz(course_id: uuid.UUID, session: SessionDep):
    """Retrieve a quiz attached to a course."""
    quiz = crud.get_quiz_by_course_id(session, course_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="No quiz found for this course")
    return quiz

@router.patch("/{course_id}/quiz", response_model=QuizPublic)
def update_course_quiz(course_id: uuid.UUID, quiz_in: QuizUpdate, session: SessionDep):
    """Update a quiz attached to a course."""
    quiz = crud.get_quiz_by_course_id(session, course_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="No quiz found for this course")
    return crud.update_quiz(session, quiz.id, quiz_in)

@router.delete("/{course_id}/quiz", response_model=Message)
def remove_course_quiz(course_id: uuid.UUID, session: SessionDep) -> Message:
    """Remove a quiz from a course."""
    quiz = crud.get_quiz_by_course_id(session, course_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="No quiz found for this course")
    session.delete(quiz)
    session.commit()
    return Message(message="Quiz deleted successfully")


@router.get("/{course_id}/progress", response_model=CoursesProgressPublic, dependencies=[SuperuserRequired])
def get_course_progress(course_id: uuid.UUID, session: SessionDep):
    """Retrieve the progress of all users for a specific course."""
    if not session.get(Course, course_id):
        raise HTTPException(status_code=404, detail="Course not found")

    users_progress = session.exec(
        select(User, CourseUserLink.status, CourseUserLink.attempt_count, CourseUserLink.score)
        .join(CourseUserLink, CourseUserLink.user_id == User.id)  # type: ignore
        .where(CourseUserLink.course_id == course_id)
    ).all()

    user_data = [
        CourseProgressPublic(
            user=UserPublic.model_validate(user),
            status=status,
            attempt_count=attempt_count,
            score=score
        )
        for user, status, attempt_count, score in users_progress
    ]

    return CoursesProgressPublic(data=user_data, count=len(users_progress))

@router.get("/{course_id}/analytics", response_model=CourseAnalyticsPublic, dependencies=[SuperuserRequired])
def get_course_analytics(course_id: uuid.UUID, session: SessionDep):
    """Retrieve analytics for a specific course."""
    if not session.get(Course, course_id):
        raise HTTPException(status_code=404, detail="Course not found")
    
    total_users = session.exec(
        select(func.count()).select_from(CourseUserLink).where(CourseUserLink.course_id == course_id)
    ).one()
    
    completed_users = session.exec(
        select(func.count()).select_from(CourseUserLink)
        .where(CourseUserLink.course_id == course_id, CourseUserLink.status == CourseStatusEnum.COMPLETED)
    ).one()
    
    failed_users = session.exec(
        select(func.count()).select_from(CourseUserLink)
        .where(CourseUserLink.course_id == course_id, CourseUserLink.status == CourseStatusEnum.FAILED)
    ).one()
    
    avg_attempts = session.exec(
        select(func.avg(CourseUserLink.attempt_count)).where(CourseUserLink.course_id == course_id)
    ).one()
    
    avg_score = session.exec(
        select(func.avg(CourseUserLink.score)).where(CourseUserLink.course_id == course_id, CourseUserLink.score.isnot(None))
    ).one()
    
    return CourseAnalyticsPublic(
        total_users=total_users,
        completed_users=completed_users,
        failed_users=failed_users,
        average_attempts=avg_attempts or 0.0,
        average_score=avg_score
    )

# ================================
# FILE UPLOADS & MATERIALS
# ================================

@router.post("/{course_id}/materials/", response_model=CoursePublic, dependencies=[SuperuserRequired])
def upload_material(course_id: uuid.UUID, session: SessionDep, file: UploadFile = File(...)):
    """Upload a file and attach it to a course."""
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    file_path = settings.UPLOAD_DIR / f"{uuid.uuid4().hex}_{file.filename}"
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db_course.materials.append(file_path.name)
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
    return db_course.materials

@router.get("/materials/{filename}")
def download_material(filename: str):
    """Download or view a material."""
    file_path = settings.UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="application/pdf", filename=filename)

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