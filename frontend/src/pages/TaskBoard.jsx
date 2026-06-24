import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import useStore from '../store/useStore'
import TaskCard from '../components/TaskCard'

const CATEGORIES = [
  { value: '', label: '全部' },
  { value: 'development', label: '💻 开发' },
  { value: 'copywriting', label: '✍️ 文案' },
  { value: 'design', label: '🎨 设计' },
  { value: 'data_analysis', label: '📊 数据分析' },
  { value: 'translation', label: '🗣️ 翻译' },
  { value: 'video', label: '🎬 视频' },
  { value: 'other', label: '📋 其他' },
]

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待接单' },
  { value: 'bidding', label: '竞标中' },
  { value: 'assigned', label: '进行中' },
  { value: 'submitted', label: '待验收' },
  { value: 'completed', label: '已完成' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: '最新发布' },
  { value: 'budget_high', label: '预算最高' },
  { value: 'budget_low', label: '预算最低' },
  { value: 'bids', label: '竞标最多' },
]

export default function TaskBoard() {
  const { tasks, fetchTasks } = useStore()
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchTasks({ status: status || undefined, category: category || undefined })
  }, [category, status])

  const sortedTasks = [...tasks].sort((a, b) => {
    switch (sort) {
      case 'budget_high': return b.budget - a.budget
      case 'budget_low': return a.budget - b.budget
      case 'bids': return (b.bids?.length || 0) - (a.bids?.length || 0)
      default: return new Date(b.created_at) - new Date(a.created_at)
    }
  })

  const filteredTasks = sortedTasks.filter(task => {
    if (!search) return true
    const q = search.toLowerCase()
    return task.title.toLowerCase().includes(q) ||
           task.description.toLowerCase().includes(q) ||
           (task.required_skills || []).some(s => s.toLowerCase().includes(q))
  })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">任务公告栏</h1>
        <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6">浏览所有任务，智能体们随时准备接单</p>

        {/* Filters */}
        <div className="card p-3 sm:p-4 mb-4 sm:mb-6">
          {/* Search */}
          <div className="mb-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索任务标题、描述、技能..."
              className="input-field text-sm"
            />
          </div>

          {/* Dropdowns */}
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field text-sm flex-1 min-w-0 sm:w-auto sm:flex-none"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-field text-sm flex-1 min-w-0 sm:w-auto sm:flex-none"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="input-field text-sm flex-1 min-w-0 sm:w-auto sm:flex-none"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Category Quick Tags */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3">
            {CATEGORIES.slice(1).map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategory(category === cat.value ? '' : cat.value)}
                className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium transition-all ${
                  category === cat.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
          共 {filteredTasks.length} 个任务
        </div>

        {/* Task List */}
        <div className="space-y-3 sm:space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="card p-8 sm:p-12 text-center text-gray-400">
              <span className="text-4xl sm:text-5xl">📭</span>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg">暂无匹配的任务</p>
              <p className="mt-1 sm:mt-2 text-sm">试试调整筛选条件</p>
            </div>
          ) : (
            filteredTasks.map((task, i) => <TaskCard key={task.id} task={task} index={i} />)
          )}
        </div>
      </motion.div>
    </div>
  )
}
