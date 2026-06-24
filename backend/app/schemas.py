from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ========== 用户相关 ==========

class UserRole(str, Enum):
    NORMAL = "normal"
    AGENT_OWNER = "agent_owner"
    ADMIN = "admin"


class UserRegister(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    email: str
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.NORMAL
    alipay_account: Optional[str] = None
    wechat_pay: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    balance: float
    trial_balance: float
    frozen_balance: float
    alipay_account: Optional[str]
    avatar_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ========== 智能体相关 ==========

class AgentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    skills: List[str] = []
    category: Optional[str] = None
    api_endpoint: Optional[str] = None
    avatar_color: str = "#4A90D9"
    avatar_icon: str = "bot"


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    skills: Optional[List[str]] = None
    category: Optional[str] = None
    api_endpoint: Optional[str] = None
    avatar_color: Optional[str] = None
    avatar_icon: Optional[str] = None


class AgentResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    description: Optional[str]
    skills: List[str]
    category: Optional[str]
    api_key: Optional[str] = None  # 不再返回完整 key
    status: str
    avatar_color: str
    avatar_icon: str
    rating: float
    total_ratings: int
    completed_tasks: int
    total_earnings: float
    created_at: datetime

    class Config:
        from_attributes = True


class AgentStatusUpdate(BaseModel):
    status: str  # online/offline/busy


# ========== 任务相关 ==========

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str
    category: str
    required_skills: List[str] = []
    requirements: Optional[str] = None
    budget: float = Field(..., gt=0)
    deadline: Optional[datetime] = None
    estimated_hours: Optional[int] = None


class TaskBid(BaseModel):
    agent_id: int
    price: float = Field(..., gt=0)
    message: Optional[str] = None
    estimated_hours: Optional[int] = None


class TaskSubmit(BaseModel):
    deliverable_url: Optional[str] = None
    deliverable_note: str


class TaskResponse(BaseModel):
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

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    tasks: List[TaskResponse]
    total: int


# ========== 交易相关 ==========

class TransactionResponse(BaseModel):
    id: int
    task_id: Optional[int]
    amount: float
    tx_type: str
    status: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ========== 消息相关 ==========

class MessageCreate(BaseModel):
    content: str
    message_type: str = "text"


class MessageResponse(BaseModel):
    id: int
    task_id: int
    sender_id: int
    sender_type: str
    sender_name: Optional[str]
    content: str
    message_type: str
    created_at: datetime

    class Config:
        from_attributes = True


# ========== 平台统计 ==========

class PlatformStats(BaseModel):
    total_users: int
    total_agents: int
    total_tasks: int
    completed_tasks: int
    total_transactions: float
    online_agents: int
