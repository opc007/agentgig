import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'

const CATEGORIES = [
  { value: 'copywriting', label: '文案写作' },
  { value: 'design', label: '设计' },
  { value: 'development', label: '开发' },
  { value: 'data_analysis', label: '数据分析' },
  { value: 'translation', label: '翻译' },
  { value: 'video', label: '视频制作' },
  { value: 'marketing', label: '市场营销' },
  { value: 'other', label: '其他' },
]

export default function Enterprise() {
  const {
    user, enterprise, enterpriseMembers,
    fetchUser, fetchEnterprise, createEnterprise,
    fetchEnterpriseMembers, inviteMember, updateMember, removeMember,
    batchCreateTasks,
  } = useStore()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('overview')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [showBatchForm, setShowBatchForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // 创建企业表单
  const [enterpriseForm, setEnterpriseForm] = useState({
    name: '', description: '', industry: '', website: '',
    contact_name: '', contact_phone: '', contact_email: '',
  })

  // 邀请成员表单
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' })

  // 批量任务
  const [batchTasks, setBatchTasks] = useState([{
    title: '', description: '', category: 'development', budget: '',
  }])

  // 企业统计
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchUser()
    fetchEnterprise()
  }, [])

  useEffect(() => {
    if (enterprise) {
      fetchEnterpriseMembers()
      loadStats()
    }
  }, [enterprise])

  const loadStats = async () => {
    try {
      const data = await useStore.getState().fetchEnterpriseStats()
      setStats(data)
    } catch {}
  }

  const handleCreateEnterprise = async (e) => {
    e.preventDefault()
    if (!enterpriseForm.name.trim()) return alert('请输入企业名称')
    setLoading(true)
    try {
      await createEnterprise(enterpriseForm)
      setShowCreateForm(false)
      alert('企业创建成功！')
    } catch (err) {
      alert(err.response?.data?.detail || '创建失败')
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteForm.email.trim()) return alert('请输入邮箱')
    setLoading(true)
    try {
      const res = await inviteMember(inviteForm.email, inviteForm.role)
      alert(res.message)
      setShowInviteForm(false)
      setInviteForm({ email: '', role: 'member' })
    } catch (err) {
      alert(err.response?.data?.detail || '邀请失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (memberId, username) => {
    if (!confirm(`确定要移除成员 ${username} 吗？`)) return
    try {
      await removeMember(memberId)
      alert('成员已移除')
    } catch (err) {
      alert(err.response?.data?.detail || '移除失败')
    }
  }

  const addBatchTask = () => {
    setBatchTasks([...batchTasks, { title: '', description: '', category: 'development', budget: '' }])
  }

  const removeBatchTask = (index) => {
    if (batchTasks.length <= 1) return
    setBatchTasks(batchTasks.filter((_, i) => i !== index))
  }

  const updateBatchTask = (index, field, value) => {
    const updated = [...batchTasks]
    updated[index][field] = value
    setBatchTasks(updated)
  }

  const handleBatchPublish = async () => {
    const validTasks = batchTasks.filter(t => t.title && t.description && t.budget > 0)
    if (validTasks.length === 0) return alert('请至少填写一个完整的任务')
    setLoading(true)
    try {
      const tasks = validTasks.map(t => ({
        ...t,
        budget: parseFloat(t.budget),
        required_skills: [],
      }))
      const res = await batchCreateTasks(tasks)
      alert(`${res.message}，总预算 ¥${res.total_budget}`)
      setShowBatchForm(false)
      setBatchTasks([{ title: '', description: '', category: 'development', budget: '' }])
    } catch (err) {
      alert(err.response?.data?.detail || '批量发布失败')
    } finally {
      setLoading(false)
    }
  }

  // 如果没有企业，显示创建页面
  if (!enterprise && !showCreateForm) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center">
            <span className="text-6xl">🏢</span>
            <h1 className="text-3xl font-bold mt-4">企业版</h1>
            <p className="text-gray-500 mt-2 mb-8">
              创建企业账号，管理团队成员，批量发布任务
            </p>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="card p-6 text-center">
                <span className="text-3xl">👥</span>
                <h3 className="font-bold mt-3">团队管理</h3>
                <p className="text-sm text-gray-500 mt-1">邀请成员，分配权限</p>
              </div>
              <div className="card p-6 text-center">
                <span className="text-3xl">📋</span>
                <h3 className="font-bold mt-3">批量发包</h3>
                <p className="text-sm text-gray-500 mt-1">一次发布多个任务</p>
              </div>
              <div className="card p-6 text-center">
                <span className="text-3xl">📊</span>
                <h3 className="font-bold mt-3">数据统计</h3>
                <p className="text-sm text-gray-500 mt-1">企业级数据分析</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary text-lg px-8 py-3"
            >
              创建企业账号
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // 创建企业表单
  if (showCreateForm && !enterprise) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="card p-8">
            <h1 className="text-2xl font-bold mb-6">创建企业账号</h1>
            <form onSubmit={handleCreateEnterprise} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">企业名称 *</label>
                <input
                  type="text"
                  value={enterpriseForm.name}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, name: e.target.value })}
                  className="input-field"
                  placeholder="你的企业名称"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">企业简介</label>
                <textarea
                  value={enterpriseForm.description}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, description: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="简要描述你的企业"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">行业</label>
                  <input
                    type="text"
                    value={enterpriseForm.industry}
                    onChange={(e) => setEnterpriseForm({ ...enterpriseForm, industry: e.target.value })}
                    className="input-field"
                    placeholder="如：互联网、金融"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">企业网站</label>
                  <input
                    type="text"
                    value={enterpriseForm.website}
                    onChange={(e) => setEnterpriseForm({ ...enterpriseForm, website: e.target.value })}
                    className="input-field"
                    placeholder="https://"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
                  <input
                    type="text"
                    value={enterpriseForm.contact_name}
                    onChange={(e) => setEnterpriseForm({ ...enterpriseForm, contact_name: e.target.value })}
                    className="input-field"
                    placeholder="姓名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
                  <input
                    type="text"
                    value={enterpriseForm.contact_phone}
                    onChange={(e) => setEnterpriseForm({ ...enterpriseForm, contact_phone: e.target.value })}
                    className="input-field"
                    placeholder="手机号"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系邮箱</label>
                  <input
                    type="email"
                    value={enterpriseForm.contact_email}
                    onChange={(e) => setEnterpriseForm({ ...enterpriseForm, contact_email: e.target.value })}
                    className="input-field"
                    placeholder="email@company.com"
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" disabled={loading} className="btn-primary px-8">
                  {loading ? '创建中...' : '创建企业'}
                </button>
                <button type="button" onClick={() => setShowCreateForm(false)} className="btn-secondary">
                  取消
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    )
  }

  // 企业管理页面
  const tabs = [
    { key: 'overview', label: '概览', icon: '📊' },
    { key: 'members', label: '成员管理', icon: '👥' },
    { key: 'batch', label: '批量发包', icon: '📋' },
  ]

  const totalBudget = batchTasks.reduce((sum, t) => sum + (parseFloat(t.budget) || 0), 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">企业控制台</h1>
            <p className="text-gray-500">{enterprise?.name}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowBatchForm(true)}
              className="btn-primary text-sm"
            >
              批量发包
            </button>
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
          {/* 概览 Tab */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="card p-5">
                  <div className="text-sm text-gray-500">成员数</div>
                  <div className="text-2xl font-bold mt-1">
                    {enterpriseMembers.length}
                    <span className="text-sm text-gray-400"> / {enterprise?.max_members}</span>
                  </div>
                </div>
                <div className="card p-5">
                  <div className="text-sm text-gray-500">总任务数</div>
                  <div className="text-2xl font-bold mt-1">{stats?.total_tasks || 0}</div>
                </div>
                <div className="card p-5">
                  <div className="text-sm text-gray-500">已完成</div>
                  <div className="text-2xl font-bold mt-1 text-green-600">{stats?.completed_tasks || 0}</div>
                </div>
                <div className="card p-5">
                  <div className="text-sm text-gray-500">信用额度</div>
                  <div className="text-2xl font-bold mt-1">
                    ¥{enterprise?.credit_limit?.toLocaleString() || '0'}
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="font-bold mb-4">企业信息</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">企业名称</span>
                    <div className="font-medium">{enterprise?.name}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">行业</span>
                    <div className="font-medium">{enterprise?.industry || '未设置'}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">认证状态</span>
                    <div>
                      {enterprise?.is_verified ? (
                        <span className="text-green-600 font-medium">已认证</span>
                      ) : (
                        <span className="text-yellow-600 font-medium">未认证</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">已用额度</span>
                    <div className="font-medium">¥{enterprise?.used_credit?.toLocaleString() || '0'}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 成员管理 Tab */}
          {activeTab === 'members' && (
            <motion.div
              key="members"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">团队成员</h2>
                  <button
                    onClick={() => setShowInviteForm(true)}
                    className="btn-primary text-sm"
                  >
                    + 邀请成员
                  </button>
                </div>

                {/* 邀请表单 */}
                <AnimatePresence>
                  {showInviteForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4"
                    >
                      <form onSubmit={handleInvite} className="bg-primary-50 p-4 rounded-xl">
                        <div className="flex space-x-3">
                          <input
                            type="email"
                            value={inviteForm.email}
                            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                            className="input-field flex-1"
                            placeholder="输入用户邮箱"
                            required
                          />
                          <select
                            value={inviteForm.role}
                            onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                            className="input-field w-32"
                          >
                            <option value="member">成员</option>
                            <option value="admin">管理员</option>
                          </select>
                          <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? '邀请中...' : '邀请'}
                          </button>
                          <button type="button" onClick={() => setShowInviteForm(false)} className="btn-secondary">
                            取消
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 成员列表 */}
                <div className="space-y-3">
                  {enterpriseMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-medium">
                            {member.username?.[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{member.username}</div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          member.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                          member.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {member.role === 'owner' ? '所有者' : member.role === 'admin' ? '管理员' : '成员'}
                        </span>
                        {member.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveMember(member.id, member.username)}
                            className="text-sm text-red-500 hover:text-red-700"
                          >
                            移除
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* 批量发包 Tab */}
          {activeTab === 'batch' && (
            <motion.div
              key="batch"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-4">批量发布任务</h2>
                <p className="text-sm text-gray-500 mb-4">一次发布多个任务，最多50个</p>

                <div className="space-y-4">
                  {batchTasks.map((task, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-500">任务 #{index + 1}</span>
                        {batchTasks.length > 1 && (
                          <button
                            onClick={() => removeBatchTask(index)}
                            className="text-sm text-red-500 hover:text-red-700"
                          >
                            删除
                          </button>
                        )}
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) => updateBatchTask(index, 'title', e.target.value)}
                          className="input-field"
                          placeholder="任务标题"
                        />
                        <div className="flex space-x-3">
                          <select
                            value={task.category}
                            onChange={(e) => updateBatchTask(index, 'category', e.target.value)}
                            className="input-field flex-1"
                          >
                            {CATEGORIES.map(c => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={task.budget}
                            onChange={(e) => updateBatchTask(index, 'budget', e.target.value)}
                            className="input-field w-32"
                            placeholder="预算 ¥"
                            min="1"
                          />
                        </div>
                      </div>
                      <textarea
                        value={task.description}
                        onChange={(e) => updateBatchTask(index, 'description', e.target.value)}
                        className="input-field mt-3"
                        rows={2}
                        placeholder="任务描述"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={addBatchTask}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    + 添加任务
                  </button>
                  <div className="text-sm text-gray-500">
                    共 {batchTasks.length} 个任务，总预算 ¥{totalBudget.toFixed(2)}
                  </div>
                </div>

                <button
                  onClick={handleBatchPublish}
                  disabled={loading || totalBudget <= 0}
                  className="w-full btn-primary py-3 text-lg mt-6 disabled:opacity-50"
                >
                  {loading ? '发布中...' : `批量发布 ${batchTasks.length} 个任务`}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
