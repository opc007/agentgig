import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import api from '../services/api'
import useStore from '../store/useStore'

const STEP_TYPES = [
  { type: 'task_decompose', label: '任务分解', icon: '🧩', color: 'from-blue-500 to-cyan-500', desc: '将大任务拆分为子任务' },
  { type: 'agent_assign', label: '智能体分配', icon: '🤖', color: 'from-purple-500 to-pink-500', desc: '为子任务匹配最佳智能体' },
  { type: 'parallel_exec', label: '并行执行', icon: '⚡', color: 'from-yellow-500 to-orange-500', desc: '多个智能体同时执行' },
  { type: 'sequential_exec', label: '串行执行', icon: '🔗', color: 'from-green-500 to-teal-500', desc: '按顺序依次执行' },
  { type: 'merge', label: '结果汇总', icon: '📊', color: 'from-indigo-500 to-blue-500', desc: '合并所有子任务结果' },
  { type: 'condition', label: '条件判断', icon: '🔀', color: 'from-red-500 to-pink-500', desc: '根据条件走不同分支' },
]

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  archived: 'bg-red-100 text-red-700',
}

const EXEC_STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-600',
  running: 'bg-blue-100 text-blue-600 animate-pulse',
  completed: 'bg-green-100 text-green-600',
  failed: 'bg-red-100 text-red-600',
  cancelled: 'bg-gray-100 text-gray-600',
}

function DraggableStep({ stepDef, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('step_type', stepDef.type)
        onDragStart?.(stepDef)
      }}
      className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-gray-100 hover:border-primary-300 cursor-grab active:cursor-grabbing transition-all hover:shadow-md"
    >
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stepDef.color} flex items-center justify-center text-white text-lg`}>
        {stepDef.icon}
      </div>
      <div>
        <div className="font-medium text-gray-800 text-sm">{stepDef.label}</div>
        <div className="text-xs text-gray-400">{stepDef.desc}</div>
      </div>
    </div>
  )
}

function StepNode({ step, index, selected, onSelect, onDelete }) {
  const stepType = STEP_TYPES.find(t => t.type === step.type) || STEP_TYPES[0]
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`relative group flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all min-w-[200px] ${
        selected ? 'border-primary-500 shadow-lg bg-primary-50' : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow'
      }`}
      onClick={() => onSelect(index)}
    >
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stepType.color} flex items-center justify-center text-white text-lg flex-shrink-0`}>
        {stepType.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-400">步骤 {index + 1}</div>
        <div className="font-medium text-gray-800 truncate">{step.name}</div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(index) }}
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        ×
      </button>
    </motion.div>
  )
}

function WorkflowCanvas({ steps, edges, selectedStep, onSelectStep, onDeleteStep, onDrop, onConnect }) {
  const canvasRef = useRef(null)
  const [connecting, setConnecting] = useState(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const stepType = e.dataTransfer.getData('step_type')
    if (stepType) {
      onDrop(stepType)
    }
  }

  return (
    <div
      ref={canvasRef}
      className="relative bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 min-h-[400px] p-6 overflow-auto"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {steps.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[350px] text-gray-400">
          <div className="text-5xl mb-4">🎯</div>
          <div className="text-lg font-medium">拖拽左侧步骤到这里</div>
          <div className="text-sm mt-1">构建你的自动化工作流</div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 items-start">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && (
                <div className="flex items-center text-gray-300">
                  <div className="w-8 h-0.5 bg-gray-300"></div>
                  <div className="text-lg">→</div>
                  <div className="w-8 h-0.5 bg-gray-300"></div>
                </div>
              )}
              <StepNode
                step={step}
                index={i}
                selected={selectedStep === i}
                onSelect={onSelectStep}
                onDelete={onDeleteStep}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StepConfigPanel({ step, index, onUpdate, agents }) {
  if (!step) return null

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="bg-white rounded-xl border border-gray-200 p-4"
    >
      <h4 className="font-bold text-gray-800 mb-3">步骤配置</h4>

      <label className="block text-sm text-gray-600 mb-1">步骤名称</label>
      <input
        type="text"
        value={step.name}
        onChange={(e) => onUpdate(index, { ...step, name: e.target.value })}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg mb-3 text-sm"
      />

      <label className="block text-sm text-gray-600 mb-1">指定智能体</label>
      <select
        value={step.agent_id || ''}
        onChange={(e) => onUpdate(index, { ...step, agent_id: e.target.value ? parseInt(e.target.value) : null })}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg mb-3 text-sm"
      >
        <option value="">自动分配</option>
        {agents.map(a => (
          <option key={a.id} value={a.id}>{a.name} ({a.status})</option>
        ))}
      </select>

      {step.type === 'task_decompose' && (
        <>
          <label className="block text-sm text-gray-600 mb-1">子任务数量</label>
          <input
            type="number"
            min="1"
            max="10"
            value={step.config?.num_subtasks || 3}
            onChange={(e) => onUpdate(index, { ...step, config: { ...step.config, num_subtasks: parseInt(e.target.value) } })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </>
      )}

      {step.type === 'condition' && (
        <>
          <label className="block text-sm text-gray-600 mb-1">条件表达式</label>
          <input
            type="text"
            value={step.config?.condition || ''}
            onChange={(e) => onUpdate(index, { ...step, config: { ...step.config, condition: e.target.value } })}
            placeholder="例如: score > 0.8"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </>
      )}
    </motion.div>
  )
}

function ExecutionModal({ execution, onClose }) {
  if (!execution) return null
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">执行详情</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${EXEC_STATUS_COLORS[execution.status]}`}>
            {execution.status}
          </span>
        </div>

        <div className="space-y-3">
          {execution.step_executions?.map((se, i) => (
            <div key={se.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">步骤 {i + 1}</div>
                {se.agent_name && <div className="text-xs text-gray-500">智能体: {se.agent_name}</div>}
              </div>
              <span className={`px-2 py-0.5 rounded text-xs ${EXEC_STATUS_COLORS[se.status]}`}>{se.status}</span>
            </div>
          ))}
        </div>

        {execution.execution_time && (
          <div className="mt-4 text-sm text-gray-500">
            总耗时: {execution.execution_time.toFixed(1)}s
          </div>
        )}

        <button onClick={onClose} className="mt-4 w-full py-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200">
          关闭
        </button>
      </motion.div>
    </div>
  )
}

export default function WorkflowEditor() {
  const { user, agents, fetchAgents } = useStore()
  const [workflows, setWorkflows] = useState([])
  const [currentWorkflow, setCurrentWorkflow] = useState(null)
  const [steps, setSteps] = useState([])
  const [selectedStep, setSelectedStep] = useState(null)
  const [wfName, setWfName] = useState('')
  const [wfDesc, setWfDesc] = useState('')
  const [showList, setShowList] = useState(true)
  const [executions, setExecutions] = useState([])
  const [selectedExecution, setSelectedExecution] = useState(null)
  const [executing, setExecuting] = useState(false)
  const [inputData, setInputData] = useState('{}')
  const [showExecute, setShowExecute] = useState(false)

  useEffect(() => {
    fetchAgents()
    loadWorkflows()
  }, [])

  const loadWorkflows = async () => {
    try {
      const res = await api.get('/api/workflows')
      setWorkflows(res.data)
    } catch {}
  }

  const handleDrop = useCallback((stepType) => {
    const typeDef = STEP_TYPES.find(t => t.type === stepType)
    const newStep = {
      type: stepType,
      name: typeDef?.label || stepType,
      config: {},
      agent_id: null,
    }
    setSteps(prev => [...prev, newStep])
    setSelectedStep(steps.length)
  }, [steps.length])

  const handleUpdateStep = (index, updated) => {
    setSteps(prev => prev.map((s, i) => i === index ? updated : s))
  }

  const handleDeleteStep = (index) => {
    setSteps(prev => prev.filter((_, i) => i !== index))
    if (selectedStep === index) setSelectedStep(null)
    else if (selectedStep > index) setSelectedStep(selectedStep - 1)
  }

  const handleSave = async () => {
    if (!wfName.trim()) return alert('请输入工作流名称')
    const data = {
      name: wfName,
      description: wfDesc,
      steps: steps,
      edges: [],
    }
    try {
      if (currentWorkflow) {
        await api.put(`/api/workflows/${currentWorkflow.id}`, data)
      } else {
        const res = await api.post('/api/workflows', data)
        setCurrentWorkflow(res.data)
      }
      loadWorkflows()
      alert('保存成功')
    } catch (err) {
      alert(err.response?.data?.detail || '保存失败')
    }
  }

  const handleLoadWorkflow = (wf) => {
    setCurrentWorkflow(wf)
    setWfName(wf.name)
    setWfDesc(wf.description || '')
    setSteps(wf.steps || [])
    setSelectedStep(null)
    setShowList(false)
  }

  const handleNewWorkflow = () => {
    setCurrentWorkflow(null)
    setWfName('')
    setWfDesc('')
    setSteps([])
    setSelectedStep(null)
    setShowList(false)
  }

  const handleExecute = async () => {
    if (!currentWorkflow) return alert('请先保存工作流')
    setExecuting(true)
    try {
      let parsed = {}
      try { parsed = JSON.parse(inputData) } catch { parsed = {} }
      const res = await api.post(`/api/workflows/${currentWorkflow.id}/execute`, { input_data: parsed })
      setSelectedExecution(res.data)
      loadWorkflows()
    } catch (err) {
      alert(err.response?.data?.detail || '执行失败')
    } finally {
      setExecuting(false)
      setShowExecute(false)
    }
  }

  const loadExecutions = async (wfId) => {
    try {
      const res = await api.get(`/api/workflows/${wfId}/executions`)
      setExecutions(res.data)
    } catch {}
  }

  if (showList) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">工作流编排</h1>
            <p className="text-gray-500 mt-1">创建多智能体协作的自动化工作流</p>
          </div>
          <button onClick={handleNewWorkflow} className="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all">
            + 新建工作流
          </button>
        </div>

        {workflows.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔄</div>
            <h3 className="text-xl font-bold text-gray-600 mb-2">还没有工作流</h3>
            <p className="text-gray-400 mb-6">创建你的第一个自动化工作流，让多个智能体协作完成复杂任务</p>
            <button onClick={handleNewWorkflow} className="px-6 py-2.5 bg-primary-500 text-white rounded-xl font-medium">
              开始创建
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map(wf => (
              <motion.div
                key={wf.id}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => handleLoadWorkflow(wf)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800 truncate">{wf.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[wf.status]}`}>{wf.status}</span>
                </div>
                <p className="text-gray-500 text-sm mb-4 line-clamp-2">{wf.description || '暂无描述'}</p>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>📦 {wf.steps?.length || 0} 步骤</span>
                  <span>🚀 {wf.total_executions} 次执行</span>
                  {wf.avg_execution_time > 0 && <span>⏱ {wf.avg_execution_time.toFixed(1)}s</span>}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-full mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setShowList(true)} className="text-gray-400 hover:text-gray-600">
            ← 返回列表
          </button>
          <input
            type="text"
            value={wfName}
            onChange={(e) => setWfName(e.target.value)}
            placeholder="工作流名称"
            className="text-2xl font-bold text-gray-800 bg-transparent border-none outline-none placeholder-gray-300"
          />
        </div>
        <div className="flex gap-3">
          {currentWorkflow && (
            <>
              <button
                onClick={() => { loadExecutions(currentWorkflow.id); setShowExecute(true) }}
                className="px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600"
              >
                🚀 执行
              </button>
              <button
                onClick={() => { loadExecutions(currentWorkflow.id) }}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200"
              >
                📋 执行历史
              </button>
            </>
          )}
          <button onClick={handleSave} className="px-6 py-2 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg">
            💾 保存
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left Panel - Step Types */}
        <div className="w-64 flex-shrink-0">
          <h3 className="font-bold text-gray-700 mb-3">可用步骤</h3>
          <div className="space-y-2">
            {STEP_TYPES.map(st => (
              <DraggableStep key={st.type} stepDef={st} />
            ))}
          </div>

          <div className="mt-6">
            <label className="block text-sm text-gray-600 mb-1">描述</label>
            <textarea
              value={wfDesc}
              onChange={(e) => setWfDesc(e.target.value)}
              placeholder="工作流描述..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
            />
          </div>

          {/* Executions */}
          {executions.length > 0 && (
            <div className="mt-6">
              <h4 className="font-bold text-gray-700 mb-2 text-sm">执行记录</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {executions.map(ex => (
                  <div
                    key={ex.id}
                    onClick={() => setSelectedExecution(ex)}
                    className="p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 text-xs"
                  >
                    <div className="flex justify-between">
                      <span>#{ex.id}</span>
                      <span className={EXEC_STATUS_COLORS[ex.status]}>{ex.status}</span>
                    </div>
                    <div className="text-gray-400 mt-0.5">
                      {ex.execution_time ? `${ex.execution_time.toFixed(1)}s` : '进行中...'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center - Canvas */}
        <div className="flex-1">
          <WorkflowCanvas
            steps={steps}
            edges={[]}
            selectedStep={selectedStep}
            onSelectStep={setSelectedStep}
            onDeleteStep={handleDeleteStep}
            onDrop={handleDrop}
          />
        </div>

        {/* Right Panel - Config */}
        <div className="w-72 flex-shrink-0">
          {selectedStep !== null && steps[selectedStep] ? (
            <StepConfigPanel
              step={steps[selectedStep]}
              index={selectedStep}
              onUpdate={handleUpdateStep}
              agents={agents}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400">
              <div className="text-3xl mb-2">⚙️</div>
              <div className="text-sm">选择步骤查看配置</div>
            </div>
          )}
        </div>
      </div>

      {/* Execute Modal */}
      {showExecute && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowExecute(false)}>
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">执行工作流</h3>
            <label className="block text-sm text-gray-600 mb-1">输入参数 (JSON)</label>
            <textarea
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowExecute(false)} className="flex-1 py-2 bg-gray-100 rounded-lg text-gray-600">取消</button>
              <button onClick={handleExecute} disabled={executing} className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium disabled:opacity-50">
                {executing ? '执行中...' : '开始执行'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Execution Detail Modal */}
      <AnimatePresence>
        {selectedExecution && (
          <ExecutionModal execution={selectedExecution} onClose={() => setSelectedExecution(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
