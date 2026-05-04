from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from . import models, schemas, database

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="API Barber Manager")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/servicos/", response_model=List[schemas.ServicoResponse])
def listar_servicos(db: Session = Depends(database.get_db)):
    return db.query(models.Servico).all()

@app.post("/servicos/", response_model=schemas.ServicoResponse)
def criar_servico(servico: schemas.ServicoCreate, db: Session = Depends(database.get_db)):
    novo_servico = models.Servico(nome=servico.nome, preco=servico.preco)
    db.add(novo_servico)
    db.commit()
    db.refresh(novo_servico)
    return novo_servico

@app.put("/servicos/{servico_id}", response_model=schemas.ServicoResponse)
def atualizar_servico(servico_id: int, servico_atualizado: schemas.ServicoCreate, db: Session = Depends(database.get_db)):
    servico_db = db.query(models.Servico).filter(models.Servico.id == servico_id).first()
    if not servico_db:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    servico_db.nome = servico_atualizado.nome
    servico_db.preco = servico_atualizado.preco
    db.commit()
    db.refresh(servico_db)
    return servico_db

@app.delete("/servicos/{servico_id}")
def deletar_servico(servico_id: int, db: Session = Depends(database.get_db)):
    servico_db = db.query(models.Servico).filter(models.Servico.id == servico_id).first()
    if not servico_db:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    db.delete(servico_db)
    db.commit()
    return {"mensagem": "Serviço deletado com sucesso"}