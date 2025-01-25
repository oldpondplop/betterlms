import json
import uuid
from datetime import datetime, date
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, EmailStr, validator
from sqlmodel import Field, Relationship, SQLModel, Column
from sqlalchemy import JSON

# User Roles Enum
class Role(str, Enum):
    ADMIN = "admin"
    EMPLOYEE = "employee"
    INFIRMIERA = "infirmiera"
    OFICIANTA = "oficianta"
    BRANCARDIER = "brancardier"
    ASISTENT_MEDICAL = "asistent medical"
    FEMEIE_DE_SERVICIU = "femeie de serviciu"
    MASAJ = "masaj"
    KINETOTERAPIE = "kinetoterapie"
    RECEPTIE = "receptie"
    CONTABILITATE = "contabilitate"
    INFORMATICA = "informatica"
    RESURSE_UMANE = "resurse umane"
    EPIDEMIOLOG = "epidemiolog"
    MANAGEMENTUL_CALITATII = "managementul calitatii"
    FARMACIST = "farmacist"
    BIROU_INTERNARI_EXTERNARI = "birou internari/externari"

# ✅ User Model
class UserBase(SQLModel):
    user_id: str = Field(unique=True, index=True, max_length=50)
    name: str = Field(max_length=255)
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    role: Role = Field(default=Role.EMPLOYEE)
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)

class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=40)

class UserRegister(BaseModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    name: Optional[str] = Field(default=None, max_length=255)

class UserUpdate(UserBase):
    pass

class UserUpdateMe(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    email: Optional[EmailStr] = Field(default=None, max_length=255)

class UpdatePassword(BaseModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)

class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    assigned_courses: List["CourseAssignment"] = Relationship(back_populates="user")
    quiz_attempts: List["QuizAttempt"] = Relationship(back_populates="user")

# ✅ User Public Response
class UserPublic(UserBase):
    id: uuid.UUID

class UsersPublic(BaseModel):
    data: List[UserPublic]
    count: int

# ✅ Course Model
class CourseBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=500)
    materials: Optional[List[str]] = Field(default=[], sa_column=Column(JSON))
    assign_to_roles: Optional[List[str]] = Field(default=[], sa_column=Column(JSON))  # ✅ Store as a list of strings
    is_active: bool = Field(default=True)
    is_due: bool = Field(default=False)
    due_date: Optional[date] = None
    start_date: Optional[date] = None

    # ✅ Convert list of Enums to list of strings
    @validator("assign_to_roles", pre=True)
    def parse_assign_to_roles(cls, value):
        if isinstance(value, str):
            return json.loads(value)
        return value

class CourseCreate(CourseBase):
    assign_to_user_id: Optional[uuid.UUID] = None  # ✅ Optional Auto-Assign to a specific user

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    is_due: Optional[bool] = None
    due_date: Optional[date] = None
    start_date: Optional[date] = None
    assign_to_roles: Optional[List[str]] = Field(default=[], sa_column=Column(JSON))  # ✅ Allow updating roles

class Course(CourseBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    assigned_courses: List["CourseAssignment"] = Relationship(back_populates="course")  # ✅ Corrected Reference
    quiz: Optional["Quiz"] = Relationship(back_populates="course")

class CoursePublic(CourseBase):
    id: uuid.UUID
    assign_to_roles: List[str]  # ✅ Ensure response returns a proper list

# ✅ Course Assignment Model
class CourseAssignment(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    course_id: uuid.UUID = Field(foreign_key="course.id")
    user_id: uuid.UUID = Field(foreign_key="user.id")
    course: Course = Relationship(back_populates="assigned_courses")  # ✅ Fixed name match
    user: User = Relationship(back_populates="assigned_courses")  # ✅ Corrected Reference

# ✅ Quiz Model (Assigned to a Course)
class QuizBase(SQLModel):
    max_attempts: int = Field(default=3)
    passing_threshold: int = Field(default=70)

class QuizCreate(QuizBase):
    course_id: uuid.UUID  # ✅ Required field for creating a quiz
    questions: List[dict] = Field(default=[], sa_column=Column(JSON))  # ✅ Store questions as JSON

class Quiz(QuizBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", unique=True)  # ✅ Ensure 1 Quiz per Course
    questions: List[dict] = Field(default=[], sa_column=Column(JSON))  # ✅ Store questions as JSON
    course: Course = Relationship(back_populates="quiz")
    attempts: List["QuizAttempt"] = Relationship(back_populates="quiz")

# ✅ Quiz Attempt Model (User Attempts Quiz)
class QuizAttempt(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    quiz_id: uuid.UUID = Field(foreign_key="quiz.id")
    user_id: uuid.UUID = Field(foreign_key="user.id")
    score: int
    attempt_number: int
    passed: bool = Field(default=False)
    quiz: Quiz = Relationship(back_populates="attempts")
    user: User = Relationship(back_populates="quiz_attempts")

# ✅ Quiz Public Model (Includes Questions & Attempts)
class QuizPublic(QuizBase):
    id: uuid.UUID
    course_id: uuid.UUID
    questions: List[dict]
    attempts: List["QuizAttempt"]

# ✅ Notifications Model
class Notification(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    message: str = Field(max_length=500)
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    user: User = Relationship()

# ✅ Token Model
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# ✅ Token Payload
class TokenPayload(BaseModel):
    sub: Optional[str] = None

# ✅ New Password Reset Model
class NewPassword(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=40)

# ✅ Generic Message Response
class Message(BaseModel):
    message: str