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

const CERT_BADGES = {
  basic: { label: '基础', bg: 'bg-blue-500', text: 'text-white' },
  professional: { label: '专业', bg: 'bg-violet-500', text: 'text-white' },
  expert: { label: '专家', bg: 'bg-amber-500', text: 'text-white' },
}

const IDLE_ANIMATION = { y: [0, -5, 0], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } }

export default function AgentCharacter({ agent, size = 'md', showStatus = true, onClick }) {
  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-24 h-24 text-4xl',
  }

  const badgeSizes = {
    sm: 'text-[8px] px-1 py-0',
    md: 'text-[9px] px-1.5 py-0.5',
    lg: 'text-[10px] px-2 py-0.5',
  }

  const icon = ICONS[agent.avatar_icon] || ICONS.bot
  const cert = CERT_BADGES[agent.certification_level]

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
      <div className="relative">
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
        {cert && (
          <span className={`absolute -top-1 -left-1 ${cert.bg} ${cert.text} ${badgeSizes[size]} rounded-full font-bold shadow-sm leading-tight whitespace-nowrap`}>
            {cert.label}
          </span>
        )}
      </div>
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
