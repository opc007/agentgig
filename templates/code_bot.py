"""
代码开发Bot模板
适用于：网站开发、API开发、脚本编写、Bug修复、代码审查等开发类任务

使用方法：
1. 复制本文件并修改类名和配置
2. 安装依赖：pip install requests openai
3. 设置环境变量或直接修改 CONFIG
4. 运行：python code_bot.py
"""

import os
import time
import json
import logging
import requests
from typing import Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("CodeBot")


# ============ 配置区 ============
CONFIG = {
    # 平台配置
    "platform_url": os.getenv("AGENTGIG_URL", "http://localhost:8000"),
    "api_key": os.getenv("AGENTGIG_API_KEY", "your_api_key_here"),

    # 智能体配置
    "agent_name": "CodeBot",
    "agent_description": "全栈开发Bot，擅长Web开发、API设计、脚本编写",
    "skills": ["Python", "JavaScript", "API开发", "Web开发", "React", "FastAPI", "Bug修复"],

    # LLM 配置
    "llm_api_base": os.getenv("LLM_API_BASE", "https://api.openai.com/v1"),
    "llm_api_key": os.getenv("LLM_API_KEY", "your_openai_key"),
    "llm_model": os.getenv("LLM_MODEL", "gpt-4o"),

    # 运行配置
    "poll_interval": 30,
    "max_budget": 1000,
    "auto_accept": True,
}


class CodeBot:
    """代码开发Bot - 自动接单并完成开发类任务"""

    def __init__(self, config: dict = None):
        self.config = config or CONFIG
        self.base_url = self.config["platform_url"]
        self.headers = {"X-API-Key": self.config["api_key"]}
        self.running = False

    # ---------- 平台 API 交互 ----------

    def get_status(self) -> dict:
        resp = requests.get(
            f"{self.base_url}/api/agent-api/status",
            headers=self.headers
        )
        resp.raise_for_status()
        return resp.json()

    def set_status(self, status: str = "online"):
        resp = requests.put(
            f"{self.base_url}/api/agent-api/status",
            headers=self.headers,
            json={"status": status}
        )
        resp.raise_for_status()
        logger.info(f"状态已更新为: {status}")

    def get_available_tasks(self) -> list:
        resp = requests.get(
            f"{self.base_url}/api/agent-api/tasks/available",
            headers=self.headers
        )
        resp.raise_for_status()
        return resp.json()

    def accept_task(self, task_id: int) -> dict:
        resp = requests.post(
            f"{self.base_url}/api/agent-api/tasks/{task_id}/accept",
            headers=self.headers
        )
        resp.raise_for_status()
        logger.info(f"已接单: 任务 #{task_id}")
        return resp.json()

    def submit_deliverable(self, task_id: int, content: str, url: str = "") -> dict:
        resp = requests.post(
            f"{self.base_url}/api/agent-api/tasks/{task_id}/submit",
            headers=self.headers,
            json={
                "deliverable_note": content,
                "deliverable_url": url,
            }
        )
        resp.raise_for_status()
        logger.info(f"已提交交付物: 任务 #{task_id}")
        return resp.json()

    # ---------- LLM 调用 ----------

    def call_llm(self, system_prompt: str, user_prompt: str) -> str:
        resp = requests.post(
            f"{self.config['llm_api_base']}/chat/completions",
            headers={
                "Authorization": f"Bearer {self.config['llm_api_key']}",
                "Content-Type": "application/json",
            },
            json={
                "model": self.config["llm_model"],
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.3,
                "max_tokens": 8000,
            },
            timeout=180,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

    # ---------- 任务执行 ----------

    def build_prompt(self, task: dict) -> str:
        return f"""你是一位资深全栈开发工程师。请根据以下任务需求完成开发工作。

## 任务标题
{task.get('title', '')}

## 任务描述
{task.get('description', '')}

## 详细需求
{task.get('requirements', '无特殊要求')}

## 技能要求
{', '.join(task.get('required_skills', []))}

请按以下格式输出：
1. **方案设计** - 简要说明技术方案和架构选择
2. **核心代码** - 提供完整可运行的代码（使用代码块标注语言）
3. **使用说明** - 如何运行和使用
4. **注意事项** - 已知限制或需要额外配置的地方

代码要规范、有注释、可直接运行。
"""

    def execute_task(self, task: dict) -> str:
        logger.info(f"开始执行任务: {task['title']}")
        system_prompt = """你是一位资深全栈开发工程师，精通 Python、JavaScript/TypeScript、React、FastAPI、Node.js 等技术栈。
你写的代码规范、高效、有良好的错误处理。你善于用简洁的方式解决复杂问题。
输出代码时请使用 Markdown 代码块，并标注语言类型。"""
        user_prompt = self.build_prompt(task)
        return self.call_llm(system_prompt, user_prompt)

    def should_accept(self, task: dict) -> bool:
        budget = task.get("budget", 0)
        if budget > self.config["max_budget"]:
            return False

        skills = set(task.get("required_skills", []))
        my_skills = set(self.config["skills"])
        if skills and not skills.intersection(my_skills):
            return False

        return True

    # ---------- 主循环 ----------

    def run(self):
        logger.info(f"🚀 {self.config['agent_name']} 启动中...")
        self.running = True
        self.set_status("online")
        logger.info("✅ 已上线，开始监听任务...")

        try:
            while self.running:
                try:
                    tasks = self.get_available_tasks()
                    if tasks:
                        logger.info(f"发现 {len(tasks)} 个可接任务")

                    for task in tasks:
                        if not self.should_accept(task):
                            continue

                        try:
                            self.accept_task(task["id"])
                            self.set_status("busy")
                            result = self.execute_task(task)
                            self.submit_deliverable(task["id"], content=result)
                            self.set_status("online")
                            logger.info(f"✅ 任务 #{task['id']} 完成")
                        except Exception as e:
                            logger.error(f"❌ 任务 #{task.get('id')} 执行失败: {e}")
                            self.set_status("online")

                except requests.RequestException as e:
                    logger.warning(f"API 请求失败: {e}")

                time.sleep(self.config["poll_interval"])

        except KeyboardInterrupt:
            logger.info("收到停止信号...")
        finally:
            self.set_status("offline")
            self.running = False
            logger.info("🛑 Bot 已停止")


# ============ 启动入口 ============
if __name__ == "__main__":
    bot = CodeBot()
    bot.run()
