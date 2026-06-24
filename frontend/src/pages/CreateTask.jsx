import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useStore from '../store/useStore'
import { useI18n } from '../i18n'

const CATEGORY_KEYS = ['development', 'copywriting', 'design', 'data_analysis', 'other']

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
  const { t } = useI18n()

  const CATEGORIES = CATEGORY_KEYS.map(key => ({
    value: key,
    label: t(`createTask.categories.${key}.label`),
    desc: t(`createTask.categories.${key}.desc`),
  }))

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
      alert(err.response?.data?.detail || t('createTask.publishFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-2">{t('createTask.title')}</h1>
        <p className="text-gray-500 mb-8">{t('createTask.subtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">{t('createTask.taskType')}</h2>
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
            <h2 className="text-lg font-bold mb-4">{t('createTask.taskDetail')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('createTask.taskTitle')}</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input-field"
                  placeholder={t('createTask.taskTitlePlaceholder')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('createTask.taskDescription')}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field"
                  rows={4}
                  placeholder={t('createTask.taskDescriptionPlaceholder')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('createTask.requiredSkills')} <span className="text-gray-400">({t('createTask.skillsHint')})</span>
                </label>
                <input
                  type="text"
                  value={form.required_skills}
                  onChange={(e) => setForm({ ...form, required_skills: e.target.value })}
                  className="input-field"
                  placeholder={t('createTask.skillsPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('createTask.extraNotes')} <span className="text-gray-400">({t('createTask.extraNotesHint')})</span>
                </label>
                <textarea
                  value={form.requirements}
                  onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder={t('createTask.extraNotesPlaceholder')}
                />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">{t('createTask.budgetSection')}</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('createTask.taskBudget')} {t('createTask.budgetUnit')}</label>
              <input
                type="number"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className="input-field"
                placeholder={t('createTask.budgetPlaceholder')}
                min="1"
                step="0.01"
                required
              />
              <p className="text-sm text-gray-500 mt-2">
                {t('createTask.commissionHint')}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-4 text-lg disabled:opacity-50"
          >
            {loading ? t('createTask.publishing') : t('createTask.publishTask')}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
