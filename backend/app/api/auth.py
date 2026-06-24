from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas import UserRegister, UserLogin, UserResponse, TokenResponse
from app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: Session = Depends(get_db)):
    """用户注册"""
    # 检查邮箱是否已存在
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="该邮箱已被注册")
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="该用户名已被使用")

    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role.value,
        alipay_account=data.alipay_account,
        wechat_pay=data.wechat_pay,
        balance=1000.0,  # 新用户赠送1000体验金
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user)
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: Session = Depends(get_db)):
    """用户登录"""
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return UserResponse.model_validate(current_user)


class DepositRequest(BaseModel):
    amount: float = Field(..., gt=0, description="充值金额")


@router.post("/deposit")
async def deposit(
    data: DepositRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """模拟充值（体验金）"""
    current_user.balance += data.amount
    tx = Transaction(
        from_user_id=current_user.id,
        to_user_id=current_user.id,
        amount=data.amount,
        tx_type="deposit",
        status="completed",
        description=f"充值 ¥{data.amount:.2f}"
    )
    db.add(tx)
    db.commit()
    db.refresh(current_user)
    return {"message": f"充值成功，到账 ¥{data.amount:.2f}", "balance": current_user.balance}
