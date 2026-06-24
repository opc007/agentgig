"""
平台管理 API —— 给平台管理智能体和管理员使用
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.agent import Agent
from app.models.task import Task, TaskStatus
from app.models.transaction import Transaction
from app.schemas import PlatformStats
from app.auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["平台管理"])


@router.get("/stats", response_model=PlatformStats)
async def get_platform_stats(db: Session = Depends(get_db)):
    """获取平台统计数据"""
    return PlatformStats(
        total_users=db.query(User).count(),
        total_agents=db.query(Agent).count(),
        total_tasks=db.query(Task).count(),
        completed_tasks=db.query(Task).filter(Task.status == TaskStatus.COMPLETED).count(),
        total_transactions=db.query(func.sum(Transaction.amount)).scalar() or 0,
        online_agents=db.query(Agent).filter(Agent.status == "online").count(),
    )


@router.get("/tasks/disputed")
async def get_disputed_tasks(db: Session = Depends(get_db)):
    """获取争议中的任务"""
    tasks = db.query(Task).filter(Task.status == TaskStatus.DISPUTED).all()
    return [{"id": t.id, "title": t.title, "publisher_id": t.publisher_id, "agent_id": t.assigned_agent_id, "budget": t.budget} for t in tasks]


@router.post("/tasks/{task_id}/resolve")
async def resolve_dispute(
    task_id: int,
    favor: str,  # "publisher" or "agent"
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """处理争议"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    if task.status != TaskStatus.DISPUTED:
        raise HTTPException(status_code=400, detail="该任务不在争议中")

    publisher = db.query(User).filter(User.id == task.publisher_id).first()
    agent = db.query(Agent).filter(Agent.id == task.assigned_agent_id).first()
    agent_owner = db.query(User).filter(User.id == agent.owner_id).first() if agent else None

    if favor == "publisher":
        # 退款给发包方
        publisher.balance += task.budget
        publisher.frozen_balance -= task.budget
        task.status = TaskStatus.CANCELLED
        db.add(Transaction(task_id=task.id, to_user_id=publisher.id, amount=task.budget, tx_type="refund", description="争议退款"))
    elif favor == "agent":
        # 付款给智能体
        publisher.frozen_balance -= task.budget
        if agent_owner:
            agent_owner.balance += task.agent_income
        agent.completed_tasks += 1
        agent.status = "online"
        task.status = TaskStatus.COMPLETED
        task.completed_at = func.now()
        db.add(Transaction(task_id=task.id, to_user_id=agent_owner.id, amount=task.agent_income, tx_type="release", description="争议结算"))
    else:
        raise HTTPException(status_code=400, detail="favor 参数无效，可选：publisher/agent")

    db.commit()
    return {"message": f"争议已处理，{'发包方' if favor == 'publisher' else '智能体'}胜出"}


@router.post("/seed-demo-data")
async def seed_demo_data(db: Session = Depends(get_db)):
    """初始化演示数据（开发用）"""
    from app.auth import hash_password
    import secrets

    # 创建演示用户
    demo_users = [
        User(username="demo_user", email="demo@agentgig.com", password_hash=hash_password("123456"), role="normal", balance=5000),
        User(username="agent_master", email="master@agentgig.com", password_hash=hash_password("123456"), role="agent_owner", balance=3000, alipay_account="master@alipay.com"),
        User(username="creator_zhang", email="zhang@agentgig.com", password_hash=hash_password("123456"), role="agent_owner", balance=2000),
    ]
    for u in demo_users:
        if not db.query(User).filter(User.email == u.email).first():
            db.add(u)
    db.commit()

    # 创建演示智能体
    demo_agents = [
        Agent(owner_id=2, name="CodeBot", description="全栈开发专家，擅长 Python/JavaScript/Go", skills=["代码", "开发", "API"], category="development", api_key=f"ag_{secrets.token_hex(24)}", status="online", avatar_color="#4CAF50", avatar_icon="code", rating=4.8, completed_tasks=42),
        Agent(owner_id=2, name="WriterBot", description="专业文案撰写，营销文案/产品描述/公众号文章", skills=["文案", "写作", "营销"], category="copywriting", api_key=f"ag_{secrets.token_hex(24)}", status="online", avatar_color="#2196F3", avatar_icon="edit", rating=4.9, completed_tasks=67),
        Agent(owner_id=3, name="DesignBot", description="UI/UX 设计，Logo/海报/网页设计", skills=["设计", "UI", "画图"], category="design", api_key=f"ag_{secrets.token_hex(24)}", status="online", avatar_color="#9C27B0", avatar_icon="palette", rating=4.7, completed_tasks=35),
        Agent(owner_id=3, name="DataBot", description="数据分析专家，Excel/Python 数据处理", skills=["数据分析", "Excel", "Python"], category="data_analysis", api_key=f"ag_{secrets.token_hex(24)}", status="online", avatar_color="#FF9800", avatar_icon="bar_chart", rating=4.6, completed_tasks=28),
    ]
    for a in demo_agents:
        if not db.query(Agent).filter(Agent.api_key == a.api_key).first():
            db.add(a)
    db.commit()

    # 创建演示任务
    demo_tasks = [
        Task(publisher_id=1, title="帮我写一个公司官网", description="需要一个响应式的企业官网，包含首页、关于我们、产品展示、联系方式", category="development", required_skills=["代码", "开发"], budget=2000, platform_fee=200, agent_income=1800, status=TaskStatus.PENDING),
        Task(publisher_id=1, title="写10篇小红书种草文案", description="美妆产品种草文案，每篇300-500字，要有吸引力", category="copywriting", required_skills=["文案", "写作"], budget=500, platform_fee=50, agent_income=450, status=TaskStatus.PENDING),
        Task(publisher_id=1, title="设计一个 App Logo", description="社交类 App，年轻用户为主，风格简约现代", category="design", required_skills=["设计", "画图"], budget=800, platform_fee=80, agent_income=720, status=TaskStatus.PENDING),
    ]
    for t in demo_tasks:
        if not db.query(Task).filter(Task.title == t.title).first():
            db.add(t)
    db.commit()

    return {"message": "演示数据初始化完成", "users": 3, "agents": 4, "tasks": 3}
