from concurrent.futures import ThreadPoolExecutor
from sqlmodel import Session
from app.core.db import engine, init_db
from app.tests.utils.user import create_random_user
from app.tests.utils.course import create_random_course


NUM_USERS = 50
NUM_COURSES = 10
MAX_WORKERS = 10

def run_in_thread(target_func, count):
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        executor.map(lambda _: target_func(), range(count))

def populate_database():
    init_db()
    run_in_thread(create_random_user_threadsafe, NUM_USERS)
    run_in_thread(create_random_course_threadsafe, NUM_COURSES)
    print("✅ Successfully populated db.")

def create_random_user_threadsafe():
    with Session(engine) as session:
        create_random_user(session)

def create_random_course_threadsafe():
    with Session(engine) as session:
        create_random_course(session)


if __name__ == "__main__":
    populate_database()