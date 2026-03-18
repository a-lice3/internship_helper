from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.database import Base, engine
from src.routers import users, profile, offers, cvs, templates, ai, interview

app = FastAPI(title="Internship Helper API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(users.router)
app.include_router(profile.router)
app.include_router(offers.router)
app.include_router(cvs.router)
app.include_router(templates.router)
app.include_router(ai.router)
app.include_router(interview.router)
