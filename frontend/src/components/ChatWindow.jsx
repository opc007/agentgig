import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../services/api'

const SYSTEM_GREETING = {
  role: 'assistant',
  content: '你好！我是 AgentGig 的智能需求助手 🤖\n\n告诉我你想做什么，我会帮你完善需求、匹配合适的智能体，一键发包！\n\n比如：\n• "帮我做一个公司官网"\n• "写10篇小红书种草文案"\n• "设计一个App的Logo"',
}

export default function ChatWindow({ onComplete }) {
  const [messages, setMessages] = useState([SYSTEM_GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [taskData, setTaskData] = useState(null)
  const [llmStatus, setLlmStatus] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 检查 LLM 配置状态
  useEffect(() => {
    api.get('/api/chat/config').then(r => {
      setLlmStatus(r.data)
    }).catch(() => {})
  }, [])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // 构建消息历史（去掉系统欢迎语）
      const chatHistory = [...messages.slice(1), userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await api.post('/api/chat', { messages: chatHistory })
      const { content, task_data } = res.data

      setMessages(prev => [...prev, { role: 'assistant', content }])

      if (task_data) {
        setTaskData(task_data)
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail || '抱歉，出了点问题，请重试'
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ ${errMsg}`,
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handlePublish = () => {
    if (taskData) {
      onComplete?.(taskData)
    }
  }

  const resetChat = () => {
    setMessages([SYSTEM_GREETING])
    setTaskData(null)
    setInput('')
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-[400px] sm:h-[500px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-purple-600 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
        <h3 className="text-white font-medium flex items-center space-x-2 text-sm sm:text-base">
          <span>🤖</span>
          <span>智能需求助手</span>
          {llmStatus?.llm_configured && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {llmStatus.model}
            </span>
          )}
        </h3>
        <button onClick={resetChat} className="text-white/70 hover:text-white text-xs">
          重新开始
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] sm:max-w-[80%] px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-primary-500 text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }`}>
                <p className="text-xs sm:text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-md">
              <div className="flex space-x-1.5">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Task preview card */}
        {taskData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-2 p-3 bg-green-50 border border-green-200 rounded-xl"
          >
            <p className="text-xs text-green-600 font-medium mb-2">📋 需求已整理完成</p>
            <p className="text-sm font-semibold text-gray-800">{taskData.title}</p>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{taskData.description}</p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm font-bold text-primary-600">¥{taskData.budget}</span>
              <button
                onClick={handlePublish}
                className="btn-primary text-xs px-4 py-1.5"
              >
                发布任务
              </button>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-2.5 sm:p-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={loading ? '思考中...' : '描述你的需求...'}
            disabled={loading}
            className="input-field text-sm disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="btn-primary px-3 sm:px-4 text-sm shrink-0 disabled:opacity-50"
          >
            {loading ? '...' : '发送'}
          </button>
        </div>
        {!llmStatus?.llm_configured && (
          <p className="text-[10px] text-gray-400 mt-1">当前使用内置规则引擎，配置 LLM API Key 可获得更智能的对话体验</p>
        )}
      </div>
    </div>
  )
}
