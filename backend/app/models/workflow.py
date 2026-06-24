from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class WorkflowStatus(str, enum.Enum):
    DRAFT = "draft"           # 草稿
    ACTIVE = "active"         # 可用
    ARCHIVED = "archived"     # 已归档


class WorkflowExecutionStatus(str, enum.Enum):
    PENDING = "pending"       # 等待执行
    RUNNING = "running"       # 执行中
    COMPLETED = "completed"   # 已完成
    FAILED = "failed"         # 失败
    CANCELLED = "cancelled"   # 已取消


class StepType(str, enum.Enum):
    TASK_DECOMPOSE = "task_decompose"     # 任务分解
    AGENT_ASSIGN = "agent_assign"         # 智能体分配
    PARALLEL_EXEC = "parallel_exec"       # 并行执行
    SEQUENTIAL_EXEC = "sequential_exec"   # 串行执行
    MERGE = "merge"                       # 结果汇总
    CONDITION = "condition"               # 条件判断


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default=WorkflowStatus.DRAFT)

    # 工作流步骤定义 (JSON数组)
    # 每个步骤: {type, name, config, next_steps}
    steps = Column(JSON, default=list)

    # 步骤间的连线关系
    # [{from_step: 0, to_step: 1, condition: "..."}]
    edges = Column(JSON, default=list)

    # 工作流全局配置
    config = Column(JSON, default=dict)

    # 执行统计
    total_executions = Column(Integer, default=0)
    successful_executions = Column(Integer, default=0)
    avg_execution_time = Column(Float, default=0.0)  # 秒

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    creator = relationship("User", backref="workflows")
    executions = relationship("WorkflowExecution", back_populates="workflow",
                              order_by="WorkflowExecution.created_at.desc()")


class WorkflowExecution(Base):
    __tablename__ = "workflow_executions"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    trigger_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    status = Column(String(20), default=WorkflowExecutionStatus.PENDING)

    # 输入参数
    input_data = Column(JSON, default=dict)

    # 最终输出
    result = Column(JSON, nullable=True)

    # 当前执行到哪一步
    current_step_index = Column(Integer, default=0)

    # 执行耗时(秒)
    execution_time = Column(Float, nullable=True)

    error_message = Column(Text, nullable=True)

    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    workflow = relationship("Workflow", back_populates="executions")
    trigger_user = relationship("User", backref="workflow_executions")
    step_executions = relationship("WorkflowStepExecution", back_populates="execution",
                                   order_by="WorkflowStepExecution.step_index")


class WorkflowStepExecution(Base):
    __tablename__ = "workflow_step_executions"

    id = Column(Integer, primary_key=True, index=True)
    execution_id = Column(Integer, ForeignKey("workflow_executions.id"), nullable=False)
    step_index = Column(Integer, nullable=False)

    # 分配的智能体
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=True)

    status = Column(String(20), default=WorkflowExecutionStatus.PENDING)

    # 步骤输入/输出
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)

    # 关联创建的任务ID
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)

    error_message = Column(Text, nullable=True)

    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # 关系
    execution = relationship("WorkflowExecution", back_populates="step_executions")
    agent = relationship("Agent")
    task = relationship("Task")
