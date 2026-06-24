import { create } from 'zustand'
import api from '../services/api'

const useStore = create((set, get) => ({
  // 用户状态
  user: null,
  token: localStorage.getItem('token'),

  // 智能体
  agents: [],
  myAgents: [],

  // 任务
  tasks: [],
  pendingTasks: [],
  myTasks: [],

  // 平台统计
  stats: null,

  // WebSocket
  ws: null,

  // 登录
  login: async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password })
    const { access_token, user } = res.data
    localStorage.setItem('token', access_token)
    set({ token: access_token, user })
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    return user
  },

  // 注册
  register: async (data) => {
    const res = await api.post('/api/auth/register', data)
    const { access_token, user } = res.data
    localStorage.setItem('token', access_token)
    set({ token: access_token, user })
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    return user
  },

  // 退出
  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null, myAgents: [] })
    delete api.defaults.headers.common['Authorization']
  },

  // 获取用户信息
  fetchUser: async () => {
    try {
      const res = await api.get('/api/auth/me')
      set({ user: res.data })
    } catch {
      get().logout()
    }
  },

  // 获取在线智能体
  fetchOnlineAgents: async () => {
    const res = await api.get('/api/agents/online')
    set({ agents: res.data })
  },

  // 获取所有智能体
  fetchAgents: async () => {
    const res = await api.get('/api/agents')
    set({ agents: res.data })
  },

  // 获取我的智能体
  fetchMyAgents: async () => {
    const res = await api.get('/api/agents/my/agents')
    set({ myAgents: res.data })
  },

  // 创建智能体
  createAgent: async (data) => {
    const res = await api.post('/api/agents', data)
    set(state => ({ myAgents: [...state.myAgents, res.data] }))
    return res.data
  },

  // 获取待接单任务
  fetchPendingTasks: async () => {
    const res = await api.get('/api/tasks/pending')
    set({ pendingTasks: res.data })
  },

  // 获取任务列表
  fetchTasks: async (params) => {
    const res = await api.get('/api/tasks', { params })
    set({ tasks: res.data })
  },

  // 创建任务
  createTask: async (data) => {
    const res = await api.post('/api/tasks', data)
    return res.data
  },

  // 获取平台统计
  fetchStats: async () => {
    const res = await api.get('/api/admin/stats')
    set({ stats: res.data })
  },

  // 初始化演示数据
  seedDemoData: async () => {
    const res = await api.post('/api/admin/seed-demo-data')
    return res.data
  },

  // 连接 WebSocket
  connectMarketWS: () => {
    const ws = new WebSocket(`ws://${window.location.host}/ws/market`)
    ws.onopen = () => console.log('Market WebSocket connected')
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      // 处理实时消息
      if (msg.type === 'new_task') {
        get().fetchPendingTasks()
      }
    }
    ws.onclose = () => {
      setTimeout(() => get().connectMarketWS(), 3000)
    }
    set({ ws })
  },
}))

export default useStore
