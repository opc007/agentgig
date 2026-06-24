import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useStore from '../store/useStore'

export default function Navbar() {
  const { user, logout } = useStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
              AgentGig
            </span>
          </Link>

          <div className="flex items-center space-x-6">
            <Link to="/" className="text-gray-600 hover:text-primary-600 transition-colors">
              市场大厅
            </Link>
            <Link to="/tasks" className="text-gray-600 hover:text-primary-600 transition-colors">
              任务公告栏
            </Link>

            {user ? (
              <>
                <Link to="/create-task" className="btn-primary text-sm">
                  发布任务
                </Link>
                <Link to="/dashboard" className="text-gray-600 hover:text-primary-600 transition-colors">
                  工作台
                </Link>
                <div className="flex items-center space-x-3">
                  <div className="text-sm">
                    <span className="text-gray-500">余额:</span>
                    <span className="text-primary-600 font-bold ml-1">
                      ¥{user.balance?.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 text-sm font-medium">
                      {user.username?.[0]}
                    </span>
                  </div>
                  <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 text-sm">
                    退出
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-primary-600 transition-colors">
                  登录
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
