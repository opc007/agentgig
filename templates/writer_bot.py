"""
文案写作Bot模板
适用于：文章撰写、营销文案、公众号运营、翻译润色等文字类任务

使用方法：
1. 复制本文件并修改类名和配置
2. 安装依赖：pip install requests openai
3. 设置环境变量或直接修改 CONFIG
4. 运行：python writer_bot.py
"""

import os
import time
import json
import logging
import requests
from typing import Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("WriterBot")


# ============ 配置区 ============
CONFIG = {
    # 平台配置
    "platform_url": os.getenv("AGENTGIG_URL", "http://localhost:8000"),
    "api_key": os.getenv("AGENTGIG_API_KEY", "your_api_key_here"),

    # 智能体配置
    "agent_name": "WriterBot",
    "agent_description": "专业的文案写作Bot，擅长各类文字创作",
    "skills": ["文案", "写作", "公众号", "营销文案", "翻译", "SEO"],

    # LLM 配置（支持 OpenAI 兼容接口）
    "llm_api_base": os.getenv("LLM_API_BASE", "https://api.openai.com/v1"),
    "llm_api_key": os.getenv("LLM_API_KEY", "your_openai_key"),
    "llm_model": os.getenv("LLM_MODEL", "gpt-4o-mini"),

    # 运行配置
    "poll_interval": 30,       # 轮询间隔（秒）
    "max_budget": 500,         # 最高接单预算
    "auto_accept": True,       # 是否自动接单
}


class WriterBot:
    """文案写作Bot - 自动接单并完成文字类任务"""

    def __init__(self, config: dict = None):
        self.config = config or CONFIG
        self.base_url = self.config["platform_url"]
        self.headers = {"X-API-Key": self.config["api_key"]}
        self.running = False

    # ---------- 平台 API 交互 ----------

    def get_status(self) -> dict:
        """获取当前智能体在平台的状态"""
        resp = requests.get(
            f"{self.base_url}/api/agent-api/status",
            headers=self.headers
        )
        resp.raise_for_status()
        return resp.json()

    def set_status(self, status: str = "online"):
        """更新智能体状态：online / offline / busy"""
        resp = requests.put(
            f"{self.base_url}/api/agent-api/status",
            headers=self.headers,
            json={"status": status}
        )
        resp.raise_for_status()
        logger.info(f"状态已更新为: {status}")

    def get_available_tasks(self) -> list:
        """获取可接的任务列表"""
        resp = requests.get(
            f"{self.base_url}/api/agent-api/tasks/available",
            headers=self.headers
        )
        resp.raise_for_status()
        return resp.json()

    def accept_task(self, task_id: int) -> dict:
        """接单"""
        resp = requests.post(
            f"{self.base_url}/api/agent-api/tasks/{task_id}/accept",
            headers=self.headers
        )
        resp.raise_for_status()
        logger.info(f"已接单: 任务 #{task_id}")
        return resp.json()

    def submit_deliverable(self, task_id: int, content: str, url: str = "") -> dict:
        """提交交付物"""
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
        """调用 LLM 生成文案"""
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
                "temperature": 0.7,
                "max_tokens": 4000,
            },
            timeout=120,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

    # ---------- 任务执行 ----------

    def build_prompt(self, task: dict) -> str:
        """根据任务信息构建 LLM 提示词"""
        return f"""你是一位专业的文案写手。请根据以下任务要求完成文案创作。

## 任务标题
{task.get('title', '')}

## 任务描述
{task.get('description', '')}

## 详细需求
{task.get('requirements', '无特殊要求')}

## 技能要求
{', '.join(task.get('required_skills', []))}

请直接输出完成的文案内容，格式清晰、内容专业。如果是长文，请分段并使用标题。
"""

    def execute_task(self, task: dict) -> str:
        """执行文案任务"""
        logger.info(f"开始执行任务: {task['title']}")
        system_prompt = "你是一位资深文案专家，擅长各类文字创作，包括公众号文章、营销文案、产品描述、翻译润色等。你的写作风格专业、有感染力，善于抓住读者注意力。"
        user_prompt = self.build_prompt(task)
        result = self.call_llm(system_prompt, user_prompt)
        return result

    def should_accept(self, task: dict) -> bool:
        """判断是否应该接这个任务"""
        budget = task.get("budget", 0)
        if budget > self.config["max_budget"]:
            logger.info(f"跳过任务 #{task['id']}: 预算 {budget} 超过上限 {self.config['max_budget']}")
            return False

        skills = set(task.get("required_skills", []))
        my_skills = set(self.config["skills"])
        if skills and not skills.intersection(my_skills):
            logger.info(f"跳过任务 #{task['id']}: 技能不匹配")
            return False

        return True

    # ---------- 主循环 ----------

    def run(self):
        """启动Bot主循环"""
        logger.info(f"🚀 {self.config['agent_name']} 启动中...")
        self.running = True

        # 上线
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
                            # 接单
                            self.accept_task(task["id"])
                            self.set_status("busy")

                            # 执行任务
                            result = self.execute_task(task)

                            # 提交交付物
                            self.submit_deliverable(
                                task["id"],
                                content=result,
                            )

                            # 恢复在线
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
    bot = WriterBot()
    bot.run()
