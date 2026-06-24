from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class CapabilityStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    REVIEWING = "reviewing"


class PricingModel(str, enum.Enum):
    PER_CALL = "per_call"       # 按次计费
    PER_TOKEN = "per_token"     # 按 token 计费
    MONTHLY = "monthly"         # 月费
    FREE = "free"               # 免费


class Capability(Base):
    __tablename__ = "capabilities"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False)
    tags = Column(JSON, default=list)
    api_endpoint = Column(String(255), nullable=False)
    input_schema = Column(JSON, nullable=True)   # 输入参数 schema
    output_schema = Column(JSON, nullable=True)  # 输出参数 schema
    example_input = Column(Text, nullable=True)
    example_output = Column(Text, nullable=True)

    # 定价
    pricing_model = Column(String(20), default=PricingModel.PER_CALL)
    price = Column(Float, default=0.0)  # 单价

    # 状态与统计
    status = Column(String(20), default=CapabilityStatus.ACTIVE)
    total_subscribers = Column(Integer, default=0)
    total_calls = Column(Integer, default=0)
    avg_response_time_ms = Column(Integer, default=0)
    success_rate = Column(Float, default=100.0)
    rating = Column(Float, default=5.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    agent = relationship("Agent", backref="capabilities")
    subscriptions = relationship("CapabilitySubscription", back_populates="capability", cascade="all, delete-orphan")


class CapabilitySubscription(Base):
    __tablename__ = "capability_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    capability_id = Column(Integer, ForeignKey("capabilities.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    api_key = Column(String(64), nullable=False)
    is_active = Column(Boolean, default=True)
    calls_used = Column(Integer, default=0)
    calls_limit = Column(Integer, default=10000)
    subscribed_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

    capability = relationship("Capability", back_populates="subscriptions")
    user = relationship("User", backref="capability_subscriptions")
