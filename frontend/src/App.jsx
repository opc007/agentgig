import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import useStore from './store/useStore'
import { I18nProvider } from './i18n'
import Navbar from './components/Navbar'
import Market from './pages/Market'
import Login from './pages/Login'
import Register from './pages/Register'
import TaskBoard from './pages/TaskBoard'
import TaskDetail from './pages/TaskDetail'
import AgentDetail from './pages/AgentDetail'
import Dashboard from './pages/Dashboard'
import CreateTask from './pages/CreateTask'
import Wallet from './pages/Wallet'
import Enterprise from './pages/Enterprise'
import AdminWithdraw from './pages/AdminWithdraw'
import WorkflowEditor from './pages/WorkflowEditor'
import AgentLearning from './pages/AgentLearning'
import Community from './pages/Community'

function PrivateRoute({ children }) {
  const token = useStore(s => s.token)
  return token ? children : <Navigate to="/login" />
}

function AdminRoute({ children }) {
  const token = useStore(s => s.token)
  const user = useStore(s => s.user)
  if (!token) return <Navigate to="/login" />
  if (user?.role !== 'admin') return <Navigate to="/" />
  return children
}

export default function App() {
  const { token, fetchUser } = useStore()

  useEffect(() => {
    if (token) {
      fetchUser()
    }
  }, [token])

  return (
    <I18nProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <Navbar />
          <Routes>
            <Route path="/" element={<Market />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/tasks" element={<TaskBoard />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/agents/:id" element={<AgentDetail />} />
            <Route path="/create-task" element={<PrivateRoute><CreateTask /></PrivateRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/wallet" element={<PrivateRoute><Wallet /></PrivateRoute>} />
            <Route path="/enterprise" element={<PrivateRoute><Enterprise /></PrivateRoute>} />
            <Route path="/admin/withdrawals" element={<AdminRoute><AdminWithdraw /></AdminRoute>} />
            <Route path="/workflows" element={<PrivateRoute><WorkflowEditor /></PrivateRoute>} />
            <Route path="/learning" element={<AgentLearning />} />
            <Route path="/learning/:id" element={<AgentLearning />} />
            <Route path="/community" element={<Community />} />
          </Routes>
        </div>
      </BrowserRouter>
    </I18nProvider>
  )
}
