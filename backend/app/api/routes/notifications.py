# backend/app/api/routes.py
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlmodel import Session
from app import crud
from app.models import Notification, NotificationCreate, NotificationPublic
from app.api.deps import SessionDep, CurrentUser

router = APIRouter(prefix="", tags=["notifications"])

@router.post("/", response_model=NotificationPublic)
def create_notification_endpoint(
    notification: NotificationCreate,
    db: SessionDep,
    current_user: CurrentUser,
):
    return crud.create_notification(db, notification)

@router.get("/", response_model=List[NotificationPublic])
def get_notifications_endpoint(
    db: SessionDep,
    current_user: CurrentUser,
):
    return crud.get_notifications(db, current_user.id)

@router.put("/{notification_id}/read", response_model=NotificationPublic)
def mark_notification_as_read_endpoint(
    notification_id: int,
    db: SessionDep,
    current_user: CurrentUser,
):
    return crud.mark_notification_as_read(db, notification_id)