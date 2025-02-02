import shutil
import uuid
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from typing import List, Any
from sqlmodel import select, func, delete
from app.api.deps import SessionDep, SuperuserRequired, CurrentUser
from app.models import (
    Course,
    CourseCreate,
    CourseMaterialPublic,
    CourseMaterialUpdate,
    CourseUserProgress,
    CourseAnalytics,
    CoursePublic,
    CoursePublicMe,
    CourseRoleLink,
    CourseUpdate,
    CourseUserLink,
    Message,
    Quiz,
    QuizAttempt,
    StatusEnum,
    User,
    UserPublic
)
from app import crud
from app.core.config import settings

router = APIRouter(prefix="/courses", tags=["courses"])


# ================================
# COURSE MANAGEMENT
# ================================

@router.get("/me", response_model=List[CoursePublicMe])
def get_my_courses(current_user: CurrentUser, session: SessionDep):
    """Retrieve courses assigned to the current user."""
    stmt = select(Course).join(CourseUserLink).where(CourseUserLink.user_id == current_user.id)
    courses = session.exec(stmt).all()
    return courses

@router.get("/", response_model=list[CoursePublic], dependencies=[SuperuserRequired])
def get_courses(session: SessionDep, skip: int = 0, limit: int = 100):
    """Retrieve all courses with pagination."""
    return crud.get_courses(session, skip=skip, limit=limit)

@router.get("/{course_id}", response_model=CoursePublic)
def get_course(course_id: uuid.UUID, session: SessionDep):
    """Retrieve a specific course."""
    if course := crud.get_course_by_id(session, course_id):
        return course
    raise HTTPException(status_code=404, detail="Course not found")

@router.post("/", response_model=CoursePublic)
def create_course(course_in: CourseCreate, session: SessionDep):
    course = Course(**course_in.model_dump(exclude={"users", "roles", "quiz"}))
    session.add(course)
    session.commit()
    session.refresh(course)

    # Assign users directly
    for user_id in course_in.users or []:
        session.add(CourseUserLink(course_id=course.id, user_id=user_id))
    
    # Assign roles and their users
    for role_id in course_in.roles or []:
        session.add(CourseRoleLink(course_id=course.id, role_id=role_id))
        role_users = session.exec(select(User).where(User.role_id == role_id)).all()
        for user in role_users:
            session.add(CourseUserLink(course_id=course.id, user_id=user.id))

    # Add quiz if provided
    if course_in.quiz:
        quiz = Quiz(**course_in.quiz, course_id=course.id)
        session.add(quiz)
    
    session.commit()
    return course

@router.patch("/{course_id}", response_model=CoursePublic)
def update_course(course_id: uuid.UUID, course_in: CourseUpdate, session: SessionDep):
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    course_data = course_in.model_dump(exclude_unset=True, exclude={"users", "roles", "quiz"})
    course.sqlmodel_update(course_data)

    # Handle user assignments
    if course_in.users:
        existing_users = {link.user_id for link in session.exec(select(CourseUserLink).where(CourseUserLink.course_id == course_id)).all()}
        new_users = set(course_in.users)
        users_to_add = new_users - existing_users
        users_to_remove = existing_users - new_users

        session.exec(delete(CourseUserLink).where(CourseUserLink.course_id == course_id, CourseUserLink.user_id.in_(users_to_remove)))
        for user_id in users_to_add:
            session.add(CourseUserLink(course_id=course_id, user_id=user_id))

    # Handle role assignments
    if course_in.roles:
        existing_roles = {link.role_id for link in session.exec(select(CourseRoleLink).where(CourseRoleLink.course_id == course_id)).all()}
        new_roles = set(course_in.roles)
        roles_to_add = new_roles - existing_roles
        roles_to_remove = existing_roles - new_roles
        session.exec(delete(CourseRoleLink).where(CourseRoleLink.course_id == course_id, CourseRoleLink.role_id.in_(roles_to_remove)))
        for role_id in roles_to_add:
            session.add(CourseRoleLink(course_id=course_id, role_id=role_id))
            role_users = session.exec(select(User).where(User.role_id == role_id)).all()
            for user in role_users:
                if not session.exec(select(CourseUserLink).where(CourseUserLink.course_id == course_id, CourseUserLink.user_id == user.id)).first():
                    session.add(CourseUserLink(course_id=course_id, user_id=user.id))
    
    # Handle quiz updates
    if course_in.quiz:
        existing_quiz = session.exec(select(Quiz).where(Quiz.course_id == course_id)).first()
        if existing_quiz:
            for key, value in course_in.quiz.items():
                setattr(existing_quiz, key, value)
        else:
            new_quiz = Quiz(**course_in.quiz, course_id=course_id)
            session.add(new_quiz)
    
    session.commit()
    session.refresh(course)
    return course

@router.delete("/{course_id}", response_model=Message)
def delete_course(course_id: uuid.UUID, session: SessionDep):
    """Delete a course and unassign all users/roles."""
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    session.exec(delete(CourseUserLink).where(CourseUserLink.course_id == course_id))  # type: ignore
    session.exec(delete(CourseRoleLink).where(CourseRoleLink.course_id == course_id))  # type: ignore
    session.exec(delete(Quiz).where(Quiz.course_id == course_id))  # type: ignore
    session.delete(course)
    session.commit()
    return Message(message="Course deleted successfully")

# ================================
# COURSE ANALYTICS ENDPOINT
# ================================

@router.get("/{course_id}/analytics", response_model=CourseAnalytics)
def get_course_analytics(course_id: uuid.UUID, session: SessionDep):
    """Retrieve analytics for a specific course."""
    if not session.get(Course, course_id):
        raise HTTPException(status_code=404, detail="Course not found")
    
    total_users = session.exec(select(func.count()).where(CourseUserLink.course_id == course_id)).one()
    completed_users = session.exec(select(func.count()).where(CourseUserLink.course_id == course_id, CourseUserLink.status == StatusEnum.COMPLETED)).one()
    failed_users = session.exec(select(func.count()).where(CourseUserLink.course_id == course_id, CourseUserLink.status == StatusEnum.FAILED)).one()
    avg_attempts = session.exec(select(func.avg(CourseUserLink.attempt_count)).where(CourseUserLink.course_id == course_id)).one()
    avg_score = session.exec(select(func.avg(CourseUserLink.score)).where(CourseUserLink.course_id == course_id, CourseUserLink.score.isnot(None))).one()  # type: ignore
    
    return CourseAnalytics(
        total_users=total_users,
        completed_users=completed_users,
        failed_users=failed_users,
        average_attempts=avg_attempts or 0,
        average_score=avg_score or 0
    )

@router.get("/{course_id}/progress", response_model=List[CourseUserProgress])
def get_course_progress(course_id: uuid.UUID, session: SessionDep):
    """Retrieve user progress for a course."""
    if not session.get(Course, course_id):
        raise HTTPException(status_code=404, detail="Course not found")
    
    users_progress = session.exec(
        select(User, CourseUserLink.status, CourseUserLink.attempt_count, CourseUserLink.score)
        .join(CourseUserLink, CourseUserLink.user_id == User.id)  # type: ignore
        .where(CourseUserLink.course_id == course_id)
    ).all()
    
    return [
        CourseUserProgress(
            user=user,
            status=status,
            attempt_count=attempts or 0,
            score=score or 0
        ) for user, status, attempts, score in users_progress
    ]

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