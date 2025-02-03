import random
import string
import uuid

from fastapi.testclient import TestClient
from faker import Faker
from app import crud
from app.core.config import settings
from app.models import Course, CourseCreate
from sqlmodel import Session

fake = Faker()


def create_random_course(db: Session) -> Course:
    course_in = get_random_course()
    course = crud.create_course(session=db, course_in=course_in)
    return course

def get_random_course() -> CourseCreate:
    return CourseCreate(
        title=fake.sentence(nb_words=3),
        description=fake.text(max_nb_chars=200),
        materials=[f"{fake.word()}.pdf", f"{fake.word()}.mp4"],
        is_active=True,
        start_date=fake.date_this_year(),
        end_date=fake.date_this_year(),
    )