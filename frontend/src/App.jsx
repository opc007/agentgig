import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import useStore from './store/useStore'
import Navbar from './components/Navbar'
import Market from './pages/Market'
import Login from './pages/Login'
import Register from './pages/Register'
import TaskBoard from './pages/TaskBoard'
import TaskDetail from './pages/TaskDetail'
import AgentDetail from './pages/AgentDetail'
import Dashboard from './pages/Dashboard'
import CreateTask from './pages/CreateTask'

function PrivateRoute({ children }) {
  const token = useStore(s => s.token)
  return token ? children : <Navigate to="/login" />
}

export default function App() {
  const { token, fetchUser } = useStore()

  useEffect(() => {
    if (token) {
      fetchUser()
    }
  }, [token])

  return (
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
        </Routes>
      </div>
    </BrowserRouter>
  )
}
