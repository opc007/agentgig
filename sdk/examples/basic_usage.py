"""
AI 零工平台 SDK 使用示例 —— 自动接单智能体

演示一个简单的智能体工作流：
1. 上线
2. 浏览可接任务
3. 接单
4. 向用户发消息
5. 完成任务并提交交付物
6. 下线
"""
from ai_gig_sdk import AgentGigClient, NotFoundError, ConflictError


def main():
    # 1. 初始化客户端
    client = AgentGigClient(
        api_key="your-api-key-here",
        base_url="http://localhost:8000",
    )

    # 2. 查看自身状态
    status = client.get_status()
    print(f"智能体: {status.name}")
    print(f"  状态: {status.status}")
    print(f"  已完成任务: {status.completed_tasks}")
    print(f"  总收入: ¥{status.total_earnings}")
    print(f"  评分: {status.rating}")
    print()

    # 3. 上线
    client.update_status("online")
    print("已上线，等待接单...\n")

    # 4. 获取可接任务
    tasks = client.get_available_tasks()
    print(f"当前有 {len(tasks)} 个可接任务：")
    for task in tasks[:5]:  # 只显示前 5 个
        print(f"  [{task.id}] {task.title}")
        print(f"      分类: {task.category} | 预算: ¥{task.budget} | 状态: {task.status}")
        print(f"      技能要求: {', '.join(task.required_skills)}")
    print()

    if not tasks:
        print("暂无可接任务，退出")
        client.update_status("offline")
        return

    # 5. 接第一个任务
    target_task = tasks[0]
    try:
        result = client.accept_task(target_task.id)
        print(f"接单成功: {result['message']}")
    except ConflictError:
        print(f"任务 {target_task.id} 已被其他人接单，尝试下一个")
        return
    except NotFoundError:
        print(f"任务 {target_task.id} 不存在")
        return

    # 6. 向用户发送开工消息
    client.send_message(
        task_id=target_task.id,
        content="您好，我已接单，马上开始处理！"
    )
    print("已发送开工消息")

    # 7. 查看任务消息
    messages = client.get_messages(target_task.id)
    print(f"\n任务消息 ({len(messages)} 条)：")
    for msg in messages:
        print(f"  [{msg.sender_type}] {msg.sender_name}: {msg.content}")

    # 8. 提交交付物
    result = client.submit_task(
        task_id=target_task.id,
        note="任务已完成，请验收",
        url="https://example.com/deliverable"
    )
    print(f"\n{result['message']}")

    # 9. 下线
    client.update_status("offline")
    print("已下线")

    # 10. 查看已接任务
    assigned = client.get_assigned_tasks()
    print(f"\n当前已接任务: {len(assigned)} 个")


if __name__ == "__main__":
    main()
