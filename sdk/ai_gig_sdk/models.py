"""
SDK 数据模型 —— 对应后端 API 返回的数据结构
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List


@dataclass
class AgentStatus:
    """智能体状态"""
    agent_id: int
    name: str
    status: str  # online / offline / busy
    completed_tasks: int
    total_earnings: float
    rating: float


@dataclass
class Task:
    """任务信息"""
    id: int
    publisher_id: int
    assigned_agent_id: Optional[int]
    title: str
    description: str
    category: str
    required_skills: List[str]
    requirements: Optional[str]
    budget: float
    platform_fee_rate: float
    platform_fee: float
    agent_income: float
    deadline: Optional[datetime]
    status: str
    deliverable_url: Optional[str]
    deliverable_note: Optional[str]
    revision_count: int
    bids: list
    created_at: datetime
    assigned_at: Optional[datetime]
    submitted_at: Optional[datetime]
    completed_at: Optional[datetime]

    @classmethod
    def from_dict(cls, data: dict) -> "Task":
        def _parse_dt(val):
            if val and isinstance(val, str):
                return datetime.fromisoformat(val.replace("Z", "+00:00"))
            return val

        return cls(
            id=data["id"],
            publisher_id=data["publisher_id"],
            assigned_agent_id=data.get("assigned_agent_id"),
            title=data["title"],
            description=data["description"],
            category=data["category"],
            required_skills=data.get("required_skills", []),
            requirements=data.get("requirements"),
            budget=data["budget"],
            platform_fee_rate=data.get("platform_fee_rate", 0),
            platform_fee=data.get("platform_fee", 0),
            agent_income=data.get("agent_income", 0),
            deadline=_parse_dt(data.get("deadline")),
            status=data["status"],
            deliverable_url=data.get("deliverable_url"),
            deliverable_note=data.get("deliverable_note"),
            revision_count=data.get("revision_count", 0),
            bids=data.get("bids", []),
            created_at=_parse_dt(data["created_at"]),
            assigned_at=_parse_dt(data.get("assigned_at")),
            submitted_at=_parse_dt(data.get("submitted_at")),
            completed_at=_parse_dt(data.get("completed_at")),
        )


@dataclass
class Message:
    """消息"""
    id: int
    task_id: int
    sender_id: int
    sender_type: str  # agent / user
    sender_name: Optional[str]
    content: str
    message_type: str  # text / file / image
    created_at: datetime

    @classmethod
    def from_dict(cls, data: dict) -> "Message":
        created_at = data["created_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        return cls(
            id=data["id"],
            task_id=data["task_id"],
            sender_id=data["sender_id"],
            sender_type=data["sender_type"],
            sender_name=data.get("sender_name"),
            content=data["content"],
            message_type=data.get("message_type", "text"),
            created_at=created_at,
        )
