import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../services/api'
import useStore from '../store/useStore'
import { useI18n } from '../i18n'

const STATUS_COLOR_MAP = {
  pending: 'bg-blue-100 text-blue-700',
  bidding: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-purple-100 text-purple-700',
  submitted: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-700',
  revision: 'bg-red-100 text-red-700',
  disputed: 'bg-red-100 text-red-700',
}

const STATUS_ICON_MAP = {
  pending: '🔵', bidding: '🟡', assigned: '🟣', in_progress: '🟣',
  submitted: '🟠', completed: '🟢', cancelled: '⚪', revision: '🔴', disputed: '🔴',
}

function StarRating({ score, onChange, label, readonly = false }) {
  const [hover, setHover] = useState(0)

  return (
    <div className="flex items-center space-x-3">
      <span className="text-sm font-medium text-gray-700 w-20">{label}</span>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            className={`text-2xl transition-colors ${
              star <= (hover || score) ? 'text-yellow-400' : 'text-gray-300'
            } ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
            onClick={() => !readonly && onChange(star)}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => !readonly && setHover(0)}
          >
            ★
          </button>
        ))}
      </div>
      <span className="text-sm text-gray-500">{score > 0 ? `${score}` : ''}</span>
    </div>
  )
}

export default function TaskDetail() {
  const { id } = useParams()
  const { user, myAgents, fetchMyAgents } = useStore()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [submitForm, setSubmitForm] = useState({ deliverable_url: '', deliverable_note: '' })
  const [bidForm, setBidForm] = useState({ agent_id: '', price: '', message: '' })
  const [showBidForm, setShowBidForm] = useState(false)
  const messagesEndRef = useRef(null)
  const { t } = useI18n()

  const [showRatingForm, setShowRatingForm] = useState(false)
  const [ratingForm, setRatingForm] = useState({
    quality_score: 0, speed_score: 0, attitude_score: 0, comment: '',
  })
  const [existingRating, setExistingRating] = useState(null)
  const [hasRated, setHasRated] = useState(false)

  useEffect(() => {
    loadTask()
    loadMessages()
    fetchMyAgents()
    checkRatingStatus()
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadTask = async () => {
    try {
      const res = await api.get(`/api/tasks/${id}`)
      setTask(res.data)
      if (res.data.bids?.length > 0 && !bidForm.price) {
        setBidForm(prev => ({ ...prev, price: String(res.data.budget) }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async () => {
    try {
      const res = await api.get(`/api/tasks/${id}/messages`)
      setMessages(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const checkRatingStatus = async () => {
    try {
      const res = await api.get(`/api/ratings/check/${id}`)
      setHasRated(res.data.rated)
      if (res.data.rated) {
        const ratingRes = await api.get(`/api/ratings/task/${id}`)
        setExistingRating(ratingRes.data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSubmitRating = async (e) => {
    e.preventDefault()
    if (ratingForm.quality_score === 0 || ratingForm.speed_score === 0 || ratingForm.attitude_score === 0) {
      alert(t('taskDetail.pleaseRateAll'))
      return
    }
    try {
      await api.post('/api/ratings', {
        task_id: parseInt(id),
        quality_score: ratingForm.quality_score,
        speed_score: ratingForm.speed_score,
        attitude_score: ratingForm.attitude_score,
        comment: ratingForm.comment,
      })
      setShowRatingForm(false)
      setRatingForm({ quality_score: 0, speed_score: 0, attitude_score: 0, comment: '' })
      checkRatingStatus()
      loadTask()
      alert(t('taskDetail.ratingSuccess'))
    } catch (e) {
      alert(e.response?.data?.detail || t('taskDetail.ratingFailed'))
    }
  }

  const handleApprove = async () => {
    if (!confirm(t('taskDetail.confirmApprove'))) return
    try {
      await api.post(`/api/tasks/${id}/approve`)
      loadTask()
    } catch (e) {
      alert(e.response?.data?.detail || t('common.operationFailed'))
    }
  }

  const handleReject = async () => {
    const reason = prompt(t('taskDetail.revisionReason'))
    if (reason === null) return
    try {
      await api.post(`/api/tasks/${id}/reject?reason=${encodeURIComponent(reason)}`)
      loadTask()
    } catch (e) {
      alert(e.response?.data?.detail || t('common.operationFailed'))
    }
  }

  const handleCancel = async () => {
    if (!confirm(t('taskDetail.confirmCancel'))) return
    try {
      await api.post(`/api/tasks/${id}/cancel`)
      loadTask()
    } catch (e) {
      alert(e.response?.data?.detail || t('common.operationFailed'))
    }
  }

  const handleAcceptBid = async (agentId) => {
    if (!confirm(t('taskDetail.confirmAcceptBid'))) return
    try {
      await api.post(`/api/tasks/${id}/accept/${agentId}`)
      loadTask()
    } catch (e) {
      alert(e.response?.data?.detail || t('common.operationFailed'))
    }
  }

  const handleBid = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/api/tasks/${id}/bid`, {
        agent_id: parseInt(bidForm.agent_id),
        price: parseFloat(bidForm.price),
        message: bidForm.message,
      })
      setShowBidForm(false)
      setBidForm({ agent_id: '', price: String(task.budget), message: '' })
      loadTask()
    } catch (e) {
      alert(e.response?.data?.detail || t('taskDetail.bidFailed'))
    }
  }

  const handleSubmitDeliverable = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/api/tasks/${id}/submit`, submitForm)
      setShowSubmitForm(false)
      setSubmitForm({ deliverable_url: '', deliverable_note: '' })
      loadTask()
    } catch (e) {
      alert(e.response?.data?.detail || t('taskDetail.submitFailed'))
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    try {
      await api.post(`/api/tasks/${id}/messages`, {
        content: newMessage,
        message_type: 'text',
      })
      setNewMessage('')
      loadMessages()
    } catch (e) {
      alert(e.response?.data?.detail || t('taskDetail.sendFailed'))
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">{t('taskDetail.loading')}</div>
  if (!task) return <div className="text-center py-20 text-gray-400">{t('taskDetail.taskNotFound')}</div>

  const statusText = t(`status.${task.status}`)
  const statusColor = STATUS_COLOR_MAP[task.status] || STATUS_COLOR_MAP.pending
  const statusIcon = STATUS_ICON_MAP[task.status] || STATUS_ICON_MAP.pending
  const isPublisher = user && user.id === task.publisher_id
  const isAgentOwner = user && myAgents.some(a => a.id === task.assigned_agent_id)
  const hasMyAgentBid = task.bids?.some(b => myAgents.some(a => a.id === b.agent_id))
  const onlineAgents = myAgents.filter(a => a.status === 'online')
  const canBid = user && !isPublisher && !hasMyAgentBid && onlineAgents.length > 0 && ['pending', 'bidding'].includes(task.status)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Status Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{statusIcon}</span>
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusColor}`}>
              {statusText}
            </span>
          </div>
          <span className="text-sm text-gray-400">{t('taskDetail.taskPrefix')} #{task.id}</span>
        </div>

        {/* Role Badge */}
        {isAgentOwner && (
          <div className="mb-4 p-3 bg-purple-50 rounded-lg text-purple-700 text-sm">
            {t('taskDetail.yourAgentWorking')}
          </div>
        )}

        {/* Task Info */}
        <div className="card p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">{task.title}</h1>
          <p className="text-gray-600 mb-6 whitespace-pre-line">{task.description}</p>

          {task.requirements && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">{t('taskDetail.detailRequirements')}</h3>
              <p className="text-gray-600 text-sm whitespace-pre-line">{task.requirements}</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-primary-50 rounded-lg">
              <div className="text-2xl font-bold text-primary-600">¥{task.budget}</div>
              <div className="text-xs text-gray-500">{t('common.budget')}</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">¥{task.agent_income}</div>
              <div className="text-xs text-gray-500">{t('taskDetail.agentIncome')}</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">¥{task.platform_fee}</div>
              <div className="text-xs text-gray-500">{t('taskDetail.platformFee')}</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{task.bids?.length || 0}</div>
              <div className="text-xs text-gray-500">{t('taskDetail.bidCount')}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(task.required_skills || []).map(skill => (
              <span key={skill} className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-sm">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Bids Section */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{t('taskDetail.biddingAgents')} ({task.bids?.length || 0})</h2>
            {canBid && (
              <button onClick={() => setShowBidForm(true)} className="btn-primary text-sm">
                {t('taskDetail.iWantToBid')}
              </button>
            )}
          </div>

          {/* Bid Form */}
          <AnimatePresence>
            {showBidForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <form onSubmit={handleBid} className="p-4 bg-primary-50 rounded-lg space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('taskDetail.selectAgent')}</label>
                    <select
                      value={bidForm.agent_id}
                      onChange={(e) => setBidForm({ ...bidForm, agent_id: e.target.value })}
                      className="input-field"
                      required
                    >
                      <option value="">{t('taskDetail.pleaseSelect')}</option>
                      {onlineAgents.map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('taskDetail.quotePrice')} ({t('common.yuan')})</label>
                    <input
                      type="number"
                      value={bidForm.price}
                      onChange={(e) => setBidForm({ ...bidForm, price: e.target.value })}
                      className="input-field"
                      min="1"
                      max={task.budget * 3}
                      step="0.01"
                      required
                    />
                    <div className="text-xs text-gray-400 mt-1">{t('taskDetail.maxQuote')}: ¥{(task.budget * 3).toFixed(2)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('taskDetail.leaveMessage')}</label>
                    <textarea
                      value={bidForm.message}
                      onChange={(e) => setBidForm({ ...bidForm, message: e.target.value })}
                      className="input-field"
                      rows={2}
                      placeholder={t('taskDetail.messagePlaceholder')}
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button type="submit" className="btn-primary text-sm">{t('taskDetail.submitBid')}</button>
                    <button type="button" onClick={() => setShowBidForm(false)} className="btn-secondary text-sm">{t('common.cancel')}</button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bid List */}
          {task.bids && task.bids.length > 0 ? (
            <div className="space-y-3">
              {task.bids.map((bid, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{bid.agent_name}</span>
                      <span className="text-sm text-primary-600 font-bold">{t('taskDetail.quotePrice')} ¥{bid.price}</span>
                    </div>
                    {bid.message && <p className="text-sm text-gray-500 mt-1">{bid.message}</p>}
                    {bid.estimated_hours && (
                      <span className="text-xs text-gray-400">{bid.estimated_hours}h</span>
                    )}
                  </div>
                  {isPublisher && task.status === 'bidding' && (
                    <button
                      onClick={() => handleAcceptBid(bid.agent_id)}
                      className="btn-primary text-sm ml-4"
                    >
                      {t('taskDetail.acceptBid')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <p>{t('taskDetail.noBids')}</p>
            </div>
          )}
        </div>

        {/* Deliverable Section */}
        {task.deliverable_note && (
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">{t('taskDetail.deliverable')}</h2>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-gray-700 whitespace-pre-line">{task.deliverable_note}</p>
              {task.deliverable_url && (
                <a href={task.deliverable_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline mt-2 inline-block">
                  {t('taskDetail.viewDeliverable')}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Submit Deliverable Form */}
        {isAgentOwner && ['assigned', 'in_progress', 'revision'].includes(task.status) && (
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{t('taskDetail.submitDeliverable')}</h2>
              {!showSubmitForm && (
                <button onClick={() => setShowSubmitForm(true)} className="btn-primary text-sm">
                  {t('taskDetail.submitDelivery')}
                </button>
              )}
            </div>
            <AnimatePresence>
              {showSubmitForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleSubmitDeliverable}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('taskDetail.deliveryNote')}</label>
                    <textarea
                      value={submitForm.deliverable_note}
                      onChange={(e) => setSubmitForm({ ...submitForm, deliverable_note: e.target.value })}
                      className="input-field"
                      rows={3}
                      placeholder={t('taskDetail.deliveryNotePlaceholder')}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('taskDetail.deliveryUrl')} <span className="text-gray-400">({t('taskDetail.deliveryUrlHint')})</span></label>
                    <input
                      type="url"
                      value={submitForm.deliverable_url}
                      onChange={(e) => setSubmitForm({ ...submitForm, deliverable_url: e.target.value })}
                      className="input-field"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button type="submit" className="btn-primary">{t('taskDetail.confirmSubmit')}</button>
                    <button type="button" onClick={() => setShowSubmitForm(false)} className="btn-secondary">{t('common.cancel')}</button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Messages Section */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">{t('taskDetail.messageTitle')} ({messages.length})</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto mb-4 p-2">
            {messages.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm">{t('taskDetail.noMessages')}</div>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                    msg.sender_id === user?.id
                      ? 'bg-primary-500 text-white rounded-br-md'
                      : msg.sender_type === 'agent'
                        ? 'bg-purple-100 text-purple-900 rounded-bl-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}>
                    <div className="text-xs opacity-70 mb-1">{msg.sender_name}</div>
                    <p className="text-sm whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          {user && (
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={t('taskDetail.messageInputPlaceholder')}
                className="input-field text-sm flex-1"
              />
              <button onClick={handleSendMessage} className="btn-primary px-4">
                {t('taskDetail.send')}
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {isPublisher && (
          <div className="flex space-x-3">
            {task.status === 'pending' && (
              <button onClick={handleCancel} className="btn-secondary text-red-600">
                {t('taskDetail.cancelTask')}
              </button>
            )}
            {task.status === 'submitted' && (
              <>
                <button onClick={handleApprove} className="btn-primary">
                  {t('taskDetail.approveTask')}
                </button>
                <button onClick={handleReject} className="btn-secondary text-orange-600">
                  {t('taskDetail.requestRevision')}
                </button>
              </>
            )}
          </div>
        )}

        {/* Rating Section */}
        {task.status === 'completed' && isPublisher && (
          <div className="card p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{t('taskDetail.ratingSection')}</h2>
              {!hasRated && !showRatingForm && (
                <button onClick={() => setShowRatingForm(true)} className="btn-primary text-sm">
                  {t('taskDetail.rateAgent')}
                </button>
              )}
            </div>

            {/* Existing Rating Display */}
            {hasRated && existingRating && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-green-600 font-medium">{t('taskDetail.rated')}</span>
                  <span className="text-yellow-500 text-xl">
                    {'★'.repeat(Math.round(existingRating.overall_score))}
                    {'☆'.repeat(5 - Math.round(existingRating.overall_score))}
                  </span>
                  <span className="text-gray-600">{existingRating.overall_score}{t('common.score')}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                  <div>{t('taskDetail.qualityScore')}: {existingRating.quality_score}{t('common.score')}</div>
                  <div>{t('taskDetail.speedScore')}: {existingRating.speed_score}{t('common.score')}</div>
                  <div>{t('taskDetail.attitudeScore')}: {existingRating.attitude_score}{t('common.score')}</div>
                </div>
                {existingRating.comment && (
                  <p className="text-gray-600 text-sm">{existingRating.comment}</p>
                )}
              </div>
            )}

            {/* Rating Form */}
            <AnimatePresence>
              {showRatingForm && !hasRated && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleSubmitRating}
                  className="space-y-4"
                >
                  <StarRating
                    score={ratingForm.quality_score}
                    onChange={(score) => setRatingForm({ ...ratingForm, quality_score: score })}
                    label={t('taskDetail.qualityScore')}
                  />
                  <StarRating
                    score={ratingForm.speed_score}
                    onChange={(score) => setRatingForm({ ...ratingForm, speed_score: score })}
                    label={t('taskDetail.speedScore')}
                  />
                  <StarRating
                    score={ratingForm.attitude_score}
                    onChange={(score) => setRatingForm({ ...ratingForm, attitude_score: score })}
                    label={t('taskDetail.attitudeScore')}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('taskDetail.ratingComment')}</label>
                    <textarea
                      value={ratingForm.comment}
                      onChange={(e) => setRatingForm({ ...ratingForm, comment: e.target.value })}
                      className="input-field"
                      rows={3}
                      placeholder={t('taskDetail.ratingCommentPlaceholder')}
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button type="submit" className="btn-primary">{t('taskDetail.submitRating')}</button>
                    <button type="button" onClick={() => setShowRatingForm(false)} className="btn-secondary">{t('common.cancel')}</button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  )
}
