import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import useStore from '../store/useStore'

const METHOD_LABELS = {
  alipay: '支付宝',
  wechat: '微信',
  bank: '银行卡',
}

export default function AdminWithdraw() {
  const { pendingWithdrawals, fetchPendingWithdrawals, reviewWithdrawal } = useStore()
  const [loading, setLoading] = useState({})
  const [rejectReason, setRejectReason] = useState({})

  useEffect(() => {
    fetchPendingWithdrawals()
  }, [])

  const handleApprove = async (id) => {
    if (!confirm('确定批准此提现申请？')) return
    setLoading(prev => ({ ...prev, [id]: true }))
    try {
      const res = await reviewWithdrawal(id, 'approve')
      alert(res.message)
    } catch (err) {
      alert(err.response?.data?.detail || '操作失败')
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const handleReject = async (id) => {
    const reason = rejectReason[id] || ''
    if (!reason.trim()) return alert('请输入拒绝原因')
    setLoading(prev => ({ ...prev, [id]: true }))
    try {
      const res = await reviewWithdrawal(id, 'reject', reason)
      alert(res.message)
      setRejectReason(prev => ({ ...prev, [id]: '' }))
    } catch (err) {
      alert(err.response?.data?.detail || '操作失败')
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">提现审批</h1>
            <p className="text-gray-500">审批用户的提现申请</p>
          </div>
          <button
            onClick={() => fetchPendingWithdrawals()}
            className="btn-secondary text-sm"
          >
            刷新
          </button>
        </div>

        {pendingWithdrawals.length === 0 ? (
          <div className="card p-12 text-center">
            <span className="text-5xl">✅</span>
            <h2 className="text-xl font-bold mt-4">暂无待审批提现</h2>
            <p className="text-gray-500 mt-2">所有提现申请已处理完毕</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingWithdrawals.map(w => (
              <div key={w.id} className="card p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-medium">
                          {w.username?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{w.username}</div>
                        <div className="text-sm text-gray-500">{w.email}</div>
                      </div>
                    </div>

                    <div className="mt-4 grid md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-xs text-gray-500">提现金额</span>
                        <div className="text-lg font-bold">¥{w.amount?.toFixed(2)}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">手续费 (1%)</span>
                        <div className="text-lg text-red-500">¥{w.fee?.toFixed(2)}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">实际到账</span>
                        <div className="text-lg font-bold text-green-600">¥{w.actual_amount?.toFixed(2)}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">收款方式</span>
                        <div className="font-medium">{METHOD_LABELS[w.method] || w.method}</div>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-gray-500">
                      收款账号: {w.account}
                      {w.account_name && ` (${w.account_name})`}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      申请时间: {new Date(w.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* 操作区域 */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleApprove(w.id)}
                      disabled={loading[w.id]}
                      className="btn-primary text-sm px-6"
                    >
                      {loading[w.id] ? '处理中...' : '批准'}
                    </button>
                    <div className="flex-1 flex items-center space-x-2">
                      <input
                        type="text"
                        value={rejectReason[w.id] || ''}
                        onChange={(e) => setRejectReason(prev => ({ ...prev, [w.id]: e.target.value }))}
                        className="input-field flex-1"
                        placeholder="输入拒绝原因..."
                      />
                      <button
                        onClick={() => handleReject(w.id)}
                        disabled={loading[w.id]}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        拒绝
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
