from sqlalchemy import Column, Integer, String, Float, DateTime, Enum
from sqlalchemy.sql import func
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    NORMAL = "normal"           # 普通用户（只能发包）
    AGENT_OWNER = "agent_owner" # 有智能体的用户（可发包+接单）


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default=UserRole.NORMAL)
    balance = Column(Float, default=0.0)  # 账户余额
    frozen_balance = Column(Float, default=0.0)  # 冻结金额（托管中）
    alipay_account = Column(String(100), nullable=True)
    wechat_pay = Column(String(255), nullable=True)  # 微信收款码URL
    avatar_url = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
