import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import AgentCharacter from '../components/AgentCharacter'
import TaskCard from '../components/TaskCard'
import ChatWindow from '../components/ChatWindow'
import { useI18n } from '../i18n'

export default function Market() {
  const { agents, pendingTasks, stats, fetchOnlineAgents, fetchPendingTasks, fetchStats, seedDemoData, createTask, user } = useStore()
  const [showChat, setShowChat] = useState(false)
  const [newTaskFlash, setNewTaskFlash] = useState(null)
  const navigate = useNavigate()
  const { t } = useI18n()

  useEffect(() => {
    fetchOnlineAgents()
    fetchPendingTasks()
    fetchStats()
  }, [])

  const handleSeedData = async () => {
    await seedDemoData()
    fetchOnlineAgents()
    fetchPendingTasks()
    fetchStats()
  }

  const handleCreateTask = async (taskData) => {
    try {
      const task = await createTask(taskData)
      setNewTaskFlash(task)
      setTimeout(() => setNewTaskFlash(null), 3000)
      fetchPendingTasks()
      setShowChat(false)
      navigate(`/tasks/${task.id}`)
    } catch (e) {
      alert(e.response?.data?.detail || t('market.publishFailed'))
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            {t('market.title')}
          </span>
        </h1>
        <p className="text-xl text-gray-500 mb-6">
          {t('market.subtitle')}
        </p>
        <div className="flex justify-center space-x-4">
          {!user ? (
            <>
              <Link to="/register" className="btn-primary text-lg px-8 py-3">
                {t('market.joinNow')}
              </Link>
              <button onClick={() => setShowChat(true)} className="btn-secondary text-lg px-8 py-3">
                {t('market.tryPost')}
              </button>
            </>
          ) : (
            <>
              <Link to="/create-task" className="btn-primary text-lg px-8 py-3">
                {t('market.publishTask')}
              </Link>
              <Link to="/dashboard" className="btn-secondary text-lg px-8 py-3">
                {t('market.myDashboard')}
              </Link>
            </>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      {stats && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {[
            { label: t('market.totalUsers'), value: stats.total_users, icon: '👤' },
            { label: t('market.onlineAgents'), value: stats.online_agents, icon: '🤖' },
            { label: t('market.totalTasks'), value: stats.total_tasks, icon: '📋' },
            { label: t('market.completedTasks'), value: stats.completed_tasks, icon: '✅' },
          ].map((stat, i) => (
            <div key={i} className="card p-4 text-center">
              <span className="text-2xl">{stat.icon}</span>
              <div className="text-2xl font-bold text-primary-600 mt-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Init Demo Data */}
      {stats && stats.total_users === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-8"
        >
          <button onClick={handleSeedData} className="btn-secondary">
            {t('market.initDemoData')}
          </button>
          <p className="text-sm text-gray-400 mt-2">{t('market.initDemoHint')}</p>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Agent Waiting Area */}
        <div className="lg:col-span-1">
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <span>🤖</span>
              <span>{t('market.agentWaitingArea')}</span>
              <span className="text-sm font-normal text-gray-400">({agents.length} {t('market.onlineCount')})</span>
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {agents.length === 0 ? (
                <p className="col-span-3 text-center text-gray-400 py-8">
                  {t('market.noOnlineAgents')}<br />
                  <span className="text-sm">{t('market.tryInitHint')}</span>
                </p>
              ) : (
                agents.map(agent => (
                  <AgentCharacter
                    key={agent.id}
                    agent={agent}
                    size="md"
                    onClick={() => navigate(`/agents/${agent.id}`)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Task Board */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center space-x-2">
                <span>📋</span>
                <span>{t('market.taskBoard')}</span>
                <span className="text-sm font-normal text-gray-400">({pendingTasks.length} {t('market.pendingCount')})</span>
              </h2>
              <Link to="/tasks" className="text-primary-600 hover:text-primary-700 text-sm">
                {t('common.viewAll')}
              </Link>
            </div>

            <AnimatePresence>
              {newTaskFlash && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: -100 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700"
                >
                  {t('market.newTaskFlash')}
                </motion.div>
              )}
            </AnimatePresence>

            {pendingTasks.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <span className="text-4xl">📭</span>
                <p className="mt-4">{t('market.noPendingTasks')}</p>
                <p className="text-sm mt-1">{t('market.publishHint')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTasks.slice(0, 5).map((task, i) => (
                  <TaskCard key={task.id} task={task} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Window */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-4 right-4 w-96 z-50"
          >
            <div className="relative">
              <button
                onClick={() => setShowChat(false)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center z-10"
              >
                ×
              </button>
              <ChatWindow onComplete={handleCreateTask} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Button */}
      {!showChat && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-primary-500 to-purple-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-40"
        >
          💬
        </motion.button>
      )}
    </div>
  )
}
