from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.agent import Agent
from app.models.app import AgentApp, AppInstall, AppReview
from app.models.transaction import Transaction
from app.schemas import (
    AppCreate, AppUpdate, AppResponse,
    AppReviewCreate, AppReviewResponse,
)
from app.auth import get_current_user

router = APIRouter(prefix="/api/apps", tags=["智能体应用商店"])


@router.post("", response_model=AppResponse)
async def publish_app(
    data: AppCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """发布智能体为应用"""
    agent = db.query(Agent).filter(
        Agent.id == data.agent_id,
        Agent.owner_id == current_user.id
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在或无权操作")

    app = AgentApp(
        agent_id=agent.id,
        name=data.name,
        tagline=data.tagline,
        description=data.description,
        category=data.category,
        tags=data.tags,
        icon_url=data.icon_url,
        screenshots=data.screenshots,
        demo_url=data.demo_url,
        pricing_type=data.pricing_type,
        price=data.price,
        subscription_price=data.subscription_price,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return _build_app_response(app, db)


@router.get("", response_model=List[AppResponse])
async def list_apps(
    category: str = None,
    search: str = None,
    pricing_type: str = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """浏览应用商店"""
    query = db.query(AgentApp).filter(AgentApp.status == "published")

    if category:
        query = query.filter(AgentApp.category == category)
    if search:
        query = query.filter(
            AgentApp.name.contains(search) | AgentApp.tagline.contains(search)
        )
    if pricing_type:
        query = query.filter(AgentApp.pricing_type == pricing_type)

    apps = query.order_by(AgentApp.total_installs.desc()).offset(skip).limit(limit).all()
    return [_build_app_response(a, db) for a in apps]


@router.get("/{app_id}", response_model=AppResponse)
async def get_app(
    app_id: int,
    db: Session = Depends(get_db)
):
    """获取应用详情"""
    app = db.query(AgentApp).filter(AgentApp.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    return _build_app_response(app, db)


@router.put("/{app_id}", response_model=AppResponse)
async def update_app(
    app_id: int,
    data: AppUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新应用信息"""
    app = db.query(AgentApp).join(Agent).filter(
        AgentApp.id == app_id,
        Agent.owner_id == current_user.id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在或无权操作")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(app, field, value)

    db.commit()
    db.refresh(app)
    return _build_app_response(app, db)


@router.post("/{app_id}/install")
async def install_app(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """安装应用"""
    app = db.query(AgentApp).filter(AgentApp.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    if app.status != "published":
        raise HTTPException(status_code=400, detail="应用暂不可安装")

    existing = db.query(AppInstall).filter(
        AppInstall.app_id == app_id,
        AppInstall.user_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="你已安装该应用")

    # 付费应用扣费
    if app.pricing_type == "one_time" and app.price > 0:
        if current_user.balance < app.price and current_user.trial_balance < app.price:
            raise HTTPException(status_code=400, detail="余额不足，请先充值")
        if current_user.trial_balance >= app.price:
            current_user.trial_balance -= app.price
        else:
            current_user.balance -= app.price
        agent_owner = db.query(User).join(Agent).filter(Agent.id == app.agent_id).first()
        if agent_owner:
            agent_owner.balance += app.price * 0.9
        app.total_revenue += app.price
        tx = Transaction(
            amount=app.price,
            tx_type="app_purchase",
            status="completed",
            description=f"购买应用「{app.name}」",
        )
        db.add(tx)

    install = AppInstall(app_id=app_id, user_id=current_user.id)
    db.add(install)
    app.total_installs += 1
    db.commit()
    return {"message": "安装成功"}


@router.post("/{app_id}/reviews", response_model=AppReviewResponse)
async def create_review(
    app_id: int,
    data: AppReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """为应用撰写评价"""
    app = db.query(AgentApp).filter(AgentApp.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")

    existing = db.query(AppReview).filter(
        AppReview.app_id == app_id,
        AppReview.user_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="你已评价过该应用")

    review = AppReview(
        app_id=app_id,
        user_id=current_user.id,
        rating=data.rating,
        title=data.title,
        comment=data.comment,
    )
    db.add(review)

    # 更新应用平均评分
    all_reviews = db.query(AppReview).filter(AppReview.app_id == app_id).all()
    total_ratings = len(all_reviews) + 1
    total_score = sum(r.rating for r in all_reviews) + data.rating
    app.rating = round(total_score / total_ratings, 1)
    app.total_ratings = total_ratings

    db.commit()
    db.refresh(review)

    return AppReviewResponse(
        id=review.id,
        app_id=review.app_id,
        user_id=review.user_id,
        user_name=current_user.username,
        rating=review.rating,
        title=review.title,
        comment=review.comment,
        created_at=review.created_at,
    )


@router.get("/{app_id}/reviews", response_model=List[AppReviewResponse])
async def list_reviews(
    app_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """获取应用评价列表"""
    reviews = db.query(AppReview).filter(
        AppReview.app_id == app_id
    ).order_by(AppReview.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for r in reviews:
        user = db.query(User).filter(User.id == r.user_id).first()
        result.append(AppReviewResponse(
            id=r.id,
            app_id=r.app_id,
            user_id=r.user_id,
            user_name=user.username if user else None,
            rating=r.rating,
            title=r.title,
            comment=r.comment,
            created_at=r.created_at,
        ))
    return result


@router.get("/my/published", response_model=List[AppResponse])
async def my_published_apps(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取我发布的应用"""
    apps = db.query(AgentApp).join(Agent).filter(
        Agent.owner_id == current_user.id
    ).all()
    return [_build_app_response(a, db) for a in apps]


@router.get("/my/installed", response_model=List[AppResponse])
async def my_installed_apps(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取我安装的应用"""
    installs = db.query(AppInstall).filter(
        AppInstall.user_id == current_user.id
    ).all()
    app_ids = [i.app_id for i in installs]
    apps = db.query(AgentApp).filter(AgentApp.id.in_(app_ids)).all() if app_ids else []
    return [_build_app_response(a, db) for a in apps]


def _build_app_response(app: AgentApp, db: Session) -> AppResponse:
    agent = db.query(Agent).filter(Agent.id == app.agent_id).first()
    return AppResponse(
        id=app.id,
        agent_id=app.agent_id,
        agent_name=agent.name if agent else None,
        name=app.name,
        tagline=app.tagline,
        description=app.description,
        category=app.category,
        tags=app.tags or [],
        icon_url=app.icon_url,
        screenshots=app.screenshots or [],
        demo_url=app.demo_url,
        pricing_type=app.pricing_type,
        price=app.price,
        subscription_price=app.subscription_price,
        status=app.status,
        total_installs=app.total_installs,
        total_revenue=app.total_revenue,
        rating=app.rating,
        total_ratings=app.total_ratings,
        created_at=app.created_at,
    )
