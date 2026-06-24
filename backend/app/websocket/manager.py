"""
WebSocket 连接管理器 —— 处理实时消息推送
"""
import json
from typing import Dict, Set
from fastapi import WebSocket
from datetime import datetime


class ConnectionManager:
    def __init__(self):
        # 市场大厅连接（所有人可见的实时更新）
        self.market_connections: Set[WebSocket] = set()
        # 任务房间连接（任务相关的消息）
        self.task_connections: Dict[int, Set[WebSocket]] = {}
        # 用户个人连接
        self.user_connections: Dict[int, Set[WebSocket]] = {}

    async def connect_market(self, websocket: WebSocket):
        await websocket.accept()
        self.market_connections.add(websocket)

    async def connect_task(self, websocket: WebSocket, task_id: int):
        await websocket.accept()
        if task_id not in self.task_connections:
            self.task_connections[task_id] = set()
        self.task_connections[task_id].add(websocket)

    async def connect_user(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(websocket)

    def disconnect_market(self, websocket: WebSocket):
        self.market_connections.discard(websocket)

    def disconnect_task(self, websocket: WebSocket, task_id: int):
        if task_id in self.task_connections:
            self.task_connections[task_id].discard(websocket)

    def disconnect_user(self, websocket: WebSocket, user_id: int):
        if user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)

    async def broadcast_market(self, message: dict):
        """广播消息到市场大厅"""
        dead = set()
        for ws in self.market_connections:
            try:
                await ws.send_json(message)
            except:
                dead.add(ws)
        self.market_connections -= dead

    async def broadcast_task(self, task_id: int, message: dict):
        """发送消息到任务房间"""
        if task_id in self.task_connections:
            dead = set()
            for ws in self.task_connections[task_id]:
                try:
                    await ws.send_json(message)
                except:
                    dead.add(ws)
            self.task_connections[task_id] -= dead

    async def notify_user(self, user_id: int, message: dict):
        """发送通知给特定用户"""
        if user_id in self.user_connections:
            dead = set()
            for ws in self.user_connections[user_id]:
                try:
                    await ws.send_json(message)
                except:
                    dead.add(ws)
            self.user_connections[user_id] -= dead

    async def broadcast_new_task(self, task_data: dict):
        """广播新任务发布"""
        await self.broadcast_market({
            "type": "new_task",
            "data": task_data,
            "timestamp": datetime.utcnow().isoformat()
        })

    async def broadcast_task_accepted(self, task_id: int, agent_name: str):
        """广播任务被接单"""
        await self.broadcast_market({
            "type": "task_accepted",
            "task_id": task_id,
            "agent_name": agent_name,
            "timestamp": datetime.utcnow().isoformat()
        })

    async def broadcast_agent_status_change(self, agent_data: dict):
        """广播智能体状态变化"""
        await self.broadcast_market({
            "type": "agent_status_change",
            "data": agent_data,
            "timestamp": datetime.utcnow().isoformat()
        })

    async def broadcast_bid_placed(self, task_id: int, bid_data: dict):
        """广播新竞标"""
        await self.broadcast_market({
            "type": "new_bid",
            "task_id": task_id,
            "data": bid_data,
            "timestamp": datetime.utcnow().isoformat()
        })


# 全局连接管理器
manager = ConnectionManager()
