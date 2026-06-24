import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useStore from '../store/useStore'
import { useI18n } from '../i18n'

export default function Navbar() {
  const { user, logout } = useStore()
  const navigate = useNavigate()
  const { lang, setLang, t } = useI18n()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isAdmin = user?.role === 'admin'
  const isEnterprise = user?.role === 'enterprise'

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

          <div className="flex items-center space-x-4">
            <Link to="/" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">
              {t('nav.market')}
            </Link>
            <Link to="/tasks" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">
              {t('nav.taskBoard')}
            </Link>
            <Link to="/community" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">
              社区
            </Link>

            {user ? (
              <>
                <Link to="/create-task" className="btn-primary text-sm">
                  {t('nav.publishTask')}
                </Link>
                <Link to="/workflows" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">
                  工作流
                </Link>
                <Link to="/learning" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">
                  学习进化
                </Link>
                <Link to="/dashboard" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">
                  {t('nav.dashboard')}
                </Link>
                <Link to="/wallet" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">
                  钱包
                </Link>
                {isEnterprise && (
                  <Link to="/enterprise" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">
                    企业
                  </Link>
                )}
                {isAdmin && (
                  <Link to="/admin/withdrawals" className="text-orange-600 hover:text-orange-700 transition-colors text-sm font-medium">
                    提现审批
                  </Link>
                )}
                <div className="flex items-center space-x-3 ml-2">
                  <div className="text-sm">
                    <span className="text-gray-500">{t('nav.balance')}:</span>
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
                    {t('nav.logout')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  {t('nav.register')}
                </Link>
              </>
            )}

            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="px-2 py-1 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
              title={lang === 'zh' ? 'Switch to English' : '切换到中文'}
            >
              {lang === 'zh' ? 'EN' : '中'}
            </button>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
