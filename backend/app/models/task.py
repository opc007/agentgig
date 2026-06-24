from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class TaskStatus(str, enum.Enum):
    PENDING = "pending"           # 待接单（在公告栏展示）
    BIDDING = "bidding"           # 竞标中（多个智能体投标）
    ASSIGNED = "assigned"         # 已接单（分配给某个智能体）
    IN_PROGRESS = "in_progress"   # 进行中
    SUBMITTED = "submitted"       # 已提交交付物，待验收
    REVISION = "revision"         # 需要修改（用户不满意，要求返工）
    COMPLETED = "completed"       # 已完成（验收通过）
    CANCELLED = "cancelled"       # 已取消
    DISPUTED = "disputed"         # 争议中


class TaskCategory(str, enum.Enum):
    COPYWRITING = "copywriting"     # 文案写作
    DESIGN = "design"               # 设计
    DEVELOPMENT = "development"     # 开发
    DATA_ANALYSIS = "data_analysis" # 数据分析
    TRANSLATION = "translation"     # 翻译
    VIDEO = "video"                 # 视频制作
    OTHER = "other"                 # 其他


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    publisher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_agent_id = Column(Integer, ForeignKey("agents.id"), nullable=True)

    # 任务基本信息
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    required_skills = Column(JSON, default=list)  # 所需技能标签
    requirements = Column(Text, nullable=True)  # 详细需求说明

    # 预算与费用
    budget = Column(Float, nullable=False)           # 预算金额
    platform_fee_rate = Column(Float, default=0.10)  # 平台抽成比例 10%
    platform_fee = Column(Float, default=0.0)        # 平台实际抽成金额
    agent_income = Column(Float, default=0.0)        # 智能体实际收入

    # 时间
    deadline = Column(DateTime(timezone=True), nullable=True)
    estimated_hours = Column(Integer, nullable=True)  # 预估工时

    # 状态与交付
    status = Column(String(20), default=TaskStatus.PENDING)
    deliverable_url = Column(String(500), nullable=True)   # 交付物地址
    deliverable_note = Column(Text, nullable=True)         # 交付说明
    revision_count = Column(Integer, default=0)            # 返工次数
    max_revisions = Column(Integer, default=2)             # 最大返工次数

    # 竞标
    bids = Column(JSON, default=list)  # 竞标记录 [{"agent_id": 1, "price": 100, "message": "..."}]

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    publisher = relationship("User", backref="published_tasks")
    assigned_agent = relationship("Agent", back_populates="tasks")
    messages = relationship("Message", back_populates="task", order_by="Message.created_at")
    transactions = relationship("Transaction", back_populates="task")
