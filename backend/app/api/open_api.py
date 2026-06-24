import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.developer import Developer, ApiKey, ApiUsage
from app.schemas import (
    DeveloperRegister, DeveloperResponse,
    ApiKeyCreate, ApiKeyResponse, ApiKeyListResponse, ApiUsageStats,
)
from app.auth import get_current_user

router = APIRouter(prefix="/api/open", tags=["开放API平台"])


def generate_api_key() -> str:
    return f"oak_{secrets.token_hex(24)}"


@router.post("/register", response_model=DeveloperResponse)
async def register_developer(
    data: DeveloperRegister,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """注册成为开发者"""
    existing = db.query(Developer).filter(Developer.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="你已经注册为开发者")

    developer = Developer(
        user_id=current_user.id,
        company_name=data.company_name,
        website=data.website,
        description=data.description,
    )
    db.add(developer)
    db.commit()
    db.refresh(developer)
    return DeveloperResponse.model_validate(developer)


@router.get("/developer", response_model=DeveloperResponse)
async def get_developer_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前开发者信息"""
    developer = db.query(Developer).filter(Developer.user_id == current_user.id).first()
    if not developer:
        raise HTTPException(status_code=404, detail="你尚未注册为开发者")
    return DeveloperResponse.model_validate(developer)


@router.get("/keys", response_model=ApiKeyListResponse)
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前开发者的所有 API Keys"""
    developer = db.query(Developer).filter(Developer.user_id == current_user.id).first()
    if not developer:
        raise HTTPException(status_code=404, detail="你尚未注册为开发者")

    keys = db.query(ApiKey).filter(ApiKey.developer_id == developer.id).order_by(ApiKey.created_at.desc()).all()
    return ApiKeyListResponse(
        keys=[ApiKeyResponse.model_validate(k) for k in keys]
    )


@router.post("/keys", response_model=ApiKeyResponse)
async def create_api_key(
    data: ApiKeyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建新的 API Key"""
    developer = db.query(Developer).filter(Developer.user_id == current_user.id).first()
    if not developer:
        raise HTTPException(status_code=404, detail="你尚未注册为开发者")

    key = ApiKey(
        developer_id=developer.id,
        key=generate_api_key(),
        name=data.name,
    )
    db.add(key)
    db.commit()
    db.refresh(key)
    return ApiKeyResponse.model_validate(key)


@router.delete("/keys/{key_id}")
async def delete_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除 API Key"""
    developer = db.query(Developer).filter(Developer.user_id == current_user.id).first()
    if not developer:
        raise HTTPException(status_code=404, detail="你尚未注册为开发者")

    key = db.query(ApiKey).filter(ApiKey.id == key_id, ApiKey.developer_id == developer.id).first()
    if not key:
        raise HTTPException(status_code=404, detail="API Key 不存在")

    db.delete(key)
    db.commit()
    return {"message": "API Key 已删除"}


@router.put("/keys/{key_id}/toggle")
async def toggle_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """启用/禁用 API Key"""
    developer = db.query(Developer).filter(Developer.user_id == current_user.id).first()
    if not developer:
        raise HTTPException(status_code=404, detail="你尚未注册为开发者")

    key = db.query(ApiKey).filter(ApiKey.id == key_id, ApiKey.developer_id == developer.id).first()
    if not key:
        raise HTTPException(status_code=404, detail="API Key 不存在")

    key.is_active = not key.is_active
    db.commit()
    db.refresh(key)
    return {"is_active": key.is_active}


@router.get("/keys/{key_id}/usage", response_model=ApiUsageStats)
async def get_api_usage(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取 API Key 的使用统计"""
    developer = db.query(Developer).filter(Developer.user_id == current_user.id).first()
    if not developer:
        raise HTTPException(status_code=404, detail="你尚未注册为开发者")

    key = db.query(ApiKey).filter(ApiKey.id == key_id, ApiKey.developer_id == developer.id).first()
    if not key:
        raise HTTPException(status_code=404, detail="API Key 不存在")

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total_calls = db.query(func.count(ApiUsage.id)).filter(ApiUsage.api_key_id == key_id).scalar() or 0
    calls_today = db.query(func.count(ApiUsage.id)).filter(
        ApiUsage.api_key_id == key_id,
        ApiUsage.called_at >= today_start
    ).scalar() or 0
    avg_time = db.query(func.avg(ApiUsage.response_time_ms)).filter(ApiUsage.api_key_id == key_id).scalar() or 0
    success_count = db.query(func.count(ApiUsage.id)).filter(
        ApiUsage.api_key_id == key_id,
        ApiUsage.status_code < 400
    ).scalar() or 0
    success_rate = (success_count / total_calls * 100) if total_calls > 0 else 100.0

    top_endpoints_q = db.query(
        ApiUsage.endpoint, func.count(ApiUsage.id).label("count")
    ).filter(
        ApiUsage.api_key_id == key_id
    ).group_by(ApiUsage.endpoint).order_by(func.count(ApiUsage.id).desc()).limit(5).all()

    top_endpoints = [{"endpoint": e, "count": c} for e, c in top_endpoints_q]

    return ApiUsageStats(
        total_calls=total_calls,
        calls_today=calls_today,
        avg_response_time_ms=round(avg_time, 1),
        success_rate=round(success_rate, 1),
        top_endpoints=top_endpoints,
    )


def get_api_key_from_header(request: Request, db: Session) -> ApiKey:
    """从请求头中验证 API Key"""
    api_key_str = request.headers.get("X-API-Key")
    if not api_key_str:
        raise HTTPException(status_code=401, detail="缺少 X-API-Key 请求头")

    key = db.query(ApiKey).filter(ApiKey.key == api_key_str).first()
    if not key:
        raise HTTPException(status_code=401, detail="无效的 API Key")
    if not key.is_active:
        raise HTTPException(status_code=403, detail="API Key 已被禁用")

    # 简单限流检查
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_calls = db.query(func.count(ApiUsage.id)).filter(
        ApiUsage.api_key_id == key.id,
        ApiUsage.called_at >= one_hour_ago
    ).scalar() or 0
    if recent_calls >= key.rate_limit:
        raise HTTPException(status_code=429, detail=f"请求频率超限，每小时上限 {key.rate_limit} 次")

    return key
