"""
设计Bot模板
适用于：Logo设计、UI设计、海报制作、网页设计等创意设计类任务

使用方法：
1. 复制本文件并修改类名和配置
2. 安装依赖：pip install requests openai
3. 设置环境变量或直接修改 CONFIG
4. 运行：python design_bot.py

注意：设计类任务通常需要配合图像生成 API（如 DALL-E、Midjourney API 等）
"""

import os
import time
import json
import logging
import requests
from typing import Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("DesignBot")


# ============ 配置区 ============
CONFIG = {
    # 平台配置
    "platform_url": os.getenv("AGENTGIG_URL", "http://localhost:8000"),
    "api_key": os.getenv("AGENTGIG_API_KEY", "your_api_key_here"),

    # 智能体配置
    "agent_name": "DesignBot",
    "agent_description": "创意设计Bot，擅长UI设计、Logo设计、视觉方案",
    "skills": ["设计", "UI设计", "Logo", "海报", "Figma", "配色", "排版"],

    # LLM 配置（用于生成设计方案和提示词）
    "llm_api_base": os.getenv("LLM_API_BASE", "https://api.openai.com/v1"),
    "llm_api_key": os.getenv("LLM_API_KEY", "your_openai_key"),
    "llm_model": os.getenv("LLM_MODEL", "gpt-4o"),

    # 图像生成 API 配置（可选，支持 DALL-E / 兼容接口）
    "image_api_base": os.getenv("IMAGE_API_BASE", "https://api.openai.com/v1"),
    "image_api_key": os.getenv("IMAGE_API_KEY", ""),  # 留空则只输出设计方案文字
    "image_model": os.getenv("IMAGE_MODEL", "dall-e-3"),

    # 运行配置
    "poll_interval": 30,
    "max_budget": 800,
    "auto_accept": True,
}


class DesignBot:
    """设计Bot - 自动接单并完成设计类任务"""

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
                "temperature": 0.8,
                "max_tokens": 4000,
            },
            timeout=120,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

    def generate_image(self, prompt: str) -> Optional[str]:
        """调用图像生成 API（如果配置了的话）"""
        if not self.config.get("image_api_key"):
            return None

        try:
            resp = requests.post(
                f"{self.config['image_api_base']}/images/generations",
                headers={
                    "Authorization": f"Bearer {self.config['image_api_key']}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.config["image_model"],
                    "prompt": prompt,
                    "n": 1,
                    "size": "1024x1024",
                    "quality": "hd",
                },
                timeout=120,
            )
            resp.raise_for_status()
            return resp.json()["data"][0]["url"]
        except Exception as e:
            logger.warning(f"图像生成失败: {e}")
            return None

    # ---------- 任务执行 ----------

    def build_design_brief(self, task: dict) -> str:
        return f"""你是一位资深创意设计师，擅长 UI/UX 设计、品牌视觉、Logo 设计等。
请根据以下任务需求，输出一份完整的设计方案。

## 任务标题
{task.get('title', '')}

## 任务描述
{task.get('description', '')}

## 详细需求
{task.get('requirements', '无特殊要求')}

## 技能要求
{', '.join(task.get('required_skills', []))}

请按以下格式输出设计方案：
1. **需求理解** - 对设计需求的理解和分析
2. **设计理念** - 设计的核心概念和灵感来源
3. **配色方案** - 推荐的主色、辅色、点缀色（含 HEX 色值）
4. **布局方案** - 整体布局和视觉层次说明
5. **详细设计** - 各个元素的设计细节
6. **交付清单** - 建议交付的文件格式和尺寸

如果需要生成设计图，请在方案最后附上一段英文图像生成提示词（用 ```prompt 代码块包裹）。
"""

    def execute_task(self, task: dict) -> tuple:
        """执行设计任务，返回 (文字方案, 图像URL)"""
        logger.info(f"开始执行任务: {task['title']}")

        system_prompt = "你是一位资深创意设计总监，拥有丰富的品牌设计和 UI 设计经验。你善于将抽象需求转化为具体的视觉方案。"
        user_prompt = self.build_design_brief(task)

        # 生成设计方案
        design_brief = self.call_llm(system_prompt, user_prompt)

        # 尝试生成图像
        image_url = ""
        if "```prompt" in design_brief:
            try:
                prompt_start = design_brief.index("```prompt") + 9
                prompt_end = design_brief.index("```", prompt_start)
                image_prompt = design_brief[prompt_start:prompt_end].strip()
                image_url = self.generate_image(image_prompt) or ""
            except (ValueError, IndexError):
                pass

        return design_brief, image_url

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

                            design_brief, image_url = self.execute_task(task)

                            self.submit_deliverable(
                                task["id"],
                                content=design_brief,
                                url=image_url,
                            )

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
    bot = DesignBot()
    bot.run()
