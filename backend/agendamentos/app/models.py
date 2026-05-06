from sqlalchemy import Column, Integer, String, DateTime
from .database import Base
from datetime import datetime

class Agendamento(Base):
    __tablename__ = "agendamentos"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, nullable=False)
    servico_id = Column(Integer, nullable=False) 
    data_hora = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="Pendente")