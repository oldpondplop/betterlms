"""
=========================================================
    This module defines the database models and Pydantic schemas
    for a simple LMS (Learning Management System) with:
    
      - Users (Employees & Admins)
      - Courses
      - Course Assignments (which user is assigned which course)
      - Quizzes (one quiz per course)
      - Quiz Attempts (individual user quiz submissions)
      - Notifications
      - Token / Auth Handling
      
=========================================================
"""

import uuid
from datetime import datetime, date
from enum import Enum
from typing import Annotated, Optional, List, Dict

from pydantic import BaseModel, EmailStr, model_validator
from sqlalchemy import JSON
from sqlmodel import (
    SQLModel,
    Field,
    Relationship,
    Column
)


# =========================================================
#  Enums & Constants
# =========================================================

class Role(str, Enum):
    """
    Enum representing possible user roles.
    You can extend or modify as needed.
    """
    ADMIN = "admin"
    DEFAULT = "employee"
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


# =========================================================
#  User Models
# =========================================================

class UserBase(SQLModel):
    """Shared properties for users."""
    user_id: str = Field(unique=True, index=True, max_length=50)
    name: str = Field(max_length=255)
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    role: Role = Field(default=Role.DEFAULT)
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)

class UserPublic(UserBase):
    """
    Properties returned via API when retrieving user info
    (e.g., to the admin or for public endpoints).
    """
    id: uuid.UUID

class UsersPublic(SQLModel):
    """
    Helper model for returning multiple users at once 
    along with a 'count'.
    """
    data: List[UserPublic]
    count: int

class UserUpdate(UserBase):
    """Properties to receive via API on update."""
    pass

class UserCreate(UserBase):
    """Properties used when creating a new user through the API."""
    password: str = Field(min_length=8, max_length=40)

# TODO: Probably not needed
class UserRegister(SQLModel):
    """Properties used for self-registration or public sign-up."""
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    name: str | None = Field(default=None, max_length=255)

class UserUpdateMe(SQLModel):
    """Allows the logged-in user to update their own profile."""
    name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)

class UpdatePassword(SQLModel):
    """Model for changing passwords."""
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)

class User(UserBase, table=True):
    """Actual database table representing a user (extends UserBase)."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str

    # Relationships
    assigned_courses: List["CourseAssignment"] = Relationship(back_populates="user")
    quiz_attempts: List["QuizAttempt"] = Relationship(back_populates="user")


# =========================================================
#  Course Models
# =========================================================

class CourseBase(SQLModel):
    """Shared properties for courses."""
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=500)
    materials: Optional[List[str]] = Field(
        default=[], 
        sa_column=Column(JSON), 
        description="List of file paths/URLs (PDF or other) associated with this course."
    )
    associated_role: Role = Field(description="Roles to assign course to")
    is_active: bool = Field(default=False, description="Flag to indicate curse is ongoin")
    end_date: Optional[date] = Field(default=None, description="Date when course expires")
    start_date: Optional[date] = Field(default=None, description="Date when course starts")
    
    @model_validator(mode="after")
    def validate_dates_if_active(self):
        """Ensure start_date and end_date are required if is_active is True."""
        if self.is_active:
            if self.start_date is None or self.end_date is None:
                raise ValueError("Both start_date and end_date are required when is_active is True.")
            if self.start_date >= self.end_date:
                raise ValueError("start_date must be before end_date.")
        return self

class CourseCreate(CourseBase):
    """Properties used when creating a new course."""
    pass

# NOTE: update this
class CreateCourseWithQuiz(CourseBase):
    """A combined schema that includes the fields to create a Course and optionally a Quiz in the same request."""
    # --- Quiz Fields ---
    create_quiz: bool = Field(
        default=False,
        description="Whether to create a quiz for this course."
    )
    max_attempts: Optional[int] = Field(
        default=3,
        description="Max quiz attempts (only used if create_quiz=True)."
    )
    passing_threshold: Optional[int] = Field(
        default=70,
        description="Passing score threshold (0-100). Used if create_quiz=True."
    )
    questions: Optional[List[Dict]] = Field(
        default=None,
        description="A list of question dicts. Used if create_quiz=True."
    )

class CourseUpdate(SQLModel):
    """Properties used when updating an existing course."""
    title: str | None = None
    description: str | None = None
    associated_role: str | None = None
    is_active: bool | None = None
    is_due: bool | None = None
    due_date: date | None = None
    start_date: date | None = None

class Course(CourseBase, table=True):
    """Actual database table representing a course."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    # One-to-one with Quiz
    quiz: Optional["Quiz"] = Relationship(back_populates="course")
    # Many-to-many bridging (CourseAssignment)
    assigned_users: List["CourseAssignment"] = Relationship(back_populates="course")

class CoursePublic(CourseBase):
    """Properties returned via API for a course (read-only)."""
    id: uuid.UUID


# =========================================================
#  Course Assignment Model (Many-to-Many bridge)
# =========================================================

class CourseAssignment(SQLModel, table=True):
    """
    Many-to-Many bridging table between Users and Courses.
    
    Tracks which user is assigned which course.
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    course_id: uuid.UUID = Field(foreign_key="course.id")
    user_id: uuid.UUID = Field(foreign_key="user.id")
    
    assigned_at: datetime = Field(default_factory=datetime.utcnow)  
    status: str = Field(
        default="assigned",
        max_length=50,
        description="assigned | in_progress | completed | failed | max_attempts_exceeded"
    )

    # Relationships
    course: Course = Relationship(back_populates="assigned_users")
    user: User = Relationship(back_populates="assigned_courses")


# =========================================================
#  Quiz Models
# =========================================================

class QuizBase(SQLModel):
    """
    Shared fields for a Quiz:
     - max_attempts 
     - passing_threshold
     - questions (stored as JSON in DB)
    """
    max_attempts: int = Field(default=3)
    passing_threshold: int = Field(default=70)
    questions: List['QuizQuestion'] = Field(
        sa_column=Column(JSON),
        description="List of QuizQuestion objects, stored as JSON."
    )

class QuizQuestion(SQLModel):
    """
    Pydantic model representing a single multiple-choice question.
    'choices' is a list of possible answers, and 'correct_index' 
    is the index of the correct choice in that list.
    """
    question: str
    choices: List[str]
    correct_index: int

class QuizCreate(QuizBase):
    """
    Request model for creating a new Quiz.
    Requires 'course_id' to link the quiz to a course.
    """
    course_id: uuid.UUID

class QuizUpdate(SQLModel):
    """
    Request model for updating an existing quiz.
    All fields are optional to allow partial updates.
    """
    course_id: Optional[uuid.UUID] = None
    max_attempts: Optional[int] = None
    passing_threshold: Optional[int] = None
    questions: Optional[List[QuizQuestion]] = None

class QuizPublic(QuizBase):
    """
    Response model for reading a Quiz.
    Inherits QuizBase fields plus 'id' and 'course_id'.
    """
    id: uuid.UUID
    course_id: uuid.UUID

class Quiz(QuizBase, table=True):
    """
    Actual database table for a quiz.
    Each course can have one quiz (course_id unique).
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", unique=True, index=True)

    # Relationship back to the Course model
    course: Course = Relationship(back_populates="quiz")
    # Relationship to track user attempts
    attempts: List["QuizAttempt"] = Relationship(back_populates="quiz")


# =========================================================
#  Quiz Attempt Model
# =========================================================

class QuizAttempt(SQLModel, table=True):
    """Tracks each attempt at a quiz by a specific user."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    quiz_id: uuid.UUID = Field(foreign_key="quiz.id")
    user_id: uuid.UUID = Field(foreign_key="user.id")
    
    score: int
    attempt_number: int
    passed: bool = Field(default=False)

    # Relationships
    quiz: Quiz = Relationship(back_populates="attempts")
    user: User = Relationship(back_populates="quiz_attempts")


# =========================================================
#  Notification Model
# =========================================================

class Notification(SQLModel, table=True):
    """Table for storing system notifications sent to users."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    
    message: str = Field(max_length=500)
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationship to the user
    user: User = Relationship()


# =========================================================
#  Auth & Token Models
# =========================================================

class Token(SQLModel):
    """Returned by the auth system on successful login."""
    access_token: str
    token_type: str = "bearer"


class TokenPayload(SQLModel):
    """Extracted from JWT tokens to identify the user (sub)."""
    sub: str | None = None


class NewPassword(SQLModel):
    """Used for password resets with a token-based workflow."""
    token: str
    new_password: str = Field(min_length=8, max_length=40)


# =========================================================
#  Generic Response Messages
# =========================================================

class Message(SQLModel):
    """A generic message model for simple string responses."""
    message: str
