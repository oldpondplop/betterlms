import uuid
from datetime import datetime, date, timezone
from typing import List, Optional
from enum import Enum
from pydantic import EmailStr
from sqlalchemy import ForeignKey
from sqlmodel import Field, Relationship, SQLModel, Column, JSON, func
from sqlalchemy.ext.mutable import MutableList


# =========================================================
#  Enums
# =========================================================

class CourseStatusEnum(str, Enum):
    ASSIGNED = "assigned"
    COMPLETED = "completed"
    FAILED = "failed"


# ================================
# LINK TABLES
# ================================

class CourseRoleLink(SQLModel, table=True):
    """Junction table linking Courses and Roles (many-to-many)."""
    course_id: uuid.UUID = Field(foreign_key="course.id", primary_key=True)
    role_id: uuid.UUID = Field(foreign_key="role.id", primary_key=True)


class CourseUserLink(SQLModel, table=True):
    """Junction table linking Courses and Users (many-to-many)."""
    course_id: uuid.UUID = Field(foreign_key="course.id", primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True)

    status: CourseStatusEnum = Field(default=CourseStatusEnum.ASSIGNED)
    quiz_score: Optional[int] = None
    attempt_count: int = Field(default=0)


# ================================
# ROLE MODELS
# ================================

class RoleBase(SQLModel):
    name: str = Field(unique=True, index=True, max_length=255)
    description: Optional[str] = None

class RoleCreate(RoleBase):
    pass

class RolePublic(RoleBase):
    id: uuid.UUID

class RolesPublic(SQLModel):
    data: List[RolePublic]
    count: int

class RoleUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None

class Role(RoleBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    
    # A single Role can have many Users
    users: List["User"] = Relationship(back_populates="role")
    # Many-to-many with Courses
    courses: List["Course"] = Relationship(
        back_populates="roles",
        link_model=CourseRoleLink
    )


# ================================
# USER MODELS
# ================================

class UserBase(SQLModel):
    name: str
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    # NOTE: maybe this should be uniqe?
    user_id: Optional[str] = Field(default=None, max_length=30, description="Employee id")

class UserCreate(UserBase):
    password: str
    role_id: uuid.UUID | None

class UserPublic(UserBase):
    id: uuid.UUID
    role_id: uuid.UUID | None = None

class UsersPublic(SQLModel):
    data: List[UserPublic]
    count: int

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
    
    # Single role per user
    role_id: Optional[uuid.UUID] = Field(foreign_key="role.id", nullable=True)
    role: Optional[Role] = Relationship(back_populates="users")

    # Many-to-many with Courses (through CourseUserLink)
    courses: List["Course"] = Relationship(back_populates="users", link_model=CourseUserLink)
    # One-to-many with QuizAttempt
    quiz_attempts: List["QuizAttempt"] = Relationship(back_populates="user")

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime | None = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={
            "onupdate": lambda: datetime.now(timezone.utc),
        },
    )

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
    pass

class CoursePublic(CourseBase):
    id: uuid.UUID
    quiz: Optional['QuizPublic'] = None  # Add quiz property

class CoursesPublic(SQLModel):
    data: List[CoursePublic]
    count: int

class CourseUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    materials: Optional[List[str]] = None
    is_active: Optional[bool] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class CourseAttachQuiz(SQLModel):
    quiz_id: uuid.UUID

class CourseDetailed(CoursePublic):
    roles: List[RolePublic] = []
    users: List[UserPublic] = []
    quiz: Optional['QuizPublic'] = None
    materials: list[str] = []

class Course(CourseBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    materials: list[str] = Field(default_factory=list, sa_column=Column(MutableList.as_mutable(JSON())))
    # Many-to-many with Roles
    roles: List[Role] = Relationship(back_populates="courses", link_model=CourseRoleLink)
    # Many-to-many with Users
    users: List[User] = Relationship(back_populates="courses", link_model=CourseUserLink)
    # One-to-many with Quiz (assuming multiple quizzes per course)
    quiz: Optional["Quiz"] = Relationship(
        back_populates="course",
        sa_relationship_kwargs={"passive_deletes": True}
    )

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime | None = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={
            "onupdate": lambda: datetime.now(timezone.utc),
        },
    )
class CourseMaterialUpdate(SQLModel):
    remove_files: List[str] = []
    new_files: List[str] = []

class CourseMaterialPublic(SQLModel):
    course_id: uuid.UUID
    materials: List[str]
# ================================
# QUIZ MODELS
# ================================
class QuizQuestion(SQLModel):
    question: str
    choices: List[str]
    correct_index: int

class QuizBase(SQLModel):
    max_attempts: int = Field(default=3)
    passing_threshold: int = Field(default=70)
    questions: List[dict] = Field(default_factory=list, sa_column=Column(JSON))


class QuizCreate(QuizBase):
    course_id: uuid.UUID

class QuizPublic(QuizBase):
    id: uuid.UUID
    course_id: uuid.UUID

class QuizzesPublic(SQLModel):
    data: List[QuizPublic]
    count: int

class QuizUpdate(SQLModel):
    max_attempts: Optional[int] = None
    passing_threshold: Optional[int] = None
    questions: Optional[List[QuizQuestion]] = None
    course_id: Optional[uuid.UUID] = None
    
class Quiz(QuizBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    
    # Relationship back to the Course model
    course_id: uuid.UUID = Field(
        sa_column=Column(
            ForeignKey("course.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        )
    )
    course: Course = Relationship(back_populates="quiz")
    # Relationship to track user attempts
    attempts: List["QuizAttempt"] = Relationship(back_populates="quiz")

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

class QuizAttemptsPublic(SQLModel):
    data: List[QuizAttemptPublic]
    count: int

class QuizAttemptUpdate(SQLModel):
    score: Optional[int] = None
    attempt_number: Optional[int] = None
    passed: Optional[bool] = None

class QuizAttempt(QuizAttemptBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    quiz_id: uuid.UUID = Field(foreign_key="quiz.id")
    quiz: Quiz = Relationship(back_populates="attempts")

    user_id: uuid.UUID = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="quiz_attempts")

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime | None = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={
            "onupdate": lambda: datetime.now(timezone.utc),
        },
    )


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
