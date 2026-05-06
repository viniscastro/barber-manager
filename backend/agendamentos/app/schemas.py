from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AgendamentoBase(BaseModel):
    cliente_id: int
    servico_id: int
    data_hora: Optional[datetime] = None
    status: Optional[str] = "Pendente"

class AgendamentoCreate(AgendamentoBase):
    pass

class AgendamentoResponse(AgendamentoBase):
    id: int

    class Config:
        from_attributes = True