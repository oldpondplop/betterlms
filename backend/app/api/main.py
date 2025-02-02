from fastapi import APIRouter

from app.api.routes import login, private, utils, users, roles, courses 
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(roles.router)
api_router.include_router(courses.router)
# api_router.include_router(quizzes.router)


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
