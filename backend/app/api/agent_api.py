"""
智能体对接 API —— 给智能体自身调用的接口
智能体通过 API Key 认证，实现：接单、提交交付物、查看状态等
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.user import User
from app.models.agent import Agent
from app.models.task import Task, TaskStatus
from app.models.message import Message
from app.schemas import TaskResponse, TaskSubmit, MessageCreate, MessageResponse

router = APIRouter(prefix="/api/agent-api", tags=["智能体API"])


async def get_agent_by_key(
    x_api_key: str = Header(..., alias="X-API-Key"),
    db: Session = Depends(get_db)
) -> Agent:
    """通过 API Key 认证智能体"""
    agent = db.query(Agent).filter(Agent.api_key == x_api_key).first()
    if not agent:
        raise HTTPException(status_code=401, detail="无效的 API Key")
    return agent


@router.get("/status")
async def agent_status(agent: Agent = Depends(get_agent_by_key)):
    """获取智能体自身状态"""
    return {
        "agent_id": agent.id,
        "name": agent.name,
        "status": agent.status,
        "completed_tasks": agent.completed_tasks,
        "total_earnings": agent.total_earnings,
        "rating": agent.rating,
    }


@router.put("/status")
async def update_agent_status(
    status: str,
    agent: Agent = Depends(get_agent_by_key),
    db: Session = Depends(get_db)
):
    """更新智能体状态（上线/下线/忙碌）"""
    if status not in ["online", "offline", "busy"]:
        raise HTTPException(status_code=400, detail="状态值无效，可选：online/offline/busy")
    agent.status = status
    db.commit()
    return {"message": f"状态已更新为 {status}"}


@router.get("/tasks/available", response_model=List[TaskResponse])
async def get_available_tasks(
    category: Optional[str] = None,
    agent: Agent = Depends(get_agent_by_key),
    db: Session = Depends(get_db)
):
    """获取可接的任务列表（匹配智能体技能）"""
    query = db.query(Task).filter(Task.status.in_([TaskStatus.PENDING, TaskStatus.BIDDING]))
    if category:
        query = query.filter(Task.category == category)
    tasks = query.order_by(Task.created_at.desc()).all()

    # 按技能匹配度排序
    agent_skills = set(agent.skills or [])
    def match_score(task):
        task_skills = set(task.required_skills or [])
        return len(agent_skills & task_skills)
    tasks.sort(key=match_score, reverse=True)

    return [TaskResponse.model_validate(t) for t in tasks]


@router.get("/tasks/assigned", response_model=List[TaskResponse])
async def get_assigned_tasks(
    agent: Agent = Depends(get_agent_by_key),
    db: Session = Depends(get_db)
):
    """获取已接单/进行中的任务"""
    tasks = db.query(Task).filter(
        Task.assigned_agent_id == agent.id,
        Task.status.in_([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.REVISION])
    ).all()
    return [TaskResponse.model_validate(t) for t in tasks]


@router.post("/tasks/{task_id}/accept")
async def agent_accept_task(
    task_id: int,
    agent: Agent = Depends(get_agent_by_key),
    db: Session = Depends(get_db)
):
    """智能体直接接单（无需竞标）"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    if task.status not in [TaskStatus.PENDING, TaskStatus.BIDDING]:
        raise HTTPException(status_code=400, detail="该任务已被接单")

    task.assigned_agent_id = agent.id
    task.status = TaskStatus.ASSIGNED
    task.assigned_at = datetime.utcnow()
    agent.status = "busy"
    db.commit()

    return {"message": "接单成功", "task_id": task_id}


@router.post("/tasks/{task_id}/submit")
async def agent_submit_task(
    task_id: int,
    data: TaskSubmit,
    agent: Agent = Depends(get_agent_by_key),
    db: Session = Depends(get_db)
):
    """智能体提交交付物"""
    task = db.query(Task).filter(Task.id == task_id, Task.assigned_agent_id == agent.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在或未分配给你")
    if task.status not in [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.REVISION]:
        raise HTTPException(status_code=400, detail="任务状态不允许提交")

    task.deliverable_url = data.deliverable_url
    task.deliverable_note = data.deliverable_note
    task.submitted_at = datetime.utcnow()
    task.status = TaskStatus.SUBMITTED
    db.commit()

    return {"message": "交付物已提交，等待用户验收"}


@router.post("/tasks/{task_id}/messages", response_model=MessageResponse)
async def agent_send_message(
    task_id: int,
    data: MessageCreate,
    agent: Agent = Depends(get_agent_by_key),
    db: Session = Depends(get_db)
):
    """智能体发送任务消息"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    msg = Message(
        task_id=task_id,
        sender_id=agent.id,
        sender_type="agent",
        sender_name=agent.name,
        content=data.content,
        message_type=data.message_type,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return MessageResponse.model_validate(msg)


@router.get("/tasks/{task_id}/messages", response_model=List[MessageResponse])
async def agent_get_messages(
    task_id: int,
    agent: Agent = Depends(get_agent_by_key),
    db: Session = Depends(get_db)
):
    """智能体获取任务消息"""
    messages = db.query(Message).filter(Message.task_id == task_id).order_by(Message.created_at).all()
    return [MessageResponse.model_validate(m) for m in messages]
