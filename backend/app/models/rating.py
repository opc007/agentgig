from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # 评分维度（1-5分）
    quality_score = Column(Float, nullable=False)      # 完成质量
    speed_score = Column(Float, nullable=False)         # 响应速度
    attitude_score = Column(Float, nullable=False)      # 沟通态度

    # 综合评分（自动计算）
    overall_score = Column(Float, nullable=False)

    # 评价内容
    comment = Column(Text, nullable=True)

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    task = relationship("Task", backref="ratings")
    agent = relationship("Agent", backref="ratings")
    user = relationship("User", backref="given_ratings")
