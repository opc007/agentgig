from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.user import User
from app.models.agent import Agent
from app.models.task import Task, TaskStatus
from app.models.transaction import Transaction
from app.models.message import Message
from app.schemas import TaskCreate, TaskResponse, TaskBid, TaskSubmit, MessageCreate, MessageResponse
from app.auth import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["任务"])

PLATFORM_FEE_RATE = 0.10


@router.post("", response_model=TaskResponse)
async def create_task(
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """发布新任务（发包）"""
    platform_fee = data.budget * PLATFORM_FEE_RATE

    if current_user.balance < data.budget:
        raise HTTPException(status_code=400, detail=f"余额不足，需要 {data.budget}，当前余额 {current_user.balance}")

    current_user.balance -= data.budget
    current_user.frozen_balance += data.budget

    task = Task(
        publisher_id=current_user.id,
        title=data.title,
        description=data.description,
        category=data.category,
        required_skills=data.required_skills,
        requirements=data.requirements,
        budget=data.budget,
        platform_fee_rate=PLATFORM_FEE_RATE,
        platform_fee=platform_fee,
        agent_income=data.budget - platform_fee,
        deadline=data.deadline,
        estimated_hours=data.estimated_hours,
        status=TaskStatus.PENDING,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    tx = Transaction(
        task_id=task.id,
        from_user_id=current_user.id,
        amount=data.budget,
        tx_type="escrow",
        status="completed",
        description=f"任务托管: {data.title}"
    )
    db.add(tx)
    db.commit()

    return TaskResponse.model_validate(task)


@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    status: Optional[str] = None,
    category: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """获取任务列表"""
    query = db.query(Task)
    if status:
        query = query.filter(Task.status == status)
    if category:
        query = query.filter(Task.category == category)
    tasks = query.order_by(Task.created_at.desc()).offset(skip).limit(limit).all()
    return [TaskResponse.model_validate(t) for t in tasks]


@router.get("/pending", response_model=List[TaskResponse])
async def list_pending_tasks(db: Session = Depends(get_db)):
    """获取待接单任务（公告栏展示）"""
    tasks = db.query(Task).filter(
        Task.status.in_([TaskStatus.PENDING, TaskStatus.BIDDING])
    ).order_by(Task.created_at.desc()).all()
    return [TaskResponse.model_validate(t) for t in tasks]


@router.get("/my/published", response_model=List[TaskResponse])
async def get_my_published_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取我发布的任务"""
    tasks = db.query(Task).filter(Task.publisher_id == current_user.id).order_by(Task.created_at.desc()).all()
    return [TaskResponse.model_validate(t) for t in tasks]


@router.get("/my/accepted", response_model=List[TaskResponse])
async def get_my_accepted_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取我的智能体参与的任务"""
    agent_ids = [a.id for a in db.query(Agent).filter(Agent.owner_id == current_user.id).all()]
    if not agent_ids:
        return []
    tasks = db.query(Task).filter(Task.assigned_agent_id.in_(agent_ids)).order_by(Task.created_at.desc()).all()
    return [TaskResponse.model_validate(t) for t in tasks]


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: int, db: Session = Depends(get_db)):
    """获取任务详情"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/bid")
async def bid_task(
    task_id: int,
    data: TaskBid,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """智能体竞标任务"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    if task.status not in [TaskStatus.PENDING, TaskStatus.BIDDING]:
        raise HTTPException(status_code=400, detail="该任务已不可竞标")

    agent = db.query(Agent).filter(Agent.id == data.agent_id, Agent.owner_id == current_user.id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在或不属于你")
    if agent.status != "online":
        raise HTTPException(status_code=400, detail="智能体需要在线才能竞标")

    bids = task.bids or []
    if any(b.get("agent_id") == data.agent_id for b in bids):
        raise HTTPException(status_code=400, detail="该智能体已竞标过此任务")

    bid_record = {
        "agent_id": data.agent_id,
        "agent_name": agent.name,
        "price": data.price,
        "message": data.message,
        "estimated_hours": data.estimated_hours,
        "bid_at": datetime.utcnow().isoformat()
    }
    bids.append(bid_record)
    task.bids = bids
    task.status = TaskStatus.BIDDING
    db.commit()

    return {"message": "竞标成功", "bid": bid_record}


@router.post("/{task_id}/accept/{agent_id}")
async def accept_bid(
    task_id: int,
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """用户选择某个智能体接单"""
    task = db.query(Task).filter(Task.id == task_id, Task.publisher_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在或无权操作")
    if task.status != TaskStatus.BIDDING:
        raise HTTPException(status_code=400, detail="任务状态不允许此操作")

    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在")

    task.assigned_agent_id = agent_id
    task.status = TaskStatus.ASSIGNED
    task.assigned_at = datetime.utcnow()
    agent.status = "busy"
    db.commit()

    return {"message": f"已选择 {agent.name} 接单", "task_id": task_id}


@router.post("/{task_id}/submit")
async def submit_deliverable(
    task_id: int,
    data: TaskSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """提交交付物"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    if task.status not in [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.REVISION]:
        raise HTTPException(status_code=400, detail="任务状态不允许提交")

    agent = db.query(Agent).filter(Agent.id == task.assigned_agent_id, Agent.owner_id == current_user.id).first()
    if not agent:
        raise HTTPException(status_code=403, detail="无权操作此任务")

    task.deliverable_url = data.deliverable_url
    task.deliverable_note = data.deliverable_note
    task.submitted_at = datetime.utcnow()
    task.status = TaskStatus.SUBMITTED
    db.commit()

    return {"message": "交付物已提交，等待用户验收"}


@router.post("/{task_id}/approve")
async def approve_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """验收通过（确认付款）"""
    task = db.query(Task).filter(Task.id == task_id, Task.publisher_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在或无权操作")
    if task.status != TaskStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="任务尚未提交交付物")

    agent = db.query(Agent).filter(Agent.id == task.assigned_agent_id).first()
    agent_owner = db.query(User).filter(User.id == agent.owner_id).first()

    current_user.frozen_balance -= task.budget
    agent_owner.balance += task.agent_income
    agent.total_earnings += task.agent_income
    agent.completed_tasks += 1
    agent.status = "online"

    task.status = TaskStatus.COMPLETED
    task.completed_at = datetime.utcnow()

    db.add(Transaction(task_id=task.id, to_user_id=agent_owner.id, amount=task.agent_income, tx_type="release", description=f"任务结算: {task.title}"))
    db.add(Transaction(task_id=task.id, from_user_id=current_user.id, amount=task.platform_fee, tx_type="commission", description=f"平台佣金: {task.title}"))
    db.commit()

    return {"message": "验收通过，已完成结算", "agent_income": task.agent_income, "platform_fee": task.platform_fee}


@router.post("/{task_id}/reject")
async def reject_task(
    task_id: int,
    reason: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """要求返工"""
    task = db.query(Task).filter(Task.id == task_id, Task.publisher_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在或无权操作")
    if task.status != TaskStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="任务尚未提交交付物")

    if task.revision_count >= task.max_revisions:
        task.status = TaskStatus.DISPUTED
        db.commit()
        return {"message": "已超过最大返工次数，进入争议处理"}

    task.revision_count += 1
    task.status = TaskStatus.REVISION
    db.commit()

    return {"message": f"已要求返工（第{task.revision_count}次）"}


@router.post("/{task_id}/cancel")
async def cancel_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """取消任务"""
    task = db.query(Task).filter(Task.id == task_id, Task.publisher_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在或无权操作")
    if task.status not in [TaskStatus.PENDING, TaskStatus.BIDDING]:
        raise HTTPException(status_code=400, detail="任务已被接单，无法取消")

    current_user.balance += task.budget
    current_user.frozen_balance -= task.budget
    task.status = TaskStatus.CANCELLED
    db.add(Transaction(task_id=task.id, to_user_id=current_user.id, amount=task.budget, tx_type="refund", description=f"任务取消退款: {task.title}"))
    db.commit()

    return {"message": "任务已取消，资金已退还"}


@router.get("/{task_id}/messages", response_model=List[MessageResponse])
async def get_task_messages(task_id: int, db: Session = Depends(get_db)):
    messages = db.query(Message).filter(Message.task_id == task_id).order_by(Message.created_at).all()
    return [MessageResponse.model_validate(m) for m in messages]


@router.post("/{task_id}/messages", response_model=MessageResponse)
async def send_message(
    task_id: int,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    msg = Message(task_id=task_id, sender_id=current_user.id, sender_type="user", sender_name=current_user.username, content=data.content, message_type=data.message_type)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return MessageResponse.model_validate(msg)


@router.get("/transactions")
async def get_my_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取我的交易记录"""
    from app.schemas import TransactionResponse
    txs = db.query(Transaction).filter(
        (Transaction.from_user_id == current_user.id) | (Transaction.to_user_id == current_user.id)
    ).order_by(Transaction.created_at.desc()).limit(50).all()
    result = []
    for tx in txs:
        tx_dict = TransactionResponse.model_validate(tx).model_dump()
        tx_dict["direction"] = "in" if tx.to_user_id == current_user.id else "out"
        result.append(tx_dict)
    return result
