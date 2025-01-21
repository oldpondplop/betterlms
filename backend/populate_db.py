import uuid
import random
from datetime import date, timedelta
from sqlmodel import Session
from app.core.db import engine, init_db
from app import crud
from app.models import UserCreate, CourseCreate, QuizCreate, QuizAttempt

# Initialize DB
def populate_database():
    init_db()
    
    with Session(engine) as session:
        print("Populating database with dummy data...")

        # Create Admin User
        admin = crud.create_user(
            session=session,
            user_create=UserCreate(
                email="admin007@example.com",
                password="adminpassword",
                name="Admin User",
                role="admin",
                is_superuser=True,
                is_active=True,
                user_id="ADMIN007"
            )
        )

        # Create Users
        users = []
        for i in range(5):
            user = crud.create_user(
                session=session,
                user_create=UserCreate(
                    email=f"user{i}@example.com",
                    password="password123",
                    name=f"User {i}",
                    role="employee",
                    is_active=True,
                    user_id=f"USER00{i}"
                )
            )
            users.append(user)

        # Create Courses
        courses = []
        for i in range(3):
            course = crud.create_course(
                session=session,
                course_create=CourseCreate(
                    title=f"Course {i}",
                    description=f"This is a description for Course {i}.",
                    materials=["https://example.com/material1", "https://example.com/material2"],
                    associated_role="employee",
                    is_active=True,
                    is_due=True,
                    due_date=date.today() + timedelta(days=30),
                    start_date=date.today()
                )
            )
            courses.append(course)

        # Assign Courses to Users
        for user in users:
            for course in random.sample(courses, k=2):  # Assign each user to 2 random courses
                crud.assign_course_to_user(session=session, course_id=course.id, user_id=user.id)

        # Create Quizzes for Courses
        quizzes = []
        for course in courses:
            quiz = crud.create_quiz(
                session=session,
                quiz_create=QuizCreate(
                    max_attempts=3,
                    passing_threshold=70,
                    questions=[
                        {"question": "What is 2+2?", "choices": ["3", "4", "5"], "answer": "4"},
                        {"question": "What is the capital of France?", "choices": ["Berlin", "Madrid", "Paris"], "answer": "Paris"}
                    ]
                ),
                course_id=course.id
            )
            quizzes.append(quiz)

        # Create Quiz Attempts for Users
        for user in users:
            for quiz in quizzes:
                attempt_number = random.randint(1, 3)
                score = random.randint(50, 100)
                passed = score >= 70
                crud.record_quiz_attempt(
                    session=session,
                    quiz_id=quiz.id,
                    user_id=user.id,
                    score=score,
                    attempt_number=attempt_number
                )

        print("Database populated successfully!")

if __name__ == "__main__":
    populate_database()
