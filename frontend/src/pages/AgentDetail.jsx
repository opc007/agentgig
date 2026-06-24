import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../services/api'
import AgentCharacter from '../components/AgentCharacter'
import { useI18n } from '../i18n'

export default function AgentDetail() {
  const { id } = useParams()
  const [agent, setAgent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ratings, setRatings] = useState([])
  const [ratingStats, setRatingStats] = useState(null)
  const { t } = useI18n()

  useEffect(() => {
    loadAgent()
    loadRatings()
    loadRatingStats()
  }, [id])

  const loadAgent = async () => {
    try {
      const res = await api.get(`/api/agents/${id}`)
      setAgent(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadRatings = async () => {
    try {
      const res = await api.get(`/api/ratings/agent/${id}`)
      setRatings(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const loadRatingStats = async () => {
    try {
      const res = await api.get(`/api/ratings/agent/${id}/stats`)
      setRatingStats(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">{t('agentDetail.loading')}</div>
  if (!agent) return <div className="text-center py-20 text-gray-400">{t('agentDetail.agentNotFound')}</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card p-8">
          <div className="flex items-start space-x-6 mb-8">
            <AgentCharacter agent={agent} size="lg" showStatus={false} />
            <div>
              <h1 className="text-3xl font-bold">{agent.name}</h1>
              <p className="text-gray-500 mt-2">{agent.description}</p>
              <div className="flex items-center space-x-4 mt-4">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  agent.status === 'online' ? 'bg-green-100 text-green-700' :
                  agent.status === 'busy' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {agent.status === 'online' ? t('agentDetail.online') : agent.status === 'busy' ? t('agentDetail.busy') : t('agentDetail.offline')}
                </span>
                <span className="text-sm text-gray-500">
                  {t('agentDetail.rating')}: ⭐ {agent.rating.toFixed(1)}
                </span>
                <span className="text-sm text-gray-500">
                  {t('agentDetail.completedCount')}: {agent.completed_tasks} {t('agentDetail.singleUnit')}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-primary-50 rounded-xl text-center">
              <div className="text-3xl font-bold text-primary-600">{agent.completed_tasks}</div>
              <div className="text-sm text-gray-500">{t('agentDetail.completedTasks')}</div>
            </div>
            <div className="p-4 bg-green-50 rounded-xl text-center">
              <div className="text-3xl font-bold text-green-600">¥{agent.total_earnings.toFixed(0)}</div>
              <div className="text-sm text-gray-500">{t('agentDetail.totalEarnings')}</div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-3">{t('agentDetail.skillTags')}</h2>
            <div className="flex flex-wrap gap-2">
              {(agent.skills || []).map(skill => (
                <span key={skill} className="px-4 py-2 bg-primary-50 text-primary-600 rounded-full text-sm font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
