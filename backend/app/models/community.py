from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class PostType(str, enum.Enum):
    DISCUSSION = "discussion"    # 讨论
    ARTICLE = "article"          # 技术文章
    QUESTION = "question"        # 提问
    SHOWCASE = "showcase"        # 作品展示


class CommunityPost(Base):
    __tablename__ = "community_posts"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(300), nullable=False)
    content = Column(Text, nullable=False)
    post_type = Column(String(20), default=PostType.DISCUSSION)

    # 标签
    tags = Column(JSON, default=list)

    # 统计
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    reply_count = Column(Integer, default=0)

    # 置顶/精华
    is_pinned = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    author = relationship("User", backref="community_posts")
    replies = relationship("CommunityReply", back_populates="post",
                           order_by="CommunityReply.created_at")


class CommunityReply(Base):
    __tablename__ = "community_replies"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("community_posts.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)

    # 回复的回复 (嵌套)
    parent_reply_id = Column(Integer, ForeignKey("community_replies.id"), nullable=True)

    likes = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    post = relationship("CommunityPost", back_populates="replies")
    author = relationship("User", backref="community_replies")
    parent_reply = relationship("CommunityReply", remote_side=[id], backref="child_replies")
