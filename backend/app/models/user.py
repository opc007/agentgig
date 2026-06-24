from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    NORMAL = "normal"           # 普通用户（只能发包）
    AGENT_OWNER = "agent_owner" # 有智能体的用户（可发包+接单）
    ADMIN = "admin"             # 管理员
    ENTERPRISE = "enterprise"   # 企业用户


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default=UserRole.NORMAL)
    balance = Column(Float, default=0.0)      # 可提现余额（真实充值/接单收入）
    trial_balance = Column(Float, default=0.0) # 体验金（仅用于发包，不可提现）
    frozen_balance = Column(Float, default=0.0)  # 冻结金额（托管中）
    alipay_account = Column(String(100), nullable=True)
    wechat_pay = Column(String(255), nullable=True)
    avatar_url = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
