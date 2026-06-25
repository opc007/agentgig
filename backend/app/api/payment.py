"""
支付与提现 API —— 模拟支付系统
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from app.database import get_db
from app.models.user import User, UserRole
from app.models.transaction import Transaction
from app.models.withdrawal import Withdrawal, WithdrawalStatus, WithdrawalMethod
from app.schemas import (
    DepositRequest, DepositResponse,
    WithdrawRequest, WithdrawalReviewRequest, WithdrawResponse,
)
from app.auth import get_current_user

router = APIRouter(prefix="/api/payment", tags=["支付"])

MIN_WITHDRAW_AMOUNT = 100.0   # 最低提现金额
WITHDRAW_FEE_RATE = 0.01      # 提现手续费 1%
MAX_DEPOSIT_AMOUNT = 100000.0  # 单笔最高充值金额


# ========== 充值 ==========

@router.post("/deposit", response_model=DepositResponse)
async def deposit(
    data: DepositRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """模拟充值（直接到账真实余额，可提现）"""
    # 金额上限校验
    if data.amount > MAX_DEPOSIT_AMOUNT:
        raise HTTPException(
            status_code=400,
            detail=f"单笔充值金额不能超过 ¥{MAX_DEPOSIT_AMOUNT:.2f}"
        )

    current_user.balance += data.amount

    tx = Transaction(
        from_user_id=current_user.id,
        to_user_id=current_user.id,
        amount=data.amount,
        tx_type="deposit",
        status="completed",
        description=f"充值 ¥{data.amount:.2f}（{data.payment_method}）"
    )
    db.add(tx)
    db.commit()
    db.refresh(current_user)

    return DepositResponse(
        message=f"充值成功，到账 ¥{data.amount:.2f}",
        amount=data.amount,
        balance=current_user.balance,
        trial_balance=current_user.trial_balance,
    )


@router.get("/history")
async def get_deposit_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """获取充值记录"""
    txs = db.query(Transaction).filter(
        Transaction.to_user_id == current_user.id,
        Transaction.tx_type == "deposit",
    ).order_by(Transaction.created_at.desc()).offset(skip).limit(limit).all()

    return [{
        "id": tx.id,
        "amount": tx.amount,
        "status": tx.status,
        "description": tx.description,
        "created_at": tx.created_at.isoformat() if tx.created_at else None,
    } for tx in txs]


# ========== 提现 ==========

@router.post("/withdraw", response_model=WithdrawResponse)
async def withdraw(
    data: WithdrawRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """申请提现"""
    # 校验最低提现金额
    if data.amount < MIN_WITHDRAW_AMOUNT:
        raise HTTPException(
            status_code=400,
            detail=f"最低提现金额为 ¥{MIN_WITHDRAW_AMOUNT:.2f}"
        )

    # 计算手续费
    fee = round(data.amount * WITHDRAW_FEE_RATE, 2)
    actual_amount = round(data.amount - fee, 2)

    # 校验余额
    if current_user.balance < data.amount:
        raise HTTPException(
            status_code=400,
            detail=f"余额不足，当前余额 ¥{current_user.balance:.2f}，需提现 ¥{data.amount:.2f}"
        )

    # 校验收款方式
    valid_methods = [m.value for m in WithdrawalMethod]
    if data.method not in valid_methods:
        raise HTTPException(
            status_code=400,
            detail=f"收款方式无效，可选：{', '.join(valid_methods)}"
        )

    # 冻结提现金额
    current_user.balance -= data.amount

    # 创建提现记录
    withdrawal = Withdrawal(
        user_id=current_user.id,
        amount=data.amount,
        fee_rate=WITHDRAW_FEE_RATE,
        fee=fee,
        actual_amount=actual_amount,
        method=data.method,
        account=data.account,
        account_name=data.account_name,
        status=WithdrawalStatus.PENDING,
    )
    db.add(withdrawal)
    db.commit()
    db.refresh(withdrawal)

    # 创建交易记录，并关联提现ID
    tx = Transaction(
        from_user_id=current_user.id,
        amount=data.amount,
        tx_type="withdraw",
        status="pending",
        description=f"提现申请 ¥{data.amount:.2f}，手续费 ¥{fee:.2f}"
    )
    db.add(tx)
    db.commit()

    return WithdrawResponse(
        id=withdrawal.id,
        amount=withdrawal.amount,
        fee=withdrawal.fee,
        actual_amount=withdrawal.actual_amount,
        method=withdrawal.method,
        account=withdrawal.account,
        status=withdrawal.status,
        created_at=withdrawal.created_at,
    )


@router.get("/withdraw-history")
async def get_withdraw_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """获取提现记录"""
    withdrawals = db.query(Withdrawal).filter(
        Withdrawal.user_id == current_user.id,
    ).order_by(Withdrawal.created_at.desc()).offset(skip).limit(limit).all()

    return [{
        "id": w.id,
        "amount": w.amount,
        "fee": w.fee,
        "actual_amount": w.actual_amount,
        "method": w.method,
        "account": w.account,
        "account_name": w.account_name,
        "status": w.status,
        "reject_reason": w.reject_reason,
        "created_at": w.created_at.isoformat() if w.created_at else None,
        "reviewed_at": w.reviewed_at.isoformat() if w.reviewed_at else None,
    } for w in withdrawals]


# ========== 管理员审批提现 ==========

@router.get("/withdraw/pending")
async def get_pending_withdrawals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取待审批提现列表（管理员）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="需要管理员权限")

    withdrawals = db.query(Withdrawal).filter(
        Withdrawal.status == WithdrawalStatus.PENDING,
    ).order_by(Withdrawal.created_at.asc()).all()

    result = []
    for w in withdrawals:
        user = db.query(User).filter(User.id == w.user_id).first()
        result.append({
            "id": w.id,
            "user_id": w.user_id,
            "username": user.username if user else "未知",
            "email": user.email if user else "",
            "amount": w.amount,
            "fee": w.fee,
            "actual_amount": w.actual_amount,
            "method": w.method,
            "account": w.account,
            "account_name": w.account_name,
            "created_at": w.created_at.isoformat() if w.created_at else None,
        })

    return result


@router.put("/withdraw/{withdrawal_id}/approve")
async def review_withdrawal(
    withdrawal_id: int,
    data: WithdrawalReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """审批提现申请（管理员）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="需要管理员权限")

    withdrawal = db.query(Withdrawal).filter(Withdrawal.id == withdrawal_id).first()
    if not withdrawal:
        raise HTTPException(status_code=404, detail="提现记录不存在")

    if withdrawal.status != WithdrawalStatus.PENDING:
        raise HTTPException(status_code=400, detail="该提现已处理")

    user = db.query(User).filter(User.id == withdrawal.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    if data.action == "approve":
        withdrawal.status = WithdrawalStatus.APPROVED
        withdrawal.reviewed_by = current_user.id
        withdrawal.reviewed_at = datetime.utcnow()
        withdrawal.completed_at = datetime.utcnow()

        # 用提现记录ID精确查找关联的交易（避免多笔待处理提现时匹配错误）
        txs = db.query(Transaction).filter(
            Transaction.from_user_id == withdrawal.user_id,
            Transaction.tx_type == "withdraw",
            Transaction.status == "pending",
        ).order_by(Transaction.created_at.desc()).all()

        # 找到金额匹配的最近一笔交易
        matched_tx = None
        for tx in txs:
            if abs(tx.amount - withdrawal.amount) < 0.01:
                matched_tx = tx
                break

        if matched_tx:
            matched_tx.status = "completed"
        else:
            # 兜底：直接更新所有该用户的待处理提现交易
            for tx in txs:
                tx.status = "completed"

        # 平台收取手续费（记一笔佣金交易）
        platform_account = db.query(User).filter(User.role == "admin").first()
        if withdrawal.fee > 0:
            fee_tx = Transaction(
                from_user_id=withdrawal.user_id,
                to_user_id=platform_account.id if platform_account else None,
                amount=withdrawal.fee,
                tx_type="commission",
                status="completed",
                description=f"提现手续费 ¥{withdrawal.fee:.2f}"
            )
            db.add(fee_tx)

            if platform_account:
                platform_account.balance += withdrawal.fee

        db.commit()
        return {"message": f"已批准提现 ¥{withdrawal.actual_amount:.2f}，手续费 ¥{withdrawal.fee:.2f}"}

    elif data.action == "reject":
        withdrawal.status = WithdrawalStatus.REJECTED
        withdrawal.reject_reason = data.reject_reason or "管理员拒绝"
        withdrawal.reviewed_by = current_user.id
        withdrawal.reviewed_at = datetime.utcnow()

        # 退还余额
        user.balance += withdrawal.amount

        # 精确匹配并更新交易状态
        txs = db.query(Transaction).filter(
            Transaction.from_user_id == withdrawal.user_id,
            Transaction.tx_type == "withdraw",
            Transaction.status == "pending",
        ).order_by(Transaction.created_at.desc()).all()

        matched_tx = None
        for tx in txs:
            if abs(tx.amount - withdrawal.amount) < 0.01:
                matched_tx = tx
                break

        if matched_tx:
            matched_tx.status = "failed"
        else:
            for tx in txs:
                tx.status = "failed"

        db.commit()
        return {"message": f"已拒绝提现，¥{withdrawal.amount:.2f} 已退回用户余额"}

    else:
        raise HTTPException(status_code=400, detail="操作无效，可选：approve/reject")
