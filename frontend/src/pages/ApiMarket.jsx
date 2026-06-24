import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'
import api from '../services/api'

const CATEGORIES = [
  { value: '', label: '全部' },
  { value: 'copywriting', label: '✍️ 文案' },
  { value: 'translation', label: '🗣️ 翻译' },
  { value: 'development', label: '💻 开发' },
  { value: 'data_analysis', label: '📊 数据分析' },
  { value: 'design', label: '🎨 设计' },
  { value: 'other', label: '📋 其他' },
]

const PRICING_LABELS = {
  free: '免费',
  per_call: '按次计费',
  per_token: '按量计费',
  monthly: '包月',
}

export default function ApiMarket() {
  const { user } = useStore()
  const [apis, setApis] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [pricingModel, setPricingModel] = useState('')
  const [selectedApi, setSelectedApi] = useState(null)
  const [showCallModal, setShowCallModal] = useState(false)
  const [callParams, setCallParams] = useState('{}')
  const [callResult, setCallResult] = useState(null)
  const [calling, setCalling] = useState(false)
  const [activeTab, setActiveTab] = useState('browse') // browse | subscriptions | history
  const [subscriptions, setSubscriptions] = useState([])
  const [callHistory, setCallHistory] = useState([])

  useEffect(() => {
    fetchApis()
  }, [category, pricingModel])

  const fetchApis = async () => {
    setLoading(true)
    try {
      const params = { skip: 0, limit: 50 }
      if (category) params.category = category
      if (search) params.search = search
      if (pricingModel) params.pricing_model = pricingModel
      const res = await api.get('/api/market/apis', { params })
      setApis(res.data.apis)
      setTotal(res.data.total)
    } catch (e) {
      console.error('获取 API 列表失败', e)
    }
    setLoading(false)
  }

  const fetchSubscriptions = async () => {
    try {
      const res = await api.get('/api/market/my/subscriptions')
      setSubscriptions(res.data)
    } catch (e) {
      console.error('获取订阅列表失败', e)
    }
  }

  const fetchCallHistory = async () => {
    try {
      const res = await api.get('/api/market/my/call-history')
      setCallHistory(res.data)
    } catch (e) {
      console.error('获取调用历史失败', e)
    }
  }

  useEffect(() => {
    if (activeTab === 'subscriptions') fetchSubscriptions()
    if (activeTab === 'history') fetchCallHistory()
  }, [activeTab])

  const handleSubscribe = async (apiId) => {
    try {
      const res = await api.post(`/api/market/apis/${apiId}/subscribe`)
      alert(`订阅成功！API Key: ${res.data.api_key}`)
      fetchApis()
    } catch (e) {
      alert(e.response?.data?.detail || '订阅失败')
    }
  }

  const handleCallApi = async () => {
    if (!selectedApi) return
    setCalling(true)
    setCallResult(null)
    try {
      let params = {}
      try {
        params = JSON.parse(callParams)
      } catch {
        alert('参数格式错误，请输入有效的 JSON')
        setCalling(false)
        return
      }
      const res = await api.post(`/api/market/apis/${selectedApi.id}/call`, { params })
      setCallResult(res.data)
    } catch (e) {
      setCallResult({
        success: false,
        error: e.response?.data?.detail || '调用失败',
      })
    }
    setCalling(false)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchApis()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              API 市场
            </span>
          </h1>
          <p className="text-gray-500">发现和调用智能体提供的 API 服务，让 AI 能力为你所用</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { key: 'browse', label: '浏览 API' },
            { key: 'subscriptions', label: '我的订阅' },
            { key: 'history', label: '调用记录' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Browse Tab */}
        {activeTab === 'browse' && (
          <>
            {/* Filters */}
            <div className="card p-4 mb-6">
              <form onSubmit={handleSearch} className="flex gap-3 items-end">
                <div className="flex-1">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜索 API 名称、描述..."
                    className="input-field"
                  />
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-field w-40"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                <select
                  value={pricingModel}
                  onChange={(e) => setPricingModel(e.target.value)}
                  className="input-field w-36"
                >
                  <option value="">全部定价</option>
                  <option value="free">免费</option>
                  <option value="per_call">按次计费</option>
                  <option value="monthly">包月</option>
                </select>
                <button type="submit" className="btn-primary px-6">
                  搜索
                </button>
              </form>
            </div>

            {/* API Grid */}
            <div className="text-sm text-gray-500 mb-4">共 {total} 个 API 服务</div>
            {loading ? (
              <div className="text-center py-12 text-gray-400">加载中...</div>
            ) : apis.length === 0 ? (
              <div className="card p-12 text-center text-gray-400">
                <span className="text-5xl">🔌</span>
                <p className="mt-4 text-lg">暂无 API 服务</p>
                <p className="mt-2 text-sm">智能体们还没有发布 API</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {apis.map(apiItem => (
                  <ApiCard
                    key={apiItem.id}
                    api={apiItem}
                    onSubscribe={handleSubscribe}
                    onCall={() => {
                      setSelectedApi(apiItem)
                      setCallParams(apiItem.input_schema ? JSON.stringify(apiItem.input_schema, null, 2) : '{}')
                      setCallResult(null)
                      setShowCallModal(true)
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-4">
            {subscriptions.length === 0 ? (
              <div className="card p-12 text-center text-gray-400">
                <span className="text-5xl">📭</span>
                <p className="mt-4 text-lg">暂无订阅</p>
                <p className="mt-2 text-sm">去浏览 API 市场订阅你需要的服务</p>
              </div>
            ) : (
              subscriptions.map(sub => (
                <div key={sub.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{sub.api_name}</h3>
                    <p className="text-sm text-gray-500">智能体: {sub.agent_name || '-'}</p>
                    <p className="text-xs text-gray-400 mt-1">API Key: {sub.api_key}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      调用次数: <span className="font-bold">{sub.calls_used}</span> / {sub.calls_limit}
                    </div>
                    <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-primary-500 h-2 rounded-full"
                        style={{ width: `${Math.min((sub.calls_used / sub.calls_limit) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {callHistory.length === 0 ? (
              <div className="card p-12 text-center text-gray-400">
                <span className="text-5xl">📊</span>
                <p className="mt-4 text-lg">暂无调用记录</p>
                <p className="mt-2 text-sm">调用 API 后记录会显示在这里</p>
              </div>
            ) : (
              callHistory.map(log => (
                <div key={log.id} className="card p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`w-3 h-3 rounded-full ${log.is_success ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <h3 className="font-medium">{log.api_name}</h3>
                      <p className="text-xs text-gray-400">
                        {new Date(log.created_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      {log.is_success ? (
                        <span className="text-green-600">成功</span>
                      ) : (
                        <span className="text-red-600">{log.error_message || '失败'}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {log.response_time_ms}ms · ¥{log.amount_charged?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </motion.div>

      {/* Call Modal */}
      <AnimatePresence>
        {showCallModal && selectedApi && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCallModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{selectedApi.name}</h2>
                    <p className="text-sm text-gray-500">调用 API</p>
                  </div>
                  <button
                    onClick={() => setShowCallModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-xl"
                  >
                    ×
                  </button>
                </div>

                {/* API Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">定价:</span>
                      <span className="ml-2 font-medium">
                        {PRICING_LABELS[selectedApi.pricing_model]}
                        {selectedApi.price > 0 && ` · ¥${selectedApi.price.toFixed(2)}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">成功率:</span>
                      <span className="ml-2 font-medium">{selectedApi.success_rate}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">平均响应:</span>
                      <span className="ml-2 font-medium">{selectedApi.avg_response_time_ms}ms</span>
                    </div>
                    <div>
                      <span className="text-gray-500">总调用:</span>
                      <span className="ml-2 font-medium">{selectedApi.total_calls}</span>
                    </div>
                  </div>
                </div>

                {/* Params Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    请求参数 (JSON)
                  </label>
                  <textarea
                    value={callParams}
                    onChange={(e) => setCallParams(e.target.value)}
                    className="input-field font-mono text-sm h-32"
                    placeholder='{"key": "value"}'
                  />
                </div>

                {/* Call Button */}
                <button
                  onClick={handleCallApi}
                  disabled={calling}
                  className="btn-primary w-full mb-4"
                >
                  {calling ? '调用中...' : '调用 API'}
                </button>

                {/* Result */}
                {callResult && (
                  <div className={`rounded-lg p-4 ${callResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium ${callResult.success ? 'text-green-700' : 'text-red-700'}`}>
                        {callResult.success ? '✅ 调用成功' : '❌ 调用失败'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {callResult.response_time_ms}ms · ¥{callResult.amount_charged?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    {callResult.success && callResult.data && (
                      <pre className="bg-white rounded p-3 text-sm overflow-auto max-h-48">
                        {JSON.stringify(callResult.data, null, 2)}
                      </pre>
                    )}
                    {callResult.error && (
                      <p className="text-red-600 text-sm">{callResult.error}</p>
                    )}
                    {callResult.remaining_calls !== undefined && (
                      <p className="text-xs text-gray-500 mt-2">
                        剩余调用次数: {callResult.remaining_calls}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


function ApiCard({ api, onSubscribe, onCall }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="card p-5 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg">{api.name}</h3>
          <p className="text-xs text-gray-400">by {api.agent_name || '未知智能体'}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          api.pricing_model === 'free'
            ? 'bg-green-100 text-green-700'
            : 'bg-blue-100 text-blue-700'
        }`}>
          {api.pricing_model === 'free' ? '免费' : `¥${api.price?.toFixed(2)}`}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
        {api.description || '暂无描述'}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
          {api.category}
        </span>
        {(api.tags || []).slice(0, 3).map((tag, i) => (
          <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs">
            {tag}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-500 mb-4">
        <div>
          <div className="font-semibold text-gray-700">{api.total_calls}</div>
          <div>调用次数</div>
        </div>
        <div>
          <div className="font-semibold text-gray-700">{api.success_rate}%</div>
          <div>成功率</div>
        </div>
        <div>
          <div className="font-semibold text-gray-700">{api.avg_response_time_ms}ms</div>
          <div>响应时间</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {api.is_subscribed ? (
          <button onClick={onCall} className="btn-primary flex-1 text-sm">
            调用
          </button>
        ) : (
          <button onClick={() => onSubscribe(api.id)} className="btn-secondary flex-1 text-sm">
            订阅
          </button>
        )}
        <button
          onClick={onCall}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          详情
        </button>
      </div>
    </motion.div>
  )
}
