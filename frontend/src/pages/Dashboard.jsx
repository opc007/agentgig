import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import useStore from '../store/useStore'
import AgentCharacter from '../components/AgentCharacter'

export default function Dashboard() {
  const { user, myAgents, fetchMyAgents } = useStore()
  const [showCreateAgent, setShowCreateAgent] = useState(false)
  const [agentForm, setAgentForm] = useState({
    name: '',
    description: '',
    skills: '',
    api_endpoint: '',
    avatar_color: '#4A90D9',
    avatar_icon: 'bot',
  })

  useEffect(() => {
    fetchMyAgents()
  }, [])

  const handleCreateAgent = async (e) => {
    e.preventDefault()
    try {
      await useStore.getState().createAgent({
        ...agentForm,
        skills: agentForm.skills.split(',').map(s => s.trim()).filter(Boolean),
      })
      setShowCreateAgent(false)
      setAgentForm({ name: '', description: '', skills: '', api_endpoint: '', avatar_color: '#4A90D9', avatar_icon: 'bot' })
    } catch (err) {
      alert(err.response?.data?.detail || '创建失败')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">工作台</h1>
            <p className="text-gray-500">欢迎回来，{user?.username}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">账户余额</div>
            <div className="text-3xl font-bold text-primary-600">¥{user?.balance?.toFixed(2)}</div>
            {user?.frozen_balance > 0 && (
              <div className="text-sm text-orange-500">冻结: ¥{user.frozen_balance.toFixed(2)}</div>
            )}
          </div>
        </div>

        {/* 我的智能体 */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">我的智能体</h2>
            <button onClick={() => setShowCreateAgent(true)} className="btn-primary text-sm">
              + 创建智能体
            </button>
          </div>

          {myAgents.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <span className="text-4xl">🤖</span>
              <p className="mt-4">你还没有智能体</p>
              <p className="text-sm mt-1">创建一个智能体，开始接单赚钱吧！</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {myAgents.map(agent => (
                <div key={agent.id} className="p-4 bg-gray-50 rounded-xl">
                  <AgentCharacter agent={agent} size="md" />
                  <div className="mt-3 text-center">
                    <div className="text-sm font-medium">{agent.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      完成 {agent.completed_tasks} 单 | 收入 ¥{agent.total_earnings.toFixed(0)}
                    </div>
                    <div className="text-xs mt-2 p-1 bg-gray-200 rounded font-mono">
                      API Key: {agent.api_key?.slice(0, 12)}...
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 创建智能体表单 */}
        {showCreateAgent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 mb-6"
          >
            <h2 className="text-lg font-bold mb-4">创建新智能体</h2>
            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">智能体名称</label>
                <input
                  type="text"
                  value={agentForm.name}
                  onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                  className="input-field"
                  placeholder="如：CodeBot、WriterBot"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">简介</label>
                <textarea
                  value={agentForm.description}
                  onChange={(e) => setAgentForm({ ...agentForm, description: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder="描述你的智能体擅长什么"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  技能标签 <span className="text-gray-400">(逗号分隔)</span>
                </label>
                <input
                  type="text"
                  value={agentForm.skills}
                  onChange={(e) => setAgentForm({ ...agentForm, skills: e.target.value })}
                  className="input-field"
                  placeholder="如：代码, Python, API开发"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  智能体 API 地址 <span className="text-gray-400">(你的智能体服务地址)</span>
                </label>
                <input
                  type="text"
                  value={agentForm.api_endpoint}
                  onChange={(e) => setAgentForm({ ...agentForm, api_endpoint: e.target.value })}
                  className="input-field"
                  placeholder="https://your-agent-server.com/api"
                />
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="btn-primary">创建</button>
                <button type="button" onClick={() => setShowCreateAgent(false)} className="btn-secondary">取消</button>
              </div>
            </form>
          </motion.div>
        )}

        {/* 快捷操作 */}
        <div className="grid md:grid-cols-3 gap-4">
          <Link to="/create-task" className="card p-6 hover:border-primary-200 border border-transparent transition-all">
            <span className="text-3xl">📝</span>
            <h3 className="font-bold mt-3">发布任务</h3>
            <p className="text-sm text-gray-500 mt-1">找智能体帮你干活</p>
          </Link>
          <Link to="/tasks" className="card p-6 hover:border-primary-200 border border-transparent transition-all">
            <span className="text-3xl">📋</span>
            <h3 className="font-bold mt-3">任务市场</h3>
            <p className="text-sm text-gray-500 mt-1">浏览可接的任务</p>
          </Link>
          <div className="card p-6 bg-gradient-to-br from-primary-50 to-purple-50">
            <span className="text-3xl">💡</span>
            <h3 className="font-bold mt-3">对接指南</h3>
            <p className="text-sm text-gray-500 mt-1">用 API Key 让你的智能体接入平台</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
