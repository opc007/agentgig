import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'

const CATEGORIES = [
  { value: '', label: '全部' },
  { value: 'text_generation', label: '文本生成' },
  { value: 'image_generation', label: '图像生成' },
  { value: 'data_analysis', label: '数据分析' },
  { value: 'translation', label: '翻译' },
  { value: 'code', label: '代码' },
  { value: 'voice', label: '语音' },
  { value: 'video', label: '视频' },
  { value: 'other', label: '其他' },
]

const PRICING_LABELS = {
  free: '免费',
  per_call: '按次',
  per_token: '按Token',
  monthly: '月费',
}

export default function Capabilities() {
  const { capabilities, fetchCapabilities, subscribeCapability, user } = useStore()
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCap, setSelectedCap] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchCapabilities({ category: category || undefined, search: search || undefined })
  }, [category, search])

  const handleSubscribe = async (capId) => {
    if (!user) {
      navigate('/login')
      return
    }
    try {
      await subscribeCapability(capId)
      alert('订阅成功！')
      fetchCapabilities({ category: category || undefined, search: search || undefined })
    } catch (e) {
      alert(e.response?.data?.detail || '订阅失败')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
              能力市场
            </span>
          </h1>
          <p className="text-gray-500 text-lg">发现智能体的强大能力，一键订阅即用</p>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="搜索能力..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    category === cat.value
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Capability List */}
        {capabilities.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <span className="text-5xl block mb-4">🔌</span>
            <p className="text-lg">暂无能力</p>
            <p className="text-sm mt-1">智能体们还在准备中...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap, i) => (
              <motion.div
                key={cap.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedCap(cap)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{cap.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{cap.agent_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    cap.pricing_model === 'free'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {cap.pricing_model === 'free' ? '免费' : `¥${cap.price}/${PRICING_LABELS[cap.pricing_model]}`}
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {cap.description || '暂无描述'}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(cap.tags || []).slice(0, 4).map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                  {cap.category && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs">
                      {cap.category}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-3">
                    <span>⭐ {cap.rating.toFixed(1)}</span>
                    <span>👥 {cap.total_subscribers}</span>
                  </div>
                  <span>📞 {cap.total_calls.toLocaleString()} 次调用</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedCap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedCap(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedCap.name}</h2>
                  <p className="text-gray-500 mt-1">by {selectedCap.agent_name}</p>
                </div>
                <button
                  onClick={() => setSelectedCap(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <p className="text-gray-600 mb-6">{selectedCap.description || '暂无描述'}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">定价模式</div>
                  <div className="font-medium">{PRICING_LABELS[selectedCap.pricing_model]}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">价格</div>
                  <div className="font-medium">
                    {selectedCap.pricing_model === 'free' ? '免费' : `¥${selectedCap.price}`}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">订阅数</div>
                  <div className="font-medium">{selectedCap.total_subscribers}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">成功率</div>
                  <div className="font-medium">{selectedCap.success_rate.toFixed(1)}%</div>
                </div>
              </div>

              {selectedCap.example_input && (
                <div className="mb-4">
                  <h3 className="font-medium mb-2">示例输入</h3>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                    {selectedCap.example_input}
                  </pre>
                </div>
              )}

              {selectedCap.example_output && (
                <div className="mb-6">
                  <h3 className="font-medium mb-2">示例输出</h3>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                    {selectedCap.example_output}
                  </pre>
                </div>
              )}

              <button
                onClick={() => handleSubscribe(selectedCap.id)}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:shadow-lg transition-shadow"
              >
                {selectedCap.pricing_model === 'free' ? '免费订阅' : `订阅 - ¥${selectedCap.price}/${PRICING_LABELS[selectedCap.pricing_model]}`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
