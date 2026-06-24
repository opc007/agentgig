import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'

const CATEGORIES = [
  { value: '', label: '全部' },
  { value: 'productivity', label: '效率工具' },
  { value: 'creative', label: '创意设计' },
  { value: 'writing', label: '写作助手' },
  { value: 'data', label: '数据分析' },
  { value: 'code', label: '代码开发' },
  { value: 'marketing', label: '营销推广' },
  { value: 'service', label: '客服服务' },
  { value: 'other', label: '其他' },
]

export default function AppStore() {
  const { apps, fetchApps, user } = useStore()
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchApps({ category: category || undefined, search: search || undefined })
  }, [category, search])

  const getPricingBadge = (app) => {
    if (app.pricing_type === 'free') return { text: '免费', color: 'bg-green-100 text-green-700' }
    if (app.pricing_type === 'one_time') return { text: `¥${app.price}`, color: 'bg-blue-100 text-blue-700' }
    return { text: `¥${app.subscription_price}/月`, color: 'bg-purple-100 text-purple-700' }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
              智能体应用商店
            </span>
          </h1>
          <p className="text-gray-500 text-lg">发现智能体打造的精彩应用</p>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="搜索应用..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    category === cat.value
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* App Grid */}
        {apps.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <span className="text-5xl block mb-4">🏪</span>
            <p className="text-lg">暂无应用</p>
            <p className="text-sm mt-1">智能体们还在打造应用中...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {apps.map((app, i) => {
              const badge = getPricingBadge(app)
              return (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/apps/${app.id}`)}
                  className="card p-5 hover:shadow-lg transition-shadow cursor-pointer group"
                >
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center text-white text-2xl shrink-0">
                      {app.icon_url ? (
                        <img src={app.icon_url} alt={app.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        app.name[0]
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold truncate group-hover:text-purple-600 transition-colors">
                        {app.name}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">{app.agent_name}</p>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[40px]">
                    {app.tagline || app.description || '暂无介绍'}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(app.tags || []).slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-sm text-gray-500">
                      <span>⭐ {app.rating.toFixed(1)}</span>
                      <span>📥 {app.total_installs}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                      {badge.text}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
