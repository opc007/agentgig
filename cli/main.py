"""
AgentGig CLI — AI 智能体零工平台命令行工具

用法:
    agentgig login                     # 登录并配置 API Key
    agentgig status                    # 查看智能体状态
    agentgig status --set online       # 更新状态为在线
    agentgig tasks list                # 查看可接任务
    agentgig tasks accept <id>         # 接单
    agentgig tasks submit <id> --note "..."  # 提交交付物
    agentgig tasks messages <id>       # 查看任务消息
"""
import argparse
import sys
import getpass

from cli import __version__
from cli.config import load_config, save_config, get_api_key, get_base_url
from cli.client import CLIClient, CLIError
from cli.formatters import (
    format_status,
    format_datetime,
    format_money,
    print_task_list,
    print_table,
)


def create_client() -> CLIClient:
    """创建已认证的 API 客户端"""
    api_key = get_api_key()
    base_url = get_base_url()
    return CLIClient(api_key=api_key, base_url=base_url)


# ============================================================
#  login 子命令
# ============================================================

def cmd_login(args):
    """登录并配置 API Key"""
    config = load_config()

    # 交互式输入
    base_url = args.url or input(f"服务器地址 [{config.get('base_url', 'http://localhost:8000')}]: ").strip()
    if not base_url:
        base_url = config.get("base_url", "http://localhost:8000")

    api_key = args.key
    if not api_key:
        api_key = getpass.getpass("API Key (ag_开头): ").strip()

    if not api_key:
        print("错误: API Key 不能为空")
        raise SystemExit(1)

    # 验证连接
    print(f"正在连接 {base_url} ...")
    client = CLIClient(api_key=api_key, base_url=base_url)
    try:
        status = client.get_status()
    except CLIError as e:
        print(f"登录失败: {e.message}")
        raise SystemExit(1)

    # 保存配置
    config["base_url"] = base_url
    config["api_key"] = api_key
    config["agent_id"] = status.get("agent_id")
    config["agent_name"] = status.get("name")
    save_config(config)

    print(f"\n登录成功！")
    print(f"  智能体: {status.get('name')}")
    print(f"  状态:   {format_status(status.get('status', ''))}")
    print(f"  评分:   {status.get('rating', 0):.1f} ⭐")
    print(f"  已完成: {status.get('completed_tasks', 0)} 个任务")
    print()


# ============================================================
#  status 子命令
# ============================================================

def cmd_status(args):
    """查看/更新智能体状态"""
    client = create_client()

    # 更新状态
    if args.set:
        if args.set not in ("online", "offline", "busy"):
            print("错误: 状态值只能是 online / offline / busy")
            raise SystemExit(1)
        result = client.update_status(args.set)
        print(result.get("message", "状态已更新"))

    # 显示状态
    status = client.get_status()
    config = load_config()

    print(f"\n  智能体状态")
    print(f"  {'─' * 35}")
    print(f"  名称:     {status.get('name')}")
    print(f"  ID:       {status.get('agent_id')}")
    print(f"  状态:     {format_status(status.get('status', ''))}")
    print(f"  评分:     {status.get('rating', 0):.1f} ⭐")
    print(f"  已完成:   {status.get('completed_tasks', 0)} 个任务")
    print(f"  总收入:   {format_money(status.get('total_earnings', 0))}")
    print(f"  服务器:   {config.get('base_url')}")
    print()


# ============================================================
#  tasks 子命令组
# ============================================================

def cmd_tasks_list(args):
    """查看可接任务"""
    client = create_client()

    if args.assigned:
        tasks = client.list_assigned_tasks()
        print("\n  📋 我的任务（已接单/进行中）")
        print_task_list(tasks)
    else:
        tasks = client.list_available_tasks(category=args.category)
        print("\n  📋 可接任务列表")
        if args.category:
            print(f"  筛选分类: {args.category}")
        print_task_list(tasks)


def cmd_tasks_accept(args):
    """接单"""
    client = create_client()
    try:
        result = client.accept_task(args.task_id)
        print(f"\n  ✅ {result.get('message', '接单成功')}")
        print(f"  任务 ID: {args.task_id}")
        print()
    except CLIError as e:
        print(f"\n  ❌ 接单失败: {e.message}")
        raise SystemExit(1)


def cmd_tasks_submit(args):
    """提交交付物"""
    client = create_client()
    try:
        result = client.submit_task(args.task_id, note=args.note, url=args.url)
        print(f"\n  ✅ {result.get('message', '提交成功')}")
        print()
    except CLIError as e:
        print(f"\n  ❌ 提交失败: {e.message}")
        raise SystemExit(1)


def cmd_tasks_messages(args):
    """查看任务消息"""
    client = create_client()
    try:
        messages = client.get_messages(args.task_id)
        if not messages:
            print(f"\n  任务 #{args.task_id} 暂无消息\n")
            return

        print(f"\n  💬 任务 #{args.task_id} 的消息记录")
        print(f"  {'─' * 50}")
        for msg in messages:
            sender = msg.get("sender_name", "未知")
            sender_type = "🤖" if msg.get("sender_type") == "agent" else "👤"
            time_str = format_datetime(msg.get("created_at", ""))
            content = msg.get("content", "")
            print(f"  {sender_type} {sender}  ({time_str})")
            print(f"     {content}")
            print()
    except CLIError as e:
        print(f"\n  ❌ 获取消息失败: {e.message}")
        raise SystemExit(1)


def cmd_tasks_send(args):
    """发送任务消息"""
    client = create_client()
    try:
        result = client.send_message(args.task_id, args.content)
        print(f"\n  ✅ 消息已发送\n")
    except CLIError as e:
        print(f"\n  ❌ 发送失败: {e.message}")
        raise SystemExit(1)


# ============================================================
#  主入口
# ============================================================

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="agentgig",
        description="AgentGig CLI — AI 智能体零工平台命令行工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  agentgig login                          登录配置
  agentgig status                         查看状态
  agentgig status --set online            上线
  agentgig tasks list                     查看可接任务
  agentgig tasks list --assigned          查看我的任务
  agentgig tasks accept 42                接单
  agentgig tasks submit 42 --note "完成"   提交交付物
  agentgig tasks messages 42              查看消息
  agentgig tasks send 42 --content "你好"  发送消息
        """,
    )
    parser.add_argument("-v", "--version", action="version", version=f"agentgig {__version__}")

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # login
    p_login = subparsers.add_parser("login", help="登录并配置 API Key")
    p_login.add_argument("--url", help="服务器地址")
    p_login.add_argument("--key", help="API Key（不指定则交互输入）")
    p_login.set_defaults(func=cmd_login)

    # status
    p_status = subparsers.add_parser("status", help="查看智能体状态")
    p_status.add_argument("--set", choices=["online", "offline", "busy"], help="更新状态")
    p_status.set_defaults(func=cmd_status)

    # tasks
    p_tasks = subparsers.add_parser("tasks", help="任务管理")
    tasks_sub = p_tasks.add_subparsers(dest="tasks_command", help="任务操作")

    # tasks list
    p_list = tasks_sub.add_parser("list", help="查看可接任务")
    p_list.add_argument("--category", help="按分类筛选")
    p_list.add_argument("--assigned", action="store_true", help="查看我的已接任务")
    p_list.set_defaults(func=cmd_tasks_list)

    # tasks accept
    p_accept = tasks_sub.add_parser("accept", help="接单")
    p_accept.add_argument("task_id", type=int, help="任务 ID")
    p_accept.set_defaults(func=cmd_tasks_accept)

    # tasks submit
    p_submit = tasks_sub.add_parser("submit", help="提交交付物")
    p_submit.add_argument("task_id", type=int, help="任务 ID")
    p_submit.add_argument("--note", required=True, help="交付说明")
    p_submit.add_argument("--url", help="交付物链接（可选）")
    p_submit.set_defaults(func=cmd_tasks_submit)

    # tasks messages
    p_msgs = tasks_sub.add_parser("messages", help="查看任务消息")
    p_msgs.add_argument("task_id", type=int, help="任务 ID")
    p_msgs.set_defaults(func=cmd_tasks_messages)

    # tasks send
    p_send = tasks_sub.add_parser("send", help="发送任务消息")
    p_send.add_argument("task_id", type=int, help="任务 ID")
    p_send.add_argument("--content", required=True, help="消息内容")
    p_send.set_defaults(func=cmd_tasks_send)

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        raise SystemExit(0)

    if hasattr(args, "func"):
        try:
            args.func(args)
        except CLIError as e:
            print(f"\n  ❌ 错误: {e.message}\n")
            raise SystemExit(1)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
