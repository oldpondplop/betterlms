import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlmodel import select
from typing import Annotated, Any
from app.api.deps import CurrentSuperUser, SessionDep, get_current_active_superuser
from app.models import (
    Course, CoursesPublic, Message, Role, RoleCreate, RolePublic, RoleUpdate, 
    RolesPublic, User, UsersPublic, CourseRoleLink
)

router = APIRouter(prefix="/roles", tags=["roles"], dependencies=[Depends(get_current_active_superuser)])

def get_role_or_404(role_id: uuid.UUID, session: SessionDep) -> Role:
    if not (role := session.get(Role, role_id)):
        raise HTTPException(status_code=404, detail="Role not found.")
    return role

RoleDep = Annotated[Role, Depends(get_role_or_404)]

@router.get("/", response_model=RolesPublic)
def get_roles(session: SessionDep) -> RolesPublic:
    return RolesPublic(
        data=session.exec(select(Role)).all(),
        count=session.exec(select(func.count()).select_from(Role)).one()
    )

@router.get("/{role_id}", response_model=RolePublic)
def get_role(role: RoleDep) -> Any:
    return role

@router.post("/", response_model=RolePublic)
def create_role(role_in: RoleCreate, session: SessionDep) -> Any:
    if session.exec(select(Role).where(Role.name == role_in.name)).first():
        raise HTTPException(status_code=400, detail="A role with this name already exists.")
    new_role = Role.model_validate(role_in)
    session.add(new_role)
    session.commit()
    session.refresh(new_role)
    return new_role

@router.patch("/{role_id}", response_model=RolePublic)
def update_role(role: RoleDep, role_in: RoleUpdate, session: SessionDep) -> Any:
    role.sqlmodel_update(role_in.model_dump(exclude_unset=True))
    session.commit()
    session.refresh(role)
    return role

@router.delete("/{role_id}")
def delete_role(role: RoleDep, session: SessionDep) -> Message:
    session.delete(role)
    session.commit()
    return Message(message="Role deleted successfully")

@router.get("/{role_id}/users", response_model=UsersPublic)
def get_users_by_role(role: RoleDep, session: SessionDep, skip: int = 0, limit: int = 100) -> UsersPublic:
    return UsersPublic(
        data=session.exec(select(User).where(User.role_id == role.id).offset(skip).limit(limit)).all(),
        count=session.exec(select(func.count()).where(User.role_id == role.id)).one()
    )

@router.get("/{role_id}/courses", response_model=CoursesPublic)
def get_courses_by_role(role: RoleDep, session: SessionDep, skip: int = 0, limit: int = 100) -> CoursesPublic:
    return CoursesPublic(
        data=session.exec(
            select(Course).join(CourseRoleLink).where(CourseRoleLink.role_id == role.id).offset(skip).limit(limit)
        ).all(),
        count=session.exec(select(func.count()).select_from(CourseRoleLink).where(CourseRoleLink.role_id == role.id)).one()
    )