import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import useStore from '../store/useStore'

const TREND_ICONS = { up: '📈', down: '📉', stable: '➡️' }
const TREND_COLORS = { up: 'text-green-500', down: 'text-red-500', stable: 'text-gray-400' }

function SkillBar({ skill }) {
  const pct = Math.round(skill.proficiency * 100)
  const barColor = pct >= 80 ? 'from-green-400 to-green-600' :
                   pct >= 60 ? 'from-blue-400 to-blue-600' :
                   pct >= 40 ? 'from-yellow-400 to-yellow-600' :
                   'from-red-400 to-red-600'

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{skill.skill_name}</span>
        <span className="text-xs text-gray-500">{pct}% ({skill.times_used}次使用)</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${barColor} rounded-full`}
        />
      </div>
    </div>
  )
}

function MiniChart({ data, label, color = '#4A90D9' }) {
  if (!data || data.length < 2) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="text-sm text-gray-500 mb-2">{label}</div>
        <div className="h-24 flex items-center justify-center text-gray-300">暂无数据</div>
      </div>
    )
  }

  const maxVal = Math.max(...data.map(d => d.value))
  const minVal = Math.min(...data.map(d => d.value))
  const range = maxVal - minVal || 1

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="text-sm font-medium text-gray-700 mb-3">{label}</div>
      <svg viewBox="0 0 200 60" className="w-full h-16">
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M ${data.map((d, i) => `${(i / (data.length - 1)) * 200},${55 - ((d.value - minVal) / range) * 50}`).join(' L ')} L 200,60 L 0,60 Z`}
          fill={`url(#grad-${label})`}
        />
        <polyline
          points={data.map((d, i) => `${(i / (data.length - 1)) * 200},${55 - ((d.value - minVal) / range) * 50}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{data[0]?.label || ''}</span>
        <span>{data[data.length - 1]?.label || ''}</span>
      </div>
    </div>
  )
}

function HistoryItem({ item }) {
  const avgScore = item.quality_score
    ? ((item.quality_score + item.speed_score + item.attitude_score) / 3).toFixed(1)
    : '-'

  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
        item.success ? 'bg-green-100' : 'bg-red-100'
      }`}>
        {item.success ? '✅' : '❌'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-800 truncate text-sm">
          {item.task_title || `任务 #${item.task_id}`}
        </div>
        <div className="text-xs text-gray-400">
          匹配度: {Math.round(item.skill_match_score * 100)}%
          {item.completion_time && ` · 耗时: ${(item.completion_time / 3600).toFixed(1)}h`}
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold text-primary-600">{avgScore}</div>
        <div className="text-xs text-gray-400">综合分</div>
      </div>
    </div>
  )
}

export default function AgentLearning() {
  const { id: agentId } = useParams()
  const { agents, fetchAgents } = useStore()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedAgent, setSelectedAgent] = useState(agentId || null)

  useEffect(() => {
    fetchAgents()
  }, [])

  useEffect(() => {
    if (selectedAgent) {
      loadDashboard(selectedAgent)
    } else {
      setLoading(false)
    }
  }, [selectedAgent])

  const loadDashboard = async (agentId) => {
    setLoading(true)
    try {
      const res = await api.get(`/api/learning/agent/${agentId}/dashboard`)
      setDashboard(res.data)
    } catch (err) {
      console.error('Failed to load learning dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSnapshot = async () => {
    if (!selectedAgent) return
    try {
      await api.post(`/api/learning/agent/${selectedAgent}/snapshot`)
      loadDashboard(selectedAgent)
      alert('快照已创建')
    } catch (err) {
      alert(err.response?.data?.detail || '创建快照失败')
    }
  }

  if (!selectedAgent) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">智能体学习进化</h1>
        <p className="text-gray-500 mb-8">查看智能体的学习曲线和技能进化</p>

        {agents.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-bold text-gray-600">暂无智能体</h3>
            <p className="text-gray-400">请先创建智能体</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map(agent => (
              <motion.div
                key={agent.id}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl border border-gray-100 p-6 cursor-pointer hover:shadow-lg transition-all"
                onClick={() => setSelectedAgent(agent.id)}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl"
                    style={{ backgroundColor: agent.avatar_color }}
                  >
                    🤖
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{agent.name}</h3>
                    <div className="text-sm text-gray-500">⭐ {agent.rating?.toFixed(1)} · {agent.completed_tasks} 任务</div>
                  </div>
                </div>
                <div className="text-sm text-gray-400">点击查看学习详情 →</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-2">📊</div>
        <div className="text-gray-500">暂无学习数据</div>
      </div>
    )
  }

  const curveData = dashboard.learning_curve || []
  const ratingData = curveData.map((c, i) => ({
    label: `#${i + 1}`,
    value: c.avg_rating,
  }))
  const proficiencyData = curveData.map((c, i) => ({
    label: `#${i + 1}`,
    value: c.overall_proficiency,
  }))

  const tabs = [
    { key: 'overview', label: '总览', icon: '📊' },
    { key: 'skills', label: '技能档案', icon: '🎯' },
    { key: 'history', label: '执行历史', icon: '📋' },
    { key: 'curve', label: '学习曲线', icon: '📈' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setSelectedAgent(null)} className="text-gray-400 hover:text-gray-600">
          ← 返回
        </button>
        <h1 className="text-3xl font-bold text-gray-800">{dashboard.agent_name} - 学习进化</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-3xl font-bold text-primary-600">{dashboard.total_tasks_completed}</div>
          <div className="text-sm text-gray-500">完成任务</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-3xl font-bold text-yellow-500">⭐ {dashboard.avg_rating?.toFixed(1)}</div>
          <div className="text-sm text-gray-500">平均评分</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-3xl font-bold text-green-500">{dashboard.skill_profiles?.length || 0}</div>
          <div className="text-sm text-gray-500">技能种类</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className={`text-3xl font-bold ${dashboard.improvement_rate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {dashboard.improvement_rate >= 0 ? '+' : ''}{dashboard.improvement_rate}%
          </div>
          <div className="text-sm text-gray-500">近期提升</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-100 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Skills */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-4">🎯 核心技能</h3>
            {(dashboard.top_skills || []).length === 0 ? (
              <div className="text-center text-gray-400 py-8">暂无技能数据</div>
            ) : (
              <div className="space-y-3">
                {dashboard.top_skills.map((skill, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">{skill.skill_name}</span>
                        <span className={`text-sm ${TREND_COLORS[skill.trend]}`}>
                          {TREND_ICONS[skill.trend]}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full mt-1">
                        <div
                          className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                          style={{ width: `${Math.round(skill.proficiency * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Charts */}
          <div className="space-y-4">
            <MiniChart data={ratingData} label="评分趋势" color="#F59E0B" />
            <MiniChart data={proficiencyData} label="综合熟练度" color="#10B981" />
          </div>

          {/* Recent History */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-4">📋 最近执行</h3>
            {(dashboard.recent_history || []).length === 0 ? (
              <div className="text-center text-gray-400 py-8">暂无执行记录</div>
            ) : (
              <div className="space-y-2">
                {dashboard.recent_history.slice(0, 5).map(item => (
                  <HistoryItem key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 text-lg">技能档案</h3>
            <button onClick={handleCreateSnapshot} className="px-4 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-sm hover:bg-primary-200">
              📸 创建快照
            </button>
          </div>
          {(dashboard.skill_profiles || []).length === 0 ? (
            <div className="text-center text-gray-400 py-12">暂无技能数据，完成任务后自动生成</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {dashboard.skill_profiles.map(sp => (
                <div key={sp.id} className="p-4 bg-gray-50 rounded-xl">
                  <SkillBar skill={sp} />
                  <div className="flex gap-4 text-xs text-gray-400 mt-2">
                    <span>使用: {sp.times_used}次</span>
                    <span>成功: {sp.success_count}次</span>
                    <span>近期均分: {sp.recent_avg_score?.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-4">执行历史</h3>
          {(dashboard.recent_history || []).length === 0 ? (
            <div className="text-center text-gray-400 py-12">暂无执行记录</div>
          ) : (
            <div className="space-y-2">
              {dashboard.recent_history.map(item => (
                <HistoryItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'curve' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-lg">学习曲线</h3>
            <button onClick={handleCreateSnapshot} className="px-4 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-sm hover:bg-primary-200">
              📸 创建快照
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MiniChart data={ratingData} label="评分趋势" color="#F59E0B" />
            <MiniChart data={proficiencyData} label="综合熟练度" color="#10B981" />
          </div>

          {curveData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h4 className="font-medium text-gray-700 mb-4">快照记录</h4>
              <div className="space-y-2">
                {curveData.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg text-sm">
                    <span className="text-gray-400 w-8">#{i + 1}</span>
                    <span className="text-gray-500">{new Date(c.snapshot_at).toLocaleDateString()}</span>
                    <span className="font-medium">任务: {c.total_tasks}</span>
                    <span>评分: {c.avg_rating?.toFixed(1)}</span>
                    <span>技能: {c.skill_diversity}种</span>
                    <span>熟练度: {Math.round(c.overall_proficiency * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
