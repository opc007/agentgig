"""
平台管理 API —— 给平台管理智能体和管理员使用
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from app.database import get_db
from app.models.user import User
from app.models.agent import Agent
from app.models.task import Task, TaskStatus
from app.models.transaction import Transaction
from app.schemas import PlatformStats
from app.auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["平台管理"])


def require_admin(current_user: User):
    """校验管理员权限"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")


@router.get("/stats", response_model=PlatformStats)
async def get_platform_stats(db: Session = Depends(get_db)):
    """获取平台统计数据（公开接口）"""
    return PlatformStats(
        total_users=db.query(User).count(),
        total_agents=db.query(Agent).count(),
        total_tasks=db.query(Task).count(),
        completed_tasks=db.query(Task).filter(Task.status == TaskStatus.COMPLETED).count(),
        total_transactions=db.query(func.sum(Transaction.amount)).scalar() or 0,
        online_agents=db.query(Agent).filter(Agent.status == "online").count(),
    )


@router.get("/tasks/disputed")
async def get_disputed_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取争议中的任务（需要管理员权限）"""
    require_admin(current_user)
    tasks = db.query(Task).filter(Task.status == TaskStatus.DISPUTED).all()
    return [{"id": t.id, "title": t.title, "publisher_id": t.publisher_id, "agent_id": t.assigned_agent_id, "budget": t.budget} for t in tasks]


@router.post("/tasks/{task_id}/resolve")
async def resolve_dispute(
    task_id: int,
    favor: str,  # "publisher" or "agent"
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """处理争议（需要管理员权限）"""
    require_admin(current_user)

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    if task.status != TaskStatus.DISPUTED:
        raise HTTPException(status_code=400, detail="该任务不在争议中")

    publisher = db.query(User).filter(User.id == task.publisher_id).first()
    agent = db.query(Agent).filter(Agent.id == task.assigned_agent_id).first()
    agent_owner = db.query(User).filter(User.id == agent.owner_id).first() if agent else None

    if favor == "publisher":
        publisher.frozen_balance -= task.budget
        publisher.balance += task.budget
        task.status = TaskStatus.CANCELLED
        db.add(Transaction(task_id=task.id, to_user_id=publisher.id, amount=task.budget, tx_type="refund", description="争议退款"))
    elif favor == "agent":
        publisher.frozen_balance -= task.budget
        if agent_owner:
            agent_owner.balance += task.agent_income
        agent.total_earnings += task.agent_income
        agent.completed_tasks += 1
        agent.status = "online"
        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.utcnow()
        db.add(Transaction(task_id=task.id, from_user_id=publisher.id, to_user_id=agent_owner.id, amount=task.agent_income, tx_type="release", description="争议结算"))
    else:
        raise HTTPException(status_code=400, detail="favor 参数无效，可选：publisher/agent")

    db.commit()
    return {"message": f"争议已处理，{'发包方' if favor == 'publisher' else '智能体'}胜出"}


@router.post("/seed-demo-data")
async def seed_demo_data(db: Session = Depends(get_db)):
    """初始化演示数据（开发用，防重复）"""
    from app.auth import hash_password
    import secrets

    created = {"users": 0, "agents": 0, "tasks": 0}

    # 创建演示用户（防重复）
    demo_users = [
        {"username": "demo_user", "email": "demo@agentgig.com", "role": "normal", "trial_balance": 5000},
        {"username": "agent_master", "email": "master@agentgig.com", "role": "agent_owner", "trial_balance": 3000, "alipay_account": "master@alipay.com"},
        {"username": "creator_zhang", "email": "zhang@agentgig.com", "role": "agent_owner", "trial_balance": 2000},
    ]
    for u in demo_users:
        if not db.query(User).filter(User.email == u["email"]).first():
            db.add(User(
                username=u["username"],
                email=u["email"],
                password_hash=hash_password("123456"),
                role=u["role"],
                trial_balance=u["trial_balance"],
                alipay_account=u.get("alipay_account"),
            ))
            created["users"] += 1
    db.commit()

    # 获取用户ID
    demo_user = db.query(User).filter(User.email == "demo@agentgig.com").first()
    master = db.query(User).filter(User.email == "master@agentgig.com").first()
    zhang = db.query(User).filter(User.email == "zhang@agentgig.com").first()

    if not all([demo_user, master, zhang]):
        return {"message": "用户创建失败", **created}

    # 创建演示智能体（按名称防重复）
    demo_agents = [
        {"owner_id": master.id, "name": "CodeBot", "description": "全栈开发专家，擅长 Python/JavaScript/Go", "skills": ["代码", "开发", "API"], "category": "development", "avatar_color": "#4CAF50", "avatar_icon": "code", "rating": 4.8, "completed_tasks": 42},
        {"owner_id": master.id, "name": "WriterBot", "description": "专业文案撰写，营销文案/产品描述/公众号文章", "skills": ["文案", "写作", "营销"], "category": "copywriting", "avatar_color": "#2196F3", "avatar_icon": "edit", "rating": 4.9, "completed_tasks": 67},
        {"owner_id": zhang.id, "name": "DesignBot", "description": "UI/UX 设计，Logo/海报/网页设计", "skills": ["设计", "UI", "画图"], "category": "design", "avatar_color": "#9C27B0", "avatar_icon": "palette", "rating": 4.7, "completed_tasks": 35},
        {"owner_id": zhang.id, "name": "DataBot", "description": "数据分析专家，Excel/Python 数据处理", "skills": ["数据分析", "Excel", "Python"], "category": "data_analysis", "avatar_color": "#FF9800", "avatar_icon": "bar_chart", "rating": 4.6, "completed_tasks": 28},
    ]
    for a in demo_agents:
        if not db.query(Agent).filter(Agent.owner_id == a["owner_id"], Agent.name == a["name"]).first():
            db.add(Agent(**a, api_key=f"ag_{secrets.token_hex(24)}", status="online"))
            created["agents"] += 1
    db.commit()

    # 创建演示任务（按标题防重复）
    demo_tasks = [
        {"publisher_id": demo_user.id, "title": "帮我写一个公司官网", "description": "需要一个响应式的企业官网，包含首页、关于我们、产品展示、联系方式", "category": "development", "required_skills": ["代码", "开发"], "budget": 2000, "platform_fee": 200, "agent_income": 1800, "status": TaskStatus.PENDING},
        {"publisher_id": demo_user.id, "title": "写10篇小红书种草文案", "description": "美妆产品种草文案，每篇300-500字，要有吸引力", "category": "copywriting", "required_skills": ["文案", "写作"], "budget": 500, "platform_fee": 50, "agent_income": 450, "status": TaskStatus.PENDING},
        {"publisher_id": demo_user.id, "title": "设计一个 App Logo", "description": "社交类 App，年轻用户为主，风格简约现代", "category": "design", "required_skills": ["设计", "画图"], "budget": 800, "platform_fee": 80, "agent_income": 720, "status": TaskStatus.PENDING},
    ]
    for t in demo_tasks:
        if not db.query(Task).filter(Task.title == t["title"]).first():
            db.add(Task(**t))
            created["tasks"] += 1
    db.commit()

    return {"message": "演示数据初始化完成", **created}
