import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ChatWindow({ onComplete }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '你好！我是 AgentGig 的小助手 🤖\n\n你想找智能体帮你做什么？告诉我你的需求，我来帮你完善！',
    },
  ])
  const [input, setInput] = useState('')
  const [step, setStep] = useState(0)
  const [taskData, setTaskData] = useState({})
  const messagesEndRef = useRef(null)

  const QUESTIONS = [
    { key: 'title', prompt: '好的！请简单描述一下你想做什么？（一句话概括）' },
    { key: 'description', prompt: '能再详细说说具体要求吗？比如：功能需求、风格偏好、交付格式等' },
    { key: 'category', prompt: '这个任务属于哪一类？\n1. 💻 开发（网站/App/脚本）\n2. ✍️ 文案（文章/营销/翻译）\n3. 🎨 设计（Logo/UI/海报）\n4. 📊 数据分析\n5. 其他' },
    { key: 'budget', prompt: '你的预算大概是多少？（输入数字，单位：元）' },
  ]

  const CATEGORY_MAP = {
    '1': 'development', '开发': 'development', '代码': 'development', '网站': 'development', 'app': 'development',
    '2': 'copywriting', '文案': 'copywriting', '文章': 'copywriting', '写作': 'copywriting',
    '3': 'design', '设计': 'design', 'logo': 'design', 'ui': 'design',
    '4': 'data_analysis', '数据': 'data_analysis', '分析': 'data_analysis',
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!input.trim()) return

    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    setTimeout(() => {
      if (step < QUESTIONS.length) {
        const q = QUESTIONS[step]
        let value = input.trim()

        if (q.key === 'category') {
          value = CATEGORY_MAP[value.toLowerCase()] || 'other'
        }
        if (q.key === 'budget') {
          value = parseFloat(value) || 100
        }

        const newData = { ...taskData, [q.key]: value }
        setTaskData(newData)

        if (step < QUESTIONS.length - 1) {
          setMessages(prev => [...prev, { role: 'assistant', content: QUESTIONS[step + 1].prompt }])
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `太好了！我帮你整理一下需求：\n\n📋 **${newData.title}**\n📝 ${newData.description}\n💰 预算：¥${newData.budget}\n\n确认发布吗？点击下方按钮直接发布！`,
          }])
          onComplete?.(newData)
        }
        setStep(step + 1)
      }
    }, 500)
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-[500px]">
      <div className="bg-gradient-to-r from-primary-500 to-purple-600 px-4 py-3">
        <h3 className="text-white font-medium flex items-center space-x-2">
          <span>🤖</span>
          <span>智能需求助手</span>
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-primary-500 text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }`}>
                <p className="text-sm whitespace-pre-line">{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-3">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="输入你的需求..."
            className="input-field text-sm"
          />
          <button onClick={sendMessage} className="btn-primary px-4">
            发送
          </button>
        </div>
      </div>
    </div>
  )
}
