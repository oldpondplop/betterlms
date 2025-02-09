from concurrent.futures import ThreadPoolExecutor
from app.models import Course
from sqlalchemy import select
from sqlmodel import Session
from app.core.db import engine, init_db
from app.tests.utils.user import create_random_user, create_roles
from app.tests.utils.course import create_random_course, assign_users_to_courses
from app.tests.utils.quiz import create_quiz_attempts, create_quizzes

NUM_USERS = 50
NUM_COURSES = 10
MAX_WORKERS = 10

def run_in_thread(target_func, count):
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        executor.map(lambda _: target_func(), range(count))

def populate_database():
    init_db()
    _create_roles()
    run_in_thread(create_users, NUM_USERS)
    run_in_thread(create_courses, NUM_COURSES)
    _assign_users_to_courses()
    _create_quizzes()
    _create_quiz_attempts()

    print("✅ Successfully populated db.")

def create_users():
    with Session(engine) as session:
        create_random_user(session)

def create_courses():
    with Session(engine) as session:
        create_random_course(session)

def _create_roles():
    with Session(engine) as session:
        create_roles(session)

def _create_quizzes():
    with Session(engine) as session:
        create_quizzes(session)

def _create_quiz_attempts():
    with Session(engine) as session:
        create_quiz_attempts(session)

def _assign_users_to_courses():
    with Session(engine) as session:
        assign_users_to_courses(session)


"""
b1f4ec14-f578-4364-8313-db4534eaf430
   "id": "4fe24b78-295c-4259-a98c-5d5ee2bad334",
    "course_id": "b1f4ec14-f578-4364-8313-db4534eaf430"
"""
if __name__ == "__main__":
    populate_database()