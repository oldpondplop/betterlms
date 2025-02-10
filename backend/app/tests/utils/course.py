import random
import string
import uuid

from fastapi.testclient import TestClient
from faker import Faker
from app import crud
from app.core.config import settings
from app.models import Course, CourseCreate, CourseRoleLink, CourseUserLink, User, Role
from sqlmodel import Session, select

fake = Faker()


def create_random_course(db: Session) -> Course:
    course_in = get_random_course()
    course = crud.create_course(session=db, course_in=course_in)
    return course

def get_random_course() -> CourseCreate:
    return CourseCreate(
        title=fake.sentence(nb_words=3),
        description=fake.text(max_nb_chars=200),
        is_active=True,
        due_date=fake.date_this_year(),
    )

def assign_users_to_courses(db: Session):
    users = db.exec(select(User)).all()
    courses = db.exec(select(Course)).all()
    roles = db.exec(select(Role)).all()

    # Assign random users to random courses
    for user in users:
        course = random.choice(courses)
        db.add(CourseUserLink(course_id=course.id, user_id=user.id))

    # Assign random roles to random courses
    for role in roles:
        course = random.choice(courses)
        db.add(CourseRoleLink(course_id=course.id, role_id=role.id))

    db.commit()