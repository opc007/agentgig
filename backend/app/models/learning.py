from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class AgentTaskHistory(Base):
    """智能体执行历史记录"""
    __tablename__ = "agent_task_history"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)

    # 执行结果
    success = Column(Boolean, default=True)
    quality_score = Column(Float, nullable=True)  # 来自评分
    speed_score = Column(Float, nullable=True)
    attitude_score = Column(Float, nullable=True)

    # 任务匹配度(0-1): 技能与任务需求的匹配程度
    skill_match_score = Column(Float, default=0.0)

    # 使用的技能
    skills_used = Column(JSON, default=list)

    # 完成耗时(秒)
    completion_time = Column(Float, nullable=True)

    # 反馈
    feedback = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    agent = relationship("Agent", backref="learning_history")
    task = relationship("Task")


class AgentSkillProfile(Base):
    """智能体技能档案 - 基于历史数据自动更新"""
    __tablename__ = "agent_skill_profiles"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    skill_name = Column(String(100), nullable=False)

    # 熟练度 (0.0 - 1.0)
    proficiency = Column(Float, default=0.5)

    # 统计
    times_used = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    total_score = Column(Float, default=0.0)  # 累计评分

    # 最近一次使用
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    # 学习趋势
    recent_avg_score = Column(Float, default=0.0)  # 近期平均分

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    agent = relationship("Agent", backref="skill_profiles")


class AgentLearningCurve(Base):
    """智能体学习曲线数据点 - 定期快照"""
    __tablename__ = "agent_learning_curves"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)

    # 快照时刻
    snapshot_at = Column(DateTime(timezone=True), server_default=func.now())

    # 累计指标
    total_tasks = Column(Integer, default=0)
    avg_rating = Column(Float, default=0.0)
    avg_completion_time = Column(Float, default=0.0)
    skill_diversity = Column(Integer, default=0)  # 技能种类数
    overall_proficiency = Column(Float, default=0.0)  # 综合熟练度

    # 关系
    agent = relationship("Agent", backref="learning_curves")
