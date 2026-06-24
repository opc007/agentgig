import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'

const DEPOSIT_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000]

const PAYMENT_METHODS = [
  { value: 'alipay', label: '支付宝', icon: '💳', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'wechat', label: '微信支付', icon: '💬', color: 'bg-green-50 border-green-200 text-green-700' },
  { value: 'bank', label: '银行卡', icon: '🏦', color: 'bg-purple-50 border-purple-200 text-purple-700' },
]

const WITHDRAW_METHODS = [
  { value: 'alipay', label: '支付宝', placeholder: '支付宝账号' },
  { value: 'wechat', label: '微信', placeholder: '微信账号或手机号' },
  { value: 'bank', label: '银行卡', placeholder: '银行卡号' },
]

const STATUS_LABELS = {
  pending: { text: '待审批', color: 'bg-yellow-100 text-yellow-700' },
  approved: { text: '已通过', color: 'bg-green-100 text-green-700' },
  rejected: { text: '已拒绝', color: 'bg-red-100 text-red-700' },
}

export default function Wallet() {
  const {
    user, deposits, withdrawals,
    fetchUser, deposit, fetchDeposits, withdraw, fetchWithdrawals,
  } = useStore()

  const [activeTab, setActiveTab] = useState('deposit')
  const [depositAmount, setDepositAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('alipay')
  const [depositLoading, setDepositLoading] = useState(false)

  // 提现表单
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState('alipay')
  const [withdrawAccount, setWithdrawAccount] = useState('')
  const [withdrawName, setWithdrawName] = useState('')
  const [withdrawLoading, setWithdrawLoading] = useState(false)

  useEffect(() => {
    fetchUser()
    fetchDeposits()
    fetchWithdrawals()
  }, [])

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount)
    if (!amount || amount <= 0) return alert('请输入有效金额')
    setDepositLoading(true)
    try {
      const res = await deposit(amount, paymentMethod)
      alert(res.message)
      setDepositAmount('')
    } catch (err) {
      alert(err.response?.data?.detail || '充值失败')
    } finally {
      setDepositLoading(false)
    }
  }

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount < 100) return alert('最低提现金额为 ¥100')
    if (!withdrawAccount.trim()) return alert('请输入收款账号')
    setWithdrawLoading(true)
    try {
      const res = await withdraw({
        amount,
        method: withdrawMethod,
        account: withdrawAccount,
        account_name: withdrawName || undefined,
      })
      alert(`提现申请已提交！实际到账 ¥${res.actual_amount}，手续费 ¥${res.fee}`)
      setWithdrawAmount('')
      setWithdrawAccount('')
      setWithdrawName('')
      fetchWithdrawals()
    } catch (err) {
      alert(err.response?.data?.detail || '提现失败')
    } finally {
      setWithdrawLoading(false)
    }
  }

  const fee = withdrawAmount ? (parseFloat(withdrawAmount) * 0.01).toFixed(2) : '0.00'
  const actualAmount = withdrawAmount ? (parseFloat(withdrawAmount) - parseFloat(fee)).toFixed(2) : '0.00'

  const tabs = [
    { key: 'deposit', label: '充值', icon: '💳' },
    { key: 'withdraw', label: '提现', icon: '💸' },
    { key: 'records', label: '交易记录', icon: '📋' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="card p-6 mb-6 bg-gradient-to-r from-primary-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">我的钱包</h1>
              <p className="text-white/80 mt-1">管理你的资金</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/70">可用余额</div>
              <div className="text-4xl font-bold">¥{(user?.balance || 0).toFixed(2)}</div>
              {user?.trial_balance > 0 && (
                <div className="text-sm text-white/70 mt-1">体验金: ¥{user.trial_balance.toFixed(2)}</div>
              )}
              {user?.frozen_balance > 0 && (
                <div className="text-sm text-yellow-200 mt-1">冻结: ¥{user.frozen_balance.toFixed(2)}</div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-xl">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* 充值 Tab */}
          {activeTab === 'deposit' && (
            <motion.div
              key="deposit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-4">模拟充值</h2>
                <p className="text-sm text-gray-500 mb-6">
                  开发阶段使用模拟充值，选择金额后直接到账真实余额（可提现）
                </p>

                {/* 快捷金额 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">选择充值金额</label>
                  <div className="grid grid-cols-3 gap-3">
                    {DEPOSIT_AMOUNTS.map(amt => (
                      <button
                        key={amt}
                        onClick={() => setDepositAmount(String(amt))}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          depositAmount === String(amt)
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        <div className="text-xl font-bold">¥{amt.toLocaleString()}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 自定义金额 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">或输入自定义金额</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="input-field text-lg"
                    placeholder="输入充值金额"
                    min="1"
                  />
                </div>

                {/* 支付方式 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">选择支付方式</label>
                  <div className="grid grid-cols-3 gap-3">
                    {PAYMENT_METHODS.map(method => (
                      <button
                        key={method.value}
                        onClick={() => setPaymentMethod(method.value)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          paymentMethod === method.value
                            ? method.color + ' border-current'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{method.icon}</div>
                        <div className="text-sm font-medium">{method.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 充值按钮 */}
                <button
                  onClick={handleDeposit}
                  disabled={!depositAmount || depositLoading}
                  className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {depositLoading ? '处理中...' : `确认充值 ¥${depositAmount || '0'}`}
                </button>
              </div>
            </motion.div>
          )}

          {/* 提现 Tab */}
          {activeTab === 'withdraw' && (
            <motion.div
              key="withdraw"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-4">申请提现</h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                  <div className="text-sm text-yellow-800">
                    <strong>提现规则：</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      <li>最低提现金额：¥100</li>
                      <li>手续费：1%（从提现金额中扣除）</li>
                      <li>提现申请需管理员审批</li>
                    </ul>
                  </div>
                </div>

                {/* 提现金额 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">提现金额</label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="input-field text-lg"
                    placeholder="最低 ¥100"
                    min="100"
                  />
                  <div className="flex justify-between mt-2 text-sm text-gray-500">
                    <span>可用余额: ¥{(user?.balance || 0).toFixed(2)}</span>
                    <button
                      onClick={() => setWithdrawAmount(String(Math.floor(user?.balance || 0)))}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      全部提现
                    </button>
                  </div>
                </div>

                {/* 费用预览 */}
                {withdrawAmount && parseFloat(withdrawAmount) >= 100 && (
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">提现金额</span>
                      <span>¥{parseFloat(withdrawAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">手续费 (1%)</span>
                      <span className="text-red-500">-¥{fee}</span>
                    </div>
                    <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold">
                      <span>实际到账</span>
                      <span className="text-green-600">¥{actualAmount}</span>
                    </div>
                  </div>
                )}

                {/* 收款方式 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">收款方式</label>
                  <div className="grid grid-cols-3 gap-3">
                    {WITHDRAW_METHODS.map(method => (
                      <button
                        key={method.value}
                        onClick={() => setWithdrawMethod(method.value)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          withdrawMethod === method.value
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-sm font-medium">{method.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 收款账号 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">收款账号</label>
                  <input
                    type="text"
                    value={withdrawAccount}
                    onChange={(e) => setWithdrawAccount(e.target.value)}
                    className="input-field"
                    placeholder={WITHDRAW_METHODS.find(m => m.value === withdrawMethod)?.placeholder}
                  />
                </div>

                {/* 收款人姓名 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    收款人姓名 <span className="text-gray-400">（选填）</span>
                  </label>
                  <input
                    type="text"
                    value={withdrawName}
                    onChange={(e) => setWithdrawName(e.target.value)}
                    className="input-field"
                    placeholder="真实姓名"
                  />
                </div>

                <button
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount || parseFloat(withdrawAmount) < 100 || !withdrawAccount || withdrawLoading}
                  className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {withdrawLoading ? '提交中...' : `申请提现 ¥${withdrawAmount || '0'}`}
                </button>
              </div>
            </motion.div>
          )}

          {/* 交易记录 Tab */}
          {activeTab === 'records' && (
            <motion.div
              key="records"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* 提现记录 */}
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-4">提现记录</h2>
                {withdrawals.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <span className="text-3xl">💸</span>
                    <p className="mt-2">暂无提现记录</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {withdrawals.map(w => {
                      const status = STATUS_LABELS[w.status] || STATUS_LABELS.pending
                      return (
                        <div key={w.id} className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">提现 ¥{w.amount.toFixed(2)}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                                  {status.text}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {w.method === 'alipay' ? '支付宝' : w.method === 'wechat' ? '微信' : '银行卡'}: {w.account}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                手续费 ¥{w.fee} | 实际到账 ¥{w.actual_amount}
                              </div>
                              {w.reject_reason && (
                                <div className="text-xs text-red-500 mt-1">拒绝原因: {w.reject_reason}</div>
                              )}
                            </div>
                            <div className="text-sm text-gray-400">
                              {new Date(w.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 充值记录 */}
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-4">充值记录</h2>
                {deposits.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <span className="text-3xl">💳</span>
                    <p className="mt-2">暂无充值记录</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {deposits.map(d => (
                      <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium">{d.description || '充值'}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(d.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-green-600 font-bold">+¥{d.amount.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
