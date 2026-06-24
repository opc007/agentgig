// 任务分类配置
export const CATEGORIES = [
  { value: 'development', label: '💻 开发', desc: '网站/App/脚本/API', icon: '💻' },
  { value: 'design', label: '🎨 设计', desc: 'Logo/UI/海报/网页', icon: '🎨' },
  { value: 'copywriting', label: '✍️ 文案', desc: '文章/营销/翻译/公众号', icon: '✍️' },
  { value: 'data_analysis', label: '📊 数据分析', desc: 'Excel/报表/可视化', icon: '📊' },
  { value: 'translation', label: '🗣️ 翻译', desc: '文档/网站/本地化', icon: '🗣️' },
  { value: 'video', label: '🎬 视频', desc: '剪辑/动画/字幕', icon: '🎬' },
  { value: 'music', label: '🎵 音乐', desc: '制作/配音/音效', icon: '🎵' },
  { value: 'marketing', label: '📢 营销', desc: '社媒/SEO/内容营销', icon: '📢' },
  { value: 'customer_service', label: '🎧 客服', desc: '客户支持/在线咨询', icon: '🎧' },
  { value: 'human_resources', label: '👥 人力', desc: '招聘/培训/绩效', icon: '👥' },
  { value: 'legal', label: '⚖️ 法律', desc: '合同/咨询/合规', icon: '⚖️' },
  { value: 'finance', label: '💰 财务', desc: '会计/税务/分析', icon: '💰' },
  { value: 'other', label: '📋 其他', desc: '其他类型任务', icon: '📋' },
]

// 子分类配置
export const SUBCATEGORIES = {
  copywriting: [
    { value: 'article', label: '文章撰写' },
    { value: 'marketing_copy', label: '营销文案' },
    { value: 'social_media', label: '社交媒体内容' },
    { value: 'technical_writing', label: '技术文档' },
    { value: 'creative_writing', label: '创意写作' },
    { value: 'other_copywriting', label: '其他文案' },
  ],
  design: [
    { value: 'logo', label: 'Logo设计' },
    { value: 'ui_ux', label: 'UI/UX设计' },
    { value: 'graphic', label: '平面设计' },
    { value: 'web_design', label: '网页设计' },
    { value: 'illustration', label: '插画设计' },
    { value: 'other_design', label: '其他设计' },
  ],
  development: [
    { value: 'web_dev', label: 'Web开发' },
    { value: 'mobile_dev', label: '移动开发' },
    { value: 'api_dev', label: 'API开发' },
    { value: 'scripting', label: '脚本开发' },
    { value: 'database', label: '数据库开发' },
    { value: 'devops', label: 'DevOps' },
    { value: 'other_dev', label: '其他开发' },
  ],
  data_analysis: [
    { value: 'data_processing', label: '数据处理' },
    { value: 'visualization', label: '数据可视化' },
    { value: 'machine_learning', label: '机器学习' },
    { value: 'statistical_analysis', label: '统计分析' },
    { value: 'other_data', label: '其他数据分析' },
  ],
  translation: [
    { value: 'document_translation', label: '文档翻译' },
    { value: 'website_translation', label: '网站翻译' },
    { value: 'software_localization', label: '软件本地化' },
    { value: 'interpretation', label: '口译服务' },
    { value: 'other_translation', label: '其他翻译' },
  ],
  video: [
    { value: 'video_editing', label: '视频剪辑' },
    { value: 'animation', label: '动画制作' },
    { value: 'video_production', label: '视频拍摄' },
    { value: 'subtitle', label: '字幕制作' },
    { value: 'other_video', label: '其他视频' },
  ],
  music: [
    { value: 'music_production', label: '音乐制作' },
    { value: 'audio_editing', label: '音频剪辑' },
    { value: 'voice_over', label: '配音服务' },
    { value: 'sound_design', label: '音效设计' },
    { value: 'other_music', label: '其他音乐' },
  ],
  marketing: [
    { value: 'social_media_marketing', label: '社交媒体营销' },
    { value: 'seo', label: 'SEO优化' },
    { value: 'content_marketing', label: '内容营销' },
    { value: 'email_marketing', label: '邮件营销' },
    { value: 'other_marketing', label: '其他营销' },
  ],
  customer_service: [
    { value: 'customer_support', label: '客户支持' },
    { value: 'chat_support', label: '在线客服' },
    { value: 'technical_support', label: '技术支持' },
    { value: 'other_service', label: '其他服务' },
  ],
  human_resources: [
    { value: 'recruitment', label: '招聘服务' },
    { value: 'training', label: '培训服务' },
    { value: 'performance', label: '绩效管理' },
    { value: 'other_hr', label: '其他人力资源' },
  ],
  legal: [
    { value: 'contract_review', label: '合同审查' },
    { value: 'legal_consulting', label: '法律咨询' },
    { value: 'compliance', label: '合规服务' },
    { value: 'other_legal', label: '其他法律' },
  ],
  finance: [
    { value: 'accounting', label: '会计服务' },
    { value: 'tax', label: '税务服务' },
    { value: 'financial_analysis', label: '财务分析' },
    { value: 'other_finance', label: '其他财务' },
  ],
  other: [
    { value: 'other', label: '其他任务' },
  ],
}

// 获取分类标签
export function getCategoryLabel(value) {
  const cat = CATEGORIES.find(c => c.value === value)
  return cat ? cat.label : value
}

// 获取子分类标签
export function getSubcategoryLabel(category, subcategory) {
  const subs = SUBCATEGORIES[category]
  if (!subs) return subcategory
  const sub = subs.find(s => s.value === subcategory)
  return sub ? sub.label : subcategory
}
