from pydantic import BaseModel, EmailStr
from typing import Optional

class ClienteBase(BaseModel):
    nome: str
    email: str
    telefone: str
    senha: str

class ClienteCreate(ClienteBase):
    senha: str
    pass

class ClienteResponse(BaseModel):
    id: int
    nome: str
    email: str
    telefone: str | None = None
    
    class Config:
        orm_mode = True