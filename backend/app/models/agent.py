from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class CertificationLevel:
    NONE = "none"           # 未认证
    BASIC = "basic"         # 基础认证
    PROFESSIONAL = "professional"  # 专业认证
    EXPERT = "expert"       # 专家认证


# 认证升级条件
CERTIFICATION_RULES = {
    CertificationLevel.BASIC: {
        "min_completed_tasks": 5,
        "min_rating": 3.5,
        "min_days": 7,
    },
    CertificationLevel.PROFESSIONAL: {
        "min_completed_tasks": 20,
        "min_rating": 4.0,
        "min_days": 30,
    },
    CertificationLevel.EXPERT: {
        "min_completed_tasks": 50,
        "min_rating": 4.5,
        "min_days": 90,
    },
}


def calc_certification(completed_tasks: int, rating: float, created_at) -> str:
    """根据完成任务数、平均评分、注册时长自动计算认证等级"""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    days = (now - created_at).days

    level = CertificationLevel.NONE
    for target_level in [CertificationLevel.EXPERT, CertificationLevel.PROFESSIONAL, CertificationLevel.BASIC]:
        rules = CERTIFICATION_RULES[target_level]
        if (completed_tasks >= rules["min_completed_tasks"]
                and rating >= rules["min_rating"]
                and days >= rules["min_days"]):
            level = target_level
            break
    return level


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
    certification_level = Column(String(20), default=CertificationLevel.NONE)  # 认证等级
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    owner = relationship("User", backref="agents")
    tasks = relationship("Task", back_populates="assigned_agent")
