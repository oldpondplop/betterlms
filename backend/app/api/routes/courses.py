import shutil
from fastapi import APIRouter, File, HTTPException, UploadFile
from typing import Any
import uuid

from sqlmodel import func, select
from sqlalchemy.orm import joinedload

from app.api.deps import SessionDep, SuperuserRequired
from app.models import (
    CourseCreateFull,
    CourseDetailed,
    CoursePublic,
    CoursePublicFull,
    CourseUpdateFull,
    CoursesPublic,
    CourseCreate,
    CourseUpdate,
    Course,
    Message,
    QuizCreate,
    Role,
    RolesPublic,
    User,
    UserPublic,
    UsersPublic,
    CourseRoleLink,
    CourseUserLink
)
from app import crud
from app.core.config import settings
from app.api.deps import CurrentUser
from fastapi.responses import FileResponse

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("/me", response_model=CoursesPublic)
def get_my_courses(session: SessionDep, current_user: CurrentUser) -> CoursesPublic:
    user_courses_stmt = (select(Course).join(CourseUserLink).where(CourseUserLink.user_id == current_user.id)) # type: ignore
    user_courses = session.exec(user_courses_stmt).all()  # type: ignore
    role_courses_stmt = select(Course).where(Course.roles.any(Role.id == current_user.role_id))  # type: ignore
    role_courses = session.exec(role_courses_stmt).all()  # type: ignore
    all_courses = {course.id: course for course in list(user_courses) + list(role_courses)}.values()
    return CoursesPublic(data=list(all_courses), count=len(all_courses))

@router.get("/", response_model=CoursesPublic, dependencies=[SuperuserRequired])
def get_courses(session: SessionDep, skip: int = 0, limit: int = 100) -> CoursesPublic:
    total = crud.count_courses(session)
    data = crud.get_courses(session, skip=skip, limit=limit)
    return CoursesPublic(data=data, count=total)

@router.get("/{course_id}/full", response_model=CourseDetailed)
def get_course_full(course_id: uuid.UUID, session: SessionDep,) -> CourseDetailed:
    db_course = crud.get_course_by_id(session, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    statement = select(Course).options(
        joinedload(Course.users),
        joinedload(Course.roles),
        joinedload(Course.quiz)
    ).where(Course.id == course_id)
    
    db_course = session.exec(statement).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    return CourseDetailed(
        id=db_course.id,
        title=db_course.title,
        description=db_course.description,
        materials=db_course.materials,
        is_active=db_course.is_active,
        start_date=db_course.start_date,
        end_date=db_course.end_date,
        roles=db_course.roles,
        users=db_course.users,
        quiz=db_course.quiz
    )

@router.post("/", response_model=CoursePublic)
def create_full_course(course_in: CourseCreateFull, session: SessionDep) -> Any:
    # 1) Create the base course
    db_course = crud.create_course(session, course_in)

    # 2) Assign roles if any
    for role_id in course_in.roles:
        db_role = crud.get_role_by_id(session, role_id)
        if db_role and db_role not in db_course.roles:
            db_course.roles.append(db_role)

    # 3) Assign users if any
    for user_id in course_in.users:
        db_user = crud.get_user_by_id(session, user_id)
        if db_user and db_user not in db_course.users:
            db_course.users.append(db_user)

    # 4) Create quiz if provided
    if course_in.quiz:
        crud.create_quiz(session=session, quiz_in=course_in.quiz, course_id=db_course.id)

    session.add(db_course)
    session.commit()
    session.refresh(db_course)
    return db_course

@router.patch("/{course_id}/full", response_model=CoursePublicFull, dependencies=[SuperuserRequired])
def update_course_full(course_id: uuid.UUID, course_in: CourseUpdateFull, session: SessionDep) -> Any:
    db_course = crud.get_course_by_id(session, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    # 1) Update base fields (title, description, etc.)
    db_course = crud.update_course(session, db_course, course_in)

    # 2) Materials
    if course_in.materials is not None:
        # Merge new materials with existing ones, avoid duplicates
        existing_materials = set(db_course.materials or [])
        new_materials = set(course_in.materials)
        db_course.materials = list(existing_materials.union(new_materials))

    # 3) Roles - Only update if different from current roles
    if course_in.roles is not None:
        current_role_ids = {role.id for role in db_course.roles}
        new_role_ids = set(course_in.roles)
        
        # Add new roles
        roles_to_add = new_role_ids - current_role_ids
        for role_id in roles_to_add:
            db_role = crud.get_role_by_id(session, role_id)
            if db_role:
                db_course.roles.append(db_role)
        
        # Remove roles not in the new set
        roles_to_remove = current_role_ids - new_role_ids
        if roles_to_remove:
            db_course.roles = [role for role in db_course.roles 
                             if role.id not in roles_to_remove]

    # 4) Users - Only update if different from current users
    if course_in.users is not None:
        current_user_ids = {user.id for user in db_course.users}
        new_user_ids = set(course_in.users)
        
        # Add new users
        users_to_add = new_user_ids - current_user_ids
        for user_id in users_to_add:
            db_user = crud.get_user_by_id(session, user_id)
            if db_user:
                db_course.users.append(db_user)
        
        # Remove users not in the new set
        users_to_remove = current_user_ids - new_user_ids
        if users_to_remove:
            db_course.users = [user for user in db_course.users 
                             if user.id not in users_to_remove]

    # 5) Quiz
    if course_in.quiz:
        if db_course.quiz:
            crud.update_quiz(session, db_course.quiz, course_in.quiz)
        else:
            new_quiz = QuizCreate(course_id=db_course.id, **course_in.quiz.model_dump())
            crud.create_quiz(session, new_quiz)

    session.add(db_course)
    session.commit()
    session.refresh(db_course)
    return db_course

@router.get("/{course_id}", response_model=CoursePublic, dependencies=[SuperuserRequired])
def get_course(course_id: uuid.UUID, session: SessionDep) -> Any:
    if db_course := crud.get_course_by_id(session, course_id):
        return db_course
    raise HTTPException(status_code=404, detail="Course not found")

@router.patch("/{course_id}", response_model=CoursePublic, dependencies=[SuperuserRequired])
def update_course(course_id: uuid.UUID, course_in: CourseUpdate, session: SessionDep) -> Any:
    if db_course := crud.get_course_by_id(session, course_id):
        return crud.update_course(session, db_course, course_in)
    raise HTTPException(status_code=404, detail="Course not found")

@router.delete("/{course_id}", response_model=Message, dependencies=[SuperuserRequired])
def delete_course(course_id: uuid.UUID, session: SessionDep) -> Message:
    if db_course := session.get(Course, course_id):
        session.delete(db_course)
        session.commit()
        return Message(message="Course deleted successfully")
    raise HTTPException(status_code=404, detail="Course not found")


# =============================
# Additional Endpoints
# =============================

@router.get("/{course_id}/roles", response_model=RolesPublic, dependencies=[SuperuserRequired])
def get_course_roles(course_id: uuid.UUID, session: SessionDep, skip: int = 0, limit: int = 100) -> RolesPublic:
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    all_roles = db_course.roles
    count = len(all_roles)
    sliced = all_roles[skip: skip + limit]
    return RolesPublic(data=sliced, count=count)

@router.post("/{course_id}/roles/{role_id}", response_model=CoursePublic, dependencies=[SuperuserRequired])
def assign_role_to_course(course_id: uuid.UUID, role_id: uuid.UUID, session: SessionDep) -> Any:
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    db_role = session.get(Role, role_id)
    if not db_role:
        raise HTTPException(status_code=404, detail="Role not found")

    if db_role in db_course.roles:
        return db_course

    db_course.roles.append(db_role)
    session.add(db_course)
    session.commit()
    session.refresh(db_course)
    return db_course

@router.delete("/{course_id}/roles/{role_id}", response_model=Message, dependencies=[SuperuserRequired])
def unassign_role_from_course(course_id: uuid.UUID,role_id: uuid.UUID, session: SessionDep) -> Any:
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
    return 

@router.get("/{course_id}/users", response_model=UsersPublic, dependencies=[SuperuserRequired])
def get_users_for_course(course_id: uuid.UUID, session: SessionDep, skip: int = 0, limit: int = 100) -> UsersPublic:
    if not crud.get_course_by_id(session, course_id):
        raise HTTPException(status_code=404, detail="Course not found")
    
    users_stmt = select(User).join(CourseUserLink).where(CourseUserLink.course_id == course_id).offset(skip).limit(limit)  # type: ignore
    users = session.exec(users_stmt).scalars().all()  # type: ignore

    count_stmt = select(func.count()).select_from(CourseUserLink).where(CourseUserLink.course_id == course_id)  # type: ignore
    total_count = session.exec(count_stmt).scalar()  # type: ignore
    return UsersPublic(data=users, count=total_count)

@router.post("/{course_id}/users/{user_id}", response_model=CoursePublic, dependencies=[SuperuserRequired])
def assign_user_to_course(course_id: uuid.UUID, user_id: uuid.UUID, session: SessionDep) -> Any:
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if db_user in db_course.users:
        return db_course

    db_course.users.append(db_user)
    session.add(db_course)
    session.commit()
    session.refresh(db_course)
    return db_course

@router.delete("/{course_id}/users/{user_id}", response_model=Message, dependencies=[SuperuserRequired])
def unassign_user_from_course(course_id: uuid.UUID, user_id: uuid.UUID, session: SessionDep) -> Message:
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
    return Message(message="User unassigned successfully")

@router.post("/{course_id}/upload-material", response_model=CoursePublic, dependencies=[SuperuserRequired])
def upload_material(session: SessionDep, course_id: uuid.UUID,file: UploadFile = File(...)) -> Any:
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    file_path = settings.UPLOAD_DIR / f"{uuid.uuid4().hex}_{file.filename}"
    if file_path.name in db_course.materials:
        return db_course
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db_course = crud.add_course_material(session, db_course, file_path.name)
    return db_course

@router.get("/{course_id}/materials", response_model=list[str], dependencies=[SuperuserRequired])
def list_course_materials(session: SessionDep, course_id: uuid.UUID) -> list[str]:
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    return db_course.materials

@router.get("/materials/{filename}")
def get_material(filename: str) -> Any:
    file_path = settings.UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="application/octet-stream", filename=filename)

@router.delete("/{course_id}/materials/{filename}", response_model=Message, dependencies=[SuperuserRequired])
def delete_material(session: SessionDep, course_id: uuid.UUID, filename: str) -> Any:
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    if filename not in db_course.materials:
        raise HTTPException(status_code=404, detail="Material not found in this course")
    
    db_course = crud.remove_course_material(session, db_course, filename)
    file_path = settings.UPLOAD_DIR / filename
    if file_path.exists():
        file_path.unlink()
    return Message(message="Course material deleted sucessfuly.")