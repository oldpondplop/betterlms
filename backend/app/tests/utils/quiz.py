import random
import uuid
from sqlmodel import Session, select
from app.models import Course, Quiz, QuizCreate, QuizAttempt, QuizAttemptCreate, User
from app import crud

def create_quizzes(db: Session):
    courses = db.exec(select(Course)).all()
    for course in courses:
        create_random_quiz(db, course.id)

def create_quiz_attempts(db: Session):
    users = db.exec(select(User)).all()
    quizzes = db.exec(select(Quiz)).all()
    for user in users:
        quiz = random.choice(quizzes)
        create_random_quiz_attempt(db, quiz.id, user.id)

def create_random_quiz(db: Session, course_id: uuid.UUID) -> Quiz:
    quiz_in = get_random_quiz(course_id)
    quiz = crud.create_quiz(session=db, quiz_in=quiz_in)
    return quiz

def get_random_quiz(course_id: uuid.UUID) -> QuizCreate:
    return QuizCreate(
        course_id=course_id,
        max_attempts=random.randint(1, 5),
        passing_threshold=random.uniform(50.0, 100.0),
        questions=[
            {
                "question": f"What is {random.randint(1, 10)} + {random.randint(1, 10)}?",
                "options": [str(random.randint(1, 20)) for _ in range(4)],
                "correct_index": random.randint(0, 3),
            }
            for _ in range(random.randint(1, 5))
        ],
    )

def create_random_quiz_attempt(db: Session, quiz_id: uuid.UUID, user_id: uuid.UUID) -> QuizAttempt:
    attempt_in = get_random_quiz_attempt(quiz_id, user_id)
    attempt = crud.create_quiz_attempt(session=db, attempt_in=attempt_in)
    return attempt

def get_random_quiz_attempt(quiz_id: uuid.UUID, user_id: uuid.UUID) -> QuizAttemptCreate:
    return QuizAttemptCreate(
        quiz_id=quiz_id,
        user_id=user_id,
        selected_indexes=[random.randint(0, 3) for _ in range(random.randint(1, 5))],
    )