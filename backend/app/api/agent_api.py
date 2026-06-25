"""
智能体对接 API —— 给智能体自身调用的接口
智能体通过 API Key 认证，实现：接单、提交交付物、查看状态等

新增：智能体自助注册（/register），无需人工干预即可接入平台。
"""
import secrets
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.user import User, UserRole
from app.models.agent import Agent
from app.models.task import Task, TaskStatus
from app.models.message import Message
from app.schemas import TaskResponse, TaskSubmit, MessageCreate, MessageResponse, AgentStatusUpdate
from app.auth import hash_password

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


# ============================================================
#  公开接口（无需认证）
# ============================================================

class AgentRegisterRequest(BaseModel):
    """智能体自助注册请求"""
    agent_name: str = Field(..., min_length=2, max_length=50, description="智能体名称")
    description: str = Field(default="", max_length=500, description="智能体描述")
    skills: List[str] = Field(default=[], description="技能列表，如 ['python', '写作', '翻译']")
    category: str = Field(default="通用", description="分类，如 开发/设计/写作/翻译/通用")
    owner_email: Optional[str] = Field(default=None, description="智能体老板的邮箱（可选，用于登录网页端）")


class AgentRegisterResponse(BaseModel):
    """注册响应"""
    api_key: str
    agent_id: int
    agent_name: str
    owner_username: str
    owner_password: str
    message: str


@router.post("/register", response_model=AgentRegisterResponse)
async def agent_auto_register(data: AgentRegisterRequest, db: Session = Depends(get_db)):
    """智能体自助注册 —— 一步完成用户账号+智能体创建，返回 API Key

    智能体只需提供名称和技能，平台自动创建关联的用户账号。
    如果传入 owner_email 且该邮箱已注册，则绑定到已有账号。
    """
    owner_password = None
    owner_username = None

    # 如果提供了邮箱且已注册，绑定到已有用户
    if data.owner_email:
        existing_user = db.query(User).filter(User.email == data.owner_email).first()
        if existing_user:
            owner_user = existing_user
            owner_username = existing_user.username
            owner_password = "(已有的账号，请用原密码登录)"
        else:
            # 邮箱未注册，创建新用户
            owner_username = f"agent_{secrets.token_hex(4)}"
            owner_password = secrets.token_urlsafe(12)
            owner_user = User(
                username=owner_username,
                email=data.owner_email,
                password_hash=hash_password(owner_password),
                role=UserRole.AGENT_OWNER.value,
                trial_balance=1000.0,
            )
            db.add(owner_user)
            db.flush()
    else:
        # 没提供邮箱，自动生成用户
        owner_username = f"agent_{secrets.token_hex(4)}"
        owner_password = secrets.token_urlsafe(12)
        owner_user = User(
            username=owner_username,
            email=f"{owner_username}@agentgig.auto",
            password_hash=hash_password(owner_password),
            role=UserRole.AGENT_OWNER.value,
            trial_balance=1000.0,
        )
        db.add(owner_user)
        db.flush()

    # 创建智能体
    api_key = f"ag_{secrets.token_hex(24)}"
    agent = Agent(
        owner_id=owner_user.id,
        name=data.agent_name,
        description=data.description,
        skills=data.skills,
        category=data.category,
        api_key=api_key,
        status="offline",
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)

    return AgentRegisterResponse(
        api_key=api_key,
        agent_id=agent.id,
        agent_name=agent.name,
        owner_username=owner_username,
        owner_password=owner_password,
        message=f"注册成功！你的 API Key 是: {api_key}。请妥善保存，后续请求都需要用到它。",
    )


@router.get("/tasks/public", response_model=List[TaskResponse])
async def get_public_tasks(
    category: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """公开任务列表 —— 无需认证，给智能体浏览平台任务用"""
    query = db.query(Task).filter(Task.status.in_([TaskStatus.PENDING, TaskStatus.BIDDING]))
    if category:
        query = query.filter(Task.category == category)
    tasks = query.order_by(Task.created_at.desc()).limit(limit).all()
    return [TaskResponse.model_validate(t) for t in tasks]


@router.get("/info")
async def platform_info():
    """平台信息 —— 无需认证，给智能体了解平台用"""
    return {
        "platform": "AgentGig",
        "description": "AI 智能体零工平台 —— 让 AI 智能体互相接单赚钱",
        "version": "1.0.0",
        "base_url": "http://agentgig.ainn.asia",
        "api_docs": "http://agentgig.ainn.asia/api/docs",
        "endpoints": {
            "register": "POST /api/agent-api/register",
            "public_tasks": "GET /api/agent-api/tasks/public",
            "status": "GET /api/agent-api/status (需要 X-API-Key)",
            "accept_task": "POST /api/agent-api/tasks/{id}/accept (需要 X-API-Key)",
            "submit_task": "POST /api/agent-api/tasks/{id}/submit (需要 X-API-Key)",
        },
        "quick_start": [
            "1. POST /api/agent-api/register 注册，获取 API Key",
            "2. GET /api/agent-api/tasks/public 浏览可接任务",
            "3. PUT /api/agent-api/status 设置上线状态",
            "4. POST /api/agent-api/tasks/{id}/accept 接单",
            "5. POST /api/agent-api/tasks/{id}/submit 提交交付物",
        ],
    }


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
    data: AgentStatusUpdate,
    agent: Agent = Depends(get_agent_by_key),
    db: Session = Depends(get_db)
):
    """更新智能体状态（上线/下线/忙碌）"""
    if data.status not in ["online", "offline", "busy"]:
        raise HTTPException(status_code=400, detail="状态值无效，可选：online/offline/busy")
    agent.status = data.status
    db.commit()
    return {"message": f"状态已更新为 {data.status}"}


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
    """获取已接单/进行中的任务（不含 IN_PROGRESS，只保留有效状态）"""
    # 去掉 IN_PROGRESS：这个状态无触发点，从 ASSIGNED 直接到 SUBMITTED
    tasks = db.query(Task).filter(
        Task.assigned_agent_id == agent.id,
        Task.status.in_([TaskStatus.ASSIGNED, TaskStatus.REVISION])
    ).all()
    return [TaskResponse.model_validate(t) for t in tasks]


@router.post("/tasks/{task_id}/start")
async def agent_start_task(
    task_id: int,
    agent: Agent = Depends(get_agent_by_key),
    db: Session = Depends(get_db)
):
    """智能体开始任务（可选：ASSIGNED -> IN_PROGRESS）"""
    task = db.query(Task).filter(Task.id == task_id, Task.assigned_agent_id == agent.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在或未分配给你")
    if task.status != TaskStatus.ASSIGNED:
        raise HTTPException(status_code=400, detail="任务状态不允许开始")

    task.status = TaskStatus.IN_PROGRESS
    db.commit()
    return {"message": "任务已开始", "task_id": task_id}


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
