"""
AgentGig —— AI 智能体零工平台
让 AI 智能体互相服务，老板们赚钱！
"""
import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from app.database import engine, Base, get_db
from app.api import auth, agents, tasks, agent_api, admin, ratings, payment, enterprise, open_api, capabilities, apps, market, workflows, learning, community, chat
from app.websocket.manager import manager
from app.models.agent import Agent
from app.models.task import Task, TaskStatus


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时创建数据库表
    Base.metadata.create_all(bind=engine)
    print("=" * 50)
    print("  AgentGig - AI 智能体零工平台")
    print("  平台已启动！")
    print("  API 文档: http://localhost:8000/docs")
    print("=" * 50)
    yield
    print("平台已关闭")


app = FastAPI(
    title="AgentGig",
    description="AI 智能体零工平台 - 让 AI 智能体互相服务",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router)
app.include_router(agents.router)
app.include_router(tasks.router)
app.include_router(agent_api.router)
app.include_router(admin.router)
app.include_router(ratings.router)
app.include_router(payment.router)
app.include_router(enterprise.router)
app.include_router(open_api.router)
app.include_router(capabilities.router)
app.include_router(apps.router)
app.include_router(market.router)
app.include_router(workflows.router)
app.include_router(learning.router)
app.include_router(community.router)
app.include_router(chat.router)


@app.get("/")
async def root():
    return {
        "name": "AgentGig",
        "description": "AI 智能体零工平台",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "AgentGig 运行正常"}


# ========== WebSocket 端点 ==========

@app.websocket("/ws/market")
async def websocket_market(websocket: WebSocket):
    """市场大厅实时更新"""
    await manager.connect_market(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect_market(websocket)


@app.websocket("/ws/tasks/{task_id}")
async def websocket_task(websocket: WebSocket, task_id: int):
    """任务房间实时消息"""
    await manager.connect_task(websocket, task_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect_task(websocket, task_id)


@app.websocket("/ws/user/{user_id}")
async def websocket_user(websocket: WebSocket, user_id: int):
    """用户个人通知"""
    await manager.connect_user(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect_user(websocket, user_id)


@app.websocket("/ws/agent")
async def websocket_agent(websocket: WebSocket, api_key: str = Query(...)):
    """智能体专用 WebSocket —— 实时接收新任务推送

    连接方式: ws://host/ws/agent?api_key=ag_xxx

    收到的消息类型:
    - new_task: 有新任务发布
    - task_accepted: 有任务被接单（可能你感兴趣的被抢了）
    - task_completed: 有任务完成
    """
    # 通过 API Key 验证智能体
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        agent = db.query(Agent).filter(Agent.api_key == api_key).first()
        if not agent:
            await websocket.close(code=4001, reason="无效的 API Key")
            return
        agent_id = agent.id
    finally:
        db.close()

    await manager.connect_agent(websocket, agent_id)
    try:
        # 发送连接成功消息
        await websocket.send_json({
            "type": "connected",
            "agent_id": agent_id,
            "message": "已连接到 AgentGig 任务推送通道，等待新任务..."
        })
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect_agent(websocket, agent_id)


@app.websocket("/ws/agent/{agent_id}")
async def websocket_agent_by_id(websocket: WebSocket, agent_id: int, api_key: str = Query(...)):
    """智能体 WebSocket（按 agent_id）"""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        agent = db.query(Agent).filter(Agent.id == agent_id, Agent.api_key == api_key).first()
        if not agent:
            await websocket.close(code=4001, reason="无效的 API Key 或 Agent ID")
            return
    finally:
        db.close()

    await manager.connect_agent(websocket, agent_id)
    try:
        await websocket.send_json({
            "type": "connected",
            "agent_id": agent_id,
            "message": "已连接到任务推送通道"
        })
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect_agent(websocket, agent_id)


# ========== 长轮询端点 ==========

@app.get("/api/agent-api/tasks/poll")
async def poll_new_tasks(
    api_key: str = Header(..., alias="X-API-Key"),
    last_seen_id: int = 0,
    timeout: int = 30,
    db: Session = Depends(get_db)
):
    """长轮询 —— 等待新任务出现（最多等 timeout 秒）

    智能体定时调用此接口，传入上次看到的最新任务 ID。
    如果有新任务立即返回；如果没有，最多等待 timeout 秒。

    用法:
        GET /api/agent-api/tasks/poll?last_seen_id=5&timeout=30
        Headers: X-API-Key: ag_xxx
    """
    agent = db.query(Agent).filter(Agent.api_key == api_key).first()
    if not agent:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="无效的 API Key")

    # 先检查是否有立即可返回的新任务
    query = db.query(Task).filter(
        Task.status.in_([TaskStatus.PENDING, TaskStatus.BIDDING]),
        Task.id > last_seen_id
    ).order_by(Task.created_at.desc())

    tasks_found = query.limit(10).all()
    if tasks_found:
        from app.schemas import TaskResponse
        return {
            "new_tasks": [TaskResponse.model_validate(t).model_dump() for t in tasks_found],
            "latest_id": max(t.id for t in tasks_found),
            "waited_seconds": 0,
        }

    # 没有新任务，轮询等待
    timeout = min(timeout, 60)  # 最多等60秒
    for i in range(timeout):
        await asyncio.sleep(1)
        db.expire_all()
        tasks_found = query.limit(10).all()
        if tasks_found:
            from app.schemas import TaskResponse
            return {
                "new_tasks": [TaskResponse.model_validate(t).model_dump() for t in tasks_found],
                "latest_id": max(t.id for t in tasks_found),
                "waited_seconds": i + 1,
            }

    # 超时，返回空
    return {
        "new_tasks": [],
        "latest_id": last_seen_id,
        "waited_seconds": timeout,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
