from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.database import get_db
from app.models.user import User
from app.models.community import CommunityPost, CommunityReply, PostType
from app.schemas import (
    CommunityPostCreate, CommunityPostUpdate, CommunityPostResponse,
    CommunityPostDetailResponse, CommunityReplyCreate, CommunityReplyResponse,
)
from app.auth import get_current_user

router = APIRouter(prefix="/api/community", tags=["开发者社区"])


def _build_post_response(post: CommunityPost, author_name: str = None) -> CommunityPostResponse:
    return CommunityPostResponse(
        id=post.id,
        author_id=post.author_id,
        author_name=author_name,
        title=post.title,
        content=post.content,
        post_type=post.post_type,
        tags=post.tags or [],
        views=post.views,
        likes=post.likes,
        reply_count=post.reply_count,
        is_pinned=post.is_pinned,
        is_featured=post.is_featured,
        created_at=post.created_at,
        updated_at=post.updated_at,
    )


def _build_reply_response(reply: CommunityReply, author_name: str = None) -> CommunityReplyResponse:
    children = []
    if hasattr(reply, 'child_replies') and reply.child_replies:
        children = [_build_reply_response(cr) for cr in reply.child_replies]

    return CommunityReplyResponse(
        id=reply.id,
        post_id=reply.post_id,
        author_id=reply.author_id,
        author_name=author_name,
        content=reply.content,
        parent_reply_id=reply.parent_reply_id,
        likes=reply.likes,
        created_at=reply.created_at,
        child_replies=children,
    )


# ========== 帖子 ==========

@router.post("/posts", response_model=CommunityPostResponse)
async def create_post(
    data: CommunityPostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """发帖"""
    post = CommunityPost(
        author_id=current_user.id,
        title=data.title,
        content=data.content,
        post_type=data.post_type,
        tags=data.tags,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _build_post_response(post, current_user.username)


@router.get("/posts", response_model=List[CommunityPostResponse])
async def list_posts(
    post_type: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = "newest",  # newest / popular / active
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """获取帖子列表"""
    query = db.query(CommunityPost)

    if post_type:
        query = query.filter(CommunityPost.post_type == post_type)
    if search:
        query = query.filter(
            CommunityPost.title.contains(search) |
            CommunityPost.content.contains(search)
        )

    if sort == "popular":
        query = query.order_by(CommunityPost.likes.desc())
    elif sort == "active":
        query = query.order_by(CommunityPost.reply_count.desc())
    else:
        query = query.order_by(
            CommunityPost.is_pinned.desc(),
            CommunityPost.created_at.desc()
        )

    posts = query.offset(skip).limit(limit).all()

    result = []
    for post in posts:
        author = db.query(User).filter(User.id == post.author_id).first()
        result.append(_build_post_response(post, author.username if author else None))

    return result


@router.get("/posts/{post_id}", response_model=CommunityPostDetailResponse)
async def get_post(
    post_id: int,
    db: Session = Depends(get_db)
):
    """获取帖子详情（含回复）"""
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")

    # 增加浏览量
    post.views = (post.views or 0) + 1
    db.commit()

    author = db.query(User).filter(User.id == post.author_id).first()

    # 获取顶级回复
    top_replies = db.query(CommunityReply).filter(
        CommunityReply.post_id == post_id,
        CommunityReply.parent_reply_id.is_(None),
    ).order_by(CommunityReply.created_at.asc()).all()

    replies = []
    for reply in top_replies:
        reply_author = db.query(User).filter(User.id == reply.author_id).first()
        replies.append(_build_reply_response(reply, reply_author.username if reply_author else None))

    return CommunityPostDetailResponse(
        id=post.id,
        author_id=post.author_id,
        author_name=author.username if author else None,
        title=post.title,
        content=post.content,
        post_type=post.post_type,
        tags=post.tags or [],
        views=post.views,
        likes=post.likes,
        reply_count=post.reply_count,
        is_pinned=post.is_pinned,
        is_featured=post.is_featured,
        created_at=post.created_at,
        updated_at=post.updated_at,
        replies=replies,
    )


@router.put("/posts/{post_id}", response_model=CommunityPostResponse)
async def update_post(
    post_id: int,
    data: CommunityPostUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """编辑帖子"""
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权编辑此帖子")

    if data.title is not None:
        post.title = data.title
    if data.content is not None:
        post.content = data.content
    if data.tags is not None:
        post.tags = data.tags

    db.commit()
    db.refresh(post)
    return _build_post_response(post, current_user.username)


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除帖子"""
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权删除此帖子")

    # 删除所有回复
    db.query(CommunityReply).filter(CommunityReply.post_id == post_id).delete()
    db.delete(post)
    db.commit()
    return {"message": "帖子已删除"}


@router.post("/posts/{post_id}/like")
async def like_post(
    post_id: int,
    db: Session = Depends(get_db)
):
    """点赞帖子"""
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    post.likes = (post.likes or 0) + 1
    db.commit()
    return {"likes": post.likes}


# ========== 回复 ==========

@router.post("/posts/{post_id}/reply", response_model=CommunityReplyResponse)
async def create_reply(
    post_id: int,
    data: CommunityReplyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """回复帖子"""
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")

    reply = CommunityReply(
        post_id=post_id,
        author_id=current_user.id,
        content=data.content,
        parent_reply_id=data.parent_reply_id,
    )
    db.add(reply)

    # 更新帖子回复数
    post.reply_count = (post.reply_count or 0) + 1

    db.commit()
    db.refresh(reply)
    return _build_reply_response(reply, current_user.username)


@router.post("/replies/{reply_id}/like")
async def like_reply(
    reply_id: int,
    db: Session = Depends(get_db)
):
    """点赞回复"""
    reply = db.query(CommunityReply).filter(CommunityReply.id == reply_id).first()
    if not reply:
        raise HTTPException(status_code=404, detail="回复不存在")
    reply.likes = (reply.likes or 0) + 1
    db.commit()
    return {"likes": reply.likes}


@router.delete("/replies/{reply_id}")
async def delete_reply(
    reply_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除回复"""
    reply = db.query(CommunityReply).filter(CommunityReply.id == reply_id).first()
    if not reply:
        raise HTTPException(status_code=404, detail="回复不存在")
    if reply.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权删除此回复")

    post = db.query(CommunityPost).filter(CommunityPost.id == reply.post_id).first()
    if post:
        post.reply_count = max(0, (post.reply_count or 0) - 1)

    db.delete(reply)
    db.commit()
    return {"message": "回复已删除"}


# ========== 统计 ==========

@router.get("/stats")
async def community_stats(db: Session = Depends(get_db)):
    """社区统计"""
    total_posts = db.query(CommunityPost).count()
    total_replies = db.query(CommunityReply).count()
    total_articles = db.query(CommunityPost).filter(
        CommunityPost.post_type == PostType.ARTICLE
    ).count()

    return {
        "total_posts": total_posts,
        "total_replies": total_replies,
        "total_articles": total_articles,
    }
