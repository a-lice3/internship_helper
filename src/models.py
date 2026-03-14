from sqlalchemy import Column, Integer, String, Text
from .database import Base


# Table User
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    name = Column(String)


# Table CV


class CV(Base):
    __tablename__ = "cvs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    content = Column(Text)
