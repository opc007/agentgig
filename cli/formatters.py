"""输出格式化工具"""
from datetime import datetime


# 状态对应的中文和符号
STATUS_MAP = {
    "online": ("在线", "🟢"),
    "offline": ("离线", "⚫"),
    "busy": ("忙碌", "🟡"),
    "pending": ("待接单", "📋"),
    "bidding": ("竞标中", "💰"),
    "assigned": ("已接单", "✅"),
    "in_progress": ("进行中", "🔧"),
    "submitted": ("已提交", "📦"),
    "revision": ("返工中", "🔄"),
    "completed": ("已完成", "✨"),
    "cancelled": ("已取消", "❌"),
    "disputed": ("争议中", "⚠️"),
}


def format_status(status: str) -> str:
    """格式化状态显示"""
    label, icon = STATUS_MAP.get(status, (status, "❓"))
    return f"{icon} {label}"


def format_datetime(dt_str: str) -> str:
    """格式化时间显示"""
    if not dt_str:
        return "-"
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M")
    except (ValueError, AttributeError):
        return dt_str


def format_money(amount: float) -> str:
    """格式化金额"""
    if amount is None:
        return "¥0.00"
    return f"¥{amount:,.2f}"


def print_table(headers: list, rows: list, col_widths: list = None):
    """打印简易表格"""
    if not rows:
        print("  (暂无数据)")
        return

    if col_widths is None:
        col_widths = []
        for i, h in enumerate(headers):
            max_w = len(str(h))
            for row in rows:
                if i < len(row):
                    cell_len = len(str(row[i]))
                    max_w = max(max_w, cell_len)
            col_widths.append(min(max_w + 2, 40))

    # 表头
    header_line = "  ".join(str(h).ljust(w) for h, w in zip(headers, col_widths))
    print(f"  {header_line}")
    print(f"  {'─' * len(header_line)}")

    # 数据行
    for row in rows:
        cells = []
        for i, w in enumerate(col_widths):
            val = str(row[i]) if i < len(row) else ""
            cells.append(val.ljust(w))
        print(f"  {'  '.join(cells)}")


def print_task_list(tasks: list, show_index: bool = True):
    """格式化打印任务列表"""
    if not tasks:
        print("\n  暂无任务\n")
        return

    headers = ["#", "ID", "标题", "分类", "预算", "状态", "发布时间"] if show_index else ["ID", "标题", "分类", "预算", "状态", "发布时间"]
    rows = []
    for i, t in enumerate(tasks):
        row = [
            str(i + 1) if show_index else None,
            str(t.get("id", "")),
            (t.get("title", "")[:25] + "…") if len(t.get("title", "")) > 25 else t.get("title", ""),
            t.get("category", ""),
            format_money(t.get("budget", 0)),
            format_status(t.get("status", "")),
            format_datetime(t.get("created_at", "")),
        ]
        if not show_index:
            row = row[1:]
        rows.append(row)

    print()
    print_table(headers, rows)
    print()
