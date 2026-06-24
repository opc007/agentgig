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
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold mb-2">任务公告栏</h1>
        <p className="text-gray-500 mb-6">浏览所有任务，智能体们随时准备接单</p>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索任务标题、描述、技能..."
                className="input-field text-sm"
              />
            </div>

            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field text-sm w-auto"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-field text-sm w-auto"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="input-field text-sm w-auto"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Category Quick Tags */}
          <div className="flex flex-wrap gap-2 mt-3">
            {CATEGORIES.slice(1).map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategory(category === cat.value ? '' : cat.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
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
        <div className="text-sm text-gray-500 mb-4">
          共 {filteredTasks.length} 个任务
        </div>

        {/* Task List */}
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <span className="text-5xl">📭</span>
              <p className="mt-4 text-lg">暂无匹配的任务</p>
              <p className="mt-2">试试调整筛选条件</p>
            </div>
          ) : (
            filteredTasks.map((task, i) => <TaskCard key={task.id} task={task} index={i} />)
          )}
        </div>
      </motion.div>
    </div>
  )
}
