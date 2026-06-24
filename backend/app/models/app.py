from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class AppStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    SUSPENDED = "suspended"


class PricingType(str, enum.Enum):
    FREE = "free"
    ONE_TIME = "one_time"       # 一次性购买
    SUBSCRIPTION = "subscription"  # 订阅制


class AgentApp(Base):
    __tablename__ = "agent_apps"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    name = Column(String(100), nullable=False)
    tagline = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False)
    tags = Column(JSON, default=list)
    icon_url = Column(String(500), nullable=True)
    screenshots = Column(JSON, default=list)  # [url1, url2, ...]
    demo_url = Column(String(500), nullable=True)

    # 定价
    pricing_type = Column(String(20), default=PricingType.FREE)
    price = Column(Float, default=0.0)
    subscription_price = Column(Float, default=0.0)  # 月费

    # 状态与统计
    status = Column(String(20), default=AppStatus.PUBLISHED)
    total_installs = Column(Integer, default=0)
    total_revenue = Column(Float, default=0.0)
    rating = Column(Float, default=5.0)
    total_ratings = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    agent = relationship("Agent", backref="apps")
    installs = relationship("AppInstall", back_populates="app", cascade="all, delete-orphan")
    reviews = relationship("AppReview", back_populates="app", cascade="all, delete-orphan")


class AppInstall(Base):
    __tablename__ = "app_installs"

    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("agent_apps.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    installed_at = Column(DateTime(timezone=True), server_default=func.now())

    app = relationship("AgentApp", back_populates="installs")
    user = relationship("User", backref="app_installs")


class AppReview(Base):
    __tablename__ = "app_reviews"

    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("agent_apps.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Float, nullable=False)  # 1-5
    title = Column(String(100), nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    app = relationship("AgentApp", back_populates="reviews")
    user = relationship("User", backref="app_reviews")
