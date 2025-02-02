import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from typing import Annotated, Any, List
from app.api.deps import SessionDep, get_current_active_superuser
from app import crud
from app.models import (
    User,
    UserPublic,
    Course,
    CoursePublic,
    Role,
    RolePublic,
    RoleCreate,
    RoleUpdate,
    CourseRoleLink,
    Message
)

router = APIRouter(prefix="/roles", tags=["roles"], dependencies=[Depends(get_current_active_superuser)])

def get_role_or_404(role_id: uuid.UUID, session: SessionDep) -> Role:
    if not (role := session.get(Role, role_id)):
        raise HTTPException(status_code=404, detail="Role not found.")
    return role

RoleDep = Annotated[Role, Depends(get_role_or_404)]

@router.get("/", response_model=List[RolePublic])
def get_roles(session: SessionDep) -> Any:
    return session.exec(select(Role)).all()

@router.get("/{role_id}", response_model=RolePublic)
def get_role(role: RoleDep) -> Any:
    return role

@router.post("/", response_model=RolePublic)
def create_role(role_in: RoleCreate, session: SessionDep) -> Any:
    return crud.create_role(session, role_in)

@router.patch("/{role_id}", response_model=RolePublic)
def update_role(role: RoleDep, role_in: RoleUpdate, session: SessionDep) -> Any:
   return crud.update_role(session, role, role_in)

@router.delete("/{role_id}")
def delete_role(role: RoleDep, session: SessionDep) -> Message:
    session.delete(role)
    session.commit()
    return Message(message="Role deleted successfully")

@router.get("/{role_id}/users", response_model=list[UserPublic])
def get_users_by_role(role: RoleDep, session: SessionDep) -> Any:
    return session.exec(select(User).where(User.role_id == role.id)).all()

@router.get("/{role_id}/courses", response_model=list[CoursePublic])
def get_courses_by_role(role: RoleDep, session: SessionDep) -> Any:
    return session.exec(select(Course).join(CourseRoleLink).where(CourseRoleLink.role_id == role.id)).all()
