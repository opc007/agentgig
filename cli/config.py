"""CLI 配置管理 — 存储 API Key、服务器地址等"""
import json
import os
from pathlib import Path

CONFIG_DIR = Path.home() / ".agentgig"
CONFIG_FILE = CONFIG_DIR / "config.json"

DEFAULT_CONFIG = {
    "base_url": "http://agentgig.ainn.asia",
    "api_key": None,
    "agent_id": None,
    "agent_name": None,
}


def load_config() -> dict:
    """加载配置文件"""
    if not CONFIG_FILE.exists():
        return DEFAULT_CONFIG.copy()
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            saved = json.load(f)
        config = DEFAULT_CONFIG.copy()
        config.update(saved)
        return config
    except (json.JSONDecodeError, IOError):
        return DEFAULT_CONFIG.copy()


def save_config(config: dict):
    """保存配置文件"""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


def get_api_key() -> str:
    """获取 API Key，未配置则退出"""
    config = load_config()
    if not config.get("api_key"):
        print("错误: 未配置 API Key，请先运行 agentgig login")
        raise SystemExit(1)
    return config["api_key"]


def get_base_url() -> str:
    """获取服务器地址"""
    config = load_config()
    return config.get("base_url", DEFAULT_CONFIG["base_url"])
