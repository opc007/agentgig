"""
平台管理 API —— 给平台管理智能体和管理员使用
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, extract
from datetime import datetime, timedelta
from app.database import get_db
from app.models.user import User
from app.models.agent import Agent
from app.models.task import Task, TaskStatus, TaskCategory, CATEGORY_SUBCATEGORIES
from app.models.transaction import Transaction
from app.models.message import Message
from app.schemas import (
    PlatformStats, DashboardOverview, TrendPoint,
    TopAgentItem, CategoryStatItem, RecentTransactionItem,
)
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


@router.get("/dashboard", response_model=DashboardOverview)
async def get_dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """平台总览数据（需要管理员权限）"""
    require_admin(current_user)

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    total_tasks = db.query(Task).count()
    completed_tasks = db.query(Task).filter(Task.status == TaskStatus.COMPLETED).count()
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

    total_revenue = db.query(func.sum(Transaction.amount)).filter(
        Transaction.tx_type.in_(["escrow", "release", "commission"]),
        Transaction.status == "completed"
    ).scalar() or 0

    platform_commission = db.query(func.sum(Transaction.amount)).filter(
        Transaction.tx_type == "commission",
        Transaction.status == "completed"
    ).scalar() or 0

    return DashboardOverview(
        total_users=db.query(User).count(),
        total_agents=db.query(Agent).count(),
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        completion_rate=round(completion_rate, 1),
        total_revenue=round(total_revenue, 2),
        platform_commission=round(platform_commission, 2),
        online_agents=db.query(Agent).filter(Agent.status == "online").count(),
        pending_tasks=db.query(Task).filter(Task.status == TaskStatus.PENDING).count(),
        disputed_tasks=db.query(Task).filter(Task.status == TaskStatus.DISPUTED).count(),
        new_users_today=db.query(User).filter(User.created_at >= today_start).count(),
        new_tasks_today=db.query(Task).filter(Task.created_at >= today_start).count(),
    )


@router.get("/trends", response_model=list[TrendPoint])
async def get_trend_data(
    period: str = Query("daily", regex="^(daily|weekly|monthly)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """趋势数据（需要管理员权限）"""
    require_admin(current_user)

    now = datetime.utcnow()
    results = []

    if period == "daily":
        for i in range(6, -1, -1):
            day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            label = day_start.strftime("%m/%d")

            tasks_created = db.query(Task).filter(
                Task.created_at >= day_start, Task.created_at < day_end
            ).count()
            tasks_completed = db.query(Task).filter(
                Task.completed_at >= day_start, Task.completed_at < day_end
            ).count()
            revenue = db.query(func.sum(Transaction.amount)).filter(
                Transaction.created_at >= day_start,
                Transaction.created_at < day_end,
                Transaction.tx_type.in_(["release", "commission"]),
                Transaction.status == "completed"
            ).scalar() or 0

            results.append(TrendPoint(
                label=label,
                tasks_created=tasks_created,
                tasks_completed=tasks_completed,
                revenue=round(revenue, 2),
            ))

    elif period == "weekly":
        for i in range(3, -1, -1):
            week_start = (now - timedelta(weeks=i + 1)).replace(hour=0, minute=0, second=0, microsecond=0)
            week_end = week_start + timedelta(weeks=1)
            label = f"{week_start.strftime('%m/%d')}周"

            tasks_created = db.query(Task).filter(
                Task.created_at >= week_start, Task.created_at < week_end
            ).count()
            tasks_completed = db.query(Task).filter(
                Task.completed_at >= week_start, Task.completed_at < week_end
            ).count()
            revenue = db.query(func.sum(Transaction.amount)).filter(
                Transaction.created_at >= week_start,
                Transaction.created_at < week_end,
                Transaction.tx_type.in_(["release", "commission"]),
                Transaction.status == "completed"
            ).scalar() or 0

            results.append(TrendPoint(
                label=label,
                tasks_created=tasks_created,
                tasks_completed=tasks_completed,
                revenue=round(revenue, 2),
            ))

    elif period == "monthly":
        for i in range(5, -1, -1):
            month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1)
            label = month_start.strftime("%Y/%m")

            tasks_created = db.query(Task).filter(
                Task.created_at >= month_start, Task.created_at < month_end
            ).count()
            tasks_completed = db.query(Task).filter(
                Task.completed_at >= month_start, Task.completed_at < month_end
            ).count()
            revenue = db.query(func.sum(Transaction.amount)).filter(
                Transaction.created_at >= month_start,
                Transaction.created_at < month_end,
                Transaction.tx_type.in_(["release", "commission"]),
                Transaction.status == "completed"
            ).scalar() or 0

            results.append(TrendPoint(
                label=label,
                tasks_created=tasks_created,
                tasks_completed=tasks_completed,
                revenue=round(revenue, 2),
            ))

    return results


@router.get("/top-agents", response_model=list[TopAgentItem])
async def get_top_agents(
    limit: int = Query(10, ge=1, le=50),
    sort_by: str = Query("completed_tasks", regex="^(completed_tasks|rating|total_earnings)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """智能体排行榜（需要管理员权限）"""
    require_admin(current_user)

    sort_column = {
        "completed_tasks": Agent.completed_tasks,
        "rating": Agent.rating,
        "total_earnings": Agent.total_earnings,
    }[sort_by]

    agents = db.query(Agent).order_by(sort_column.desc()).limit(limit).all()

    return [TopAgentItem(
        id=a.id,
        name=a.name,
        avatar_color=a.avatar_color,
        avatar_icon=a.avatar_icon,
        rating=a.rating,
        completed_tasks=a.completed_tasks,
        total_earnings=round(a.total_earnings, 2),
        category=a.category,
    ) for a in agents]


CATEGORY_LABELS = {
    "copywriting": "文案写作",
    "design": "设计",
    "development": "开发",
    "data_analysis": "数据分析",
    "translation": "翻译",
    "video": "视频制作",
    "music": "音乐",
    "marketing": "市场营销",
    "customer_service": "客户服务",
    "human_resources": "人力资源",
    "legal": "法律",
    "finance": "财务",
    "other": "其他",
}


@router.get("/category-stats", response_model=list[CategoryStatItem])
async def get_category_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """分类统计（需要管理员权限）"""
    require_admin(current_user)

    total_tasks = db.query(Task).count() or 1

    rows = db.query(
        Task.category,
        func.count(Task.id).label("count"),
        func.sum(Task.budget).label("total_budget"),
    ).group_by(Task.category).all()

    return [CategoryStatItem(
        category=row.category,
        label=CATEGORY_LABELS.get(row.category, row.category),
        count=row.count,
        total_budget=round(row.total_budget or 0, 2),
        percentage=round(row.count / total_tasks * 100, 1),
    ) for row in sorted(rows, key=lambda r: r.count, reverse=True)]


@router.get("/recent-transactions", response_model=list[RecentTransactionItem])
async def get_recent_transactions(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """最近交易列表（需要管理员权限）"""
    require_admin(current_user)

    txs = db.query(Transaction).order_by(Transaction.created_at.desc()).limit(limit).all()

    results = []
    for tx in txs:
        from_user = db.query(User).filter(User.id == tx.from_user_id).first() if tx.from_user_id else None
        to_user = db.query(User).filter(User.id == tx.to_user_id).first() if tx.to_user_id else None
        task = db.query(Task).filter(Task.id == tx.task_id).first() if tx.task_id else None

        results.append(RecentTransactionItem(
            id=tx.id,
            amount=tx.amount,
            tx_type=tx.tx_type,
            description=tx.description,
            created_at=tx.created_at,
            from_username=from_user.username if from_user else None,
            to_username=to_user.username if to_user else None,
            task_title=task.title if task else None,
        ))

    return results


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

    # 冻结金额校验
    if publisher and publisher.frozen_balance < task.budget:
        raise HTTPException(status_code=400, detail="冻结金额异常，无法处理争议")

    if favor == "publisher":
        # 解冻并退款：优先退体验金（与 cancel_task 逻辑一致，防止套现）
        publisher.frozen_balance -= task.budget
        publisher.trial_balance += task.budget
        task.status = TaskStatus.CANCELLED
        db.add(Transaction(
            task_id=task.id,
            to_user_id=publisher.id,
            amount=task.budget,
            tx_type="refund",
            description="争议退款（发包方胜出）"
        ))
    elif favor == "agent":
        # 解冻并将智能体收入给智能体老板，平台佣金也入账
        publisher.frozen_balance -= task.budget
        if agent_owner:
            agent_owner.balance += task.agent_income
        agent.total_earnings += task.agent_income
        agent.completed_tasks += 1
        agent.status = "online"
        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.utcnow()
        db.add(Transaction(
            task_id=task.id,
            from_user_id=publisher.id,
            to_user_id=agent_owner.id if agent_owner else None,
            amount=task.agent_income,
            tx_type="release",
            description="争议结算（智能体胜出）"
        ))
        # 平台佣金入账
        platform_account = db.query(User).filter(User.role == "admin").first()
        if platform_account and task.platform_fee > 0:
            platform_account.balance += task.platform_fee
            db.add(Transaction(
                task_id=task.id,
                from_user_id=publisher.id,
                to_user_id=platform_account.id,
                amount=task.platform_fee,
                tx_type="commission",
                status="completed",
                description=f"争议处理平台佣金: {task.title}"
            ))
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
        {"username": "admin", "email": "admin@agentgig.com", "role": "admin", "balance": 0, "trial_balance": 99999},
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
                balance=u.get("balance", 0),
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
