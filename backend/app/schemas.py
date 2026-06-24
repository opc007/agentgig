from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ========== 用户相关 ==========

class UserRole(str, Enum):
    NORMAL = "normal"
    AGENT_OWNER = "agent_owner"
    ADMIN = "admin"
    ENTERPRISE = "enterprise"


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
    certification_level: str = "none"
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
    sub_category: Optional[str] = None
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
    sub_category: Optional[str] = None
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


# ========== 评分相关 ==========

class RatingCreate(BaseModel):
    task_id: int
    quality_score: float = Field(..., ge=1, le=5, description="完成质量 (1-5)")
    speed_score: float = Field(..., ge=1, le=5, description="响应速度 (1-5)")
    attitude_score: float = Field(..., ge=1, le=5, description="沟通态度 (1-5)")
    comment: Optional[str] = None


class RatingResponse(BaseModel):
    id: int
    task_id: int
    agent_id: int
    user_id: int
    quality_score: float
    speed_score: float
    attitude_score: float
    overall_score: float
    comment: Optional[str]
    created_at: datetime
    user_name: Optional[str] = None
    task_title: Optional[str] = None
    agent_name: Optional[str] = None

    class Config:
        from_attributes = True


class RatingStats(BaseModel):
    average_rating: float
    total_ratings: int
    quality_avg: float
    speed_avg: float
    attitude_avg: float


# ========== 平台统计 ==========

class PlatformStats(BaseModel):
    total_users: int
    total_agents: int
    total_tasks: int
    completed_tasks: int
    total_transactions: float
    online_agents: int


# ========== 管理后台统计 ==========

class DashboardOverview(BaseModel):
    total_users: int
    total_agents: int
    total_tasks: int
    completed_tasks: int
    completion_rate: float
    total_revenue: float
    platform_commission: float
    online_agents: int
    pending_tasks: int
    disputed_tasks: int
    new_users_today: int
    new_tasks_today: int


class TrendPoint(BaseModel):
    label: str
    tasks_created: int
    tasks_completed: int
    revenue: float


class TopAgentItem(BaseModel):
    id: int
    name: str
    avatar_color: str
    avatar_icon: str
    rating: float
    completed_tasks: int
    total_earnings: float
    category: Optional[str]


class CategoryStatItem(BaseModel):
    category: str
    label: str
    count: int
    total_budget: float
    percentage: float


class RecentTransactionItem(BaseModel):
    id: int
    amount: float
    tx_type: str
    description: Optional[str]
    created_at: datetime
    from_username: Optional[str] = None
    to_username: Optional[str] = None
    task_title: Optional[str] = None


# ========== 认证相关 ==========

class CertificationInfo(BaseModel):
    level: str
    label: str
    color: str
    icon: str
    completed_tasks: int
    rating: float
    days_since_register: int
    next_level: Optional[str] = None
    next_level_requirements: Optional[dict] = None


# ========== 支付相关 ==========

class DepositRequest(BaseModel):
    amount: float = Field(..., gt=0, description="充值金额")
    payment_method: str = Field(default="alipay", description="支付方式: alipay/wechat/bank")


class DepositResponse(BaseModel):
    message: str
    amount: float
    balance: float
    trial_balance: float


class WithdrawRequest(BaseModel):
    amount: float = Field(..., gt=0, description="提现金额")
    method: str = Field(..., description="提现方式: alipay/wechat/bank")
    account: str = Field(..., description="收款账号")
    account_name: Optional[str] = Field(None, description="收款人姓名")


class WithdrawResponse(BaseModel):
    id: int
    amount: float
    fee: float
    actual_amount: float
    method: str
    account: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class WithdrawalReviewRequest(BaseModel):
    action: str = Field(..., description="审批操作: approve/reject")
    reject_reason: Optional[str] = Field(None, description="拒绝原因")


# ========== 企业相关 ==========

class EnterpriseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="企业名称")
    description: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None


class EnterpriseResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    description: Optional[str]
    industry: Optional[str]
    website: Optional[str]
    is_verified: bool
    credit_limit: float
    used_credit: float
    max_members: int
    member_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class EnterpriseMemberResponse(BaseModel):
    id: int
    user_id: int
    username: str
    email: str
    role: str
    can_publish_tasks: bool
    can_manage_members: bool
    can_view_finances: bool
    joined_at: Optional[datetime]

    class Config:
        from_attributes = True


class InviteMemberRequest(BaseModel):
    email: str = Field(..., description="被邀请人邮箱")
    role: str = Field(default="member", description="成员角色: admin/member")


class UpdateMemberRequest(BaseModel):
    role: Optional[str] = None
    can_publish_tasks: Optional[bool] = None
    can_manage_members: Optional[bool] = None
    can_view_finances: Optional[bool] = None


class BatchTaskItem(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str
    category: str
    sub_category: Optional[str] = None
    required_skills: List[str] = []
    budget: float = Field(..., gt=0)
    deadline: Optional[datetime] = None


class BatchTaskCreate(BaseModel):
    tasks: List[BatchTaskItem] = Field(..., min_items=1, max_items=50, description="批量任务列表")


# Dashboard 相关
class DashboardOverview(BaseModel):
    total_users: int
    total_agents: int
    total_tasks: int
    completed_tasks: int
    total_transactions: float
    online_agents: int
    pending_withdrawals: int = 0


class TrendPoint(BaseModel):
    date: str
    count: int


class TopAgentItem(BaseModel):
    id: int
    name: str
    completed_tasks: int
    rating: float
    total_earnings: float


class CategoryStatItem(BaseModel):
    category: str
    count: int


class RecentTransactionItem(BaseModel):
    id: int
    amount: float
    tx_type: str
    description: Optional[str]
    created_at: datetime


# ========== 开放 API 平台 ==========

class DeveloperRegister(BaseModel):
    company_name: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None


class DeveloperResponse(BaseModel):
    id: int
    user_id: int
    company_name: Optional[str]
    website: Optional[str]
    description: Optional[str]
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class ApiKeyResponse(BaseModel):
    id: int
    key: str
    name: str
    is_active: bool
    rate_limit: int
    total_calls: int
    last_used_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ApiKeyListResponse(BaseModel):
    keys: List[ApiKeyResponse]


class ApiUsageStats(BaseModel):
    total_calls: int
    calls_today: int
    avg_response_time_ms: float
    success_rate: float
    top_endpoints: List[dict]


# ========== 能力市场 ==========

class CapabilityCreate(BaseModel):
    agent_id: int
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    category: str
    tags: List[str] = []
    api_endpoint: str
    input_schema: Optional[dict] = None
    output_schema: Optional[dict] = None
    example_input: Optional[str] = None
    example_output: Optional[str] = None
    pricing_model: str = "per_call"
    price: float = Field(default=0.0, ge=0)


class CapabilityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    api_endpoint: Optional[str] = None
    input_schema: Optional[dict] = None
    output_schema: Optional[dict] = None
    example_input: Optional[str] = None
    example_output: Optional[str] = None
    pricing_model: Optional[str] = None
    price: Optional[float] = None
    status: Optional[str] = None


class CapabilityResponse(BaseModel):
    id: int
    agent_id: int
    agent_name: Optional[str] = None
    name: str
    description: Optional[str]
    category: str
    tags: List[str]
    api_endpoint: str
    input_schema: Optional[dict]
    output_schema: Optional[dict]
    example_input: Optional[str]
    example_output: Optional[str]
    pricing_model: str
    price: float
    status: str
    total_subscribers: int
    total_calls: int
    avg_response_time_ms: int
    success_rate: float
    rating: float
    created_at: datetime

    class Config:
        from_attributes = True


class CapabilitySubscriptionResponse(BaseModel):
    id: int
    capability_id: int
    user_id: int
    api_key: str
    is_active: bool
    calls_used: int
    calls_limit: int
    subscribed_at: datetime
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


# ========== 智能体应用商店 ==========

class AppCreate(BaseModel):
    agent_id: int
    name: str = Field(..., min_length=1, max_length=100)
    tagline: Optional[str] = None
    description: Optional[str] = None
    category: str
    tags: List[str] = []
    icon_url: Optional[str] = None
    screenshots: List[str] = []
    demo_url: Optional[str] = None
    pricing_type: str = "free"
    price: float = Field(default=0.0, ge=0)
    subscription_price: float = Field(default=0.0, ge=0)


class AppUpdate(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    icon_url: Optional[str] = None
    screenshots: Optional[List[str]] = None
    demo_url: Optional[str] = None
    pricing_type: Optional[str] = None
    price: Optional[float] = None
    subscription_price: Optional[float] = None
    status: Optional[str] = None


class AppResponse(BaseModel):
    id: int
    agent_id: int
    agent_name: Optional[str] = None
    name: str
    tagline: Optional[str]
    description: Optional[str]
    category: str
    tags: List[str]
    icon_url: Optional[str]
    screenshots: List[str]
    demo_url: Optional[str]
    pricing_type: str
    price: float
    subscription_price: float
    status: str
    total_installs: int
    total_revenue: float
    rating: float
    total_ratings: int
    created_at: datetime

    class Config:
        from_attributes = True


class AppReviewCreate(BaseModel):
    rating: float = Field(..., ge=1, le=5)
    title: Optional[str] = None
    comment: Optional[str] = None


class AppReviewResponse(BaseModel):
    id: int
    app_id: int
    user_id: int
    user_name: Optional[str] = None
    rating: float
    title: Optional[str]
    comment: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ========== 工作流编排 ==========

class WorkflowStepCreate(BaseModel):
    type: str  # task_decompose / agent_assign / parallel_exec / sequential_exec / merge / condition
    name: str = Field(..., min_length=1, max_length=100)
    config: dict = {}  # 步骤配置
    agent_id: Optional[int] = None  # 指定智能体


class WorkflowEdgeCreate(BaseModel):
    from_step: int
    to_step: int
    condition: Optional[str] = None


class WorkflowCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    steps: List[WorkflowStepCreate] = []
    edges: List[WorkflowEdgeCreate] = []
    config: dict = {}


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    steps: Optional[List[WorkflowStepCreate]] = None
    edges: Optional[List[WorkflowEdgeCreate]] = None
    config: Optional[dict] = None
    status: Optional[str] = None


class WorkflowStepResponse(BaseModel):
    type: str
    name: str
    config: dict
    agent_id: Optional[int] = None


class WorkflowResponse(BaseModel):
    id: int
    creator_id: int
    name: str
    description: Optional[str]
    status: str
    steps: list
    edges: list
    config: dict
    total_executions: int
    successful_executions: int
    avg_execution_time: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkflowExecuteRequest(BaseModel):
    input_data: dict = {}


class WorkflowStepExecutionResponse(BaseModel):
    id: int
    step_index: int
    agent_id: Optional[int]
    agent_name: Optional[str] = None
    status: str
    input_data: Optional[dict]
    output_data: Optional[dict]
    task_id: Optional[int]
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class WorkflowExecutionResponse(BaseModel):
    id: int
    workflow_id: int
    trigger_user_id: int
    status: str
    input_data: dict
    result: Optional[dict]
    current_step_index: int
    execution_time: Optional[float]
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    step_executions: List[WorkflowStepExecutionResponse] = []

    class Config:
        from_attributes = True


# ========== 智能体学习进化 ==========

class AgentTaskHistoryResponse(BaseModel):
    id: int
    agent_id: int
    task_id: int
    task_title: Optional[str] = None
    success: bool
    quality_score: Optional[float]
    speed_score: Optional[float]
    attitude_score: Optional[float]
    skill_match_score: float
    skills_used: list
    completion_time: Optional[float]
    feedback: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AgentSkillProfileResponse(BaseModel):
    id: int
    agent_id: int
    skill_name: str
    proficiency: float
    times_used: int
    success_count: int
    total_score: float
    recent_avg_score: float
    last_used_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class AgentLearningCurveResponse(BaseModel):
    id: int
    agent_id: int
    snapshot_at: datetime
    total_tasks: int
    avg_rating: float
    avg_completion_time: float
    skill_diversity: int
    overall_proficiency: float

    class Config:
        from_attributes = True


class AgentLearningDashboard(BaseModel):
    agent_id: int
    agent_name: str
    total_tasks_completed: int
    avg_rating: float
    skill_profiles: List[AgentSkillProfileResponse]
    learning_curve: List[AgentLearningCurveResponse]
    recent_history: List[AgentTaskHistoryResponse]
    top_skills: List[dict]  # [{skill_name, proficiency, trend}]
    improvement_rate: float  # 近期提升率


# ========== 开发者社区 ==========

class CommunityPostCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    content: str
    post_type: str = "discussion"  # discussion / article / question / showcase
    tags: List[str] = []


class CommunityPostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None


class CommunityReplyCreate(BaseModel):
    content: str
    parent_reply_id: Optional[int] = None


class CommunityReplyResponse(BaseModel):
    id: int
    post_id: int
    author_id: int
    author_name: Optional[str] = None
    content: str
    parent_reply_id: Optional[int]
    likes: int
    created_at: datetime
    child_replies: List["CommunityReplyResponse"] = []

    class Config:
        from_attributes = True


class CommunityPostResponse(BaseModel):
    id: int
    author_id: int
    author_name: Optional[str] = None
    title: str
    content: str
    post_type: str
    tags: list
    views: int
    likes: int
    reply_count: int
    is_pinned: bool
    is_featured: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CommunityPostDetailResponse(CommunityPostResponse):
    replies: List[CommunityReplyResponse] = []
