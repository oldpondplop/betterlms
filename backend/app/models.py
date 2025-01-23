import uuid
from datetime import datetime, date
from pydantic import EmailStr
from sqlmodel import Field, Relationship, SQLModel, Column
from sqlalchemy import JSON
from typing import Optional
# User Roles Enum
from enum import Enum

class Role(str, Enum):
    ADMIN = "admin"
    EMPLOYEE = "employee"

# User Model
class UserBase(SQLModel):
    user_id: str = Field(unique=True, index=True, max_length=50)
    name: str = Field(max_length=255)
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    role: Role = Field(default=Role.EMPLOYEE)
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)

class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=40)

class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    name: str | None = Field(default=None, max_length=255)

class UserUpdate(UserBase):
    pass

class UserUpdateMe(SQLModel):
    name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)

class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)

class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    assigned_courses: list["CourseAssignment"] = Relationship(back_populates="user")
    quiz_attempts: list["QuizAttempt"] = Relationship(back_populates="user")

# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID

class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Course Model
class CourseBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=500)
    materials: Optional[list[str]] = Field(default=[], sa_column=Column(JSON))
    associated_role: Role
    is_active: bool = Field(default=True)
    is_due: bool = Field(default=False)
    due_date: Optional[date] = None
    start_date: Optional[date] = None

class CourseCreate(CourseBase):
    pass

class CourseUpdate(SQLModel):
    title: str | None = None
    description: str | None = None
    is_active: bool | None = None
    is_due: bool | None = None
    due_date: date | None = None
    start_date: date | None = None

class Course(CourseBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    assigned_users: list["CourseAssignment"] = Relationship(back_populates="course")
    # quiz: "Quiz" | None = Relationship(back_populates="course")
    quiz: Optional["Quiz"] = Relationship(back_populates="course")

class CoursePublic(CourseBase):
    id: uuid.UUID

# Course Assignment Model
class CourseAssignment(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    course_id: uuid.UUID = Field(foreign_key="course.id")
    user_id: uuid.UUID = Field(foreign_key="user.id")
    course: Course = Relationship(back_populates="assigned_users")
    user: User = Relationship(back_populates="assigned_courses")

# Quiz Model
class QuizBase(SQLModel):
    max_attempts: int = Field(default=3)
    passing_threshold: int = Field(default=70)

class QuizCreate(QuizBase):
    questions: list[dict]  # Stores 10 multiple-choice questions

class Quiz(QuizBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", unique=True)
    course: Course = Relationship(back_populates="quiz")
    attempts: list["QuizAttempt"] = Relationship(back_populates="quiz")

# Quiz Attempt Model
class QuizAttempt(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    quiz_id: uuid.UUID = Field(foreign_key="quiz.id")
    user_id: uuid.UUID = Field(foreign_key="user.id")
    score: int
    attempt_number: int
    passed: bool = Field(default=False)
    quiz: Quiz = Relationship(back_populates="attempts")
    user: User = Relationship(back_populates="quiz_attempts")

# Notifications
class Notification(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    message: str = Field(max_length=500)
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    user: User = Relationship()

# Token Model
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"

# Token Payload
class TokenPayload(SQLModel):
    sub: str | None = None

# New Password Reset Model
class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=40)

# Generic message
class Message(SQLModel):
    message: str

