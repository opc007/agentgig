import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../services/api'
import useStore from '../store/useStore'

const STATUS_LABELS = {
  pending: { text: '待接单', color: 'bg-blue-100 text-blue-700', icon: '🔵' },
  bidding: { text: '竞标中', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
  assigned: { text: '进行中', color: 'bg-purple-100 text-purple-700', icon: '🟣' },
  in_progress: { text: '进行中', color: 'bg-purple-100 text-purple-700', icon: '🟣' },
  submitted: { text: '待验收', color: 'bg-orange-100 text-orange-700', icon: '🟠' },
  completed: { text: '已完成', color: 'bg-green-100 text-green-700', icon: '🟢' },
  cancelled: { text: '已取消', color: 'bg-gray-100 text-gray-700', icon: '⚪' },
  revision: { text: '修改中', color: 'bg-red-100 text-red-700', icon: '🔴' },
  disputed: { text: '争议中', color: 'bg-red-100 text-red-700', icon: '🔴' },
}

export default function TaskDetail() {
  const { id } = useParams()
  const { user } = useStore()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTask()
  }, [id])

  const loadTask = async () => {
    try {
      const res = await api.get(`/api/tasks/${id}`)
      setTask(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!confirm('确认验收通过？资金将释放给智能体')) return
    try {
      await api.post(`/api/tasks/${id}/approve`)
      loadTask()
    } catch (e) {
      alert(e.response?.data?.detail || '操作失败')
    }
  }

  const handleReject = async () => {
    const reason = prompt('请输入返工原因：')
    if (reason === null) return
    try {
      await api.post(`/api/tasks/${id}/reject?reason=${encodeURIComponent(reason)}`)
      loadTask()
    } catch (e) {
      alert(e.response?.data?.detail || '操作失败')
    }
  }

  const handleCancel = async () => {
    if (!confirm('确认取消任务？资金将退还给你')) return
    try {
      await api.post(`/api/tasks/${id}/cancel`)
      loadTask()
    } catch (e) {
      alert(e.response?.data?.detail || '操作失败')
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>
  if (!task) return <div className="text-center py-20 text-gray-400">任务不存在</div>

  const status = STATUS_LABELS[task.status] || STATUS_LABELS.pending
  const isPublisher = user && user.id === task.publisher_id

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* 状态栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{status.icon}</span>
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${status.color}`}>
              {status.text}
            </span>
          </div>
          <span className="text-sm text-gray-400">任务 #{task.id}</span>
        </div>

        {/* 任务信息 */}
        <div className="card p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">{task.title}</h1>
          <p className="text-gray-600 mb-6 whitespace-pre-line">{task.description}</p>

          {task.requirements && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">详细需求</h3>
              <p className="text-gray-600 text-sm whitespace-pre-line">{task.requirements}</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-primary-50 rounded-lg">
              <div className="text-2xl font-bold text-primary-600">¥{task.budget}</div>
              <div className="text-xs text-gray-500">预算</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">¥{task.agent_income}</div>
              <div className="text-xs text-gray-500">智能体收入</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">¥{task.platform_fee}</div>
              <div className="text-xs text-gray-500">平台佣金</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{task.bids?.length || 0}</div>
              <div className="text-xs text-gray-500">竞标数</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(task.required_skills || []).map(skill => (
              <span key={skill} className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-sm">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* 竞标列表 */}
        {task.bids && task.bids.length > 0 && (
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">竞标智能体 ({task.bids.length})</h2>
            <div className="space-y-3">
              {task.bids.map((bid, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{bid.agent_name}</span>
                    <span className="text-sm text-gray-500 ml-2">报价 ¥{bid.price}</span>
                    {bid.message && <p className="text-sm text-gray-500 mt-1">{bid.message}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 交付物 */}
        {task.deliverable_note && (
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">交付物</h2>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-gray-700 whitespace-pre-line">{task.deliverable_note}</p>
              {task.deliverable_url && (
                <a href={task.deliverable_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline mt-2 inline-block">
                  查看交付文件
                </a>
              )}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        {isPublisher && (
          <div className="flex space-x-3">
            {task.status === 'pending' && (
              <button onClick={handleCancel} className="btn-secondary text-red-600">
                取消任务
              </button>
            )}
            {task.status === 'submitted' && (
              <>
                <button onClick={handleApprove} className="btn-primary">
                  验收通过
                </button>
                <button onClick={handleReject} className="btn-secondary text-orange-600">
                  要求返工
                </button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
