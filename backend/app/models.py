import uuid
from datetime import date
from typing import Optional
from enum import Enum
from pydantic import EmailStr, BaseModel, field_validator, validator
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
    course_id: uuid.UUID = Field(foreign_key="course.id", ondelete="CASCADE", primary_key=True)
    role_id: uuid.UUID = Field(foreign_key="role.id", ondelete="CASCADE", primary_key=True)

class CourseUserLink(SQLModel, table=True):
    course_id: uuid.UUID = Field(foreign_key="course.id", ondelete="CASCADE", primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE", primary_key=True)

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
    name: Optional[str] = None
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    user_id: Optional[str] = Field(default=None, max_length=30, description="Employee id")

class UserCreate(UserBase):
    password: str
    role_id: Optional[uuid.UUID] = None

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
    # quiz_attempts: list["QuizAttempt"] = Relationship(back_populates="user")

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

class CoursePublicMe(CourseBase):
    id: uuid.UUID

class CoursePublic(CourseBase):
    id: uuid.UUID
    users: list[UserPublic]
    roles: list[RolePublic]
    # quiz: Optional["QuizPublic"]

class CourseUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    users_to_add: Optional[list[uuid.UUID]] = None
    users_to_remove: Optional[list[uuid.UUID]] = None
    roles_to_add: Optional[list[uuid.UUID]] = None
    roles_to_remove: Optional[list[uuid.UUID]] = None

class CourseUserProgress(SQLModel):
    user: UserPublic
    status: StatusEnum
    attempt_count: int
    score: Optional[float]

class CourseAnalytics(SQLModel):
    total_users: int
    completed_users: int
    failed_users: int
    average_attempts: float
    average_score: Optional[float]

class Course(CourseBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    materials: list[str] = Field(default_factory=list, sa_column=Column(MutableList.as_mutable(JSON())))
    quiz: Optional["Quiz"] = Relationship(back_populates="course")
    roles: list[Role] = Relationship(back_populates="courses", link_model=CourseRoleLink)
    users: list[User] = Relationship(back_populates="courses", link_model=CourseUserLink)

# ================================
# QUIZ MODELS
# ================================

class Question(SQLModel):
    question_text: str
    options: list[str] = Field(..., min_items=2, max_items=5)
    correct_index: int = Field(..., ge=0)
    
    @field_validator("correct_index")
    def validate_correct_index(cls, v, values):
        if "options" in values and v >= len(values["options"]):
            raise ValueError("Correct index exceeds number of options")
        return v

class QuizBase(SQLModel):
    max_attempts: int = Field(default=3)
    passing_threshold: float = Field(70.0, ge=0, le=100)
    questions: list[Question] = Field(default_factory=list, sa_column=Column(JSON))

class QuizCreate(QuizBase):
    course_id: uuid.UUID

class QuizPublic(QuizBase):
    id: uuid.UUID
    course_id: uuid.UUID

class QuizUpdate(SQLModel):
    max_attempts: Optional[int] = None
    passing_threshold: Optional[float] = None
    questions: Optional[list[Question]] = None

class Quiz(QuizBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", ondelete="CASCADE")
    course: Optional[Course] = Relationship(back_populates="quiz")
    attempts: list["QuizAttempt"] = Relationship(back_populates="quiz")

# ================================
# QUIZ ATTEMPT MODELS
# ================================

class QuizAttemptBase(SQLModel):
    selected_indexes: list[int] = Field(default_factory=list, sa_column=Column(JSON))

class QuizAttemptCreate(QuizAttemptBase):
    quiz_id: uuid.UUID
    user_id: uuid.UUID

class QuizAttemptResult(SQLModel):
    question_text: str
    options: list[str]
    correct_index: int
    selected_index: int
    is_correct: bool

class QuizAttemptPublic(QuizAttemptBase):
    id: uuid.UUID
    quiz_id: uuid.UUID
    user_id: uuid.UUID
    score: float
    passed: bool
    attempt_number: int
    results: list[QuizAttemptResult]

class QuizAttempt(QuizAttemptBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    quiz_id: uuid.UUID = Field(foreign_key="quiz.id", ondelete="CASCADE")
    user_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    quiz: Quiz = Relationship(back_populates="attempts")

    @property
    def score(self) -> float:
        """Compute the score as a percentage of correct answers."""
        if not self.quiz:
            return 0.0

        correct = 0
        for i, question in enumerate(self.quiz.questions):
            if i < len(self.selected_indexes) and self.selected_indexes[i] == question.correct_index:
                correct += 1

        total_questions = len(self.quiz.questions)
        return (correct / total_questions) * 100 if total_questions > 0 else 0.0

    @property
    def passed(self) -> bool:
        """Determine if the attempt passed based on the quiz's passing threshold."""
        return self.score >= self.quiz.passing_threshold if self.quiz else False

    @property
    def attempt_number(self) -> int:
        """Compute the attempt number dynamically based on the user's attempts."""
        if not self.quiz:
            return 0
        attempts = self.quiz.attempts
        user_attempts = [a for a in attempts if a.user_id == self.user_id]
        return user_attempts.index(self) + 1 if self in user_attempts else 0

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
