import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
  const { user, myAgents, fetchMyAgents } = useStore()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [submitForm, setSubmitForm] = useState({ deliverable_url: '', deliverable_note: '' })
  const [bidForm, setBidForm] = useState({ agent_id: '', price: '', message: '' })
  const [showBidForm, setShowBidForm] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadTask()
    loadMessages()
    fetchMyAgents()
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadTask = async () => {
    try {
      const res = await api.get(`/api/tasks/${id}`)
      setTask(res.data)
      if (res.data.bids?.length > 0 && !bidForm.price) {
        setBidForm(prev => ({ ...prev, price: String(res.data.budget) }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async () => {
    try {
      const res = await api.get(`/api/tasks/${id}/messages`)
      setMessages(res.data)
    } catch (e) {
      console.error(e)
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

  const handleAcceptBid = async (agentId) => {
    if (!confirm('确认选择该智能体接单？')) return
    try {
      await api.post(`/api/tasks/${id}/accept/${agentId}`)
      loadTask()
    } catch (e) {
      alert(e.response?.data?.detail || '操作失败')
    }
  }

  const handleBid = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/api/tasks/${id}/bid`, {
        agent_id: parseInt(bidForm.agent_id),
        price: parseFloat(bidForm.price),
        message: bidForm.message,
      })
      setShowBidForm(false)
      setBidForm({ agent_id: '', price: String(task.budget), message: '' })
      loadTask()
    } catch (e) {
      alert(e.response?.data?.detail || '竞标失败')
    }
  }

  const handleSubmitDeliverable = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/api/tasks/${id}/submit`, submitForm)
      setShowSubmitForm(false)
      setSubmitForm({ deliverable_url: '', deliverable_note: '' })
      loadTask()
    } catch (e) {
      alert(e.response?.data?.detail || '提交失败')
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    try {
      await api.post(`/api/tasks/${id}/messages`, {
        content: newMessage,
        message_type: 'text',
      })
      setNewMessage('')
      loadMessages()
    } catch (e) {
      alert(e.response?.data?.detail || '发送失败')
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>
  if (!task) return <div className="text-center py-20 text-gray-400">任务不存在</div>

  const status = STATUS_LABELS[task.status] || STATUS_LABELS.pending
  const isPublisher = user && user.id === task.publisher_id
  const isAgentOwner = user && myAgents.some(a => a.id === task.assigned_agent_id)
  const hasMyAgentBid = task.bids?.some(b => myAgents.some(a => a.id === b.agent_id))
  const onlineAgents = myAgents.filter(a => a.status === 'online')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Status Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{status.icon}</span>
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${status.color}`}>
              {status.text}
            </span>
          </div>
          <span className="text-sm text-gray-400">任务 #{task.id}</span>
        </div>

        {/* Task Info */}
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

        {/* Bids Section */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">竞标智能体 ({task.bids?.length || 0})</h2>
            {user && !isPublisher && !hasMyAgentBid && onlineAgents.length > 0 && task.status === 'pending' || task.status === 'bidding' ? (
              <button onClick={() => setShowBidForm(true)} className="btn-primary text-sm">
                我要竞标
              </button>
            ) : null}
          </div>

          {/* Bid Form */}
          <AnimatePresence>
            {showBidForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <form onSubmit={handleBid} className="p-4 bg-primary-50 rounded-lg space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">选择智能体</label>
                    <select
                      value={bidForm.agent_id}
                      onChange={(e) => setBidForm({ ...bidForm, agent_id: e.target.value })}
                      className="input-field"
                      required
                    >
                      <option value="">请选择</option>
                      {onlineAgents.map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">报价 (元)</label>
                    <input
                      type="number"
                      value={bidForm.price}
                      onChange={(e) => setBidForm({ ...bidForm, price: e.target.value })}
                      className="input-field"
                      min="1"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">留言</label>
                    <textarea
                      value={bidForm.message}
                      onChange={(e) => setBidForm({ ...bidForm, message: e.target.value })}
                      className="input-field"
                      rows={2}
                      placeholder="介绍一下你的优势..."
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button type="submit" className="btn-primary text-sm">提交竞标</button>
                    <button type="button" onClick={() => setShowBidForm(false)} className="btn-secondary text-sm">取消</button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bid List */}
          {task.bids && task.bids.length > 0 ? (
            <div className="space-y-3">
              {task.bids.map((bid, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{bid.agent_name}</span>
                      <span className="text-sm text-primary-600 font-bold">报价 ¥{bid.price}</span>
                    </div>
                    {bid.message && <p className="text-sm text-gray-500 mt-1">{bid.message}</p>}
                    {bid.estimated_hours && (
                      <span className="text-xs text-gray-400">预估 {bid.estimated_hours} 小时</span>
                    )}
                  </div>
                  {isPublisher && task.status === 'bidding' && (
                    <button
                      onClick={() => handleAcceptBid(bid.agent_id)}
                      className="btn-primary text-sm ml-4"
                    >
                      选择接单
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <p>暂无智能体竞标</p>
            </div>
          )}
        </div>

        {/* Deliverable Section */}
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

        {/* Submit Deliverable Form (for agent owner) */}
        {isAgentOwner && ['assigned', 'in_progress', 'revision'].includes(task.status) && (
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">提交交付物</h2>
              {!showSubmitForm && (
                <button onClick={() => setShowSubmitForm(true)} className="btn-primary text-sm">
                  提交交付
                </button>
              )}
            </div>
            <AnimatePresence>
              {showSubmitForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleSubmitDeliverable}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">交付说明</label>
                    <textarea
                      value={submitForm.deliverable_note}
                      onChange={(e) => setSubmitForm({ ...submitForm, deliverable_note: e.target.value })}
                      className="input-field"
                      rows={3}
                      placeholder="描述你的交付内容..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">交付文件链接 <span className="text-gray-400">(可选)</span></label>
                    <input
                      type="url"
                      value={submitForm.deliverable_url}
                      onChange={(e) => setSubmitForm({ ...submitForm, deliverable_url: e.target.value })}
                      className="input-field"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button type="submit" className="btn-primary">确认提交</button>
                    <button type="button" onClick={() => setShowSubmitForm(false)} className="btn-secondary">取消</button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Messages Section */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">消息对话 ({messages.length})</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto mb-4 p-2">
            {messages.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm">暂无消息</div>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                    msg.sender_id === user?.id
                      ? 'bg-primary-500 text-white rounded-br-md'
                      : msg.sender_type === 'agent'
                        ? 'bg-purple-100 text-purple-900 rounded-bl-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}>
                    <div className="text-xs opacity-70 mb-1">{msg.sender_name}</div>
                    <p className="text-sm whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          {user && (
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="输入消息..."
                className="input-field text-sm flex-1"
              />
              <button onClick={handleSendMessage} className="btn-primary px-4">
                发送
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
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
