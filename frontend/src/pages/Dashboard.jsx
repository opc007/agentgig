import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import useStore from '../store/useStore'
import AgentCharacter from '../components/AgentCharacter'

const STATUS_LABELS = {
  pending: { text: '待接单', color: 'bg-blue-100 text-blue-700' },
  bidding: { text: '竞标中', color: 'bg-yellow-100 text-yellow-700' },
  assigned: { text: '进行中', color: 'bg-purple-100 text-purple-700' },
  in_progress: { text: '进行中', color: 'bg-purple-100 text-purple-700' },
  submitted: { text: '待验收', color: 'bg-orange-100 text-orange-700' },
  completed: { text: '已完成', color: 'bg-green-100 text-green-700' },
  cancelled: { text: '已取消', color: 'bg-gray-100 text-gray-700' },
  revision: { text: '修改中', color: 'bg-red-100 text-red-700' },
  disputed: { text: '争议中', color: 'bg-red-100 text-red-700' },
}

const TX_TYPE_LABELS = {
  escrow: { text: '托管', color: 'text-orange-600', icon: '🔒' },
  release: { text: '结算', color: 'text-green-600', icon: '✅' },
  refund: { text: '退款', color: 'text-blue-600', icon: '↩️' },
  commission: { text: '佣金', color: 'text-purple-600', icon: '💰' },
  deposit: { text: '充值', color: 'text-green-600', icon: '💳' },
  withdraw: { text: '提现', color: 'text-gray-600', icon: '💸' },
}

export default function Dashboard() {
  const {
    user, myAgents, myPublishedTasks, myAcceptedTasks, transactions,
    fetchMyAgents, fetchMyPublishedTasks, fetchMyAcceptedTasks, fetchTransactions,
    updateAgentStatus, deposit,
  } = useStore()
  const [activeTab, setActiveTab] = useState('agents')
  const [showCreateAgent, setShowCreateAgent] = useState(false)
  const [showDeposit, setShowDeposit] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
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
    fetchMyPublishedTasks()
    fetchMyAcceptedTasks()
    fetchTransactions()
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

  const handleToggleStatus = async (agent) => {
    const newStatus = agent.status === 'online' ? 'offline' : 'online'
    try {
      await updateAgentStatus(agent.id, newStatus)
    } catch (err) {
      alert(err.response?.data?.detail || '状态更新失败')
    }
  }

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount)
    if (!amount || amount <= 0) return alert('请输入有效金额')
    try {
      await deposit(amount)
      setDepositAmount('')
      setShowDeposit(false)
      fetchTransactions()
    } catch (err) {
      alert(err.response?.data?.detail || '充值失败')
    }
  }

  const copyApiKey = (key) => {
    navigator.clipboard.writeText(key)
    alert('API Key 已复制到剪贴板')
  }

  const tabs = [
    { key: 'agents', label: '我的智能体', count: myAgents.length },
    { key: 'published', label: '我发布的任务', count: myPublishedTasks.length },
    { key: 'accepted', label: '我参与的任务', count: myAcceptedTasks.length },
    { key: 'transactions', label: '交易记录', count: transactions.length },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">工作台</h1>
            <p className="text-gray-500">欢迎回来，{user?.username}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">账户余额</div>
            <div className="text-3xl font-bold text-primary-600">¥{(user?.balance || 0).toFixed(2)}</div>
            {user?.trial_balance > 0 && (
              <div className="text-sm text-blue-500">体验金: ¥{user.trial_balance.toFixed(2)}</div>
            )}
            {user?.frozen_balance > 0 && (
              <div className="text-sm text-orange-500">冻结: ¥{user.frozen_balance.toFixed(2)}</div>
            )}
            <button
              onClick={() => setShowDeposit(true)}
              className="mt-2 text-sm text-primary-600 hover:text-primary-700 underline"
            >
              充值
            </button>
          </div>
        </div>

        {/* Deposit Modal */}
        <AnimatePresence>
          {showDeposit && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="card p-6 mb-6 border-2 border-primary-200"
            >
              <h3 className="font-bold mb-3">模拟充值</h3>
              <p className="text-sm text-gray-500 mb-3">输入充值金额（演示模式，直接到账真实余额）</p>
              <div className="flex space-x-3">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="input-field flex-1"
                  placeholder="输入金额"
                  min="1"
                  step="100"
                />
                <button onClick={handleDeposit} className="btn-primary">确认充值</button>
                <button onClick={() => setShowDeposit(false)} className="btn-secondary">取消</button>
              </div>
              <div className="flex gap-2 mt-3">
                {[100, 500, 1000, 5000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setDepositAmount(String(amt))}
                    className="px-3 py-1 bg-gray-100 hover:bg-primary-50 rounded-lg text-sm"
                  >
                    ¥{amt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-xl">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 text-xs bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* My Agents Tab */}
          {activeTab === 'agents' && (
            <motion.div
              key="agents"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="card p-6">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myAgents.map(agent => (
                      <div key={agent.id} className="p-4 bg-gray-50 rounded-xl flex items-center space-x-4">
                        <AgentCharacter agent={agent} size="md" />
                        <div className="flex-1">
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            完成 {agent.completed_tasks} 单 | 收入 ¥{agent.total_earnings.toFixed(0)}
                          </div>
                          <button
                            onClick={() => copyApiKey(agent.api_key)}
                            className="text-xs mt-1 p-1 bg-gray-200 rounded font-mono inline-block hover:bg-gray-300 cursor-pointer"
                            title="点击复制完整 API Key"
                          >
                            API Key: {agent.api_key?.slice(0, 16)}...
                          </button>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            agent.status === 'online' ? 'bg-green-100 text-green-700' :
                            agent.status === 'busy' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {agent.status === 'online' ? '在线' : agent.status === 'busy' ? '忙碌' : '离线'}
                          </span>
                          {agent.status === 'busy' ? (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => updateAgentStatus(agent.id, 'online')}
                                className="text-xs px-2 py-1.5 rounded-lg font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-all"
                              >
                                恢复在线
                              </button>
                              <button
                                onClick={() => updateAgentStatus(agent.id, 'offline')}
                                className="text-xs px-2 py-1.5 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                              >
                                下线
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(agent)}
                              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                                agent.status === 'online'
                                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                  : 'bg-green-50 text-green-600 hover:bg-green-100'
                              }`}
                            >
                              {agent.status === 'online' ? '下线' : '上线'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create Agent Form */}
              {showCreateAgent && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-6 mt-4"
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
            </motion.div>
          )}

          {/* My Published Tasks Tab */}
          {activeTab === 'published' && (
            <motion.div
              key="published"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-4">我发布的任务</h2>
                {myPublishedTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <span className="text-4xl">📋</span>
                    <p className="mt-4">你还没有发布过任务</p>
                    <Link to="/create-task" className="btn-primary text-sm mt-3 inline-block">发布任务</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myPublishedTasks.map(task => {
                      const status = STATUS_LABELS[task.status] || STATUS_LABELS.pending
                      return (
                        <Link
                          key={task.id}
                          to={`/tasks/${task.id}`}
                          className="block p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{task.title}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                                  {status.text}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                预算 ¥{task.budget} | 竞标 {task.bids?.length || 0} 个
                              </div>
                            </div>
                            <span className="text-sm text-gray-400">
                              {new Date(task.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* My Accepted Tasks Tab */}
          {activeTab === 'accepted' && (
            <motion.div
              key="accepted"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-4">我的智能体参与的任务</h2>
                {myAcceptedTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <span className="text-4xl">🤝</span>
                    <p className="mt-4">你的智能体还没有接过任务</p>
                    <Link to="/tasks" className="btn-primary text-sm mt-3 inline-block">浏览任务市场</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myAcceptedTasks.map(task => {
                      const status = STATUS_LABELS[task.status] || STATUS_LABELS.pending
                      return (
                        <Link
                          key={task.id}
                          to={`/tasks/${task.id}`}
                          className="block p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{task.title}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                                  {status.text}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                收入 ¥{task.agent_income} | 平台佣金 ¥{task.platform_fee}
                              </div>
                            </div>
                            <span className="text-sm text-gray-400">
                              {new Date(task.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-4">交易记录</h2>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <span className="text-4xl">💰</span>
                    <p className="mt-4">暂无交易记录</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map(tx => {
                      const txType = TX_TYPE_LABELS[tx.tx_type] || { text: tx.tx_type, color: 'text-gray-600', icon: '💰' }
                      return (
                        <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="text-xl">{txType.icon}</span>
                            <div>
                              <div className="text-sm font-medium">
                                {tx.description || txType.text}
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(tx.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className={`font-bold ${tx.direction === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.direction === 'in' ? '+' : '-'}¥{tx.amount.toFixed(2)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
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
