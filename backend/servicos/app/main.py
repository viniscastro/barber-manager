import os
import json
import redis
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from . import models, schemas, database

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Barber Manager - API de serviços")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
redis_url = os.getenv("REDIS_URL", "redis://redis_cache:6379/0")
redis_client = redis.Redis.from_url(redis_url)

@app.get("/servicos/", response_model=List[schemas.ServicoResponse])
def listar_servicos(db: Session = Depends(database.get_db)):
    servicos_em_cache = redis_client.get("servicos_lista")
    
    if servicos_em_cache:
        print("⚡ Buscou do CACHE (Redis)!")
        return json.loads(servicos_em_cache)

    print("🐘 Buscou do BANCO DE DADOS (PostgreSQL)!")
    servicos_db = db.query(models.Servico).all()
    servicos_lista = []
    for servico in servicos_db:
        servicos_lista.append({
            "id": servico.id,
            "nome": servico.nome,
            "preco": float(servico.preco)
        })
    redis_client.setex("servicos_lista", 3600, json.dumps(servicos_lista))
    
    return servicos_db

@app.post("/servicos/", response_model=schemas.ServicoResponse)
def criar_servico(servico: schemas.ServicoCreate, db: Session = Depends(database.get_db)):
    novo_servico = models.Servico(nome=servico.nome, preco=servico.preco)
    db.add(novo_servico)
    db.commit()
    db.refresh(novo_servico)

    redis_client.delete("servicos_lista")
    
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
    redis_client.delete("servicos_lista")
    
    return servico_db

@app.delete("/servicos/{servico_id}")
def deletar_servico(servico_id: int, db: Session = Depends(database.get_db)):
    servico_db = db.query(models.Servico).filter(models.Servico.id == servico_id).first()
    if not servico_db:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    db.delete(servico_db)
    db.commit()
    redis_client.delete("servicos_lista")
    
    return {"mensagem": "Serviço deletado com sucesso"}