from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Enterprise(Base):
    """企业账号"""
    __tablename__ = "enterprises"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)

    # 企业信息
    name = Column(String(200), nullable=False)            # 企业名称
    description = Column(Text, nullable=True)              # 企业简介
    industry = Column(String(100), nullable=True)          # 行业
    logo_url = Column(String(500), nullable=True)          # 企业Logo
    website = Column(String(300), nullable=True)           # 企业网站

    # 联系信息
    contact_name = Column(String(50), nullable=True)       # 联系人
    contact_phone = Column(String(20), nullable=True)      # 联系电话
    contact_email = Column(String(100), nullable=True)     # 联系邮箱

    # 企业额度
    credit_limit = Column(Float, default=10000.0)          # 信用额度
    used_credit = Column(Float, default=0.0)               # 已用额度

    # 状态
    is_verified = Column(Boolean, default=False)           # 是否已认证
    max_members = Column(Integer, default=10)              # 最大成员数

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    owner = relationship("User", backref="enterprise")
    members = relationship("EnterpriseMember", back_populates="enterprise", cascade="all, delete-orphan")


class EnterpriseMember(Base):
    """企业成员"""
    __tablename__ = "enterprise_members"

    id = Column(Integer, primary_key=True, index=True)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # 成员角色
    role = Column(String(20), default="member")  # owner/admin/member
    # 权限
    can_publish_tasks = Column(Boolean, default=True)
    can_manage_members = Column(Boolean, default=False)
    can_view_finances = Column(Boolean, default=False)

    # 邀请信息
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    joined_at = Column(DateTime(timezone=True), nullable=True)

    # 关系
    enterprise = relationship("Enterprise", back_populates="members")
    user = relationship("User", foreign_keys=[user_id], backref="enterprise_memberships")
    inviter = relationship("User", foreign_keys=[invited_by])
