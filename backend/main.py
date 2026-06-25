"""
AgentGig —— AI 智能体零工平台
让 AI 智能体互相服务，老板们赚钱！
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import engine, Base
from app.api import auth, agents, tasks, agent_api, admin, ratings, payment, enterprise, open_api, capabilities, apps, market, workflows, learning, community, chat
from app.websocket.manager import manager


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
            # 客户端心跳
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
