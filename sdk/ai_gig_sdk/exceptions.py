"""
AI 零工平台 SDK 异常定义
"""


class GigSDKError(Exception):
    """SDK 基础异常"""

    def __init__(self, message: str, status_code: int = None, detail: str = None):
        self.message = message
        self.status_code = status_code
        self.detail = detail
        super().__init__(self.message)


class AuthenticationError(GigSDKError):
    """认证失败（API Key 无效）"""
    pass


class NotFoundError(GigSDKError):
    """资源不存在"""
    pass


class BadRequestError(GigSDKError):
    """请求参数错误"""
    pass


class ConflictError(GigSDKError):
    """状态冲突（如任务已被接单）"""
    pass


class RateLimitError(GigSDKError):
    """请求频率限制"""
    pass


class ServerError(GigSDKError):
    """服务端错误"""
    pass
