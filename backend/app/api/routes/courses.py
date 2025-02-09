import shutil
import uuid
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from typing import List, Any
from sqlalchemy import or_
from sqlmodel import select, func
from app.api.deps import SessionDep, SuperuserRequired, CurrentUser
from app.models import (
    Course,
    CourseCreate,
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
    QuizAttemptPublic,
    StatusEnum,
    User,
    UserPublic,
)
from app import crud
from app.core.config import settings

router = APIRouter(prefix="/courses", tags=["courses"])

# ================================
# COURSE MANAGEMENT
# ================================

@router.get("/me", response_model=list[CoursePublicMe])
def get_my_courses(session: SessionDep, current_user: CurrentUser):
    return crud.get_courses_for_user(session, current_user)

@router.get("/", response_model=list[CoursePublic])
def get_courses(session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100):
    if current_user.is_superuser:
        courses = crud.get_courses(session, skip=skip, limit=limit)
    else:
        courses = crud.get_courses_for_user(session, current_user)
    return courses

@router.post("/", response_model=CoursePublic, dependencies=[SuperuserRequired])
def create_course(course_in: CourseCreate, session: SessionDep):
    return crud.create_course(session, course_in)

@router.get("/{course_id}", response_model=CoursePublic, dependencies=[SuperuserRequired])
def get_course(course_id: uuid.UUID, session: SessionDep):
    """Retrieve a specific course."""
    if course := crud.get_course_by_id(session, course_id):
        return course
    raise HTTPException(status_code=404, detail="Course not found")

@router.get("/{course_id}/users", response_model=list[UserPublic], dependencies=[SuperuserRequired])
def get_course_users(course_id: uuid.UUID, session: SessionDep):
    """Retrieve a specific course."""
    if not (course := crud.get_course_by_id(session, course_id)):
        raise HTTPException(status_code=404, detail="Course not found")
    return crud.get_course_users(session, course_id)

@router.patch("/{course_id}", response_model=CoursePublic, dependencies=[SuperuserRequired])
def update_course(course_id: uuid.UUID, course_in: CourseUpdate, session: SessionDep):
    course = crud.get_course_by_id(session, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return crud.update_course(session, course, course_in)

@router.delete("/{course_id}", response_model=Message, dependencies=[SuperuserRequired])
def delete_course(course_id: uuid.UUID, session: SessionDep):
    course = crud.get_course_by_id(session, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    session.delete(course)
    session.commit()
    return Message(message="Course deleted successfully")

# =========================================================
#  QUIZ Attempts
# =========================================================

@router.get("/{course_id}/attempts", response_model=List[QuizAttemptPublic], dependencies=[SuperuserRequired])
def get_course_attempts(course_id: uuid.UUID, session: SessionDep):
    """Retrieve all quiz attempts for a given course."""
    return crud.get_attempts_for_course(session, course_id)

@router.get("/{course_id}/users/{user_id}/attempts", response_model=List[QuizAttemptPublic], dependencies=[SuperuserRequired])
def get_user_course_attempts(course_id: uuid.UUID, user_id: uuid.UUID, session: SessionDep):
    """Retrieve all quiz attempts for a given user in a specific course."""
    return crud.get_attempts_for_user_in_course(session, course_id, user_id)

# =========================================================
#  COURSE ANALYTICS & PROGRESS
# =========================================================

@router.get("/{course_id}/analytics", response_model=CourseAnalytics, dependencies=[SuperuserRequired])
def get_course_analytics(course_id: uuid.UUID, session: SessionDep):
    return crud.get_course_analytics(session, course_id)

# TODO: fix this, make it work on last attempt, fix status, why its not updating?
@router.get("/{course_id}/progress", response_model=List[CourseUserProgress], dependencies=[SuperuserRequired])
def get_course_progress(course_id: uuid.UUID, session: SessionDep):
    users = crud.get_course_users(session, course_id)
    quiz = crud.get_quiz_by_course(session, course_id)
    if not quiz: return []
    users_progress = []
    for user in users:
        attempts = crud.get_attempts_for_user_in_course(session, course_id, user.id)
        attempt_count = len(attempts)
        score = max(a.score for a in attempts) if attempt_count > 0 else 0
        status = StatusEnum.PASSED if any(a.passed for a in attempts) else (StatusEnum.FAILED if attempt_count >= quiz.max_attempts else StatusEnum.IN_PROGRESS)
        users_progress.append(CourseUserProgress(user=user, status=status, attempt_count=attempt_count, score=score))
    return users_progress

# ================================
# FILE UPLOADS & MATERIALS
# ================================

@router.post("/{course_id}/materials/", response_model=list[str], dependencies=[SuperuserRequired])
def upload_course_materials(course_id: uuid.UUID, session: SessionDep, files: List[UploadFile] = File(...)):
    """Upload multiple files and attach them to a course."""
    course = crud.upload_course_materials(session, course_id, files)
    return course.materials

@router.get("/{course_id}/materials/", response_model=List[str])
def list_course_materials(course_id: uuid.UUID, session: SessionDep, current_user: CurrentUser):
    """List all materials for a course."""
    return crud.list_course_materials(session, course_id)
    
@router.get("/materials/{filename}")
def download_material(filename: str, current_user: CurrentUser):
    """Download or view a material."""
    file_path = settings.UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="application/pdf", filename=filename)

@router.delete("/{course_id}/materials/{filename}", response_model=Message, dependencies=[SuperuserRequired])
def delete_course_material(session: SessionDep, course_id: uuid.UUID, filename: str) -> Any:
    return crud.delete_course_material(session, course_id, filename)

@router.delete("/{course_id}/materials/", response_model=Message, dependencies=[SuperuserRequired])
def delete_all_course_materials(session: SessionDep, course_id: uuid.UUID) -> Any:
    return crud.delete_all_course_materials(session, course_id)
