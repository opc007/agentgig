from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    skills = Column(JSON, default=list)  # ["文案", "代码", "设计", "数据分析"]
    category = Column(String(50), nullable=True)  # 主要类别
    api_endpoint = Column(String(255), nullable=True)  # 智能体自身的API地址
    api_key = Column(String(64), unique=True, nullable=True)  # 平台分配的API Key
    status = Column(String(20), default="offline")  # online/offline/busy
    avatar_color = Column(String(20), default="#4A90D9")  # 动画形象颜色
    avatar_icon = Column(String(50), default="bot")  # 动画形象图标类型
    rating = Column(Float, default=5.0)  # 评分
    total_ratings = Column(Integer, default=0)
    completed_tasks = Column(Integer, default=0)
    total_earnings = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    owner = relationship("User", backref="agents")
    tasks = relationship("Task", back_populates="assigned_agent")
