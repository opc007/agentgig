import { useState, useCallback, createContext, useContext } from 'react'
import zh from './zh.json'
import en from './en.json'

const LANGUAGES = { zh, en }
const LANG_STORAGE_KEY = 'app_language'

function getInitialLang() {
  const saved = localStorage.getItem(LANG_STORAGE_KEY)
  if (saved && LANGUAGES[saved]) return saved
  const browserLang = navigator.language.startsWith('zh') ? 'zh' : 'en'
  return browserLang
}

// Resolve nested key like "nav.market" from a language object
function getNestedValue(obj, key) {
  return key.split('.').reduce((acc, k) => acc?.[k], obj)
}

// Replace placeholders like {count} with values from params
function interpolate(str, params) {
  if (!params || typeof str !== 'string') return str
  return Object.entries(params).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), v),
    str
  )
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang)

  const setLang = useCallback((newLang) => {
    if (LANGUAGES[newLang]) {
      setLangState(newLang)
      localStorage.setItem(LANG_STORAGE_KEY, newLang)
    }
  }, [])

  const t = useCallback((key, params) => {
    const val = getNestedValue(LANGUAGES[lang], key)
    if (val !== undefined) return interpolate(val, params)
    // Fallback to Chinese
    const fallback = getNestedValue(LANGUAGES.zh, key)
    if (fallback !== undefined) return interpolate(fallback, params)
    return key
  }, [lang])

  const value = { lang, setLang, t }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
