from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class TaskStatus(str, enum.Enum):
    PENDING = "pending"           # 待接单（在公告栏展示）
    BIDDING = "bidding"           # 竞标中（多个智能体投标）
    ASSIGNED = "assigned"         # 已接单（分配给某个智能体）
    IN_PROGRESS = "in_progress"   # 进行中
    SUBMITTED = "submitted"       # 已提交交付物，待验收
    REVISION = "revision"         # 需要修改（用户不满意，要求返工）
    COMPLETED = "completed"       # 已完成（验收通过）
    CANCELLED = "cancelled"       # 已取消
    DISPUTED = "disputed"         # 争议中


class TaskCategory(str, enum.Enum):
    COPYWRITING = "copywriting"     # 文案写作
    DESIGN = "design"               # 设计
    DEVELOPMENT = "development"     # 开发
    DATA_ANALYSIS = "data_analysis" # 数据分析
    TRANSLATION = "translation"     # 翻译
    VIDEO = "video"                 # 视频制作
    MUSIC = "music"                 # 音乐
    MARKETING = "marketing"         # 市场营销
    CUSTOMER_SERVICE = "customer_service"  # 客户服务
    HUMAN_RESOURCES = "human_resources"    # 人力资源
    LEGAL = "legal"                 # 法律
    FINANCE = "finance"             # 财务
    OTHER = "other"                 # 其他


# 分类与子分类映射
CATEGORY_SUBCATEGORIES = {
    TaskCategory.COPYWRITING: [
        {"value": "article", "label": "文章撰写"},
        {"value": "marketing_copy", "label": "营销文案"},
        {"value": "social_media", "label": "社交媒体内容"},
        {"value": "technical_writing", "label": "技术文档"},
        {"value": "creative_writing", "label": "创意写作"},
        {"value": "other_copywriting", "label": "其他文案"},
    ],
    TaskCategory.DESIGN: [
        {"value": "logo", "label": "Logo设计"},
        {"value": "ui_ux", "label": "UI/UX设计"},
        {"value": "graphic", "label": "平面设计"},
        {"value": "web_design", "label": "网页设计"},
        {"value": "illustration", "label": "插画设计"},
        {"value": "other_design", "label": "其他设计"},
    ],
    TaskCategory.DEVELOPMENT: [
        {"value": "web_dev", "label": "Web开发"},
        {"value": "mobile_dev", "label": "移动开发"},
        {"value": "api_dev", "label": "API开发"},
        {"value": "scripting", "label": "脚本开发"},
        {"value": "database", "label": "数据库开发"},
        {"value": "devops", "label": "DevOps"},
        {"value": "other_dev", "label": "其他开发"},
    ],
    TaskCategory.DATA_ANALYSIS: [
        {"value": "data_processing", "label": "数据处理"},
        {"value": "visualization", "label": "数据可视化"},
        {"value": "machine_learning", "label": "机器学习"},
        {"value": "statistical_analysis", "label": "统计分析"},
        {"value": "other_data", "label": "其他数据分析"},
    ],
    TaskCategory.TRANSLATION: [
        {"value": "document_translation", "label": "文档翻译"},
        {"value": "website_translation", "label": "网站翻译"},
        {"value": "software_localization", "label": "软件本地化"},
        {"value": "interpretation", "label": "口译服务"},
        {"value": "other_translation", "label": "其他翻译"},
    ],
    TaskCategory.VIDEO: [
        {"value": "video_editing", "label": "视频剪辑"},
        {"value": "animation", "label": "动画制作"},
        {"value": "video_production", "label": "视频拍摄"},
        {"value": "subtitle", "label": "字幕制作"},
        {"value": "other_video", "label": "其他视频"},
    ],
    TaskCategory.MUSIC: [
        {"value": "music_production", "label": "音乐制作"},
        {"value": "audio_editing", "label": "音频剪辑"},
        {"value": "voice_over", "label": "配音服务"},
        {"value": "sound_design", "label": "音效设计"},
        {"value": "other_music", "label": "其他音乐"},
    ],
    TaskCategory.MARKETING: [
        {"value": "social_media_marketing", "label": "社交媒体营销"},
        {"value": "seo", "label": "SEO优化"},
        {"value": "content_marketing", "label": "内容营销"},
        {"value": "email_marketing", "label": "邮件营销"},
        {"value": "other_marketing", "label": "其他营销"},
    ],
    TaskCategory.CUSTOMER_SERVICE: [
        {"value": "customer_support", "label": "客户支持"},
        {"value": "chat_support", "label": "在线客服"},
        {"value": "technical_support", "label": "技术支持"},
        {"value": "other_service", "label": "其他服务"},
    ],
    TaskCategory.HUMAN_RESOURCES: [
        {"value": "recruitment", "label": "招聘服务"},
        {"value": "training", "label": "培训服务"},
        {"value": "performance", "label": "绩效管理"},
        {"value": "other_hr", "label": "其他人力资源"},
    ],
    TaskCategory.LEGAL: [
        {"value": "contract_review", "label": "合同审查"},
        {"value": "legal_consulting", "label": "法律咨询"},
        {"value": "compliance", "label": "合规服务"},
        {"value": "other_legal", "label": "其他法律"},
    ],
    TaskCategory.FINANCE: [
        {"value": "accounting", "label": "会计服务"},
        {"value": "tax", "label": "税务服务"},
        {"value": "financial_analysis", "label": "财务分析"},
        {"value": "other_finance", "label": "其他财务"},
    ],
    TaskCategory.OTHER: [
        {"value": "other", "label": "其他任务"},
    ],
}


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    publisher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_agent_id = Column(Integer, ForeignKey("agents.id"), nullable=True)

    # 任务基本信息
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    sub_category = Column(String(50), nullable=True)  # 子分类
    required_skills = Column(JSON, default=list)  # 所需技能标签
    requirements = Column(Text, nullable=True)  # 详细需求说明

    # 预算与费用
    budget = Column(Float, nullable=False)           # 预算金额
    platform_fee_rate = Column(Float, default=0.10)  # 平台抽成比例 10%
    platform_fee = Column(Float, default=0.0)        # 平台实际抽成金额
    agent_income = Column(Float, default=0.0)        # 智能体实际收入

    # 时间
    deadline = Column(DateTime(timezone=True), nullable=True)
    estimated_hours = Column(Integer, nullable=True)  # 预估工时

    # 状态与交付
    status = Column(String(20), default=TaskStatus.PENDING)
    deliverable_url = Column(String(500), nullable=True)   # 交付物地址
    deliverable_note = Column(Text, nullable=True)         # 交付说明
    revision_count = Column(Integer, default=0)            # 返工次数
    max_revisions = Column(Integer, default=2)             # 最大返工次数

    # 竞标
    bids = Column(JSON, default=list)  # 竞标记录 [{"agent_id": 1, "price": 100, "message": "..."}]

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    publisher = relationship("User", backref="published_tasks")
    assigned_agent = relationship("Agent", back_populates="tasks")
    messages = relationship("Message", back_populates="task", order_by="Message.created_at")
    transactions = relationship("Transaction", back_populates="task")
