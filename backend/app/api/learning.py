from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.models.user import User
from app.models.agent import Agent
from app.models.task import Task, TaskStatus
from app.models.rating import Rating
from app.models.learning import AgentTaskHistory, AgentSkillProfile, AgentLearningCurve
from app.schemas import (
    AgentTaskHistoryResponse, AgentSkillProfileResponse,
    AgentLearningCurveResponse, AgentLearningDashboard,
)
from app.auth import get_current_user

router = APIRouter(prefix="/api/learning", tags=["智能体学习"])


def _calc_skill_match(agent_skills: list, required_skills: list) -> float:
    """计算技能匹配度"""
    if not required_skills:
        return 1.0
    agent_set = set(s.lower() for s in (agent_skills or []))
    req_set = set(s.lower() for s in required_skills)
    if not req_set:
        return 1.0
    matched = agent_set & req_set
    return round(len(matched) / len(req_set), 2)


def _update_skill_profile(db: Session, agent_id: int, skills: list, score: float, success: bool):
    """更新智能体技能档案"""
    for skill_name in skills:
        profile = db.query(AgentSkillProfile).filter(
            AgentSkillProfile.agent_id == agent_id,
            AgentSkillProfile.skill_name == skill_name,
        ).first()

        if not profile:
            profile = AgentSkillProfile(
                agent_id=agent_id,
                skill_name=skill_name,
                proficiency=0.5,
                times_used=0,
                success_count=0,
                total_score=0.0,
                recent_avg_score=0.0,
            )
            db.add(profile)

        profile.times_used += 1
        if success:
            profile.success_count += 1
        profile.total_score += score
        profile.last_used_at = datetime.now(timezone.utc)

        # 更新熟练度: 基于成功率和平均分
        success_rate = profile.success_count / profile.times_used
        avg_score = profile.total_score / profile.times_used
        profile.proficiency = round(min(1.0, (success_rate * 0.4 + avg_score / 5 * 0.6)), 2)

        # 近期平均分 (简化: 使用加权平均)
        profile.recent_avg_score = round(
            profile.recent_avg_score * 0.7 + score * 0.3 if profile.recent_avg_score > 0 else score, 2
        )


def _snapshot_learning_curve(db: Session, agent: Agent):
    """创建学习曲线快照"""
    total_tasks = agent.completed_tasks or 0
    avg_rating = agent.rating or 0.0

    # 计算技能多样性
    skill_count = db.query(AgentSkillProfile).filter(
        AgentSkillProfile.agent_id == agent.id
    ).count()

    # 计算综合熟练度
    profiles = db.query(AgentSkillProfile).filter(
        AgentSkillProfile.agent_id == agent.id
    ).all()
    overall_proficiency = 0.0
    if profiles:
        overall_proficiency = round(sum(p.proficiency for p in profiles) / len(profiles), 2)

    # 计算平均完成时间
    histories = db.query(AgentTaskHistory).filter(
        AgentTaskHistory.agent_id == agent.id,
        AgentTaskHistory.completion_time.isnot(None),
    ).all()
    avg_time = 0.0
    if histories:
        avg_time = round(sum(h.completion_time for h in histories) / len(histories), 2)

    snapshot = AgentLearningCurve(
        agent_id=agent.id,
        total_tasks=total_tasks,
        avg_rating=avg_rating,
        avg_completion_time=avg_time,
        skill_diversity=skill_count,
        overall_proficiency=overall_proficiency,
    )
    db.add(snapshot)


@router.post("/record")
async def record_task_completion(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """记录智能体完成任务的学习数据（任务完成后自动调用）"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    if not task.assigned_agent_id:
        raise HTTPException(status_code=400, detail="任务未分配智能体")

    agent = db.query(Agent).filter(Agent.id == task.assigned_agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在")

    # 获取评分
    rating = db.query(Rating).filter(
        Rating.task_id == task_id,
        Rating.agent_id == agent.id,
    ).first()

    quality = rating.quality_score if rating else 3.0
    speed = rating.speed_score if rating else 3.0
    attitude = rating.attitude_score if rating else 3.0

    # 计算技能匹配度
    skill_match = _calc_skill_match(agent.skills, task.required_skills)

    # 计算完成时间
    completion_time = None
    if task.completed_at and task.assigned_at:
        delta = task.completed_at - task.assigned_at
        completion_time = delta.total_seconds()

    # 记录历史
    history = AgentTaskHistory(
        agent_id=agent.id,
        task_id=task.id,
        success=(task.status == TaskStatus.COMPLETED),
        quality_score=quality,
        speed_score=speed,
        attitude_score=attitude,
        skill_match_score=skill_match,
        skills_used=task.required_skills or [],
        completion_time=completion_time,
    )
    db.add(history)

    # 更新技能档案
    avg_score = (quality + speed + attitude) / 3
    _update_skill_profile(db, agent.id, task.required_skills or [], avg_score, history.success)

    # 每完成10个任务创建一次学习曲线快照
    if agent.completed_tasks > 0 and agent.completed_tasks % 10 == 0:
        _snapshot_learning_curve(db, agent)

    db.commit()

    return {"message": "学习数据已记录", "skill_match": skill_match}


@router.get("/agent/{agent_id}/dashboard")
async def get_learning_dashboard(
    agent_id: int,
    db: Session = Depends(get_db)
):
    """获取智能体学习仪表板"""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在")

    # 技能档案
    skill_profiles = db.query(AgentSkillProfile).filter(
        AgentSkillProfile.agent_id == agent_id
    ).order_by(AgentSkillProfile.proficiency.desc()).all()

    # 学习曲线
    learning_curve = db.query(AgentLearningCurve).filter(
        AgentLearningCurve.agent_id == agent_id
    ).order_by(AgentLearningCurve.snapshot_at.asc()).all()

    # 最近历史
    recent_history = db.query(AgentTaskHistory).filter(
        AgentTaskHistory.agent_id == agent_id
    ).order_by(AgentTaskHistory.created_at.desc()).limit(20).all()

    # Top skills
    top_skills = []
    for sp in skill_profiles[:5]:
        trend = "up" if sp.recent_avg_score > sp.total_score / max(sp.times_used, 1) else "stable"
        top_skills.append({
            "skill_name": sp.skill_name,
            "proficiency": sp.proficiency,
            "trend": trend,
        })

    # 近期提升率
    improvement_rate = 0.0
    if len(recent_history) >= 5:
        recent_scores = [h.quality_score for h in recent_history[:5] if h.quality_score]
        older_scores = [h.quality_score for h in recent_history[5:10] if h.quality_score]
        if recent_scores and older_scores:
            recent_avg = sum(recent_scores) / len(recent_scores)
            older_avg = sum(older_scores) / len(older_scores)
            if older_avg > 0:
                improvement_rate = round((recent_avg - older_avg) / older_avg * 100, 1)

    # 构建响应
    def build_history(h):
        task = db.query(Task).filter(Task.id == h.task_id).first()
        return AgentTaskHistoryResponse(
            id=h.id,
            agent_id=h.agent_id,
            task_id=h.task_id,
            task_title=task.title if task else None,
            success=h.success,
            quality_score=h.quality_score,
            speed_score=h.speed_score,
            attitude_score=h.attitude_score,
            skill_match_score=h.skill_match_score,
            skills_used=h.skills_used or [],
            completion_time=h.completion_time,
            feedback=h.feedback,
            created_at=h.created_at,
        )

    return AgentLearningDashboard(
        agent_id=agent.id,
        agent_name=agent.name,
        total_tasks_completed=agent.completed_tasks or 0,
        avg_rating=agent.rating or 0.0,
        skill_profiles=[AgentSkillProfileResponse(
            id=sp.id,
            agent_id=sp.agent_id,
            skill_name=sp.skill_name,
            proficiency=sp.proficiency,
            times_used=sp.times_used,
            success_count=sp.success_count,
            total_score=sp.total_score,
            recent_avg_score=sp.recent_avg_score,
            last_used_at=sp.last_used_at,
            created_at=sp.created_at,
        ) for sp in skill_profiles],
        learning_curve=[AgentLearningCurveResponse(
            id=lc.id,
            agent_id=lc.agent_id,
            snapshot_at=lc.snapshot_at,
            total_tasks=lc.total_tasks,
            avg_rating=lc.avg_rating,
            avg_completion_time=lc.avg_completion_time,
            skill_diversity=lc.skill_diversity,
            overall_proficiency=lc.overall_proficiency,
        ) for lc in learning_curve],
        recent_history=[build_history(h) for h in recent_history],
        top_skills=top_skills,
        improvement_rate=improvement_rate,
    )


@router.get("/agent/{agent_id}/skills", response_model=List[AgentSkillProfileResponse])
async def get_agent_skills(
    agent_id: int,
    db: Session = Depends(get_db)
):
    """获取智能体技能档案"""
    profiles = db.query(AgentSkillProfile).filter(
        AgentSkillProfile.agent_id == agent_id
    ).order_by(AgentSkillProfile.proficiency.desc()).all()
    return [AgentSkillProfileResponse(
        id=sp.id,
        agent_id=sp.agent_id,
        skill_name=sp.skill_name,
        proficiency=sp.proficiency,
        times_used=sp.times_used,
        success_count=sp.success_count,
        total_score=sp.total_score,
        recent_avg_score=sp.recent_avg_score,
        last_used_at=sp.last_used_at,
        created_at=sp.created_at,
    ) for sp in profiles]


@router.get("/agent/{agent_id}/curve", response_model=List[AgentLearningCurveResponse])
async def get_learning_curve(
    agent_id: int,
    db: Session = Depends(get_db)
):
    """获取智能体学习曲线"""
    curves = db.query(AgentLearningCurve).filter(
        AgentLearningCurve.agent_id == agent_id
    ).order_by(AgentLearningCurve.snapshot_at.asc()).all()
    return [AgentLearningCurveResponse(
        id=c.id,
        agent_id=c.agent_id,
        snapshot_at=c.snapshot_at,
        total_tasks=c.total_tasks,
        avg_rating=c.avg_rating,
        avg_completion_time=c.avg_completion_time,
        skill_diversity=c.skill_diversity,
        overall_proficiency=c.overall_proficiency,
    ) for c in curves]


@router.get("/agent/{agent_id}/history", response_model=List[AgentTaskHistoryResponse])
async def get_task_history(
    agent_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """获取智能体任务执行历史"""
    histories = db.query(AgentTaskHistory).filter(
        AgentTaskHistory.agent_id == agent_id
    ).order_by(AgentTaskHistory.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for h in histories:
        task = db.query(Task).filter(Task.id == h.task_id).first()
        result.append(AgentTaskHistoryResponse(
            id=h.id,
            agent_id=h.agent_id,
            task_id=h.task_id,
            task_title=task.title if task else None,
            success=h.success,
            quality_score=h.quality_score,
            speed_score=h.speed_score,
            attitude_score=h.attitude_score,
            skill_match_score=h.skill_match_score,
            skills_used=h.skills_used or [],
            completion_time=h.completion_time,
            feedback=h.feedback,
            created_at=h.created_at,
        ))
    return result


@router.post("/agent/{agent_id}/snapshot")
async def create_snapshot(
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """手动创建学习曲线快照"""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在")
    if agent.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此智能体")

    _snapshot_learning_curve(db, agent)
    db.commit()
    return {"message": "学习曲线快照已创建"}
