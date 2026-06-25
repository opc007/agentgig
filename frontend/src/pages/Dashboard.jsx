import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import useStore from '../store/useStore'
import AgentCharacter from '../components/AgentCharacter'
import { useI18n } from '../i18n'

const STATUS_COLOR_MAP = {
  pending: 'bg-blue-100 text-blue-700',
  bidding: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-purple-100 text-purple-700',
  submitted: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-700',
  revision: 'bg-red-100 text-red-700',
  disputed: 'bg-red-100 text-red-700',
}

const TX_TYPE_ICONS = {
  escrow: '🔒', release: '✅', refund: '↩️', commission: '💰', deposit: '💳', withdraw: '💸',
}
const TX_TYPE_COLORS = {
  escrow: 'text-orange-600', release: 'text-green-600', refund: 'text-blue-600',
  commission: 'text-purple-600', deposit: 'text-green-600', withdraw: 'text-gray-600',
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
    name: '', description: '', skills: '', api_endpoint: '', avatar_color: '#4A90D9', avatar_icon: 'bot',
  })
  const { t } = useI18n()

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
      alert(err.response?.data?.detail || t('dashboard.createFailed'))
    }
  }

  const handleToggleStatus = async (agent) => {
    const newStatus = agent.status === 'online' ? 'offline' : 'online'
    try {
      await updateAgentStatus(agent.id, newStatus)
    } catch (err) {
      alert(err.response?.data?.detail || t('dashboard.statusUpdateFailed'))
    }
  }

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount)
    if (!amount || amount <= 0) return alert(t('dashboard.invalidAmount'))
    try {
      await deposit(amount)
      setDepositAmount('')
      setShowDeposit(false)
      fetchTransactions()
    } catch (err) {
      alert(err.response?.data?.detail || t('dashboard.depositFailed'))
    }
  }

  // API Key 安全展示：完整 key 不在列表页显示，提供复制入口
  const displayApiKey = (key) => {
    if (!key) return t('dashboard.apiKeyHidden') || 'API Key 已隐藏'
    return key.slice(0, 8) + '...' + key.slice(-4)
  }

  const copyApiKey = (key) => {
    if (!key) return
    navigator.clipboard.writeText(key)
    alert(t('dashboard.apiKeyCopied') || 'API Key 已复制')
  }

  const tabs = [
    { key: 'agents', label: t('dashboard.tabAgents'), count: myAgents.length },
    { key: 'published', label: t('dashboard.tabPublished'), count: myPublishedTasks.length },
    { key: 'accepted', label: t('dashboard.tabAccepted'), count: myAcceptedTasks.length },
    { key: 'transactions', label: t('dashboard.tabTransactions'), count: transactions.length },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
            <p className="text-gray-500">{t('dashboard.welcomeBack')}{user?.username}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">{t('dashboard.accountBalance')}</div>
            <div className="text-3xl font-bold text-primary-600">¥{(user?.balance || 0).toFixed(2)}</div>
            {user?.trial_balance > 0 && (
              <div className="text-sm text-blue-500">{t('dashboard.trialBalance')}: ¥{user.trial_balance.toFixed(2)}</div>
            )}
            {user?.frozen_balance > 0 && (
              <div className="text-sm text-orange-500">{t('dashboard.frozenBalance')}: ¥{user.frozen_balance.toFixed(2)}</div>
            )}
            <Link
              to="/wallet"
              className="mt-2 text-sm text-primary-600 hover:text-primary-700 underline inline-block"
            >
              {t('dashboard.deposit')} / 提现
            </Link>
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
              <h3 className="font-bold mb-3">{t('dashboard.mockDeposit')}</h3>
              <p className="text-sm text-gray-500 mb-3">{t('dashboard.depositHint')}</p>
              <div className="flex space-x-3">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="input-field flex-1"
                  placeholder={t('dashboard.depositAmountPlaceholder')}
                  min="1"
                  step="100"
                />
                <button onClick={handleDeposit} className="btn-primary">{t('dashboard.confirmDeposit')}</button>
                <button onClick={() => setShowDeposit(false)} className="btn-secondary">{t('dashboard.cancel')}</button>
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
                  <h2 className="text-lg font-bold">{t('dashboard.tabAgents')}</h2>
                  <button onClick={() => setShowCreateAgent(true)} className="btn-primary text-sm">
                    {t('dashboard.createAgent')}
                  </button>
                </div>

                {myAgents.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <span className="text-4xl">🤖</span>
                    <p className="mt-4">{t('dashboard.noAgents')}</p>
                    <p className="text-sm mt-1">{t('dashboard.createAgentHint')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myAgents.map(agent => (
                      <div key={agent.id} className="p-4 bg-gray-50 rounded-xl flex items-center space-x-4">
                        <AgentCharacter agent={agent} size="md" />
                        <div className="flex-1">
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {t('dashboard.completedTasks')} {agent.completed_tasks} {t('dashboard.singleUnit')} | {t('dashboard.earnings')} ¥{agent.total_earnings.toFixed(0)}
                          </div>
                          {/* API Key 安全展示：完整 key 不在此处显示 */}
                          <div className="text-xs mt-1 flex items-center gap-1">
                            <span className="text-gray-400">API Key:</span>
                            <span
                              className="px-2 py-0.5 bg-gray-200 rounded font-mono cursor-pointer hover:bg-gray-300 transition-colors"
                              title={agent.api_key ? t('dashboard.copyApiKey') : 'API Key 未生成'}
                              onClick={() => agent.api_key && copyApiKey(agent.api_key)}
                            >
                              {displayApiKey(agent.api_key)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            agent.status === 'online' ? 'bg-green-100 text-green-700' :
                            agent.status === 'busy' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {agent.status === 'online' ? t('dashboard.online') : agent.status === 'busy' ? t('dashboard.busy') : t('dashboard.offline')}
                          </span>
                          {agent.status === 'busy' ? (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => updateAgentStatus(agent.id, 'online')}
                                className="text-xs px-2 py-1.5 rounded-lg font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-all"
                              >
                                {t('dashboard.goOnline')}
                              </button>
                              <button
                                onClick={() => updateAgentStatus(agent.id, 'offline')}
                                className="text-xs px-2 py-1.5 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                              >
                                {t('dashboard.goOffline')}
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
                              {agent.status === 'online' ? t('dashboard.goOffline') : t('dashboard.goOnlineAction')}
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
                  <h2 className="text-lg font-bold mb-4">{t('dashboard.createNewAgent')}</h2>
                  <form onSubmit={handleCreateAgent} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('dashboard.agentName')}</label>
                      <input
                        type="text"
                        value={agentForm.name}
                        onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                        className="input-field"
                        placeholder={t('dashboard.agentNamePlaceholder')}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('dashboard.agentDescription')}</label>
                      <textarea
                        value={agentForm.description}
                        onChange={(e) => setAgentForm({ ...agentForm, description: e.target.value })}
                        className="input-field"
                        rows={2}
                        placeholder={t('dashboard.agentDescPlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('dashboard.agentSkills')} <span className="text-gray-400">({t('dashboard.skillsHint')})</span>
                      </label>
                      <input
                        type="text"
                        value={agentForm.skills}
                        onChange={(e) => setAgentForm({ ...agentForm, skills: e.target.value })}
                        className="input-field"
                        placeholder={t('dashboard.agentSkillsPlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('dashboard.agentApiEndpoint')} <span className="text-gray-400">({t('dashboard.apiEndpointHint')})</span>
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
                      <button type="submit" className="btn-primary">{t('dashboard.create')}</button>
                      <button type="button" onClick={() => setShowCreateAgent(false)} className="btn-secondary">{t('common.cancel')}</button>
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
                <h2 className="text-lg font-bold mb-4">{t('dashboard.tabPublished')}</h2>
                {myPublishedTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <span className="text-4xl">📋</span>
                    <p className="mt-4">{t('dashboard.noPublishedTasks')}</p>
                    <Link to="/create-task" className="btn-primary text-sm mt-3 inline-block">{t('dashboard.publishTaskLink')}</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myPublishedTasks.map(task => {
                      const statusText = t(`status.${task.status}`)
                      const statusColor = STATUS_COLOR_MAP[task.status] || STATUS_COLOR_MAP.pending
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
                                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>
                                  {statusText}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {t('dashboard.budgetInfo', { budget: `¥${task.budget}`, bids: task.bids?.length || 0 })}
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
                <h2 className="text-lg font-bold mb-4">{t('dashboard.acceptedTitle')}</h2>
                {myAcceptedTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <span className="text-4xl">🤝</span>
                    <p className="mt-4">{t('dashboard.noAcceptedTasks')}</p>
                    <Link to="/tasks" className="btn-primary text-sm mt-3 inline-block">{t('dashboard.browseMarket')}</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myAcceptedTasks.map(task => {
                      const statusText = t(`status.${task.status}`)
                      const statusColor = STATUS_COLOR_MAP[task.status] || STATUS_COLOR_MAP.pending
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
                                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>
                                  {statusText}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {t('dashboard.incomeInfo', { income: `¥${task.agent_income}`, fee: `¥${task.platform_fee}` })}
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
                <h2 className="text-lg font-bold mb-4">{t('dashboard.tabTransactions')}</h2>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <span className="text-4xl">💰</span>
                    <p className="mt-4">{t('dashboard.noTransactions')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map(tx => {
                      const txText = t(`transaction.${tx.tx_type}`) || tx.tx_type
                      const txColor = TX_TYPE_COLORS[tx.tx_type] || 'text-gray-600'
                      const txIcon = TX_TYPE_ICONS[tx.tx_type] || '💰'
                      return (
                        <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="text-xl">{txIcon}</span>
                            <div>
                              <div className="text-sm font-medium">
                                {tx.description || txText}
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
            <h3 className="font-bold mt-3">{t('dashboard.quickActions.publishTask')}</h3>
            <p className="text-sm text-gray-500 mt-1">{t('dashboard.quickActions.publishTaskDesc')}</p>
          </Link>
          <Link to="/tasks" className="card p-6 hover:border-primary-200 border border-transparent transition-all">
            <span className="text-3xl">📋</span>
            <h3 className="font-bold mt-3">{t('dashboard.quickActions.taskMarket')}</h3>
            <p className="text-sm text-gray-500 mt-1">{t('dashboard.quickActions.taskMarketDesc')}</p>
          </Link>
          <div className="card p-6 bg-gradient-to-br from-primary-50 to-purple-50">
            <span className="text-3xl">💡</span>
            <h3 className="font-bold mt-3">{t('dashboard.quickActions.apiGuide')}</h3>
            <p className="text-sm text-gray-500 mt-1">{t('dashboard.quickActions.apiGuideDesc')}</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
