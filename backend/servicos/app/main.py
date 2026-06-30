from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from fastapi.encoders import jsonable_encoder
import jwt
import json
import redis

from . import models, schemas, database

models.Base.metadata.create_all(bind=database.engine)
app = FastAPI(title="Barber Manager - Serviços API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "chave_super_secreta_da_dom_barbershop"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
redis_client = redis.Redis(host='redis_cache', port=6379, db=0, decode_responses=True)

def validar_token(token: str = Depends(oauth2_scheme)):
    excecao_credenciais = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sessão inválida ou expirada. Faça login novamente.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise excecao_credenciais
        return email 
    except jwt.PyJWTError:
        raise excecao_credenciais

@app.get("/servicos/", response_model=list[schemas.ServicoResponse])
def read_servicos(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    cache = redis_client.get("servicos_lista")
    if cache:
        print("Buscou do CACHE (Redis)!")
        return json.loads(cache)

    print("Buscou do BANCO DE DADOS (PostgreSQL)!")
    servicos = db.query(models.Servico).offset(skip).limit(limit).all()
    servicos_json = jsonable_encoder(servicos)
    redis_client.setex("servicos_lista", 60, json.dumps(servicos_json))
    
    return servicos

@app.post("/servicos/", response_model=schemas.ServicoResponse, status_code=201)
def create_servico(servico: schemas.ServicoCreate, db: Session = Depends(database.get_db), usuario_email: str = Depends(validar_token)):
    novo_servico = models.Servico(**servico.dict())
    db.add(novo_servico)
    db.commit()
    db.refresh(novo_servico)

    redis_client.delete("servicos_lista")
    
    return novo_servico

@app.delete("/servicos/{servico_id}", status_code=204)
def delete_servico(servico_id: int, db: Session = Depends(database.get_db), usuario_email: str = Depends(validar_token)):
    servico = db.query(models.Servico).filter(models.Servico.id == servico_id).first()
    if not servico:
        return JSONResponse(status_code=404, content={"detail": "Serviço não encontrado"})
    db.delete(servico)
    db.commit()

    redis_client.delete("servicos_lista")
    
    return None

@app.put("/servicos/{servico_id}", response_model=schemas.ServicoResponse)
def update_servico(servico_id: int, servico_updated: schemas.ServicoCreate, db: Session = Depends(database.get_db), usuario_email: str = Depends(validar_token)):
    servico = db.query(models.Servico).filter(models.Servico.id == servico_id).first()
    if not servico:
        return JSONResponse(status_code=404, content={"detail": "Serviço não encontrado"})
    
    for key, value in servico_updated.dict().items():
        setattr(servico, key, value)
    
    db.commit()
    db.refresh(servico)
   
    redis_client.delete("servicos_lista")
    
    return servico