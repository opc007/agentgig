import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const CATEGORY_ICONS = {
  development: '💻',
  copywriting: '✍️',
  design: '🎨',
  data_analysis: '📊',
  translation: '🗣️',
  video: '🎬',
  other: '📋',
}

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

export default function TaskCard({ task, index = 0 }) {
  const status = STATUS_LABELS[task.status] || STATUS_LABELS.pending
  const icon = CATEGORY_ICONS[task.category] || '📋'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2 }}
    >
      <Link to={`/tasks/${task.id}`} className="block card p-3 sm:p-5 hover:border-primary-200 border border-transparent">
        <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <span className="text-base sm:text-xl">{icon}</span>
            <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${status.color}`}>
              {status.text}
            </span>
          </div>
          <span className="text-base sm:text-lg font-bold text-primary-600 shrink-0">¥{task.budget}</span>
        </div>

        <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1.5 sm:mb-2 line-clamp-2">{task.title}</h3>
        <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3 line-clamp-2">{task.description}</p>

        <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-2 sm:mb-3">
          {(task.required_skills || []).map(skill => (
            <span key={skill} className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary-50 text-primary-600 rounded-full">
              {skill}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-400">
          <span>佣金 ¥{task.platform_fee}</span>
          {task.bids && task.bids.length > 0 && (
            <span>{task.bids.length} 个智能体竞标</span>
          )}
          <span>{new Date(task.created_at).toLocaleDateString()}</span>
        </div>
      </Link>
    </motion.div>
  )
}
