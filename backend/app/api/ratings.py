from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.agent import Agent, calc_certification
from app.models.task import Task, TaskStatus
from app.models.rating import Rating
from app.schemas import RatingCreate, RatingResponse, RatingStats
from app.auth import get_current_user

router = APIRouter(prefix="/api/ratings", tags=["评分"])


def _build_rating_response(rating, db: Session) -> RatingResponse:
    """构建完整的评分响应（含用户名、任务标题、智能体名称）"""
    user = db.query(User).filter(User.id == rating.user_id).first()
    task = db.query(Task).filter(Task.id == rating.task_id).first()
    agent = db.query(Agent).filter(Agent.id == rating.agent_id).first()
    return RatingResponse(
        id=rating.id,
        task_id=rating.task_id,
        agent_id=rating.agent_id,
        user_id=rating.user_id,
        quality_score=rating.quality_score,
        speed_score=rating.speed_score,
        attitude_score=rating.attitude_score,
        overall_score=rating.overall_score,
        comment=rating.comment,
        created_at=rating.created_at,
        user_name=user.username if user else None,
        task_title=task.title if task else None,
        agent_name=agent.name if agent else None,
    )


def _refresh_agent_certification(agent: Agent, db: Session):
    """重新计算智能体认证等级"""
    new_level = calc_certification(agent.completed_tasks, agent.rating, agent.created_at)
    if new_level != agent.certification_level:
        agent.certification_level = new_level
        db.commit()


@router.post("", response_model=RatingResponse)
async def create_rating(
    data: RatingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """为完成的任务评价智能体"""
    task = db.query(Task).filter(Task.id == data.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    if task.status != TaskStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="只能评价已完成的任务")
    if task.publisher_id != current_user.id:
        raise HTTPException(status_code=403, detail="只有任务发布者才能评价")
    if not task.assigned_agent_id:
        raise HTTPException(status_code=400, detail="该任务没有分配智能体")

    existing_rating = db.query(Rating).filter(
        Rating.task_id == data.task_id,
        Rating.user_id == current_user.id
    ).first()
    if existing_rating:
        raise HTTPException(status_code=400, detail="你已经评价过该任务")

    overall_score = round((data.quality_score + data.speed_score + data.attitude_score) / 3, 1)

    rating = Rating(
        task_id=data.task_id,
        agent_id=task.assigned_agent_id,
        user_id=current_user.id,
        quality_score=data.quality_score,
        speed_score=data.speed_score,
        attitude_score=data.attitude_score,
        overall_score=overall_score,
        comment=data.comment,
    )
    db.add(rating)

    agent = db.query(Agent).filter(Agent.id == task.assigned_agent_id).first()
    if agent:
        all_ratings = db.query(Rating).filter(Rating.agent_id == agent.id).all()
        total_ratings = len(all_ratings) + 1
        total_score = sum(r.overall_score for r in all_ratings) + overall_score
        agent.rating = round(total_score / total_ratings, 1)
        agent.total_ratings = total_ratings
        db.commit()
        db.refresh(rating)
        _refresh_agent_certification(agent, db)
    else:
        db.commit()
        db.refresh(rating)

    return _build_rating_response(rating, db)


@router.get("/my", response_model=List[RatingResponse])
async def get_my_ratings(
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """获取当前用户的评价历史"""
    ratings = db.query(Rating).filter(
        Rating.user_id == current_user.id
    ).order_by(Rating.created_at.desc()).offset(skip).limit(limit).all()
    return [_build_rating_response(r, db) for r in ratings]


@router.get("/agent/{agent_id}", response_model=List[RatingResponse])
async def get_agent_ratings(
    agent_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """获取智能体的评价列表"""
    ratings = db.query(Rating).filter(
        Rating.agent_id == agent_id
    ).order_by(Rating.created_at.desc()).offset(skip).limit(limit).all()
    return [_build_rating_response(r, db) for r in ratings]


@router.get("/agent/{agent_id}/stats", response_model=RatingStats)
async def get_agent_rating_stats(
    agent_id: int,
    db: Session = Depends(get_db)
):
    """获取智能体的评分统计"""
    ratings = db.query(Rating).filter(Rating.agent_id == agent_id).all()

    if not ratings:
        return RatingStats(
            average_rating=0.0,
            total_ratings=0,
            quality_avg=0.0,
            speed_avg=0.0,
            attitude_avg=0.0,
        )

    total = len(ratings)
    quality_avg = round(sum(r.quality_score for r in ratings) / total, 1)
    speed_avg = round(sum(r.speed_score for r in ratings) / total, 1)
    attitude_avg = round(sum(r.attitude_score for r in ratings) / total, 1)
    average_rating = round(sum(r.overall_score for r in ratings) / total, 1)

    return RatingStats(
        average_rating=average_rating,
        total_ratings=total,
        quality_avg=quality_avg,
        speed_avg=speed_avg,
        attitude_avg=attitude_avg,
    )


@router.get("/task/{task_id}", response_model=RatingResponse)
async def get_task_rating(
    task_id: int,
    db: Session = Depends(get_db)
):
    """获取任务的评价"""
    rating = db.query(Rating).filter(Rating.task_id == task_id).first()
    if not rating:
        raise HTTPException(status_code=404, detail="该任务暂无评价")
    return _build_rating_response(rating, db)


@router.get("/check/{task_id}")
async def check_rating_exists(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """检查任务是否已评价"""
    rating = db.query(Rating).filter(
        Rating.task_id == task_id,
        Rating.user_id == current_user.id
    ).first()
    return {"rated": rating is not None}
