from typing import Optional
import uuid
from datetime import datetime, date
from enum import Enum
from pydantic import EmailStr
from sqlmodel import (
    SQLModel,
    JSON,
    Field,
    Relationship,
    Column,
    Enum as SAEnum,
    Session,
    select,
    String
)

# =========================================================
#  Role Models
# =========================================================

class RoleEnum(str, Enum):
    """Enum representing possible user roles."""
    ADMIN = "admin"
    USER = "user"
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
    """Base properties for Users."""
    email: EmailStr
    user_id: str | None =  None 
    name: str | None = Field(default=None, max_length=255, description="Full Name")
    role_name: RoleEnum = Field(default=RoleEnum.USER, description="User role as an enum")
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)

class UserPublic(UserBase):
    """Properties returned via API when retrieving user info."""
    id: uuid.UUID

class UsersPublic(SQLModel):
    """Helper model for returning multiple users at once along with a 'count'."""
    data: list[UserPublic]
    count: int

class UserCreate(UserBase):
    """Properties used when creating a new user through the API."""
    password: str = Field(min_length=8, max_length=40)

# TODO: Probably not needed
class UserRegister(SQLModel):
    """Properties used for self-registration or public sign-up."""
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    name: str | None = Field(default=None, max_length=255)

class UserUpdate(SQLModel):
    """Schema for updating an existing user. All fields optional."""
    name: str | None = None
    email: EmailStr | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None
    role_name: RoleEnum | None = None 

class UserUpdateMe(SQLModel):
    """Allows the logged-in user to update their own profile."""
    name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)

class UpdatePassword(SQLModel):
    """Model for changing passwords."""
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)

class User(UserBase, table=True):
    """Database model for Users."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(sa_column=Column(String, unique=True, index=True, nullable=False))
    user_id: str | None = Field(default=None, unique=True, index=True, description="Employee id")
    hashed_password: str
    assignments: list["CourseAssignment"] = Relationship(back_populates="user")
    quiz_attempts: list["QuizAttempt"] = Relationship(back_populates="user")

# =========================================================
#  Course Models
# =========================================================

class CourseBase(SQLModel):
    """Base properties for a course"""
    title: str = Field(..., max_length=255)
    description: str | None = Field(default=None, max_length=500)
    materials: list[str] = Field(default=[], sa_column=Column(JSON))
    is_active: bool = Field(default=True)
    start_date: date | None = None
    end_date: date | None = None

class Course(CourseBase, table=True):
    """Database model for Course"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
   
    quiz: Optional['Quiz'] = Relationship(back_populates="course")    
    assignments: list["CourseAssignment"] = Relationship(back_populates="course")
    
class CourseCreate(SQLModel):
    """Schema for creating a course with optional assignments and quiz creation."""
    title: str = Field(..., max_length=255)
    description: str | None = Field(default=None, max_length=500)
    materials: list[str] = Field(default=[], sa_column=Column(JSON))
    is_active: bool = Field(default=True)
    start_date: date | None = None
    end_date: date | None = None

    # Optional assignments
    assigned_users: list[uuid.UUID] = []
    assigned_roles: list[RoleEnum] = []

    # Optional quiz creation
    create_quiz: bool = False


class CourseAssign(SQLModel):
    """Schema for assigning users and roles to a course."""
    assigned_user_emails: list[EmailStr] = []
    assigned_role_names: list[RoleEnum] = []

class AttachQuizToCourse(SQLModel):
    """Schema for attaching an existing quiz to a course."""
    quiz_id: uuid.UUID

class CourseUpdate(SQLModel):
    """Schema for updating a course"""
    title: Optional[str] = None
    description: Optional[str] = None
    materials: Optional[list[str]] = None
    is_active: Optional[bool] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    assigned_users: Optional[list[uuid.UUID]] = None
    assigned_roles: Optional[list[RoleEnum]] = None
    
class CoursePublic(CourseBase):
    """Public response model including assigned users and roles"""
    id: uuid.UUID
    assigned_users: list[str] | None = None  # Changed to list[str]
    assigned_roles: list[RoleEnum] | None = None


class CoursesPublic(SQLModel):
    """ Helper model for returning multiple courses at once along with a `count`."""
    data: list[CoursePublic]
    count: int

# =========================================================
#  Course Assignment Model (Many-to-Many bridge)
# =========================================================

class CourseAssignment(SQLModel, table=True):
    """Many-to-Many bridging table between Users/Roles and Courses."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    course_id: uuid.UUID = Field(foreign_key="course.id")
    user_id: uuid.UUID = Field(default=None, foreign_key="user.id")    
    role_name: RoleEnum = Field(
        sa_column=Column(SAEnum(RoleEnum), index=True), 
        description="Enum representing possible user roles"
    )

    assigned_at: datetime = Field(default_factory=datetime.utcnow)

    course: Course = Relationship(back_populates="assignments")
    user: User  = Relationship(back_populates="assignments")
    

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
    questions: list['QuizQuestion'] = Field(
        sa_column=Column(JSON),
        description="list of QuizQuestion objects, stored as JSON."
    )

class QuizQuestion(SQLModel):
    """
    Pydantic model representing a single multiple-choice question.
    'choices' is a list of possible answers, and 'correct_index' 
    is the index of the correct choice in that list.
    """
    question: str
    choices: list[str]
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
    # course_id: Optional[uuid.UUID] = None
    max_attempts: Optional[int] = None
    passing_threshold: Optional[int] = None
    questions: Optional[list[QuizQuestion]] = None

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
    attempts: list["QuizAttempt"] = Relationship(back_populates="quiz")


# =========================================================
#  ATTACH QUIZ TO EXISTING COURSE
# =========================================================

class AttachQuizToCourse(SQLModel):
    """Schema for adding a quiz to an existing course."""
    course_id: uuid.UUID
    quiz_id: uuid.UUID


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

# class Notification(SQLModel, table=True):
#     """Table for storing system notifications sent to users."""
#     id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
#     user_id: uuid.UUID = Field(foreign_key="user.id")
    
#     message: str = Field(max_length=500)
#     is_read: bool = Field(default=False)
#     created_at: datetime = Field(default_factory=datetime.utcnow)

#     # Relationship to the user
#     user: User = Relationship()


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




'''
import uuid
from datetime import datetime, date
from typing import Optional, list
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import JSON
from enum import Enum

# =========================================================
# Role Models
# =========================================================

class RoleEnum(str, Enum):
    """Enum for predefined user roles."""
    ADMIN = "admin"
    EMPLOYEE = "employee"
    MANAGER = "manager"
    INSTRUCTOR = "instructor"

class RoleBase(SQLModel):
    name: RoleEnum = Field(unique=True, index=True, max_length=50)

class Role(RoleBase, table=True):
    """Database model for roles."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    users: list["User"] = Relationship(back_populates="role")

class RoleCreate(RoleBase):
    pass

class RoleUpdate(SQLModel):
    name: RoleEnum | None = None

# =========================================================
# User Models
# =========================================================

class UserBase(SQLModel):
    """Base properties for Users."""
    user_id: str = Field(unique=True, index=True, max_length=50)
    name: str = Field(max_length=255)
    email: str = Field(unique=True, index=True, max_length=255)
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)
    role_id: uuid.UUID | None = Field(foreign_key="role.id", default=None)

class User(UserBase, table=True):
    """Database model for Users."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    assignments: list["CourseAssignment"] = Relationship(back_populates="user")
    quiz_attempts: list["QuizAttempt"] = Relationship(back_populates="user")
    role: Optional[Role] = Relationship(back_populates="users")

class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=40)

class UserUpdate(SQLModel):
    name: str | None = None
    email: str | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None
    role_id: uuid.UUID | None = None

# =========================================================
# Course Models
# =========================================================

class CourseBase(SQLModel):
    """Base properties for a course."""
    title: str = Field(max_length=255)
    description: str | None = None
    materials: list[str] = Field(default=[], sa_column=Column(JSON))
    is_active: bool = Field(default=True)
    start_date: date | None = None
    end_date: date | None = None

class Course(CourseBase, table=True):
    """Database model for Course."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    quiz: Optional["Quiz"] = Relationship(back_populates="course")
    assignments: list["CourseAssignment"] = Relationship(back_populates="course")

class CourseCreate(CourseBase):
    assigned_user_ids: list[uuid.UUID] = []
    assigned_role_ids: list[uuid.UUID] = []
    create_quiz: bool = False

class CourseUpdate(SQLModel):
    title: str | None = None
    description: str | None = None
    materials: list[str] | None = None
    is_active: bool | None = None
    start_date: date | None = None
    end_date: date | None = None
    assigned_user_ids: list[uuid.UUID] | None = None
    assigned_role_ids: list[uuid.UUID] | None = None

# =========================================================
# Course Assignment Model (Handles Both Users & Roles)
# =========================================================

class CourseAssignment(SQLModel, table=True):
    """Many-to-Many bridging table between Users and Courses.
    If assigned via role, user_id is still stored for consistency."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    course_id: uuid.UUID = Field(foreign_key="course.id")
    user_id: uuid.UUID = Field(foreign_key="user.id")
    role_id: uuid.UUID | None = Field(foreign_key="role.id", default=None)  # ✅ Tracks role-based assignments
    assigned_at: datetime = Field(default_factory=datetime.utcnow)

    course: Course = Relationship(back_populates="assignments")
    user: User = Relationship(back_populates="assignments")
    role: Optional[Role] = Relationship(back_populates="assignments")



'''