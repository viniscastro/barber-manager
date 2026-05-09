from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, database

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Barber Manager - API de agendamentos")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/agendamentos/", response_model=schemas.AgendamentoResponse, status_code=201)
def create_agendamento(agendamento: schemas.AgendamentoCreate, db: Session = Depends(database.get_db)):
    novo_agendamento = models.Agendamento(**agendamento.model_dump())
    db.add(novo_agendamento)
    db.commit()
    db.refresh(novo_agendamento)
    return novo_agendamento

@app.get("/agendamentos/", response_model=list[schemas.AgendamentoResponse])
def read_agendamentos(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return db.query(models.Agendamento).offset(skip).limit(limit).all()

@app.put("/agendamentos/{agendamento_id}", response_model=schemas.AgendamentoResponse)
def update_agendamento(agendamento_id: int, updated: schemas.AgendamentoCreate, db: Session = Depends(database.get_db)):
    db_agendamento = db.query(models.Agendamento).filter(models.Agendamento.id == agendamento_id).first()
    if not db_agendamento:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    
    for key, value in updated.model_dump().items():
        setattr(db_agendamento, key, value)
    
    db.commit()
    db.refresh(db_agendamento)
    return db_agendamento

@app.delete("/agendamentos/{agendamento_id}", status_code=204)
def delete_agendamento(agendamento_id: int, db: Session = Depends(database.get_db)):
    db_agendamento = db.query(models.Agendamento).filter(models.Agendamento.id == agendamento_id).first()
    if not db_agendamento:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    db.delete(db_agendamento)
    db.commit()
    return None