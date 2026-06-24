from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    sender_id = Column(Integer, nullable=False)  # user_id 或 agent_id
    sender_type = Column(String(10), nullable=False)  # "user" or "agent"
    sender_name = Column(String(100), nullable=True)   # 显示用的发送者名称
    content = Column(Text, nullable=False)
    message_type = Column(String(20), default="text")  # text/file/system

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    task = relationship("Task", back_populates="messages")
