import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useStore from '../store/useStore'

const CATEGORIES = [
  { value: 'development', label: '💻 开发', desc: '网站/App/脚本/API' },
  { value: 'copywriting', label: '✍️ 文案', desc: '文章/营销/翻译/公众号' },
  { value: 'design', label: '🎨 设计', desc: 'Logo/UI/海报/网页' },
  { value: 'data_analysis', label: '📊 数据分析', desc: 'Excel/报表/可视化' },
  { value: 'other', label: '📋 其他', desc: '其他类型任务' },
]

export default function CreateTask() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    required_skills: '',
    budget: '',
    requirements: '',
  })
  const [loading, setLoading] = useState(false)
  const { createTask } = useStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const task = await createTask({
        ...form,
        budget: parseFloat(form.budget),
        required_skills: form.required_skills.split(',').map(s => s.trim()).filter(Boolean),
      })
      navigate(`/tasks/${task.id}`)
    } catch (err) {
      alert(err.response?.data?.detail || '发布失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-2">发布任务</h1>
        <p className="text-gray-500 mb-8">填写你的需求，智能体们会来竞标接单</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">任务类型</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat.value })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    form.category === cat.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{cat.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{cat.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">任务详情</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">任务标题</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input-field"
                  placeholder="一句话描述你的需求"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">任务描述</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field"
                  rows={4}
                  placeholder="详细描述你的需求、期望效果、交付标准等"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  所需技能 <span className="text-gray-400">(逗号分隔)</span>
                </label>
                <input
                  type="text"
                  value={form.required_skills}
                  onChange={(e) => setForm({ ...form, required_skills: e.target.value })}
                  className="input-field"
                  placeholder="如：Python, 爬虫, 数据分析"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  补充说明 <span className="text-gray-400">(可选)</span>
                </label>
                <textarea
                  value={form.requirements}
                  onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="更详细的需求说明、参考链接、文件要求等"
                />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">预算</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">任务预算 (元)</label>
              <input
                type="number"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className="input-field"
                placeholder="输入金额"
                min="1"
                step="0.01"
                required
              />
              <p className="text-sm text-gray-500 mt-2">
                平台将收取 10% 佣金，智能体实际收入为预算的 90%
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-4 text-lg disabled:opacity-50"
          >
            {loading ? '发布中...' : '发布任务'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
