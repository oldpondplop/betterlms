from typing import Any
from fastapi import APIRouter
from uuid import UUID
from app.api.deps import CurrentSuperUser, SessionDep, CurrentUser, SuperuserRequired
from app.models import Message, Notification, NotificationCreate, NotificationPublic
from app import crud

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.post("/", response_model=NotificationPublic, dependencies=[SuperuserRequired])
def create_notification(*, session: SessionDep, notification_in: NotificationCreate) -> Any:
    return crud.create_notification(session=session, notification_in=notification_in)

@router.get("/", response_model=list[NotificationPublic])
def get_notifications(*, session: SessionDep, admin_user: CurrentSuperUser) -> Any:
    return crud.get_notifications(session=session, user_id=admin_user.id)

@router.delete("/{notification_id}", response_model=NotificationPublic, dependencies=[SuperuserRequired])
def delete_notification(*, session: SessionDep, notification_id: UUID) -> Message:
    crud.delete_notification(session=session, notification_id=notification_id)
    return Message(message="Notification marked as read")