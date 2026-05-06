from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from . import models, schemas, database

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Barber Manager - Clientes API")

@app.post("/clientes/", response_model=schemas.ClienteResponse, status_code=201)
def create_cliente(cliente: schemas.ClienteCreate, db: Session = Depends(database.get_db)):
    db_cliente = db.query(models.Cliente).filter(models.Cliente.email == cliente.email).first()
    if db_cliente:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    novo_cliente = models.Cliente(**cliente.dict())
    db.add(novo_cliente)
    db.commit()
    db.refresh(novo_cliente)
    return novo_cliente

@app.get("/clientes/", response_model=list[schemas.ClienteResponse])
def read_clientes(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    clientes = db.query(models.Cliente).offset(skip).limit(limit).all()
    return clientes

@app.delete("/clientes/{cliente_id}", status_code=204)
def delete_cliente(cliente_id: int, db: Session = Depends(database.get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    db.delete(cliente)
    db.commit()
    return None

@app.put("/clientes/{cliente_id}", response_model=schemas.ClienteResponse)
def update_cliente(cliente_id: int, cliente_atualizado: schemas.ClienteCreate, db: Session = Depends(database.get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    for key, value in cliente_atualizado.dict().items():
        setattr(cliente, key, value)
        
    db.commit()
    db.refresh(cliente)
    return cliente