from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt

from . import models, schemas, database

models.Base.metadata.create_all(bind=database.engine)
app = FastAPI(title="Barber Manager - Agendamentos API")

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

@app.post("/agendamentos/", response_model=schemas.AgendamentoResponse, status_code=201)
def create_agendamento(agendamento: schemas.AgendamentoCreate, db: Session = Depends(database.get_db), usuario_email: str = Depends(validar_token)):
    novo_agendamento = models.Agendamento(**agendamento.dict())
    db.add(novo_agendamento)
    db.commit()
    db.refresh(novo_agendamento)
    return novo_agendamento

@app.get("/agendamentos/", response_model=list[schemas.AgendamentoResponse])
def read_agendamentos(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), usuario_email: str = Depends(validar_token)):
    return db.query(models.Agendamento).offset(skip).limit(limit).all()

@app.delete("/agendamentos/{agendamento_id}", status_code=204)
def delete_agendamento(agendamento_id: int, db: Session = Depends(database.get_db), usuario_email: str = Depends(validar_token)):
    agendamento = db.query(models.Agendamento).filter(models.Agendamento.id == agendamento_id).first()
    if not agendamento:
        return JSONResponse(status_code=404, content={"detail": "Agendamento não encontrado"})
    db.delete(agendamento)
    db.commit()
    return None

@app.put("/agendamentos/{agendamento_id}", response_model=schemas.AgendamentoResponse)
def update_agendamento(agendamento_id: int, agendamento_updated: schemas.AgendamentoCreate, db: Session = Depends(database.get_db), usuario_email: str = Depends(validar_token)):
    agendamento = db.query(models.Agendamento).filter(models.Agendamento.id == agendamento_id).first()
    if not agendamento:
        return JSONResponse(status_code=404, content={"detail": "Agendamento não encontrado"})
    
    for key, value in agendamento_updated.dict().items():
        setattr(agendamento, key, value)
    
    db.commit()
    db.refresh(agendamento)
    return agendamento