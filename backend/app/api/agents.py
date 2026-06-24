import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.agent import Agent
from app.schemas import AgentCreate, AgentUpdate, AgentResponse, AgentStatusUpdate
from app.auth import get_current_user

router = APIRouter(prefix="/api/agents", tags=["智能体"])


def generate_api_key() -> str:
    return f"ag_{secrets.token_hex(24)}"


@router.post("", response_model=AgentResponse)
async def create_agent(
    data: AgentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """注册新智能体"""
    api_key = generate_api_key()

    agent = Agent(
        owner_id=current_user.id,
        name=data.name,
        description=data.description,
        skills=data.skills,
        category=data.category,
        api_endpoint=data.api_endpoint,
        api_key=api_key,
        avatar_color=data.avatar_color,
        avatar_icon=data.avatar_icon,
        status="offline",
    )
    db.add(agent)

    # 更新用户角色为智能体拥有者
    current_user.role = "agent_owner"
    db.commit()
    db.refresh(agent)

    return AgentResponse.model_validate(agent)


@router.get("", response_model=List[AgentResponse])
async def list_agents(
    skill: str = None,
    status: str = None,
    db: Session = Depends(get_db)
):
    """获取智能体列表"""
    query = db.query(Agent)
    if skill:
        query = query.filter(Agent.skills.contains(skill))
    if status:
        query = query.filter(Agent.status == status)
    agents = query.order_by(Agent.rating.desc()).all()
    return [AgentResponse.model_validate(a) for a in agents]


@router.get("/online", response_model=List[AgentResponse])
async def list_online_agents(db: Session = Depends(get_db)):
    """获取在线智能体（市场展示用）"""
    agents = db.query(Agent).filter(Agent.status == "online").order_by(Agent.rating.desc()).all()
    return [AgentResponse.model_validate(a) for a in agents]


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: int, db: Session = Depends(get_db)):
    """获取智能体详情"""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在")
    return AgentResponse.model_validate(agent)


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: int,
    data: AgentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新智能体信息"""
    agent = db.query(Agent).filter(Agent.id == agent_id, Agent.owner_id == current_user.id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在或无权操作")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(agent, field, value)

    db.commit()
    db.refresh(agent)
    return AgentResponse.model_validate(agent)


@router.put("/{agent_id}/status", response_model=AgentResponse)
async def update_agent_status(
    agent_id: int,
    data: AgentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新智能体状态（上线/下线/忙碌）"""
    agent = db.query(Agent).filter(Agent.id == agent_id, Agent.owner_id == current_user.id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在或无权操作")

    agent.status = data.status
    db.commit()
    db.refresh(agent)
    return AgentResponse.model_validate(agent)


@router.get("/my/agents", response_model=List[AgentResponse])
async def get_my_agents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取我的智能体列表"""
    agents = db.query(Agent).filter(Agent.owner_id == current_user.id).all()
    return [AgentResponse.model_validate(a) for a in agents]
