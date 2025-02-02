import uuid
from datetime import date
from typing import Optional
from enum import Enum
from pydantic import EmailStr, BaseModel
from sqlalchemy import ForeignKey
from sqlmodel import Field, Relationship, SQLModel, Column
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy.types import JSON

# =========================================================
#  Enums
# =========================================================

class StatusEnum(str, Enum):
    ASSIGNED = "assigned"
    COMPLETED = "completed"
    FAILED = "failed"
    PASSED = "passed"
    IN_PROGRESS = "in_progress"

# ================================
# LINK TABLES
# ================================

class CourseRoleLink(SQLModel, table=True):
    course_id: uuid.UUID = Field(sa_column=Column(ForeignKey("course.id", ondelete="CASCADE"), primary_key=True))
    role_id: uuid.UUID = Field(sa_column=Column(ForeignKey("role.id", ondelete="CASCADE"), primary_key=True))

class CourseUserLink(SQLModel, table=True):
    course_id: uuid.UUID = Field(sa_column=Column(ForeignKey("course.id", ondelete="CASCADE"), primary_key=True))
    user_id: uuid.UUID = Field(sa_column=Column(ForeignKey("user.id", ondelete="CASCADE"), primary_key=True))
    status: StatusEnum = Field(default=StatusEnum.ASSIGNED)
    attempt_count: int = Field(default=0, description="Number of quiz attempts made by the user")
    score: Optional[int] = Field(default=None, description="Highest quiz score achieved")

# ================================
# ROLE MODELS
# ================================

class RoleBase(SQLModel):
    name: str = Field(unique=True, index=True, max_length=255)

class RoleCreate(RoleBase):
    pass

class RolePublic(RoleBase):
    id: uuid.UUID

class RoleUpdate(SQLModel):
    name: Optional[str] = None

class Role(RoleBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    users: list["User"] = Relationship(back_populates="role")
    courses: list["Course"] = Relationship(back_populates="roles", link_model=CourseRoleLink)

# ================================
# USER MODELS
# ================================

class UserBase(SQLModel):
    name: str
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    user_id: Optional[str] = Field(default=None, max_length=30, description="Employee id")

class UserCreate(UserBase):
    password: str
    role_id: Optional[uuid.UUID]

class UserPublic(UserBase):
    id: uuid.UUID
    role_id: Optional[uuid.UUID]

class UserUpdate(SQLModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    user_id: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    role_id: Optional[uuid.UUID] = None

class UserUpdateMe(SQLModel):
    name: Optional[str]  = None
    email: Optional[EmailStr] = None

class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)

class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    role_id: Optional[uuid.UUID] = Field(default=None, foreign_key="role.id", ondelete="SET NULL")
    role: Optional[Role] = Relationship(back_populates="users")
    courses: list["Course"] = Relationship(back_populates="users", link_model=CourseUserLink) 
    quiz_attempts: list["QuizAttempt"] = Relationship(back_populates="user")

# ================================
# COURSE MODELS
# ================================

class CourseBase(SQLModel):
    title: str = Field(max_length=255)
    description: Optional[str] = Field(default=None, max_length=500)
    is_active: bool = Field(default=True)
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class CourseCreate(CourseBase):
    users: Optional[list[uuid.UUID]] = []
    roles: Optional[list[uuid.UUID]] = []
    quiz: Optional[dict] = None

class CoursePublicMe(CourseBase):
    id: uuid.UUID

class CoursePublic(CourseBase):
    id: uuid.UUID
    users: list[UserPublic]
    roles: list[RolePublic]
    quiz: Optional["QuizPublic"]

class CourseMaterialUpdate(SQLModel):
    remove_files: list[str] = []
    new_files: list[str] = []

class CourseMaterialPublic(SQLModel):
    course_id: uuid.UUID
    materials: list[str]

class CourseUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    users: Optional[list[uuid.UUID]] = None
    roles: Optional[list[uuid.UUID]] = None
    quiz: Optional[dict] = None

class CourseUserProgress(SQLModel):
    user: UserPublic
    status: StatusEnum
    attempt_count: int
    score: Optional[int]

class CourseAnalytics(SQLModel):
    total_users: int
    completed_users: int
    failed_users: int
    average_attempts: float
    average_score: Optional[float]

class Course(CourseBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    materials: list[str] = Field(default_factory=list, sa_column=Column(MutableList.as_mutable(JSON())))
    roles: list[Role] = Relationship(back_populates="courses", link_model=CourseRoleLink)
    users: list[User] = Relationship(back_populates="courses", link_model=CourseUserLink)
    quiz: Optional["Quiz"] = Relationship(back_populates="course")

# ================================
# QUIZ MODELS
# ================================

class QuizBase(SQLModel):
    max_attempts: int = Field(default=3)
    passing_threshold: int = Field(default=70)
    questions: list[dict] = Field(default_factory=list, sa_column=Column(JSON))

class QuizCreate(QuizBase):
    pass
    # course_id: Optional[uuid.UUID]

class QuizPublic(QuizBase):
    id: uuid.UUID
    # course_id: Optional[uuid.UUID]

class QuizUpdate(SQLModel):
    max_attempts: Optional[int] = None
    passing_threshold: Optional[int] = None
    questions: Optional[list[dict]] = None

class Quiz(QuizBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    course_id: Optional[uuid.UUID] = Field(default=None, foreign_key="course.id", nullable=True)
    course: Optional[Course] = Relationship(back_populates="quiz")
    attempts: list["QuizAttempt"] = Relationship(back_populates="quiz")

# ================================
# QUIZ ATTEMPT MODELS
# ================================

class QuizAttemptBase(SQLModel):
    score: int
    attempt_number: int
    passed: bool = Field(default=False)

class QuizAttemptCreate(QuizAttemptBase):
    quiz_id: uuid.UUID
    user_id: uuid.UUID

class QuizAttemptPublic(QuizAttemptBase):
    id: uuid.UUID
    quiz_id: uuid.UUID
    user_id: uuid.UUID

class QuizAttemptUpdate(SQLModel):
    score: Optional[int] = None
    attempt_number: Optional[int] = None
    passed: Optional[bool] = None

class QuizAttempt(QuizAttemptBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    quiz_id: uuid.UUID = Field(foreign_key="quiz.id", ondelete="CASCADE")
    user_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    quiz: Quiz = Relationship(back_populates="attempts")
    user: User = Relationship(back_populates="quiz_attempts")

# =========================================================
#  Auth & Token Models
# =========================================================

class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(SQLModel):
    sub: str | None = None

class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=40)

# =========================================================
#  Generic Response Messages
# =========================================================

class Message(SQLModel):
    message: str
