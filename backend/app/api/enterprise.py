"""
企业版 API —— 企业账号、团队成员管理、批量发布任务
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from app.database import get_db
from app.models.user import User, UserRole
from app.models.enterprise import Enterprise, EnterpriseMember
from app.models.task import Task, TaskStatus
from app.models.transaction import Transaction
from app.schemas import (
    EnterpriseCreate, EnterpriseResponse, EnterpriseMemberResponse,
    InviteMemberRequest, UpdateMemberRequest, BatchTaskCreate,
)
from app.auth import get_current_user

router = APIRouter(prefix="/api/enterprise", tags=["企业版"])

PLATFORM_FEE_RATE = 0.10


# ========== 企业管理 ==========

@router.post("", response_model=EnterpriseResponse)
async def create_enterprise(
    data: EnterpriseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建企业账号"""
    # 检查是否已有企业
    existing = db.query(Enterprise).filter(Enterprise.owner_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="你已创建过企业账号")

    # 更新用户角色
    current_user.role = UserRole.ENTERPRISE

    enterprise = Enterprise(
        owner_id=current_user.id,
        name=data.name,
        description=data.description,
        industry=data.industry,
        website=data.website,
        contact_name=data.contact_name,
        contact_phone=data.contact_phone,
        contact_email=data.contact_email,
    )
    db.add(enterprise)
    db.flush()

    # 将创建者添加为 owner 成员
    member = EnterpriseMember(
        enterprise_id=enterprise.id,
        user_id=current_user.id,
        role="owner",
        can_publish_tasks=True,
        can_manage_members=True,
        can_view_finances=True,
        joined_at=datetime.utcnow(),
    )
    db.add(member)
    db.commit()
    db.refresh(enterprise)

    return EnterpriseResponse(
        id=enterprise.id,
        owner_id=enterprise.owner_id,
        name=enterprise.name,
        description=enterprise.description,
        industry=enterprise.industry,
        website=enterprise.website,
        is_verified=enterprise.is_verified,
        credit_limit=enterprise.credit_limit,
        used_credit=enterprise.used_credit,
        max_members=enterprise.max_members,
        member_count=1,
        created_at=enterprise.created_at,
    )


@router.get("/me", response_model=EnterpriseResponse)
async def get_my_enterprise(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取我的企业信息"""
    enterprise = db.query(Enterprise).filter(Enterprise.owner_id == current_user.id).first()
    if not enterprise:
        raise HTTPException(status_code=404, detail="你还没有创建企业")

    member_count = db.query(EnterpriseMember).filter(
        EnterpriseMember.enterprise_id == enterprise.id
    ).count()

    return EnterpriseResponse(
        id=enterprise.id,
        owner_id=enterprise.owner_id,
        name=enterprise.name,
        description=enterprise.description,
        industry=enterprise.industry,
        website=enterprise.website,
        is_verified=enterprise.is_verified,
        credit_limit=enterprise.credit_limit,
        used_credit=enterprise.used_credit,
        max_members=enterprise.max_members,
        member_count=member_count,
        created_at=enterprise.created_at,
    )


# ========== 成员管理 ==========

@router.get("/members", response_model=List[EnterpriseMemberResponse])
async def get_members(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取企业成员列表"""
    enterprise = db.query(Enterprise).filter(Enterprise.owner_id == current_user.id).first()
    if not enterprise:
        raise HTTPException(status_code=404, detail="企业不存在")

    members = db.query(EnterpriseMember).filter(
        EnterpriseMember.enterprise_id == enterprise.id
    ).all()

    result = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        result.append(EnterpriseMemberResponse(
            id=m.id,
            user_id=m.user_id,
            username=user.username if user else "未知",
            email=user.email if user else "",
            role=m.role,
            can_publish_tasks=m.can_publish_tasks,
            can_manage_members=m.can_manage_members,
            can_view_finances=m.can_view_finances,
            joined_at=m.joined_at,
        ))

    return result


@router.post("/members/invite")
async def invite_member(
    data: InviteMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """邀请成员加入企业"""
    enterprise = db.query(Enterprise).filter(Enterprise.owner_id == current_user.id).first()
    if not enterprise:
        raise HTTPException(status_code=404, detail="企业不存在")

    # 查找被邀请用户
    invite_user = db.query(User).filter(User.email == data.email).first()
    if not invite_user:
        raise HTTPException(status_code=404, detail="未找到该邮箱对应的用户")

    # 检查是否已是成员
    existing = db.query(EnterpriseMember).filter(
        EnterpriseMember.enterprise_id == enterprise.id,
        EnterpriseMember.user_id == invite_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="该用户已是企业成员")

    # 检查成员上限
    member_count = db.query(EnterpriseMember).filter(
        EnterpriseMember.enterprise_id == enterprise.id
    ).count()
    if member_count >= enterprise.max_members:
        raise HTTPException(status_code=400, detail=f"已达成员上限（{enterprise.max_members}人）")

    member = EnterpriseMember(
        enterprise_id=enterprise.id,
        user_id=invite_user.id,
        role=data.role,
        invited_by=current_user.id,
        joined_at=datetime.utcnow(),
    )
    db.add(member)
    db.commit()

    return {"message": f"已邀请 {invite_user.username} 加入企业", "user_id": invite_user.id}


@router.put("/members/{member_id}")
async def update_member(
    member_id: int,
    data: UpdateMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新成员权限"""
    enterprise = db.query(Enterprise).filter(Enterprise.owner_id == current_user.id).first()
    if not enterprise:
        raise HTTPException(status_code=404, detail="企业不存在")

    member = db.query(EnterpriseMember).filter(
        EnterpriseMember.id == member_id,
        EnterpriseMember.enterprise_id == enterprise.id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="成员不存在")

    if member.role == "owner":
        raise HTTPException(status_code=400, detail="不能修改企业所有者权限")

    if data.role is not None:
        member.role = data.role
    if data.can_publish_tasks is not None:
        member.can_publish_tasks = data.can_publish_tasks
    if data.can_manage_members is not None:
        member.can_manage_members = data.can_manage_members
    if data.can_view_finances is not None:
        member.can_view_finances = data.can_view_finances

    db.commit()
    return {"message": "成员权限已更新"}


@router.delete("/members/{member_id}")
async def remove_member(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """移除企业成员"""
    enterprise = db.query(Enterprise).filter(Enterprise.owner_id == current_user.id).first()
    if not enterprise:
        raise HTTPException(status_code=404, detail="企业不存在")

    member = db.query(EnterpriseMember).filter(
        EnterpriseMember.id == member_id,
        EnterpriseMember.enterprise_id == enterprise.id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="成员不存在")

    if member.role == "owner":
        raise HTTPException(status_code=400, detail="不能移除企业所有者")

    db.delete(member)
    db.commit()
    return {"message": "成员已移除"}


# ========== 批量发布任务 ==========

@router.post("/tasks/batch")
async def batch_create_tasks(
    data: BatchTaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """批量发布任务（企业功能，支持企业信用额度和个人余额）"""
    enterprise = db.query(Enterprise).filter(Enterprise.owner_id == current_user.id).first()
    if not enterprise:
        raise HTTPException(status_code=404, detail="需要企业账号才能使用此功能")

    # 检查成员是否有发布权限
    member = db.query(EnterpriseMember).filter(
        EnterpriseMember.enterprise_id == enterprise.id,
        EnterpriseMember.user_id == current_user.id,
    ).first()
    if not member or not member.can_publish_tasks:
        raise HTTPException(status_code=403, detail="你没有发布任务的权限")

    # 计算总预算
    total_budget = sum(t.budget for t in data.tasks)
    total_fee = round(total_budget * PLATFORM_FEE_RATE, 2)

    # 企业可用信用额度
    enterprise_available = max(0, enterprise.credit_limit - enterprise.used_credit)
    personal_available = current_user.trial_balance + current_user.balance
    total_available = enterprise_available + personal_available

    if total_available < total_budget:
        raise HTTPException(
            status_code=400,
            detail=f"可用资金不足，需要 ¥{total_budget:.2f}，企业信用剩余 ¥{enterprise_available:.2f}，个人余额 ¥{personal_available:.2f}"
        )

    # 优先使用企业信用额度
    remaining = total_budget
    if enterprise_available >= remaining:
        # 全部用企业信用
        enterprise.used_credit += remaining
        remaining = 0
    elif enterprise_available > 0:
        # 部分用企业信用
        enterprise.used_credit += enterprise_available
        remaining -= enterprise_available
        # 剩余从个人余额扣
        if current_user.trial_balance >= remaining:
            current_user.trial_balance -= remaining
        else:
            remaining -= current_user.trial_balance
            current_user.trial_balance = 0
            current_user.balance -= remaining
    else:
        # 全部用个人余额
        if current_user.trial_balance >= remaining:
            current_user.trial_balance -= remaining
        else:
            remaining -= current_user.trial_balance
            current_user.trial_balance = 0
            current_user.balance -= remaining

    current_user.frozen_balance += total_budget

    # 批量创建任务
    created_tasks = []
    for task_data in data.tasks:
        platform_fee = round(task_data.budget * PLATFORM_FEE_RATE, 2)
        task = Task(
            publisher_id=current_user.id,
            title=task_data.title,
            description=task_data.description,
            category=task_data.category,
            sub_category=task_data.sub_category,
            required_skills=task_data.required_skills,
            budget=task_data.budget,
            platform_fee_rate=PLATFORM_FEE_RATE,
            platform_fee=platform_fee,
            agent_income=task_data.budget - platform_fee,
            deadline=task_data.deadline,
            status=TaskStatus.PENDING,
        )
        db.add(task)
        created_tasks.append(task)

    # 记录交易
    tx = Transaction(
        from_user_id=current_user.id,
        amount=total_budget,
        tx_type="escrow",
        status="completed",
        description=f"企业批量托管 {len(data.tasks)} 个任务"
    )
    db.add(tx)

    db.commit()

    return {
        "message": f"成功发布 {len(created_tasks)} 个任务",
        "count": len(created_tasks),
        "total_budget": total_budget,
        "total_fee": total_fee,
        "enterprise_used_credit": enterprise.used_credit,
    }


# ========== 企业统计 ==========

@router.get("/stats")
async def get_enterprise_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取企业统计数据"""
    enterprise = db.query(Enterprise).filter(Enterprise.owner_id == current_user.id).first()
    if not enterprise:
        raise HTTPException(status_code=404, detail="企业不存在")

    # 获取企业成员 IDs
    member_ids = [m.user_id for m in db.query(EnterpriseMember).filter(
        EnterpriseMember.enterprise_id == enterprise.id
    ).all()]

    # 任务统计
    total_tasks = db.query(Task).filter(Task.publisher_id.in_(member_ids)).count()
    completed_tasks = db.query(Task).filter(
        Task.publisher_id.in_(member_ids),
        Task.status == TaskStatus.COMPLETED,
    ).count()

    # 成员数
    member_count = len(member_ids)

    return {
        "enterprise_name": enterprise.name,
        "member_count": member_count,
        "max_members": enterprise.max_members,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "credit_limit": enterprise.credit_limit,
        "used_credit": enterprise.used_credit,
        "is_verified": enterprise.is_verified,
    }
