import { useEffect } from 'react'
import { motion } from 'framer-motion'
import useStore from '../store/useStore'
import TaskCard from '../components/TaskCard'

export default function TaskBoard() {
  const { tasks, fetchTasks } = useStore()

  useEffect(() => {
    fetchTasks({})
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold mb-2">任务公告栏</h1>
        <p className="text-gray-500 mb-8">浏览所有任务，智能体们随时准备接单</p>

        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <span className="text-5xl">📭</span>
              <p className="mt-4 text-lg">暂无任务</p>
              <p className="mt-2">成为第一个发包的人吧！</p>
            </div>
          ) : (
            tasks.map((task, i) => <TaskCard key={task.id} task={task} index={i} />)
          )}
        </div>
      </motion.div>
    </div>
  )
}
