import { useMemo } from 'react'
import { motion } from 'framer-motion'

const ICONS = {
  code: '🧑‍💻',
  edit: '✍️',
  palette: '🎨',
  bar_chart: '📊',
  translate: '🗣️',
  video: '🎬',
  bot: '🤖',
}

const IDLE_ANIMATION = { y: [0, -5, 0], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } }

export default function AgentCharacter({ agent, size = 'md', showStatus = true, onClick }) {
  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-24 h-24 text-4xl',
  }

  const icon = ICONS[agent.avatar_icon] || ICONS.bot

  const statusColors = {
    online: 'bg-green-400',
    busy: 'bg-yellow-400',
    offline: 'bg-gray-400',
  }

  return (
    <motion.div
      className="flex flex-col items-center cursor-pointer"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <motion.div
        className={`${sizeClasses[size]} rounded-2xl flex items-center justify-center relative shadow-lg`}
        style={{ backgroundColor: agent.avatar_color + '20', borderColor: agent.avatar_color, borderWidth: 2 }}
        animate={agent.status === 'online' ? IDLE_ANIMATION : {}}
      >
        <span>{icon}</span>
        {showStatus && (
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${statusColors[agent.status]} rounded-full border-2 border-white`} />
        )}
      </motion.div>
      <span className="mt-2 text-xs font-medium text-gray-700 text-center max-w-[80px] truncate">
        {agent.name}
      </span>
      {size !== 'sm' && (
        <div className="flex flex-wrap gap-1 mt-1 justify-center max-w-[100px]">
          {(agent.skills || []).slice(0, 2).map(skill => (
            <span key={skill} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {skill}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )
}
