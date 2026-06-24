import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import useStore from '../store/useStore'

export default function OpenApiDashboard() {
  const { user } = useStore()
  const navigate = useNavigate()
  const [developer, setDeveloper] = useState(null)
  const [apiKeys, setApiKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRegister, setShowRegister] = useState(false)
  const [showNewKey, setShowNewKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [registerData, setRegisterData] = useState({ company_name: '', website: '', description: '' })
  const [selectedKeyStats, setSelectedKeyStats] = useState(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadData()
  }, [user])

  const loadData = async () => {
    setLoading(true)
    try {
      const devRes = await api.get('/api/open/developer')
      setDeveloper(devRes.data)
      const keysRes = await api.get('/api/open/keys')
      setApiKeys(keysRes.data.keys)
    } catch (e) {
      if (e.response?.status === 404) {
        setShowRegister(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    try {
      const res = await api.post('/api/open/register', registerData)
      setDeveloper(res.data)
      setShowRegister(false)
    } catch (e) {
      alert(e.response?.data?.detail || '注册失败')
    }
  }

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return alert('请输入 Key 名称')
    try {
      const res = await api.post('/api/open/keys', { name: newKeyName })
      setApiKeys([res.data, ...apiKeys])
      setNewKeyName('')
      setShowNewKey(false)
    } catch (e) {
      alert(e.response?.data?.detail || '创建失败')
    }
  }

  const handleDeleteKey = async (keyId) => {
    if (!confirm('确定删除该 API Key？')) return
    try {
      await api.delete(`/api/open/keys/${keyId}`)
      setApiKeys(apiKeys.filter(k => k.id !== keyId))
    } catch (e) {
      alert(e.response?.data?.detail || '删除失败')
    }
  }

  const handleToggleKey = async (keyId) => {
    try {
      const res = await api.put(`/api/open/keys/${keyId}/toggle`)
      setApiKeys(apiKeys.map(k => k.id === keyId ? { ...k, is_active: res.data.is_active } : k))
    } catch (e) {
      alert(e.response?.data?.detail || '操作失败')
    }
  }

  const loadKeyStats = async (keyId) => {
    try {
      const res = await api.get(`/api/open/keys/${keyId}/usage`)
      setSelectedKeyStats({ keyId, ...res.data })
    } catch (e) {
      console.error(e)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => alert('已复制'))
  }

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              开放 API 平台
            </span>
          </h1>
          <p className="text-gray-500 text-lg">管理你的开发者账号和 API Keys</p>
        </div>

        {/* Register Form */}
        {showRegister && (
          <div className="card p-8 mb-6">
            <h2 className="text-xl font-bold mb-4">注册开发者</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="公司名称（可选）"
                value={registerData.company_name}
                onChange={e => setRegisterData({ ...registerData, company_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg"
              />
              <input
                type="text"
                placeholder="网站（可选）"
                value={registerData.website}
                onChange={e => setRegisterData({ ...registerData, website: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg"
              />
              <textarea
                placeholder="简介（可选）"
                value={registerData.description}
                onChange={e => setRegisterData({ ...registerData, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg h-24 resize-none"
              />
              <button onClick={handleRegister} className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium">
                注册开发者
              </button>
            </div>
          </div>
        )}

        {/* Developer Info */}
        {developer && (
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  {developer.company_name || '个人开发者'}
                  {developer.is_verified && <span className="ml-2 text-blue-500">✓ 已认证</span>}
                </h2>
                {developer.website && (
                  <a href={developer.website} target="_blank" rel="noopener noreferrer"
                     className="text-sm text-blue-500 hover:underline">
                    {developer.website}
                  </a>
                )}
                {developer.description && (
                  <p className="text-sm text-gray-500 mt-1">{developer.description}</p>
                )}
              </div>
              <button
                onClick={() => setShowNewKey(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-medium"
              >
                + 创建 API Key
              </button>
            </div>
          </div>
        )}

        {/* New Key Form */}
        {showNewKey && (
          <div className="card p-6 mb-6 border-2 border-blue-200">
            <h3 className="font-bold mb-3">创建新 API Key</h3>
            <div className="flex space-x-3">
              <input
                type="text"
                placeholder="Key 名称，如：生产环境"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg"
              />
              <button onClick={handleCreateKey} className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium">
                创建
              </button>
              <button onClick={() => setShowNewKey(false)} className="px-4 py-2 text-gray-500">
                取消
              </button>
            </div>
          </div>
        )}

        {/* API Keys List */}
        {developer && (
          <div className="space-y-4">
            {apiKeys.length === 0 ? (
              <div className="card p-12 text-center text-gray-400">
                <span className="text-4xl block mb-3">🔑</span>
                <p>暂无 API Key</p>
                <p className="text-sm mt-1">创建一个 Key 开始使用开放 API</p>
              </div>
            ) : (
              apiKeys.map(key => (
                <div key={key.id} className="card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-bold">{key.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        key.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {key.is_active ? '活跃' : '已禁用'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => loadKeyStats(key.id)}
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                      >
                        统计
                      </button>
                      <button
                        onClick={() => handleToggleKey(key.id)}
                        className="px-3 py-1 text-sm text-yellow-600 hover:bg-yellow-50 rounded"
                      >
                        {key.is_active ? '禁用' : '启用'}
                      </button>
                      <button
                        onClick={() => handleDeleteKey(key.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                      >
                        删除
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mb-3">
                    <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono text-gray-600 truncate">
                      {key.key}
                    </code>
                    <button
                      onClick={() => copyToClipboard(key.key)}
                      className="px-3 py-2 bg-gray-200 rounded text-sm hover:bg-gray-300"
                    >
                      复制
                    </button>
                  </div>

                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <span>限额: {key.rate_limit} 次/小时</span>
                    <span>总调用: {key.total_calls}</span>
                    {key.last_used_at && (
                      <span>最后使用: {new Date(key.last_used_at).toLocaleString('zh-CN')}</span>
                    )}
                  </div>

                  {/* Usage Stats */}
                  {selectedKeyStats?.keyId === key.id && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-blue-50 rounded-lg text-center">
                        <div className="text-xl font-bold text-blue-600">{selectedKeyStats.total_calls}</div>
                        <div className="text-xs text-gray-500">总调用</div>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg text-center">
                        <div className="text-xl font-bold text-green-600">{selectedKeyStats.calls_today}</div>
                        <div className="text-xs text-gray-500">今日调用</div>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg text-center">
                        <div className="text-xl font-bold text-yellow-600">{selectedKeyStats.avg_response_time_ms}ms</div>
                        <div className="text-xs text-gray-500">平均响应</div>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg text-center">
                        <div className="text-xl font-bold text-purple-600">{selectedKeyStats.success_rate}%</div>
                        <div className="text-xs text-gray-500">成功率</div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* API Docs Section */}
        {developer && (
          <div className="card p-6 mt-6">
            <h2 className="text-lg font-bold mb-4">API 文档</h2>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                使用 <code className="bg-gray-100 px-1 rounded">X-API-Key</code> 请求头进行认证。
              </p>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono">
                <div className="text-gray-500"># 示例请求</div>
                <div>curl -H "X-API-Key: YOUR_API_KEY" \</div>
                <div className="ml-4">https://api.agentgig.com/v1/capabilities</div>
              </div>
              <div className="text-sm text-gray-500">
                <p>- 每小时请求上限取决于你的 API Key 配置</p>
                <p>- 超出限制将返回 429 状态码</p>
                <p>- 详细文档请访问 <span className="text-blue-500">/docs</span></p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
