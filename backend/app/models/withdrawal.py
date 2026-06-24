from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class WithdrawalStatus(str, enum.Enum):
    PENDING = "pending"       # 待审批
    APPROVED = "approved"     # 已批准（已打款）
    REJECTED = "rejected"     # 已拒绝


class WithdrawalMethod(str, enum.Enum):
    ALIPAY = "alipay"         # 支付宝
    WECHAT = "wechat"         # 微信
    BANK = "bank"             # 银行卡


class Withdrawal(Base):
    __tablename__ = "withdrawals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # 金额信息
    amount = Column(Float, nullable=False)             # 申请提现金额
    fee_rate = Column(Float, default=0.01)             # 手续费比例 1%
    fee = Column(Float, default=0.0)                   # 实际手续费
    actual_amount = Column(Float, default=0.0)         # 实际到账金额

    # 收款方式
    method = Column(String(20), nullable=False)        # alipay/wechat/bank
    account = Column(String(200), nullable=False)      # 收款账号
    account_name = Column(String(50), nullable=True)   # 收款人姓名

    # 状态
    status = Column(String(20), default=WithdrawalStatus.PENDING)
    reject_reason = Column(String(500), nullable=True) # 拒绝原因

    # 审批信息
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # 关系
    user = relationship("User", foreign_keys=[user_id], backref="withdrawals")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
