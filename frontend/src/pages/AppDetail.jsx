import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../services/api'
import useStore from '../store/useStore'

function StarDisplay({ score, size = 'md' }) {
  const sizeClass = size === 'lg' ? 'text-2xl' : 'text-lg'
  return (
    <span className={`${sizeClass} text-yellow-400`}>
      {'★'.repeat(Math.round(score))}
      {'☆'.repeat(5 - Math.round(score))}
    </span>
  )
}

export default function AppDetail() {
  const { id } = useParams()
  const { user } = useStore()
  const navigate = useNavigate()
  const [app, setApp] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewData, setReviewData] = useState({ rating: 5, title: '', comment: '' })

  useEffect(() => {
    loadApp()
    loadReviews()
  }, [id])

  const loadApp = async () => {
    try {
      const res = await api.get(`/api/apps/${id}`)
      setApp(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadReviews = async () => {
    try {
      const res = await api.get(`/api/apps/${id}/reviews`)
      setReviews(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleInstall = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setInstalling(true)
    try {
      await api.post(`/api/apps/${id}/install`)
      alert('安装成功！')
      loadApp()
    } catch (e) {
      alert(e.response?.data?.detail || '安装失败')
    } finally {
      setInstalling(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    try {
      await api.post(`/api/apps/${id}/reviews`, reviewData)
      setShowReviewForm(false)
      setReviewData({ rating: 5, title: '', comment: '' })
      loadReviews()
      loadApp()
    } catch (e) {
      alert(e.response?.data?.detail || '评价失败')
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>
  if (!app) return <div className="text-center py-20 text-gray-400">应用不存在</div>

  const getPricingText = () => {
    if (app.pricing_type === 'free') return '免费安装'
    if (app.pricing_type === 'one_time') return `购买 - ¥${app.price}`
    return `订阅 - ¥${app.subscription_price}/月`
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* App Header */}
        <div className="card p-8 mb-6">
          <div className="flex items-start space-x-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center text-white text-3xl shrink-0">
              {app.icon_url ? (
                <img src={app.icon_url} alt={app.name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                app.name[0]
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{app.name}</h1>
              <p className="text-gray-500 mt-1">by {app.agent_name}</p>
              {app.tagline && <p className="text-gray-600 mt-2">{app.tagline}</p>}
              <div className="flex items-center space-x-4 mt-3">
                <StarDisplay score={app.rating} />
                <span className="text-sm text-gray-500">{app.total_ratings} 条评价</span>
                <span className="text-sm text-gray-500">📥 {app.total_installs} 次安装</span>
              </div>
            </div>
            <button
              onClick={handleInstall}
              disabled={installing}
              className="px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl font-medium hover:shadow-lg transition-shadow disabled:opacity-50"
            >
              {installing ? '安装中...' : getPricingText()}
            </button>
          </div>
        </div>

        {/* Description */}
        {app.description && (
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-bold mb-3">应用介绍</h2>
            <p className="text-gray-600 whitespace-pre-wrap">{app.description}</p>
          </div>
        )}

        {/* Tags */}
        {app.tags?.length > 0 && (
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-bold mb-3">标签</h2>
            <div className="flex flex-wrap gap-2">
              {app.tags.map(tag => (
                <span key={tag} className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-full text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-violet-600">{app.total_installs}</div>
            <div className="text-sm text-gray-500">安装量</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">{app.rating.toFixed(1)}</div>
            <div className="text-sm text-gray-500">评分</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-green-600">¥{app.total_revenue.toFixed(0)}</div>
            <div className="text-sm text-gray-500">收入</div>
          </div>
        </div>

        {/* Reviews */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">用户评价 ({reviews.length})</h2>
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="px-4 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100"
            >
              写评价
            </button>
          </div>

          {showReviewForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">评分</label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      onClick={() => setReviewData({ ...reviewData, rating: s })}
                      className={`text-2xl ${s <= reviewData.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                placeholder="标题（可选）"
                value={reviewData.title}
                onChange={e => setReviewData({ ...reviewData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg mb-3"
              />
              <textarea
                placeholder="分享你的使用体验..."
                value={reviewData.comment}
                onChange={e => setReviewData({ ...reviewData, comment: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg mb-3 h-24 resize-none"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowReviewForm(false)}
                  className="px-4 py-2 text-gray-500 text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmitReview}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium"
                >
                  提交评价
                </button>
              </div>
            </div>
          )}

          {reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-400">暂无评价</div>
          ) : (
            <div className="space-y-4">
              {reviews.map(review => (
                <div key={review.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{review.user_name || '匿名用户'}</span>
                      <StarDisplay score={review.rating} />
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(review.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  {review.title && <p className="font-medium text-sm mb-1">{review.title}</p>}
                  {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
