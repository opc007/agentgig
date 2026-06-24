import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.agent import Agent
from app.models.capability import Capability, CapabilitySubscription, CapabilityStatus
from app.models.transaction import Transaction
from app.schemas import (
    CapabilityCreate, CapabilityUpdate, CapabilityResponse,
    CapabilitySubscriptionResponse,
)
from app.auth import get_current_user

router = APIRouter(prefix="/api/capabilities", tags=["能力市场"])


@router.post("", response_model=CapabilityResponse)
async def publish_capability(
    data: CapabilityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """发布智能体能力为 API"""
    agent = db.query(Agent).filter(
        Agent.id == data.agent_id,
        Agent.owner_id == current_user.id
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在或无权操作")

    capability = Capability(
        agent_id=agent.id,
        name=data.name,
        description=data.description,
        category=data.category,
        tags=data.tags,
        api_endpoint=data.api_endpoint,
        input_schema=data.input_schema,
        output_schema=data.output_schema,
        example_input=data.example_input,
        example_output=data.example_output,
        pricing_model=data.pricing_model,
        price=data.price,
    )
    db.add(capability)
    db.commit()
    db.refresh(capability)

    return _build_capability_response(capability, db)


@router.get("", response_model=List[CapabilityResponse])
async def list_capabilities(
    category: str = None,
    search: str = None,
    pricing_model: str = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """浏览能力市场"""
    query = db.query(Capability).filter(Capability.status == CapabilityStatus.ACTIVE)

    if category:
        query = query.filter(Capability.category == category)
    if search:
        query = query.filter(
            Capability.name.contains(search) | Capability.description.contains(search)
        )
    if pricing_model:
        query = query.filter(Capability.pricing_model == pricing_model)

    capabilities = query.order_by(Capability.total_subscribers.desc()).offset(skip).limit(limit).all()
    return [_build_capability_response(c, db) for c in capabilities]


@router.get("/{capability_id}", response_model=CapabilityResponse)
async def get_capability(
    capability_id: int,
    db: Session = Depends(get_db)
):
    """获取能力详情"""
    cap = db.query(Capability).filter(Capability.id == capability_id).first()
    if not cap:
        raise HTTPException(status_code=404, detail="能力不存在")
    return _build_capability_response(cap, db)


@router.put("/{capability_id}", response_model=CapabilityResponse)
async def update_capability(
    capability_id: int,
    data: CapabilityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新能力信息"""
    cap = db.query(Capability).join(Agent).filter(
        Capability.id == capability_id,
        Agent.owner_id == current_user.id
    ).first()
    if not cap:
        raise HTTPException(status_code=404, detail="能力不存在或无权操作")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cap, field, value)

    db.commit()
    db.refresh(cap)
    return _build_capability_response(cap, db)


@router.post("/{capability_id}/subscribe", response_model=CapabilitySubscriptionResponse)
async def subscribe_capability(
    capability_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """订阅能力"""
    cap = db.query(Capability).filter(Capability.id == capability_id).first()
    if not cap:
        raise HTTPException(status_code=404, detail="能力不存在")
    if cap.status != CapabilityStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="该能力暂不可订阅")

    existing = db.query(CapabilitySubscription).filter(
        CapabilitySubscription.capability_id == capability_id,
        CapabilitySubscription.user_id == current_user.id,
        CapabilitySubscription.is_active == True,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="你已订阅该能力")

    # 付费能力扣费
    if cap.pricing_model == "monthly" and cap.price > 0:
        if current_user.balance < cap.price and current_user.trial_balance < cap.price:
            raise HTTPException(status_code=400, detail="余额不足，请先充值")
        # 优先扣体验金
        if current_user.trial_balance >= cap.price:
            current_user.trial_balance -= cap.price
        else:
            current_user.balance -= cap.price
        # 转给能力所有者
        agent_owner = db.query(User).join(Agent).filter(Agent.id == cap.agent_id).first()
        if agent_owner:
            agent_owner.balance += cap.price * 0.9  # 平台抽 10%
        tx = Transaction(
            amount=cap.price,
            tx_type="capability_subscription",
            status="completed",
            description=f"订阅能力「{cap.name}」",
        )
        db.add(tx)

    sub_key = f"cap_{secrets.token_hex(20)}"
    sub = CapabilitySubscription(
        capability_id=capability_id,
        user_id=current_user.id,
        api_key=sub_key,
    )
    db.add(sub)
    cap.total_subscribers += 1
    db.commit()
    db.refresh(sub)

    return CapabilitySubscriptionResponse.model_validate(sub)


@router.get("/my/subscriptions", response_model=List[CapabilitySubscriptionResponse])
async def my_subscriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取我的能力订阅列表"""
    subs = db.query(CapabilitySubscription).filter(
        CapabilitySubscription.user_id == current_user.id,
        CapabilitySubscription.is_active == True,
    ).all()
    return [CapabilitySubscriptionResponse.model_validate(s) for s in subs]


@router.get("/my/published", response_model=List[CapabilityResponse])
async def my_published_capabilities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取我发布的能力列表"""
    caps = db.query(Capability).join(Agent).filter(
        Agent.owner_id == current_user.id
    ).all()
    return [_build_capability_response(c, db) for c in caps]


def _build_capability_response(cap: Capability, db: Session) -> CapabilityResponse:
    agent = db.query(Agent).filter(Agent.id == cap.agent_id).first()
    return CapabilityResponse(
        id=cap.id,
        agent_id=cap.agent_id,
        agent_name=agent.name if agent else None,
        name=cap.name,
        description=cap.description,
        category=cap.category,
        tags=cap.tags or [],
        api_endpoint=cap.api_endpoint,
        input_schema=cap.input_schema,
        output_schema=cap.output_schema,
        example_input=cap.example_input,
        example_output=cap.example_output,
        pricing_model=cap.pricing_model,
        price=cap.price,
        status=cap.status,
        total_subscribers=cap.total_subscribers,
        total_calls=cap.total_calls,
        avg_response_time_ms=cap.avg_response_time_ms,
        success_rate=cap.success_rate,
        rating=cap.rating,
        created_at=cap.created_at,
    )
