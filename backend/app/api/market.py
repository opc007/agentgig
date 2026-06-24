"""
API 市场 —— 提供统一的 API 浏览、调用和计费接口
"""
import time
import requests
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, Field
from app.database import get_db
from app.models.user import User
from app.models.agent import Agent
from app.models.capability import Capability, CapabilitySubscription, CapabilityStatus
from app.models.api_service import ApiCallLog
from app.models.transaction import Transaction
from app.auth import get_current_user

router = APIRouter(prefix="/api/market", tags=["API �场"])

PLATFORM_COMMISSION_RATE = 0.10  # 平台抽成 10%


# ========== 请求/响应模型 ==========

class ApiListItem(BaseModel):
    id: int
    agent_id: int
    agent_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    category: str
    tags: List[str] = []
    pricing_model: str
    price: float
    total_subscribers: int
    total_calls: int
    avg_response_time_ms: int
    success_rate: float
    rating: float
    is_subscribed: bool = False
    subscription_key: Optional[str] = None


class ApiListResponse(BaseModel):
    apis: List[ApiListItem]
    total: int


class ApiCallRequest(BaseModel):
    params: dict = Field(default_factory=dict, description="调用参数")


class ApiCallResponse(BaseModel):
    success: bool
    status_code: int
    data: Optional[dict] = None
    error: Optional[str] = None
    response_time_ms: int
    amount_charged: float
    remaining_calls: Optional[int] = None


class MyApiSubscription(BaseModel):
    id: int
    capability_id: int
    api_name: str
    agent_name: Optional[str] = None
    api_key: str
    is_active: bool
    calls_used: int
    calls_limit: int
    subscribed_at: datetime

    class Config:
        from_attributes = True


# ========== API 市场接口 ==========

@router.get("/apis", response_model=ApiListResponse)
async def list_market_apis(
    category: Optional[str] = None,
    search: Optional[str] = None,
    pricing_model: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """列出可用 API（标记当前用户是否已订阅）"""
    query = db.query(Capability).filter(Capability.status == CapabilityStatus.ACTIVE)

    if category:
        query = query.filter(Capability.category == category)
    if search:
        query = query.filter(
            Capability.name.contains(search) | Capability.description.contains(search)
        )
    if pricing_model:
        query = query.filter(Capability.pricing_model == pricing_model)

    total = query.count()
    capabilities = query.order_by(Capability.total_subscribers.desc()).offset(skip).limit(limit).all()

    # 获取当前用户的订阅
    user_subs = {
        sub.capability_id: sub
        for sub in db.query(CapabilitySubscription).filter(
            CapabilitySubscription.user_id == current_user.id,
            CapabilitySubscription.is_active == True,
        ).all()
    }

    apis = []
    for cap in capabilities:
        agent = db.query(Agent).filter(Agent.id == cap.agent_id).first()
        sub = user_subs.get(cap.id)
        apis.append(ApiListItem(
            id=cap.id,
            agent_id=cap.agent_id,
            agent_name=agent.name if agent else None,
            name=cap.name,
            description=cap.description,
            category=cap.category,
            tags=cap.tags or [],
            pricing_model=cap.pricing_model,
            price=cap.price,
            total_subscribers=cap.total_subscribers,
            total_calls=cap.total_calls,
            avg_response_time_ms=cap.avg_response_time_ms,
            success_rate=cap.success_rate,
            rating=cap.rating,
            is_subscribed=sub is not None,
            subscription_key=sub.api_key if sub else None,
        ))

    return ApiListResponse(apis=apis, total=total)


@router.get("/apis/{api_id}")
async def get_api_detail(
    api_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取 API 详情"""
    cap = db.query(Capability).filter(Capability.id == api_id).first()
    if not cap:
        raise HTTPException(status_code=404, detail="API 不存在")

    agent = db.query(Agent).filter(Agent.id == cap.agent_id).first()
    sub = db.query(CapabilitySubscription).filter(
        CapabilitySubscription.capability_id == api_id,
        CapabilitySubscription.user_id == current_user.id,
        CapabilitySubscription.is_active == True,
    ).first()

    return {
        "id": cap.id,
        "agent_id": cap.agent_id,
        "agent_name": agent.name if agent else None,
        "name": cap.name,
        "description": cap.description,
        "category": cap.category,
        "tags": cap.tags or [],
        "api_endpoint": cap.api_endpoint,
        "input_schema": cap.input_schema,
        "output_schema": cap.output_schema,
        "example_input": cap.example_input,
        "example_output": cap.example_output,
        "pricing_model": cap.pricing_model,
        "price": cap.price,
        "status": cap.status,
        "total_subscribers": cap.total_subscribers,
        "total_calls": cap.total_calls,
        "avg_response_time_ms": cap.avg_response_time_ms,
        "success_rate": cap.success_rate,
        "rating": cap.rating,
        "is_subscribed": sub is not None,
        "subscription_key": sub.api_key if sub else None,
        "created_at": cap.created_at,
    }


@router.post("/apis/{api_id}/call", response_model=ApiCallResponse)
async def call_api(
    api_id: int,
    data: ApiCallRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """调用 API（带计费）"""
    cap = db.query(Capability).filter(Capability.id == api_id).first()
    if not cap:
        raise HTTPException(status_code=404, detail="API 不存在")
    if cap.status != CapabilityStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="API 当前不可用")

    # 检查订阅
    sub = db.query(CapabilitySubscription).filter(
        CapabilitySubscription.capability_id == api_id,
        CapabilitySubscription.user_id == current_user.id,
        CapabilitySubscription.is_active == True,
    ).first()

    if not sub:
        raise HTTPException(status_code=403, detail="请先订阅该 API")

    # 检查调用次数
    if sub.calls_used >= sub.calls_limit:
        raise HTTPException(status_code=429, detail="已达调用次数上限，请升级订阅")

    # 计费检查
    amount = 0.0
    if cap.pricing_model == "per_call" and cap.price > 0:
        total_available = current_user.trial_balance + current_user.balance
        if total_available < cap.price:
            raise HTTPException(status_code=400, detail=f"余额不足，需要 ¥{cap.price:.2f}，当前可用 ¥{total_available:.2f}")
        amount = cap.price

    # 调用智能体 API
    start_time = time.time()
    is_success = False
    response_status = 0
    response_body = None
    error_message = None

    try:
        resp = requests.post(
            cap.api_endpoint,
            json=data.params,
            headers={"Content-Type": "application/json"},
            timeout=30,
        )
        response_time_ms = int((time.time() - start_time) * 1000)
        response_status = resp.status_code
        is_success = resp.ok

        if resp.ok:
            try:
                response_body = resp.json()
            except Exception:
                response_body = {"raw": resp.text}
        else:
            error_message = f"API 返回错误: HTTP {resp.status_code}"
            try:
                error_detail = resp.json()
                error_message = error_detail.get("detail", error_message)
            except Exception:
                pass
    except requests.ConnectionError:
        response_time_ms = int((time.time() - start_time) * 1000)
        error_message = "无法连接到智能体 API"
    except requests.Timeout:
        response_time_ms = int((time.time() - start_time) * 1000)
        error_message = "智能体 API 响应超时"
    except Exception as e:
        response_time_ms = int((time.time() - start_time) * 1000)
        error_message = f"调用异常: {str(e)}"

    # 记录调用日志
    log = ApiCallLog(
        service_id=api_id,
        caller_id=current_user.id,
        request_params=data.params,
        response_status=response_status,
        response_body=str(response_body)[:2000] if response_body else None,
        response_time_ms=response_time_ms,
        amount_charged=amount if is_success else 0.0,
        is_success=is_success,
        error_message=error_message,
    )
    db.add(log)

    # 更新统计
    cap.total_calls += 1
    sub.calls_used += 1

    # 更新成功率（滑动平均）
    total_success = db.query(ApiCallLog).filter(
        ApiCallLog.service_id == api_id,
        ApiCallLog.is_success == True,
    ).count()
    total_all = db.query(ApiCallLog).filter(ApiCallLog.service_id == api_id).count()
    if total_all > 0:
        cap.success_rate = round((total_success / total_all) * 100, 1)

    # 更新平均响应时间
    if cap.avg_response_ms == 0:
        cap.avg_response_ms = response_time_ms
    else:
        cap.avg_response_ms = int((cap.avg_response_ms * 0.9) + (response_time_ms * 0.1))

    # 扣费
    if is_success and amount > 0:
        if current_user.trial_balance >= amount:
            current_user.trial_balance -= amount
        else:
            remaining = amount - current_user.trial_balance
            current_user.trial_balance = 0
            current_user.balance -= remaining

        # 转给能力所有者
        agent_owner = db.query(User).join(Agent).filter(Agent.id == cap.agent_id).first()
        if agent_owner:
            owner_income = amount * (1 - PLATFORM_COMMISSION_RATE)
            agent_owner.balance += owner_income

        # 记录交易
        tx = Transaction(
            from_user_id=current_user.id,
            amount=amount,
            tx_type="api_call",
            status="completed",
            description=f"API 调用: {cap.name}",
        )
        db.add(tx)

    db.commit()

    return ApiCallResponse(
        success=is_success,
        status_code=response_status,
        data=response_body if is_success else None,
        error=error_message,
        response_time_ms=response_time_ms,
        amount_charged=amount if is_success else 0.0,
        remaining_calls=sub.calls_limit - sub.calls_used,
    )


@router.post("/apis/{api_id}/subscribe")
async def subscribe_api(
    api_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """订阅 API"""
    cap = db.query(Capability).filter(Capability.id == api_id).first()
    if not cap:
        raise HTTPException(status_code=404, detail="API 不存在")
    if cap.status != CapabilityStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="API 当前不可用")

    existing = db.query(CapabilitySubscription).filter(
        CapabilitySubscription.capability_id == api_id,
        CapabilitySubscription.user_id == current_user.id,
        CapabilitySubscription.is_active == True,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="你已订阅该 API")

    # 付费订阅扣费
    if cap.pricing_model == "monthly" and cap.price > 0:
        total_available = current_user.trial_balance + current_user.balance
        if total_available < cap.price:
            raise HTTPException(status_code=400, detail="余额不足，请先充值")
        if current_user.trial_balance >= cap.price:
            current_user.trial_balance -= cap.price
        else:
            remaining = cap.price - current_user.trial_balance
            current_user.trial_balance = 0
            current_user.balance -= remaining

        agent_owner = db.query(User).join(Agent).filter(Agent.id == cap.agent_id).first()
        if agent_owner:
            agent_owner.balance += cap.price * (1 - PLATFORM_COMMISSION_RATE)
        db.add(Transaction(
            from_user_id=current_user.id,
            amount=cap.price,
            tx_type="api_subscription",
            status="completed",
            description=f"订阅 API: {cap.name}",
        ))

    import secrets
    sub_key = f"cap_{secrets.token_hex(20)}"
    sub = CapabilitySubscription(
        capability_id=api_id,
        user_id=current_user.id,
        api_key=sub_key,
    )
    db.add(sub)
    cap.total_subscribers += 1
    db.commit()
    db.refresh(sub)

    return {
        "message": "订阅成功",
        "subscription_id": sub.id,
        "api_key": sub.api_key,
        "calls_limit": sub.calls_limit,
    }


@router.get("/my/subscriptions", response_model=List[MyApiSubscription])
async def my_api_subscriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取我的 API 订阅列表"""
    subs = db.query(CapabilitySubscription).filter(
        CapabilitySubscription.user_id == current_user.id,
        CapabilitySubscription.is_active == True,
    ).all()

    result = []
    for sub in subs:
        cap = db.query(Capability).filter(Capability.id == sub.capability_id).first()
        agent = db.query(Agent).filter(Agent.id == cap.agent_id).first() if cap else None
        result.append(MyApiSubscription(
            id=sub.id,
            capability_id=sub.capability_id,
            api_name=cap.name if cap else "未知 API",
            agent_name=agent.name if agent else None,
            api_key=sub.api_key,
            is_active=sub.is_active,
            calls_used=sub.calls_used,
            calls_limit=sub.calls_limit,
            subscribed_at=sub.subscribed_at,
        ))

    return result


@router.get("/my/call-history")
async def my_call_history(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取我的 API 调用历史"""
    logs = db.query(ApiCallLog).filter(
        ApiCallLog.caller_id == current_user.id,
    ).order_by(ApiCallLog.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for log in logs:
        cap = db.query(Capability).filter(Capability.id == log.service_id).first()
        result.append({
            "id": log.id,
            "api_name": cap.name if cap else "未知 API",
            "is_success": log.is_success,
            "response_status": log.response_status,
            "response_time_ms": log.response_time_ms,
            "amount_charged": log.amount_charged,
            "error_message": log.error_message,
            "created_at": log.created_at,
        })

    return result
