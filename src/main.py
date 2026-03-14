from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from src import crud, schemas
from src.database import Base, engine, get_db
from src.llm_service import ask_mistral

app = FastAPI()

Base.metadata.create_all(bind=engine)


@app.post("/users")
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    return crud.create_user(db, user)


@app.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.post("/ask", response_model=schemas.AskResponse)
def ask(body: schemas.AskRequest):
    answer = ask_mistral(body.question)
    return schemas.AskResponse(question=body.question, answer=answer)
