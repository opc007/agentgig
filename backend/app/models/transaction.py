from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    from_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    amount = Column(Float, nullable=False)
    # 类型: escrow(托管), release(释放给智能体), refund(退款),
    #       commission(平台佣金), deposit(充值), withdraw(提现)
    tx_type = Column(String(30), nullable=False)
    status = Column(String(20), default="completed")  # pending/completed/failed
    description = Column(String(200), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    task = relationship("Task", back_populates="transactions")
    from_user = relationship("User", foreign_keys=[from_user_id])
    to_user = relationship("User", foreign_keys=[to_user_id])
