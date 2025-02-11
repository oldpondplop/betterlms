from typing import Any
from fastapi import APIRouter
from uuid import UUID
from app.api.deps import SessionDep, CurrentUser, SuperuserRequired
from app.models import Notification, NotificationCreate, NotificationPublic
from app import crud

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.post("/", response_model=NotificationPublic, dependencies=[SuperuserRequired])
def create_notification(*, session: SessionDep, notification_in: NotificationCreate) -> Any:
    return crud.create_notification(session=session, notification_in=notification_in)

@router.get("/", response_model=list[NotificationPublic], dependencies=[SuperuserRequired])
def get_notifications(*, session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100) -> Any:
    return crud.get_notifications_for_user(session=session, user_id=current_user.id, skip=skip, limit=limit)

@router.patch("/{notification_id}/mark-as-read", response_model=NotificationPublic, dependencies=[SuperuserRequired])
def mark_notification_as_read(*, session: SessionDep, notification_id: UUID) -> Any:
    return crud.mark_notification_as_read(session=session, notification_id=notification_id)