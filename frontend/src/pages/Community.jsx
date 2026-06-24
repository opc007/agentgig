import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import api from '../services/api'
import useStore from '../store/useStore'

const POST_TYPES = [
  { value: 'all', label: '全部', icon: '📌' },
  { value: 'discussion', label: '讨论', icon: '💬' },
  { value: 'article', label: '技术文章', icon: '📝' },
  { value: 'question', label: '提问', icon: '❓' },
  { value: 'showcase', label: '作品展示', icon: '🎨' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: '最新' },
  { value: 'popular', label: '最热' },
  { value: 'active', label: '最活跃' },
]

function PostCard({ post, onClick }) {
  const typeDef = POST_TYPES.find(t => t.value === post.post_type) || POST_TYPES[0]
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-all"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {post.author_name?.[0] || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {post.is_pinned && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">置顶</span>}
            {post.is_featured && <span className="text-xs bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded">精华</span>}
            <span className="text-xs text-gray-400">{typeDef.icon} {typeDef.label}</span>
          </div>
          <h3 className="font-bold text-gray-800 text-lg mb-1 line-clamp-2">{post.title}</h3>
          <p className="text-gray-500 text-sm line-clamp-2 mb-3">{post.content}</p>

          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>{post.author_name || '匿名'}</span>
            <span>{new Date(post.created_at).toLocaleDateString()}</span>
            <span>👁 {post.views}</span>
            <span>❤️ {post.likes}</span>
            <span>💬 {post.reply_count}</span>
          </div>

          {post.tags?.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {post.tags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function PostDetail({ post, onBack, currentUser }) {
  const [replies, setReplies] = useState(post.replies || [])
  const [replyContent, setReplyContent] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [liked, setLiked] = useState(false)

  const handleReply = async () => {
    if (!replyContent.trim()) return
    try {
      const res = await api.post(`/api/community/posts/${post.id}/reply`, {
        content: replyContent,
        parent_reply_id: replyTo,
      })
      setReplies(prev => [...prev, res.data])
      setReplyContent('')
      setReplyTo(null)
    } catch (err) {
      alert(err.response?.data?.detail || '回复失败')
    }
  }

  const handleLike = async () => {
    if (liked) return
    try {
      await api.post(`/api/community/posts/${post.id}/like`)
      setLiked(true)
    } catch {}
  }

  const typeDef = POST_TYPES.find(t => t.value === post.post_type) || POST_TYPES[0]

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onBack} className="text-gray-400 hover:text-gray-600 mb-4 text-sm">
        ← 返回列表
      </button>

      {/* Post */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          {post.is_pinned && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">置顶</span>}
          {post.is_featured && <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded">精华</span>}
          <span className="text-sm text-gray-400">{typeDef.icon} {typeDef.label}</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-4">{post.title}</h1>

        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white font-bold">
            {post.author_name?.[0] || '?'}
          </div>
          <div>
            <div className="font-medium text-gray-700">{post.author_name || '匿名'}</div>
            <div className="text-xs text-gray-400">{new Date(post.created_at).toLocaleString()}</div>
          </div>
        </div>

        <div className="prose prose-gray max-w-none mb-6 whitespace-pre-wrap">{post.content}</div>

        {post.tags?.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {post.tags.map((tag, i) => (
              <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">{tag}</span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
          <button onClick={handleLike} className={`flex items-center gap-1 text-sm ${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
            ❤️ {post.likes + (liked ? 1 : 0)}
          </button>
          <span className="text-sm text-gray-400">👁 {post.views}</span>
          <span className="text-sm text-gray-400">💬 {post.reply_count}</span>
        </div>
      </div>

      {/* Replies */}
      <div className="space-y-4 mb-6">
        <h3 className="font-bold text-gray-700">回复 ({replies.length})</h3>
        {replies.map(reply => (
          <div key={reply.id} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                {reply.author_name?.[0] || '?'}
              </div>
              <div>
                <span className="font-medium text-gray-700 text-sm">{reply.author_name || '匿名'}</span>
                <span className="text-xs text-gray-400 ml-2">{new Date(reply.created_at).toLocaleString()}</span>
              </div>
            </div>
            <div className="text-gray-600 text-sm ml-11 whitespace-pre-wrap">{reply.content}</div>
            <div className="flex items-center gap-4 mt-2 ml-11">
              <button className="text-xs text-gray-400 hover:text-red-500">❤️ {reply.likes}</button>
              <button onClick={() => setReplyTo(reply.id)} className="text-xs text-gray-400 hover:text-primary-500">↩️ 回复</button>
            </div>

            {/* Nested replies */}
            {reply.child_replies?.length > 0 && (
              <div className="ml-11 mt-3 space-y-3 border-l-2 border-gray-100 pl-4">
                {reply.child_replies.map(child => (
                  <div key={child.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                        {child.author_name?.[0] || '?'}
                      </div>
                      <span className="font-medium text-gray-600 text-xs">{child.author_name || '匿名'}</span>
                      <span className="text-xs text-gray-300">{new Date(child.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-gray-600 text-sm ml-8">{child.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reply Form */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        {replyTo && (
          <div className="flex items-center justify-between mb-2 px-3 py-1.5 bg-blue-50 rounded-lg text-sm">
            <span className="text-blue-600">↩️ 回复 #{replyTo}</span>
            <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        )}
        <textarea
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          placeholder="写下你的回复..."
          rows={4}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-primary-400 text-sm"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleReply}
            disabled={!replyContent.trim()}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-primary-600"
          >
            发布回复
          </button>
        </div>
      </div>
    </div>
  )
}

function CreatePostModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [postType, setPostType] = useState('discussion')
  const [tags, setTags] = useState('')

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return alert('请填写标题和内容')
    try {
      const res = await api.post('/api/community/posts', {
        title,
        content,
        post_type: postType,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      })
      onCreated(res.data)
      onClose()
    } catch (err) {
      alert(err.response?.data?.detail || '发帖失败')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6">发布帖子</h2>

        <div className="flex gap-2 mb-4">
          {POST_TYPES.filter(t => t.value !== 'all').map(t => (
            <button
              key={t.value}
              onClick={() => setPostType(t.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                postType === t.value ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 text-lg focus:outline-none focus:border-primary-400"
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写下你的想法..."
          rows={10}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 resize-none focus:outline-none focus:border-primary-400"
        />

        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="标签 (用逗号分隔，如: AI, 智能体, 开发)"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-6 focus:outline-none focus:border-primary-400"
        />

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 rounded-xl text-gray-600 font-medium hover:bg-gray-200">
            取消
          </button>
          <button onClick={handleSubmit} className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg">
            发布
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function Community() {
  const { user } = useStore()
  const [posts, setPosts] = useState([])
  const [selectedPost, setSelectedPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('all')
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadPosts()
    loadStats()
  }, [activeType, sort])

  const loadPosts = async () => {
    setLoading(true)
    try {
      const params = { sort }
      if (activeType !== 'all') params.post_type = activeType
      if (search) params.search = search
      const res = await api.get('/api/community/posts', { params })
      setPosts(res.data)
    } catch (err) {
      console.error('Failed to load posts:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const res = await api.get('/api/community/stats')
      setStats(res.data)
    } catch {}
  }

  const handleSearch = (e) => {
    e.preventDefault()
    loadPosts()
  }

  const loadPostDetail = async (postId) => {
    try {
      const res = await api.get(`/api/community/posts/${postId}`)
      setSelectedPost(res.data)
    } catch (err) {
      alert(err.response?.data?.detail || '加载失败')
    }
  }

  if (selectedPost) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <PostDetail
          post={selectedPost}
          onBack={() => setSelectedPost(null)}
          currentUser={user}
        />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">开发者社区</h1>
          <p className="text-gray-500 mt-1">分享经验、交流技术、展示作品</p>
        </div>
        {user && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            ✏️ 发帖
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className="text-2xl font-bold text-primary-600">{stats.total_posts}</div>
            <div className="text-sm text-gray-500">帖子</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.total_replies}</div>
            <div className="text-sm text-gray-500">回复</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.total_articles}</div>
            <div className="text-sm text-gray-500">技术文章</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex gap-2">
          {POST_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setActiveType(t.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeType === t.value ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 ml-auto">
          {SORT_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => setSort(s.value)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                sort === s.value ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索帖子..."
            className="px-4 py-1.5 border border-gray-200 rounded-lg text-sm w-48"
          />
          <button type="submit" className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">🔍</button>
        </form>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-xl font-bold text-gray-600 mb-2">还没有帖子</h3>
          <p className="text-gray-400">成为第一个发帖的人吧！</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onClick={() => loadPostDetail(post.id)}
            />
          ))}
        </div>
      )}

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreatePostModal
            onClose={() => setShowCreate(false)}
            onCreated={(newPost) => {
              setPosts(prev => [newPost, ...prev])
              loadStats()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
