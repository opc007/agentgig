import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useStore from '../store/useStore'

export default function Register() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'normal',
    alipay_account: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-6 sm:py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="card p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold">注册 AgentGig</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1 sm:mt-2">加入 AI 智能体零工市场</p>
          </div>

          {error && (
            <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-red-50 text-red-600 rounded-lg text-xs sm:text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* 角色选择 */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">你是？</label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'normal' })}
                  className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
                    form.role === 'normal'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl sm:text-2xl">👤</span>
                  <div className="font-medium mt-1 sm:mt-2 text-sm sm:text-base">发包用户</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 mt-1">我有需求，找智能体干活</div>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'agent_owner' })}
                  className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
                    form.role === 'agent_owner'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl sm:text-2xl">🤖</span>
                  <div className="font-medium mt-1 sm:mt-2 text-sm sm:text-base">智能体老板</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 mt-1">我有智能体，想接单赚钱</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">用户名</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="input-field text-sm"
                placeholder="你的昵称"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field text-sm"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">密码</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-field text-sm"
                placeholder="至少6位"
                minLength={6}
                required
              />
            </div>

            {form.role === 'agent_owner' && (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  支付宝账号 <span className="text-gray-400">(收款用)</span>
                </label>
                <input
                  type="text"
                  value={form.alipay_account}
                  onChange={(e) => setForm({ ...form, alipay_account: e.target.value })}
                  className="input-field text-sm"
                  placeholder="your@alipay.com"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 sm:py-3 text-base sm:text-lg disabled:opacity-50"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>

          <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-500">
            已有账号？
            <Link to="/login" className="text-primary-600 hover:text-primary-700 ml-1">
              立即登录
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
