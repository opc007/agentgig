import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import useStore from '../store/useStore'

const TX_TYPE_LABELS = {
  escrow: { text: '托管', color: 'text-orange-600', bg: 'bg-orange-50' },
  release: { text: '结算', color: 'text-green-600', bg: 'bg-green-50' },
  refund: { text: '退款', color: 'text-blue-600', bg: 'bg-blue-50' },
  commission: { text: '佣金', color: 'text-purple-600', bg: 'bg-purple-50' },
  deposit: { text: '充值', color: 'text-green-600', bg: 'bg-green-50' },
  withdraw: { text: '提现', color: 'text-gray-600', bg: 'bg-gray-50' },
}

const CATEGORY_COLORS = [
  '#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#3B82F6',
  '#8B5CF6', '#EF4444', '#10B981', '#F97316', '#06B6D4',
  '#84CC16', '#E11D48', '#6B7280',
]

function StatCard({ label, value, sub, color, icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5 relative overflow-hidden"
    >
      <div className={`absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 -mr-6 -mt-6 ${color}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </motion.div>
  )
}

function CSSBarChart({ data, maxVal }) {
  const max = maxVal || Math.max(...data.map(d => Math.max(d.tasks_created, d.tasks_completed)), 1)

  return (
    <div className="space-y-3">
      <div className="flex items-end space-x-2" style={{ height: 200 }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center space-y-1">
            <div className="w-full flex space-x-0.5 items-end" style={{ height: 180 }}>
              <div
                className="flex-1 bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-sm transition-all duration-500"
                style={{ height: `${(d.tasks_created / max) * 100}%`, minHeight: d.tasks_created > 0 ? 4 : 0 }}
                title={`新建: ${d.tasks_created}`}
              />
              <div
                className="flex-1 bg-gradient-to-t from-green-500 to-green-400 rounded-t-sm transition-all duration-500"
                style={{ height: `${(d.tasks_completed / max) * 100}%`, minHeight: d.tasks_completed > 0 ? 4 : 0 }}
                title={`完成: ${d.tasks_completed}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex space-x-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-xs text-gray-500">{d.label}</div>
        ))}
      </div>
      <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
        <span className="flex items-center"><span className="w-3 h-3 bg-primary-500 rounded-sm mr-1.5" />新建任务</span>
        <span className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded-sm mr-1.5" />完成任务</span>
      </div>
    </div>
  )
}

function CSSLineChart({ data }) {
  const max = Math.max(...data.map(d => d.revenue), 1)
  const width = 100
  const height = 160
  const padding = 20

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - (d.revenue / max) * (height - padding * 2)
    return { x, y, ...d }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = pathD + ` L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 200 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(ratio => (
          <line
            key={ratio}
            x1={padding}
            y1={height - padding - ratio * (height - padding * 2)}
            x2={width - padding}
            y2={height - padding - ratio * (height - padding * 2)}
            stroke="#E5E7EB"
            strokeWidth="0.3"
          />
        ))}
        <path d={areaD} fill="url(#areaGrad)" />
        <path d={pathD} fill="none" stroke="#6366F1" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill="#6366F1" />
        ))}
      </svg>
      <div className="flex space-x-2 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-xs text-gray-500">{d.label}</div>
        ))}
      </div>
      <p className="text-center text-xs text-gray-400 mt-2">交易额趋势 (¥)</p>
    </div>
  )
}

function CategoryBar({ label, count, percentage, color, budget }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700 font-medium">{label}</span>
        <span className="text-gray-500">{count} 个任务 · ¥{budget.toLocaleString()}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  )
}

const SORT_OPTIONS = [
  { value: 'completed_tasks', label: '完成任务数' },
  { value: 'rating', label: '评分' },
  { value: 'total_earnings', label: '总收入' },
]

export default function AdminDashboard() {
  const { user } = useStore()
  const {
    adminDashboard, adminTrends, adminTopAgents, adminCategoryStats, adminRecentTransactions,
    fetchAdminDashboard, fetchAdminTrends, fetchAdminTopAgents, fetchAdminCategoryStats, fetchAdminRecentTransactions,
  } = useStore()

  const [trendPeriod, setTrendPeriod] = useState('daily')
  const [agentSort, setAgentSort] = useState('completed_tasks')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([
        fetchAdminDashboard(),
        fetchAdminTrends(trendPeriod),
        fetchAdminTopAgents(agentSort),
        fetchAdminCategoryStats(),
        fetchAdminRecentTransactions(),
      ])
      setLoading(false)
    }
    load()
  }, [])

  const handleTrendChange = async (period) => {
    setTrendPeriod(period)
    await fetchAdminTrends(period)
  }

  const handleAgentSortChange = async (sortBy) => {
    setAgentSort(sortBy)
    await fetchAdminTopAgents(sortBy)
  }

  if (loading && !adminDashboard) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-gray-500 mt-4">加载管理面板...</p>
      </div>
    )
  }

  const d = adminDashboard || {}

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-2">
              <span className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">A</span>
              </span>
              <span>管理后台</span>
            </h1>
            <p className="text-gray-500 mt-1">平台运营数据分析 · 管理员: {user?.username}</p>
          </div>
          <Link to="/dashboard" className="btn-secondary text-sm">
            返回工作台
          </Link>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="总用户数"
            value={d.total_users || 0}
            sub={`今日新增 +${d.new_users_today || 0}`}
            color="bg-blue-500"
            icon="👥"
          />
          <StatCard
            label="总任务数"
            value={d.total_tasks || 0}
            sub={`今日新增 +${d.new_tasks_today || 0}`}
            color="bg-purple-500"
            icon="📋"
          />
          <StatCard
            label="交易总额"
            value={`¥${(d.total_revenue || 0).toLocaleString()}`}
            sub={`平台佣金 ¥${(d.platform_commission || 0).toLocaleString()}`}
            color="bg-green-500"
            icon="💰"
          />
          <StatCard
            label="完成率"
            value={`${d.completion_rate || 0}%`}
            sub={`${d.completed_tasks || 0}/${d.total_tasks || 0} 已完成`}
            color="bg-orange-500"
            icon="📊"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{d.online_agents || 0}</p>
            <p className="text-xs text-gray-500 mt-1">在线智能体</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{d.total_agents || 0}</p>
            <p className="text-xs text-gray-500 mt-1">总智能体数</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{d.pending_tasks || 0}</p>
            <p className="text-xs text-gray-500 mt-1">待接单任务</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{d.disputed_tasks || 0}</p>
            <p className="text-xs text-gray-500 mt-1">争议任务</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Trend Chart */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">任务趋势</h2>
              <div className="flex space-x-1 bg-gray-100 p-0.5 rounded-lg">
                {['daily', 'weekly', 'monthly'].map(p => (
                  <button
                    key={p}
                    onClick={() => handleTrendChange(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      trendPeriod === p
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {{ daily: '按日', weekly: '按周', monthly: '按月' }[p]}
                  </button>
                ))}
              </div>
            </div>
            <CSSBarChart data={adminTrends} />
          </div>

          {/* Revenue Trend */}
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">交易额趋势</h2>
            <CSSLineChart data={adminTrends} />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Top Agents */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">智能体排行榜</h2>
              <select
                value={agentSort}
                onChange={(e) => handleAgentSortChange(e.target.value)}
                className="text-xs bg-gray-100 border-0 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              {adminTopAgents.length === 0 ? (
                <p className="text-center text-gray-400 py-8">暂无数据</p>
              ) : (
                adminTopAgents.map((agent, i) => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0 ? 'bg-yellow-100 text-yellow-700' :
                      i === 1 ? 'bg-gray-200 text-gray-600' :
                      i === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {i + 1}
                    </span>
                    <Link to={`/agents/${agent.id}`} className="flex items-center space-x-3 flex-1 min-w-0">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0"
                        style={{ backgroundColor: agent.avatar_color }}
                      >
                        {agent.name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{agent.name}</div>
                        <div className="text-xs text-gray-400 flex items-center space-x-2">
                          <span className="flex items-center">
                            <span className="text-yellow-500 mr-0.5">★</span>
                            {agent.rating.toFixed(1)}
                          </span>
                          <span>{agent.completed_tasks} 单</span>
                        </div>
                      </div>
                    </Link>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">¥{agent.total_earnings.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">总收入</div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Category Distribution */}
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">分类分布</h2>
            {adminCategoryStats.length === 0 ? (
              <p className="text-center text-gray-400 py-8">暂无数据</p>
            ) : (
              <div className="space-y-4">
                {adminCategoryStats.map((cat, i) => (
                  <CategoryBar
                    key={cat.category}
                    label={cat.label}
                    count={cat.count}
                    percentage={cat.percentage}
                    color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                    budget={cat.total_budget}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-4">最近交易</h2>
          {adminRecentTransactions.length === 0 ? (
            <p className="text-center text-gray-400 py-8">暂无交易记录</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-3 font-medium">ID</th>
                    <th className="pb-3 font-medium">类型</th>
                    <th className="pb-3 font-medium">金额</th>
                    <th className="pb-3 font-medium">发起方</th>
                    <th className="pb-3 font-medium">接收方</th>
                    <th className="pb-3 font-medium">关联任务</th>
                    <th className="pb-3 font-medium">说明</th>
                    <th className="pb-3 font-medium text-right">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {adminRecentTransactions.map(tx => {
                    const txType = TX_TYPE_LABELS[tx.tx_type] || { text: tx.tx_type, color: 'text-gray-600', bg: 'bg-gray-50' }
                    return (
                      <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 text-gray-400 font-mono">#{tx.id}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${txType.bg} ${txType.color}`}>
                            {txType.text}
                          </span>
                        </td>
                        <td className="py-3 font-bold">¥{tx.amount.toFixed(2)}</td>
                        <td className="py-3 text-gray-600">{tx.from_username || '-'}</td>
                        <td className="py-3 text-gray-600">{tx.to_username || '-'}</td>
                        <td className="py-3 text-gray-500 max-w-[120px] truncate">{tx.task_title || '-'}</td>
                        <td className="py-3 text-gray-400 max-w-[100px] truncate">{tx.description || '-'}</td>
                        <td className="py-3 text-right text-gray-400 text-xs">
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
