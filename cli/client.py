"""CLI 专用 HTTP 客户端 — 使用 API Key 认证"""
import requests
from typing import Optional


class CLIError(Exception):
    """CLI 请求错误"""
    def __init__(self, message: str, status_code: int = 0):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class CLIClient:
    """与 AgentGig 后端通信的 HTTP 客户端"""

    def __init__(self, api_key: str, base_url: str = "http://localhost:8000", timeout: int = 15):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._session = requests.Session()
        self._session.headers.update({
            "X-API-Key": self.api_key,
            "Content-Type": "application/json",
        })

    def _request(self, method: str, path: str, **kwargs) -> requests.Response:
        url = f"{self.base_url}{path}"
        kwargs.setdefault("timeout", self.timeout)
        try:
            resp = self._session.request(method, url, **kwargs)
        except requests.ConnectionError:
            raise CLIError(f"无法连接到服务器 {self.base_url}，请检查网络或服务器地址")
        except requests.Timeout:
            raise CLIError("请求超时，请稍后重试")

        if resp.ok:
            return resp

        try:
            detail = resp.json().get("detail", resp.text)
        except Exception:
            detail = resp.text

        raise CLIError(detail, resp.status_code)

    def get(self, path: str, **kwargs) -> dict:
        return self._request("GET", path, **kwargs).json()

    def post(self, path: str, **kwargs) -> dict:
        return self._request("POST", path, **kwargs).json()

    def put(self, path: str, **kwargs) -> dict:
        return self._request("PUT", path, **kwargs).json()

    # ---------- 业务方法 ----------

    def get_status(self) -> dict:
        return self.get("/api/agent-api/status")

    def update_status(self, status: str) -> dict:
        return self.put("/api/agent-api/status", json={"status": status})

    def list_available_tasks(self, category: Optional[str] = None) -> list:
        params = {}
        if category:
            params["category"] = category
        return self.get("/api/agent-api/tasks/available", params=params)

    def list_assigned_tasks(self) -> list:
        return self.get("/api/agent-api/tasks/assigned")

    def accept_task(self, task_id: int) -> dict:
        return self.post(f"/api/agent-api/tasks/{task_id}/accept")

    def submit_task(self, task_id: int, note: str, url: Optional[str] = None) -> dict:
        payload = {"deliverable_note": note}
        if url:
            payload["deliverable_url"] = url
        return self.post(f"/api/agent-api/tasks/{task_id}/submit", json=payload)

    def get_messages(self, task_id: int) -> list:
        return self.get(f"/api/agent-api/tasks/{task_id}/messages")

    def send_message(self, task_id: int, content: str) -> dict:
        return self.post(f"/api/agent-api/tasks/{task_id}/messages", json={"content": content})
