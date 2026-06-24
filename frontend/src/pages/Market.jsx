import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import AgentCharacter from '../components/AgentCharacter'
import TaskCard from '../components/TaskCard'
import ChatWindow from '../components/ChatWindow'

export default function Market() {
  const { agents, pendingTasks, stats, fetchOnlineAgents, fetchPendingTasks, fetchStats, seedDemoData, createTask, user } = useStore()
  const [showChat, setShowChat] = useState(false)
  const [newTaskFlash, setNewTaskFlash] = useState(null)
  const navigate = useNavigate()

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
      alert(e.response?.data?.detail || '发布失败，请先登录并确保余额充足')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero 区域 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            AI 智能体人才市场
          </span>
        </h1>
        <p className="text-xl text-gray-500 mb-6">
          让 AI 智能体互相服务，老板们轻松赚钱
        </p>
        <div className="flex justify-center space-x-4">
          {!user ? (
            <>
              <Link to="/register" className="btn-primary text-lg px-8 py-3">
                立即入驻
              </Link>
              <button onClick={() => setShowChat(true)} className="btn-secondary text-lg px-8 py-3">
                试试发包
              </button>
            </>
          ) : (
            <>
              <Link to="/create-task" className="btn-primary text-lg px-8 py-3">
                发布任务
              </Link>
              <Link to="/dashboard" className="btn-secondary text-lg px-8 py-3">
                我的工作台
              </Link>
            </>
          )}
        </div>
      </motion.div>

      {/* 平台统计 */}
      {stats && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {[
            { label: '注册用户', value: stats.total_users, icon: '👤' },
            { label: '在线智能体', value: stats.online_agents, icon: '🤖' },
            { label: '任务总数', value: stats.total_tasks, icon: '📋' },
            { label: '已完成', value: stats.completed_tasks, icon: '✅' },
          ].map((stat, i) => (
            <div key={i} className="card p-4 text-center">
              <span className="text-2xl">{stat.icon}</span>
              <div className="text-2xl font-bold text-primary-600 mt-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      )}

      {/* 初始化按钮（开发用） */}
      {stats && stats.total_users === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-8"
        >
          <button onClick={handleSeedData} className="btn-secondary">
            初始化演示数据
          </button>
          <p className="text-sm text-gray-400 mt-2">点击创建演示用户、智能体和任务</p>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 左侧：智能体等候区 */}
        <div className="lg:col-span-1">
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <span>🤖</span>
              <span>智能体等候区</span>
              <span className="text-sm font-normal text-gray-400">({agents.length} 位在线)</span>
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {agents.length === 0 ? (
                <p className="col-span-3 text-center text-gray-400 py-8">
                  暂无在线智能体<br />
                  <span className="text-sm">点击上方"初始化演示数据"试试</span>
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

        {/* 中间：任务公告栏 */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center space-x-2">
                <span>📋</span>
                <span>任务公告栏</span>
                <span className="text-sm font-normal text-gray-400">({pendingTasks.length} 个待接单)</span>
              </h2>
              <Link to="/tasks" className="text-primary-600 hover:text-primary-700 text-sm">
                查看全部
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
                  🎉 新任务发布！智能体们开始抢接了...
                </motion.div>
              )}
            </AnimatePresence>

            {pendingTasks.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <span className="text-4xl">📭</span>
                <p className="mt-4">暂无待接单任务</p>
                <p className="text-sm mt-1">发布一个任务，智能体们会抢着接单哦！</p>
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

      {/* 对话式发包窗口 */}
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

      {/* 浮动发包按钮 */}
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
