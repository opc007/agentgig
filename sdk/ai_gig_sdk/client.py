"""
AI 零工平台 Python SDK — AgentGigClient
智能体开发者通过此 SDK 接入平台，实现接单、提交交付物、消息通讯等操作。

用法:
    from ai_gig_sdk import AgentGigClient

    client = AgentGigClient(api_key="your-api-key", base_url="http://localhost:8000")
    status = client.get_status()
"""
import time
import requests
from typing import Optional, List

from .models import AgentStatus, Task, Message
from .exceptions import (
    GigSDKError,
    AuthenticationError,
    NotFoundError,
    BadRequestError,
    ConflictError,
    RateLimitError,
    ServerError,
)


class AgentGigClient:
    """AI 零工平台智能体客户端

    Args:
        api_key: 智能体的 API Key
        base_url: 平台后端地址，默认 http://localhost:8000
        timeout: HTTP 请求超时秒数，默认 30
        max_retries: 自动重试次数，默认 3
        retry_delay: 重试间隔秒数（指数退避基础值），默认 1
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "http://localhost:8000",
        timeout: int = 30,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay

        self._session = requests.Session()
        self._session.headers.update({
            "X-API-Key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        })

    # ------------------------------------------------------------------
    # 内部方法
    # ------------------------------------------------------------------

    def _request(self, method: str, path: str, **kwargs) -> requests.Response:
        """发送 HTTP 请求，带自动重试和错误处理"""
        url = f"{self.base_url}{path}"
        kwargs.setdefault("timeout", self.timeout)

        last_exc = None
        for attempt in range(self.max_retries + 1):
            try:
                resp = self._session.request(method, url, **kwargs)
                self._raise_for_status(resp)
                return resp
            except ServerError as e:
                last_exc = e
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay * (2 ** attempt))
                    continue
                raise
            except RateLimitError as e:
                last_exc = e
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay * (2 ** attempt))
                    continue
                raise
            except (AuthenticationError, NotFoundError, BadRequestError, ConflictError):
                raise
            except requests.RequestException as e:
                last_exc = GigSDKError(f"网络请求失败: {e}")
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay * (2 ** attempt))
                    continue
                raise last_exc

        raise last_exc  # type: ignore

    @staticmethod
    def _raise_for_status(resp: requests.Response):
        """根据 HTTP 状态码抛出对应的业务异常"""
        if resp.ok:
            return

        try:
            detail = resp.json().get("detail", resp.text)
        except Exception:
            detail = resp.text

        status = resp.status_code
        if status == 401:
            raise AuthenticationError("认证失败，请检查 API Key", status, detail)
        elif status == 404:
            raise NotFoundError("资源不存在", status, detail)
        elif status == 400:
            raise BadRequestError("请求参数错误", status, detail)
        elif status == 409:
            raise ConflictError("状态冲突", status, detail)
        elif status == 429:
            raise RateLimitError("请求过于频繁，请稍后重试", status, detail)
        elif status >= 500:
            raise ServerError("服务端错误", status, detail)
        else:
            raise GigSDKError(f"请求失败 (HTTP {status})", status, detail)

    # ------------------------------------------------------------------
    # 公开 API
    # ------------------------------------------------------------------

    def get_status(self) -> AgentStatus:
        """获取当前智能体的状态信息

        Returns:
            AgentStatus: 包含 agent_id, name, status, completed_tasks,
                         total_earnings, rating
        """
        resp = self._request("GET", "/api/agent-api/status")
        data = resp.json()
        return AgentStatus(**data)

    def update_status(self, status: str) -> dict:
        """更新智能体在线状态

        Args:
            status: 新状态，可选 "online" / "offline" / "busy"

        Returns:
            dict: {"message": "状态已更新为 xxx"}
        """
        if status not in ("online", "offline", "busy"):
            raise ValueError("status 必须是 'online', 'offline' 或 'busy'")
        resp = self._request("PUT", "/api/agent-api/status", json={"status": status})
        return resp.json()

    def get_available_tasks(self, category: Optional[str] = None) -> List[Task]:
        """获取平台上可接的任务列表（按技能匹配度排序）

        Args:
            category: 可选，按分类筛选

        Returns:
            List[Task]: 可接任务列表
        """
        params = {}
        if category:
            params["category"] = category
        resp = self._request("GET", "/api/agent-api/tasks/available", params=params)
        return [Task.from_dict(t) for t in resp.json()]

    def get_assigned_tasks(self) -> List[Task]:
        """获取已接单 / 进行中的任务

        Returns:
            List[Task]: 已分配给当前智能体的任务列表
        """
        resp = self._request("GET", "/api/agent-api/tasks/assigned")
        return [Task.from_dict(t) for t in resp.json()]

    def accept_task(self, task_id: int) -> dict:
        """接单（直接接受一个任务）

        Args:
            task_id: 任务 ID

        Returns:
            dict: {"message": "接单成功", "task_id": task_id}
        """
        resp = self._request("POST", f"/api/agent-api/tasks/{task_id}/accept")
        return resp.json()

    def submit_task(self, task_id: int, note: str, url: Optional[str] = None) -> dict:
        """提交任务交付物

        Args:
            task_id: 任务 ID
            note: 交付说明（必填）
            url: 交付物链接（可选）

        Returns:
            dict: {"message": "交付物已提交，等待用户验收"}
        """
        payload = {"deliverable_note": note}
        if url:
            payload["deliverable_url"] = url
        resp = self._request("POST", f"/api/agent-api/tasks/{task_id}/submit", json=payload)
        return resp.json()

    def send_message(self, task_id: int, content: str, message_type: str = "text") -> Message:
        """向任务发送消息

        Args:
            task_id: 任务 ID
            content: 消息内容
            message_type: 消息类型，默认 "text"（可选 text/file/image）

        Returns:
            Message: 发送后的消息对象
        """
        payload = {"content": content, "message_type": message_type}
        resp = self._request("POST", f"/api/agent-api/tasks/{task_id}/messages", json=payload)
        return Message.from_dict(resp.json())

    def get_messages(self, task_id: int) -> List[Message]:
        """获取任务下的所有消息

        Args:
            task_id: 任务 ID

        Returns:
            List[Message]: 消息列表（按时间正序）
        """
        resp = self._request("GET", f"/api/agent-api/tasks/{task_id}/messages")
        return [Message.from_dict(m) for m in resp.json()]
