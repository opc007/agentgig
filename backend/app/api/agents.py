import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.agent import Agent, calc_certification, CERTIFICATION_RULES, CertificationLevel
from app.models.rating import Rating
from app.schemas import AgentCreate, AgentUpdate, AgentResponse, AgentStatusUpdate, CertificationInfo
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


CERT_LEVEL_META = {
    CertificationLevel.NONE: {"label": "未认证", "color": "#9CA3AF", "icon": "⚪"},
    CertificationLevel.BASIC: {"label": "基础认证", "color": "#3B82F6", "icon": "🔵"},
    CertificationLevel.PROFESSIONAL: {"label": "专业认证", "color": "#8B5CF6", "icon": "🟣"},
    CertificationLevel.EXPERT: {"label": "专家认证", "color": "#F59E0B", "icon": "🟡"},
}

LEVEL_ORDER = [CertificationLevel.NONE, CertificationLevel.BASIC, CertificationLevel.PROFESSIONAL, CertificationLevel.EXPERT]


@router.get("/{agent_id}/certification", response_model=CertificationInfo)
async def get_agent_certification(
    agent_id: int,
    db: Session = Depends(get_db)
):
    """获取智能体认证信息"""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在")

    now = datetime.now(timezone.utc)
    created_at = agent.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    days = (now - created_at).days

    current_level = agent.certification_level or CertificationLevel.NONE
    meta = CERT_LEVEL_META.get(current_level, CERT_LEVEL_META[CertificationLevel.NONE])

    # 找到下一个等级
    current_idx = LEVEL_ORDER.index(current_level) if current_level in LEVEL_ORDER else 0
    next_level = LEVEL_ORDER[current_idx + 1] if current_idx < len(LEVEL_ORDER) - 1 else None
    next_requirements = CERTIFICATION_RULES.get(next_level) if next_level else None

    return CertificationInfo(
        level=current_level,
        label=meta["label"],
        color=meta["color"],
        icon=meta["icon"],
        completed_tasks=agent.completed_tasks,
        rating=agent.rating,
        days_since_register=days,
        next_level=next_level,
        next_level_requirements=next_requirements,
    )


@router.post("/{agent_id}/certification/refresh")
async def refresh_certification(
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """手动刷新智能体认证等级（自动升级）"""
    agent = db.query(Agent).filter(Agent.id == agent_id, Agent.owner_id == current_user.id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在或无权操作")

    old_level = agent.certification_level
    new_level = calc_certification(agent.completed_tasks, agent.rating, agent.created_at)
    agent.certification_level = new_level
    db.commit()

    upgraded = LEVEL_ORDER.index(new_level) > LEVEL_ORDER.index(old_level) if old_level in LEVEL_ORDER and new_level in LEVEL_ORDER else False
    meta = CERT_LEVEL_META.get(new_level, CERT_LEVEL_META[CertificationLevel.NONE])
    return {
        "certification_level": new_level,
        "label": meta["label"],
        "upgraded": upgraded,
        "message": f"恭喜升级为「{meta['label']}」！" if upgraded else f"当前认证等级：{meta['label']}",
    }
