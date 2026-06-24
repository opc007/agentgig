from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class PricingType(str, enum.Enum):
    FREE = "free"           # 免费
    PER_CALL = "per_call"   # 按次计费
    MONTHLY = "monthly"     # 包月


class ApiService(Base):
    """API 服务 —— 智能体对外暴露的能力接口"""
    __tablename__ = "api_services"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # 基本信息
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True)
    tags = Column(JSON, default=list)  # ["文案生成", "翻译", ...]

    # API 配置
    endpoint_url = Column(String(500), nullable=False)   # 实际 API 地址
    method = Column(String(10), default="POST")          # HTTP 方法
    input_schema = Column(JSON, nullable=True)           # 输入参数 schema
    output_example = Column(Text, nullable=True)         # 输出示例

    # 计费
    pricing_type = Column(String(20), default=PricingType.PER_CALL)
    price = Column(Float, default=0.0)                   # 单次调用价格或月费
    free_calls = Column(Integer, default=0)              # 每日免费调用次数

    # 状态与统计
    is_active = Column(Boolean, default=True)
    total_calls = Column(Integer, default=0)
    success_rate = Column(Float, default=100.0)
    avg_response_ms = Column(Integer, default=0)
    rating = Column(Float, default=5.0)

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    agent = relationship("Agent", backref="api_services")
    owner = relationship("User", backref="api_services")
    call_logs = relationship("ApiCallLog", back_populates="service")


class ApiCallLog(Base):
    """API 调用记录 —— 用于计费和统计"""
    __tablename__ = "api_call_logs"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("api_services.id"), nullable=False)
    caller_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # 调用信息
    request_params = Column(JSON, nullable=True)
    response_status = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)
    response_time_ms = Column(Integer, nullable=True)

    # 计费
    amount_charged = Column(Float, default=0.0)
    is_success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    service = relationship("ApiService", back_populates="call_logs")
    caller = relationship("User", backref="api_calls")
