from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
import asyncio
import time
from app.database import get_db
from app.models.user import User
from app.models.agent import Agent
from app.models.task import Task, TaskStatus
from app.models.workflow import (
    Workflow, WorkflowExecution, WorkflowStepExecution,
    WorkflowStatus, WorkflowExecutionStatus, StepType,
)
from app.schemas import (
    WorkflowCreate, WorkflowUpdate, WorkflowResponse,
    WorkflowExecuteRequest, WorkflowExecutionResponse,
    WorkflowStepExecutionResponse,
)
from app.auth import get_current_user

router = APIRouter(prefix="/api/workflows", tags=["工作流"])


def _build_workflow_response(wf: Workflow) -> WorkflowResponse:
    return WorkflowResponse(
        id=wf.id,
        creator_id=wf.creator_id,
        name=wf.name,
        description=wf.description,
        status=wf.status,
        steps=wf.steps or [],
        edges=wf.edges or [],
        config=wf.config or {},
        total_executions=wf.total_executions,
        successful_executions=wf.successful_executions,
        avg_execution_time=wf.avg_execution_time,
        created_at=wf.created_at,
        updated_at=wf.updated_at,
    )


def _build_step_exec_response(se, db: Session) -> WorkflowStepExecutionResponse:
    agent_name = None
    if se.agent_id:
        agent = db.query(Agent).filter(Agent.id == se.agent_id).first()
        agent_name = agent.name if agent else None
    return WorkflowStepExecutionResponse(
        id=se.id,
        step_index=se.step_index,
        agent_id=se.agent_id,
        agent_name=agent_name,
        status=se.status,
        input_data=se.input_data,
        output_data=se.output_data,
        task_id=se.task_id,
        error_message=se.error_message,
        started_at=se.started_at,
        completed_at=se.completed_at,
    )


def _build_execution_response(exec: WorkflowExecution, db: Session) -> WorkflowExecutionResponse:
    step_execs = [_build_step_exec_response(se, db) for se in exec.step_executions]
    return WorkflowExecutionResponse(
        id=exec.id,
        workflow_id=exec.workflow_id,
        trigger_user_id=exec.trigger_user_id,
        status=exec.status,
        input_data=exec.input_data or {},
        result=exec.result,
        current_step_index=exec.current_step_index,
        execution_time=exec.execution_time,
        error_message=exec.error_message,
        started_at=exec.started_at,
        completed_at=exec.completed_at,
        created_at=exec.created_at,
        step_executions=step_execs,
    )


@router.post("", response_model=WorkflowResponse)
async def create_workflow(
    data: WorkflowCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建工作流"""
    steps = [s.model_dump() for s in data.steps]
    edges = [e.model_dump() for e in data.edges]

    workflow = Workflow(
        creator_id=current_user.id,
        name=data.name,
        description=data.description,
        steps=steps,
        edges=edges,
        config=data.config,
        status=WorkflowStatus.DRAFT,
    )
    db.add(workflow)
    db.commit()
    db.refresh(workflow)
    return _build_workflow_response(workflow)


@router.get("", response_model=List[WorkflowResponse])
async def list_workflows(
    status: str = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """获取工作流列表"""
    query = db.query(Workflow)
    if status:
        query = query.filter(Workflow.status == status)
    workflows = query.order_by(Workflow.created_at.desc()).offset(skip).limit(limit).all()
    return [_build_workflow_response(wf) for wf in workflows]


@router.get("/my", response_model=List[WorkflowResponse])
async def list_my_workflows(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前用户创建的工作流"""
    workflows = db.query(Workflow).filter(
        Workflow.creator_id == current_user.id
    ).order_by(Workflow.created_at.desc()).all()
    return [_build_workflow_response(wf) for wf in workflows]


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """获取工作流详情"""
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="工作流不存在")
    return _build_workflow_response(wf)


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: int,
    data: WorkflowUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新工作流"""
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="工作流不存在")
    if wf.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权修改此工作流")

    if data.name is not None:
        wf.name = data.name
    if data.description is not None:
        wf.description = data.description
    if data.steps is not None:
        wf.steps = [s.model_dump() for s in data.steps]
    if data.edges is not None:
        wf.edges = [e.model_dump() for e in data.edges]
    if data.config is not None:
        wf.config = data.config
    if data.status is not None:
        wf.status = data.status

    db.commit()
    db.refresh(wf)
    return _build_workflow_response(wf)


@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除工作流"""
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="工作流不存在")
    if wf.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权删除此工作流")

    db.delete(wf)
    db.commit()
    return {"message": "工作流已删除"}


@router.post("/{workflow_id}/execute", response_model=WorkflowExecutionResponse)
async def execute_workflow(
    workflow_id: int,
    data: WorkflowExecuteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """执行工作流"""
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="工作流不存在")
    if wf.status == WorkflowStatus.ARCHIVED:
        raise HTTPException(status_code=400, detail="已归档的工作流无法执行")

    steps = wf.steps or []
    if not steps:
        raise HTTPException(status_code=400, detail="工作流没有步骤，无法执行")

    # 创建执行记录
    execution = WorkflowExecution(
        workflow_id=wf.id,
        trigger_user_id=current_user.id,
        input_data=data.input_data,
        status=WorkflowExecutionStatus.RUNNING,
        started_at=datetime.now(timezone.utc),
    )
    db.add(execution)
    db.flush()

    # 为每个步骤创建执行记录
    for i, step in enumerate(steps):
        step_exec = WorkflowStepExecution(
            execution_id=execution.id,
            step_index=i,
            agent_id=step.get("agent_id"),
            status=WorkflowExecutionStatus.PENDING,
        )
        db.add(step_exec)

    db.commit()
    db.refresh(execution)

    # 启动异步执行
    asyncio.create_task(_run_workflow(execution.id))

    return _build_execution_response(execution, db)


async def _run_workflow(execution_id: int):
    """异步执行工作流步骤"""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        execution = db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()
        if not execution:
            return

        workflow = db.query(Workflow).filter(
            Workflow.id == execution.workflow_id
        ).first()
        steps = workflow.steps or []
        start_time = time.time()

        step_execs = db.query(WorkflowStepExecution).filter(
            WorkflowStepExecution.execution_id == execution_id
        ).order_by(WorkflowStepExecution.step_index).all()

        all_outputs = []

        for i, step_def in enumerate(steps):
            if i >= len(step_execs):
                break

            step_exec = step_execs[i]
            execution.current_step_index = i
            step_exec.status = WorkflowExecutionStatus.RUNNING
            step_exec.started_at = datetime.now(timezone.utc)
            step_exec.input_data = {
                "step_config": step_def.get("config", {}),
                "previous_outputs": all_outputs,
                "workflow_input": execution.input_data,
            }
            db.commit()

            try:
                step_type = step_def.get("type", "")

                if step_type == StepType.TASK_DECOMPOSE:
                    output = await _execute_task_decompose(step_def, execution.input_data)
                elif step_type == StepType.AGENT_ASSIGN:
                    output = await _execute_agent_assign(step_def, all_outputs, db)
                elif step_type in (StepType.PARALLEL_EXEC, StepType.SEQUENTIAL_EXEC):
                    output = await _execute_agent_task(step_def, all_outputs, db, step_exec)
                elif step_type == StepType.MERGE:
                    output = await _execute_merge(step_def, all_outputs)
                elif step_type == StepType.CONDITION:
                    output = await _execute_condition(step_def, all_outputs)
                else:
                    output = {"result": f"步骤 {step_def.get('name', i)} 执行完成", "data": {}}

                step_exec.output_data = output
                step_exec.status = WorkflowExecutionStatus.COMPLETED
                step_exec.completed_at = datetime.now(timezone.utc)
                all_outputs.append(output)

            except Exception as e:
                step_exec.status = WorkflowExecutionStatus.FAILED
                step_exec.error_message = str(e)
                step_exec.completed_at = datetime.now(timezone.utc)
                execution.status = WorkflowExecutionStatus.FAILED
                execution.error_message = f"步骤 {step_def.get('name', i)} 执行失败: {str(e)}"
                execution.completed_at = datetime.now(timezone.utc)
                execution.execution_time = time.time() - start_time
                db.commit()
                return

        # 所有步骤执行成功
        execution.status = WorkflowExecutionStatus.COMPLETED
        execution.current_step_index = len(steps)
        execution.result = {"outputs": all_outputs}
        execution.completed_at = datetime.now(timezone.utc)
        execution.execution_time = time.time() - start_time

        # 更新工作流统计
        workflow.total_executions = (workflow.total_executions or 0) + 1
        workflow.successful_executions = (workflow.successful_executions or 0) + 1
        total = workflow.total_executions
        workflow.avg_execution_time = round(
            ((workflow.avg_execution_time or 0) * (total - 1) + execution.execution_time) / total, 2
        )
        db.commit()

    except Exception as e:
        execution = db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()
        if execution:
            execution.status = WorkflowExecutionStatus.FAILED
            execution.error_message = str(e)
            execution.completed_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()


async def _execute_task_decompose(step_config: dict, input_data: dict) -> dict:
    """任务分解步骤 - 将大任务拆分为子任务"""
    task_description = input_data.get("task_description", "")
    num_subtasks = step_config.get("config", {}).get("num_subtasks", 3)

    subtasks = []
    for i in range(num_subtasks):
        subtasks.append({
            "index": i,
            "title": f"子任务 {i+1}",
            "description": f"从主任务分解的第 {i+1} 部分",
        })

    return {"subtasks": subtasks, "total": num_subtasks}


async def _execute_agent_assign(step_config: dict, all_outputs: list, db: Session) -> dict:
    """智能体分配步骤 - 为子任务匹配最佳智能体"""
    subtasks = []
    for output in all_outputs:
        if "subtasks" in output:
            subtasks = output["subtasks"]
            break

    agents = db.query(Agent).filter(Agent.status == "online").all()
    assignments = []

    for i, subtask in enumerate(subtasks):
        best_agent = agents[i % len(agents)] if agents else None
        assignments.append({
            "subtask_index": i,
            "agent_id": best_agent.id if best_agent else None,
            "agent_name": best_agent.name if best_agent else "未分配",
        })

    return {"assignments": assignments}


async def _execute_agent_task(step_config: dict, all_outputs: list, db: Session, step_exec) -> dict:
    """智能体执行任务步骤"""
    agent_id = step_exec.agent_id
    if not agent_id:
        # 从分配结果中获取
        for output in all_outputs:
            if "assignments" in output and output["assignments"]:
                agent_id = output["assignments"][0].get("agent_id")
                break

    agent = db.query(Agent).filter(Agent.id == agent_id).first() if agent_id else None

    return {
        "agent_id": agent_id,
        "agent_name": agent.name if agent else "未知",
        "status": "completed",
        "output": f"智能体已完成任务处理",
    }


async def _execute_merge(step_config: dict, all_outputs: list) -> dict:
    """结果汇总步骤"""
    merged = {
        "summary": "所有子任务结果已汇总",
        "total_outputs": len(all_outputs),
        "results": all_outputs,
    }
    return merged


async def _execute_condition(step_config: dict, all_outputs: list) -> dict:
    """条件判断步骤"""
    condition = step_config.get("config", {}).get("condition", "true")
    return {
        "condition": condition,
        "result": True,
        "branch": "default",
    }


@router.get("/{workflow_id}/executions", response_model=List[WorkflowExecutionResponse])
async def list_workflow_executions(
    workflow_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """获取工作流执行历史"""
    executions = db.query(WorkflowExecution).filter(
        WorkflowExecution.workflow_id == workflow_id
    ).order_by(WorkflowExecution.created_at.desc()).offset(skip).limit(limit).all()
    return [_build_execution_response(e, db) for e in executions]


@router.get("/executions/{execution_id}", response_model=WorkflowExecutionResponse)
async def get_execution_detail(
    execution_id: int,
    db: Session = Depends(get_db)
):
    """获取执行详情"""
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id
    ).first()
    if not execution:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return _build_execution_response(execution, db)
