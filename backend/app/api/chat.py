"""
LLM 对话 API —— 智能需求助手
支持 OpenAI 兼容接口（MiniMax / DeepSeek / GPT 等）
"""
import os
import json
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/chat", tags=["智能对话"])

# ========== LLM 配置 ==========
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.minimax.io")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "MiniMax-M3")

SYSTEM_PROMPT = """你是 AgentGig 平台的智能需求助手。你的职责是通过对话帮助用户完善发包需求。

## 工作流程
1. 先友好地了解用户想做什么
2. 引导用户补充关键信息：具体描述、技术要求、预算、截止时间
3. 当信息足够时，输出结构化的任务信息

## 输出格式
当你收集到足够的信息后，必须在回复末尾输出一个 JSON 代码块：
```json
{
  "title": "任务标题",
  "description": "详细描述",
  "category": "development|copywriting|design|data_analysis|translation|video|music|marketing|customer_service|other",
  "required_skills": ["技能1", "技能2"],
  "budget": 500,
  "deadline": "2026-07-01"
}
```

## 注意事项
- 对话要自然友好，不要太机械
- 每次只问 1-2 个问题，不要一次性问太多
- 如果用户描述不清楚，主动追问细节
- 预算要合理引导，不要过高或过低
- category 必须是上面列出的值之一
- 当你认为信息已经足够完善时，才输出 JSON
"""


class ChatMessage(BaseModel):
    role: str  # "user" 或 "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    stream: bool = False


class ChatResponse(BaseModel):
    content: str
    task_data: Optional[dict] = None


def _strip_thinking(content: str) -> str:
    """移除 LLM 的 <think>...</think> 思考过程，只保留最终回复"""
    import re
    # 移除 <think>...</think> 块（支持跨行）
    content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)
    # 清理多余空行
    content = re.sub(r'\n{3,}', '\n\n', content)
    return content.strip()


def _extract_task_data(content: str) -> Optional[dict]:
    """从 LLM 回复中提取 JSON 任务数据"""
    try:
        # 查找 ```json ... ``` 代码块
        start = content.find("```json")
        if start == -1:
            return None
        start += 7  # len("```json")
        end = content.find("```", start)
        if end == -1:
            return None
        json_str = content[start:end].strip()
        data = json.loads(json_str)
        # 校验必要字段
        if data.get("title") and data.get("description"):
            return data
    except (json.JSONDecodeError, KeyError):
        pass
    return None


async def _call_llm(messages: List[dict], stream: bool = False):
    """调用 LLM API"""
    if not LLM_API_KEY:
        # 没配置 API Key 时，使用内置的简单对话逻辑
        return None

    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "model": LLM_MODEL,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + messages,
        "temperature": 0.7,
        "max_tokens": 1000,
        "stream": stream,
    }

    if stream:
        return _stream_llm(headers, body)
    else:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{LLM_BASE_URL}/v1/chat/completions",
                    headers=headers,
                    json=body,
                )
                if resp.status_code != 200:
                    # LLM 调用失败，降级到内置引擎
                    return None
                data = resp.json()
                return data["choices"][0]["message"]["content"]
        except Exception:
            # 网络异常等，降级到内置引擎
            return None


async def _stream_llm(headers: dict, body: dict):
    """流式调用 LLM"""
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{LLM_BASE_URL}/v1/chat/completions",
            headers=headers,
            json=body,
        ) as resp:
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    chunk = line[6:]
                    if chunk == "[DONE]":
                        yield "data: [DONE]\n\n"
                        break
                    try:
                        data = json.loads(chunk)
                        delta = data["choices"][0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield f"data: {json.dumps({'content': content})}\n\n"
                    except (json.JSONDecodeError, KeyError):
                        continue


def _simple_chat(user_messages: List[dict]) -> str:
    """内置简单对话逻辑（无 LLM API Key 时的 fallback）"""
    last_msg = user_messages[-1]["content"] if user_messages else ""
    msg_count = len([m for m in user_messages if m["role"] == "user"])

    if msg_count == 1:
        return f"好的，你想做「{last_msg}」对吧？\n\n能再详细说说具体要求吗？比如功能需求、风格偏好、交付格式等。"
    elif msg_count == 2:
        return "明白了！这个任务属于哪一类？\n\n1. 💻 开发（网站/App/脚本）\n2. ✍️ 文案（文章/营销/翻译）\n3. 🎨 设计（Logo/UI/海报）\n4. 📊 数据分析\n5. 其他"
    elif msg_count == 3:
        return "好的！你的预算大概是多少？（单位：元）"
    else:
        # 尝试从对话中提取信息
        title = user_messages[0]["content"][:50] if user_messages else "新任务"
        description = " ".join([m["content"] for m in user_messages if m["role"] == "user"])

        # 尝试解析预算
        import re
        budget = 500
        for m in user_messages:
            nums = re.findall(r'\d+', m["content"])
            if nums:
                budget = int(nums[-1])
                break

        # 尝试解析分类
        category = "other"
        category_keywords = {
            "development": ["开发", "代码", "网站", "app", "程序", "python", "java"],
            "copywriting": ["文案", "文章", "写作", "翻译", "内容"],
            "design": ["设计", "logo", "ui", "海报", "图片"],
            "data_analysis": ["数据", "分析", "excel", "统计"],
        }
        all_text = " ".join([m["content"].lower() for m in user_messages])
        for cat, keywords in category_keywords.items():
            if any(kw in all_text for kw in keywords):
                category = cat
                break

        task_json = json.dumps({
            "title": title,
            "description": description,
            "category": category,
            "required_skills": [],
            "budget": budget,
        }, ensure_ascii=False, indent=2)

        return f"好的，我帮你整理了需求：\n\n```json\n{task_json}\n```\n\n确认无误的话，点击「发布任务」按钮即可！如需修改请告诉我。"


@router.post("")
async def chat(req: ChatRequest):
    """智能对话接口"""
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    # 尝试调用 LLM
    content = await _call_llm(messages, stream=False)

    # Fallback 到内置逻辑
    if content is None:
        content = _simple_chat(messages)

    # 移除思考过程
    content = _strip_thinking(content)

    # 提取任务数据
    task_data = _extract_task_data(content)

    return ChatResponse(content=content, task_data=task_data)


@router.post("/stream")
async def chat_stream(req: ChatRequest):
    """流式对话接口"""
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    # 尝试调用 LLM 流式接口
    stream = await _call_llm(messages, stream=True)

    if stream is None:
        # Fallback: 直接返回完整回复
        content = _simple_chat(messages)
        return ChatResponse(content=content, task_data=_extract_task_data(content))

    return StreamingResponse(stream, media_type="text/event-stream")


@router.get("/config")
async def get_chat_config():
    """获取 LLM 配置状态（不暴露 API Key）"""
    return {
        "llm_configured": bool(LLM_API_KEY),
        "model": LLM_MODEL if LLM_API_KEY else "内置规则引擎",
        "base_url": LLM_BASE_URL if LLM_API_KEY else None,
    }
