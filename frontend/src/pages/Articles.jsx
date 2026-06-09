import { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material'
import api from '../api'

// ─── Авто-теги и обложки по ключевым словам в заголовке ──────────────────────

const TAG_RULES = [
  { keywords: ['кот', 'кош', 'мяу', 'котёнок', 'котенок'], tag: 'Кошки', color: '#f3e5f5', accent: '#ab47bc', emoji: '🐱' },
  { keywords: ['соб', 'пёс', 'пес', 'щенок'], tag: 'Собаки', color: '#e3f2fd', accent: '#1e88e5', emoji: '🐶' },
  { keywords: ['кролик', 'хомяк', 'грызун'], tag: 'Грызуны', color: '#fff8e1', accent: '#fb8c00', emoji: '🐹' },
  { keywords: ['птиц', 'попугай'], tag: 'Птицы', color: '#e8f5e9', accent: '#43a047', emoji: '🐦' },
  { keywords: ['вакцин', 'прививк', 'укол'], tag: 'Вакцинация', color: '#fce4ec', accent: '#e91e63', emoji: '💉' },
  { keywords: ['корм', 'питани', 'диет', 'еда'], tag: 'Питание', color: '#e8f5e9', accent: '#2e7d32', emoji: '🥗' },
  { keywords: ['болезн', 'лечен', 'здоровь', 'симптом'], tag: 'Здоровье', color: '#e3f2fd', accent: '#0277bd', emoji: '🩺' },
  { keywords: ['космос', 'ракет', 'байконур', 'звезд'], tag: 'Байконур 🚀', color: '#ede7f6', accent: '#5e35b1', emoji: '🚀' },
  { keywords: ['уход', 'гигиен', 'мыть', 'купать'], tag: 'Уход', color: '#f1f8e9', accent: '#558b2f', emoji: '🛁' },
]

const DEFAULT_TAG = { tag: 'Советы', color: '#f5f5f5', accent: '#757575', emoji: '📖' }

function getArticleMeta(title, index) {
  const lower = (title || '').toLowerCase()
  for (const rule of TAG_RULES) {
    if (rule.keywords.some(k => lower.includes(k))) {
      return rule
    }
  }
  // Чередуем дефолтные обложки для разнообразия
  const fallbacks = [
    { tag: 'Советы', color: '#f5f5f5', accent: '#757575', emoji: '📖' },
    { tag: 'Интересное', color: '#fff3e0', accent: '#f57c00', emoji: '💡' },
    { tag: 'Здоровье', color: '#e3f2fd', accent: '#0277bd', emoji: '🩺' },
  ]
  return fallbacks[index % fallbacks.length]
}

function formatDate(str) {
  if (!str) return ''
  try {
    return new Date(str).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return str?.slice(0, 10) }
}

// ─── Карточка статьи ─────────────────────────────────────────────────────────

function ArticleCard({ article, index, isFeatured, isVet, onClick, onDelete, getTag, getTitle }) {
  const [hovered, setHovered] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(Math.floor(Math.abs(Math.sin(article.id * 7)) * 30) + 2)
  const meta = getTag(article, index)
  const cleanTitle = getTitle(article.title)
  const preview = article.content?.slice(0, isFeatured ? 200 : 110)

  const handleLike = (e) => {
    e.stopPropagation()
    setLiked(l => !l)
    setLikes(l => liked ? l - 1 : l + 1)
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: hovered ? '0 10px 36px rgba(0,0,0,0.13)' : '0 2px 14px rgba(0,0,0,0.07)',
        transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
        transition: 'all 0.22s cubic-bezier(0.34, 1.3, 0.64, 1)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gridColumn: isFeatured ? 'span 2' : 'span 1',
      }}
    >
      {/* Обложка */}
      <div style={{
        height: isFeatured ? 180 : 120,
        background: `linear-gradient(135deg, ${meta.color}, ${meta.accent}22)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: isFeatured ? 72 : 52,
        position: 'relative',
        flexShrink: 0,
      }}>
        {meta.emoji}
        {isFeatured && (
          <div style={{
            position: 'absolute', top: 14, left: 14,
            background: 'linear-gradient(135deg, #ff9800, #f57c00)',
            color: '#fff', borderRadius: 12,
            padding: '4px 12px', fontSize: 12, fontWeight: 800,
            fontFamily: "'Nunito', sans-serif",
            boxShadow: '0 2px 8px rgba(255,152,0,0.4)',
          }}>
            ⭐ Статья недели
          </div>
        )}
        {isVet && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(article.id) }}
            style={{
              position: 'absolute', top: 10, right: 10,
              background: 'rgba(255,255,255,0.85)', border: 'none',
              borderRadius: 8, padding: '4px 10px',
              color: '#e53935', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
            }}
          >
            🗑 Удалить
          </button>
        )}
      </div>

      {/* Контент */}
      <div style={{ padding: '16px 18px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Тег */}
        <span style={{
          display: 'inline-block', alignSelf: 'flex-start',
          padding: '2px 10px', borderRadius: 20,
          background: meta.color, color: meta.accent,
          fontSize: 11, fontWeight: 800,
          fontFamily: "'Nunito', sans-serif",
          border: `1px solid ${meta.accent}33`,
        }}>
          {meta.tag}
        </span>

        {/* Заголовок */}
        <h3 style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: isFeatured ? 20 : 16,
          fontWeight: 800, color: '#2d4a2d',
          margin: 0, lineHeight: 1.3,
        }}>
          {cleanTitle}
        </h3>

        {/* Превью */}
        <p style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: 13, color: '#888', lineHeight: 1.6,
          margin: 0, flex: 1,
        }}>
          {preview}{article.content?.length > (isFeatured ? 200 : 110) ? '…' : ''}
        </p>

        {/* Футер карточки */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: '#bbb', fontStyle: 'italic', fontFamily: "'Nunito', sans-serif" }}>
            {formatDate(article.created_at)}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleLike}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                color: liked ? '#e53935' : '#bbb',
                fontSize: 13, fontWeight: 700,
                fontFamily: "'Nunito', sans-serif",
                transition: 'color 0.15s',
                padding: 0,
              }}
            >
              {liked ? '❤️' : '🤍'} {likes}
            </button>
            <span style={{
              fontSize: 12, fontWeight: 700, color: meta.accent,
              fontFamily: "'Nunito', sans-serif",
            }}>
              Читать →
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Главный компонент ────────────────────────────────────────────────────────

export default function Articles() {
  const [articles, setArticles] = useState([])
  const [open, setOpen] = useState(false)
  const [openTab, setOpenTab] = useState('edit')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ title: '', content: '', category: '' })
  const [isVet, setIsVet] = useState(false)
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState('all')

  const loadArticles = async () => {
    try { const res = await api.get('/articles/'); setArticles(res.data) } catch {}
  }

  useEffect(() => {
    loadArticles()
    api.get('/auth/me').then(res => setIsVet(res.data.role === 'vet' || res.data.role === 'assistant')).catch(() => {})
  }, [])

  const handleCreate = async () => {
    if (!form.title || !form.content || !form.category) return
    try {
      const titleWithCategory = `[${form.category}] ${form.title}`
      await api.post('/articles/', { title: titleWithCategory, content: form.content })
      setOpen(false); setForm({ title: '', content: '', category: '' }); setOpenTab('edit'); loadArticles()
    } catch {}
  }

  const handleDelete = async (id) => {
    try { await api.delete(`/articles/${id}`); loadArticles() } catch {}
  }

  // Получаем тег статьи — сначала из явной категории в заголовке, потом авто
  const getArticleTag = (article, index) => {
    // Если в заголовке есть маркер категории [Категория]
    const match = article.title?.match(/^\[(.+?)\]\s*/)
    if (match) {
      const cat = match[1]
      return TAG_RULES.find(r => r.tag === cat) || DEFAULT_TAG
    }
    return getArticleMeta(article.title, index)
  }

  const getCleanTitle = (title) => title?.replace(/^\[.+?\]\s*/, '') || title

  // Фильтрация
  const FILTER_TAGS = [
    { key: 'all',         label: 'Все' },
    { key: 'Кошки',       label: '🐱 Кошки' },
    { key: 'Собаки',      label: '🐶 Собаки' },
    { key: 'Грызуны',     label: '🐹 Грызуны' },
    { key: 'Птицы',       label: '🐦 Птицы' },
    { key: 'Вакцинация',  label: '💉 Вакцинация' },
    { key: 'Здоровье',    label: '🩺 Здоровье' },
    { key: 'Питание',     label: '🥗 Питание' },
    { key: 'Уход',        label: '🛁 Уход' },
    { key: 'Советы',      label: '📖 Советы' },
    { key: 'Байконур 🚀', label: '🚀 Байконур' },
  ]

  const CATEGORIES = TAG_RULES.map(r => ({ value: r.tag, label: `${r.emoji} ${r.tag}` }))

  const filtered = articles.filter((a, i) => {
    const matchSearch = search === '' || a.title.toLowerCase().includes(search.toLowerCase()) || a.content?.toLowerCase().includes(search.toLowerCase())
    const meta = getArticleTag(a, i)
    const matchTag = filterTag === 'all' || meta.tag === filterTag
    return matchSearch && matchTag
  })

  const fieldStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 12,
    border: '1.5px solid #e0e0e0', fontSize: 14,
    fontFamily: "'Nunito', sans-serif", outline: 'none',
    background: '#fafafa', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f8f4', fontFamily: "'Nunito', 'Segoe UI', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '36px 24px 80px' }}>

        {/* Шапка */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: "'Nunito', sans-serif", fontSize: 30, fontWeight: 800, color: '#2d4a2d', margin: '0 0 4px' }}>
              📚 Полезные статьи
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: '#7a9e7a', fontWeight: 600 }}>
              Советы от ветеринаров ГБУ «Ветстанция г. Байконур»
            </p>
          </div>
          {isVet && (
            <button onClick={() => { setOpen(true); setOpenTab('edit') }} style={{
              padding: '11px 22px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #3a7d44, #52a85e)',
              color: '#fff', fontSize: 14, fontWeight: 800,
              fontFamily: "'Nunito', sans-serif", cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(58,125,68,0.3)',
            }}>
              + Новая статья
            </button>
          )}
        </div>

        {/* Поиск */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по статьям…"
            style={{ ...fieldStyle, paddingLeft: 40 }}
            onFocus={e => e.target.style.borderColor = '#3a7d44'}
            onBlur={e => e.target.style.borderColor = '#e0e0e0'}
          />
        </div>

        {/* Фильтры по тегам */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {FILTER_TAGS.map(t => (
            <button key={t.key} onClick={() => setFilterTag(t.key)} style={{
              padding: '6px 14px', borderRadius: 20,
              border: `1.5px solid ${filterTag === t.key ? '#3a7d44' : '#e0e0e0'}`,
              background: filterTag === t.key ? '#3a7d44' : '#fff',
              color: filterTag === t.key ? '#fff' : '#666',
              fontSize: 13, fontWeight: 700,
              fontFamily: "'Nunito', sans-serif", cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Сетка статей */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa' }}>
            <div style={{ fontSize: 56 }}>📭</div>
            <p style={{ fontWeight: 700, fontSize: 16, marginTop: 12 }}>
              {articles.length === 0 ? 'Статей пока нет' : 'Ничего не найдено'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {filtered.map((article, i) => (
              <ArticleCard
                key={article.id}
                article={article}
                index={i}
                isFeatured={i === 0 && filtered.length > 2}
                isVet={isVet}
                getTag={getArticleTag}
                getTitle={getCleanTitle}
                onClick={() => setSelected(article)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Диалог создания — с предпросмотром */}
      {open && (() => {
        const previewMeta = getArticleMeta(form.title, 0)
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => setOpen(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: '#fff', borderRadius: 24, width: '100%', maxWidth: 580,
              maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
              fontFamily: "'Nunito', sans-serif",
            }}>
              {/* Шапка с вкладками */}
              <div style={{ padding: '22px 28px 0', borderBottom: '1px solid #f0f0f0' }}>
                <h2 style={{ fontWeight: 800, fontSize: 20, color: '#2d4a2d', margin: '0 0 16px' }}>
                  ✍️ Новая статья
                </h2>
                <div style={{ display: 'flex', gap: 0 }}>
                  {[{ key: 'edit', label: '✏️ Редактор' }, { key: 'preview', label: '👁 Предпросмотр' }].map(t => (
                    <button key={t.key}
                      onClick={() => setOpenTab(t.key)}
                      style={{
                        padding: '8px 18px', border: 'none', cursor: 'pointer',
                        background: 'transparent', fontSize: 14, fontWeight: 700,
                        fontFamily: "'Nunito', sans-serif",
                        color: openTab === t.key ? '#3a7d44' : '#aaa',
                        borderBottom: `2.5px solid ${openTab === t.key ? '#3a7d44' : 'transparent'}`,
                        transition: 'all 0.15s', marginBottom: -1,
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 8px' }}>
                {openTab === 'edit' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Категория */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#888', fontFamily: "'Nunito', sans-serif", display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        Категория *
                      </label>
                      <select
                        value={form.category}
                        onChange={e => setForm({ ...form, category: e.target.value })}
                        style={{
                          width: '100%', padding: '13px 16px', borderRadius: 14,
                          border: `2px solid ${form.category ? '#3a7d44' : '#e8e8e8'}`,
                          fontSize: 14, fontFamily: "'Nunito', sans-serif",
                          outline: 'none', background: '#fff', cursor: 'pointer',
                          boxSizing: 'border-box',
                        }}
                        onFocus={e => e.target.style.borderColor = '#3a7d44'}
                        onBlur={e => e.target.style.borderColor = form.category ? '#3a7d44' : '#e8e8e8'}
                      >
                        <option value="">— выберите категорию —</option>
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>

                    {/* Заголовок */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#888', fontFamily: "'Nunito', sans-serif", display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        Заголовок *
                      </label>
                      <input
                        style={{
                          width: '100%', padding: '13px 16px', borderRadius: 14,
                          border: '2px solid #e8e8e8', fontSize: 15,
                          fontFamily: "'Nunito', sans-serif", outline: 'none',
                          background: '#fff', boxSizing: 'border-box',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                          fontWeight: 600, color: '#2d4a2d',
                        }}
                        placeholder="Например: Как правильно кормить кошку"
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        onFocus={e => { e.target.style.borderColor = '#3a7d44'; e.target.style.boxShadow = '0 0 0 3px rgba(58,125,68,0.1), inset 0 2px 4px rgba(0,0,0,0.04)' }}
                        onBlur={e => { e.target.style.borderColor = '#e8e8e8'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.04)' }}
                      />
                    </div>

                    {/* Содержание */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#888', fontFamily: "'Nunito', sans-serif", display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        Содержание *
                      </label>
                      <textarea
                        style={{
                          width: '100%', padding: '13px 16px', borderRadius: 14,
                          border: '2px solid #e8e8e8', fontSize: 14,
                          fontFamily: "'Nunito', sans-serif", outline: 'none',
                          background: '#fff', boxSizing: 'border-box',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                          resize: 'vertical', minHeight: 160, lineHeight: 1.7, color: '#333',
                        }}
                        placeholder="Опишите симптомы, методы лечения или советы по уходу. Например: «При вакцинации кошек важно учитывать...»"
                        value={form.content}
                        onChange={e => setForm({ ...form, content: e.target.value })}
                        onFocus={e => { e.target.style.borderColor = '#3a7d44'; e.target.style.boxShadow = '0 0 0 3px rgba(58,125,68,0.1), inset 0 2px 4px rgba(0,0,0,0.04)' }}
                        onBlur={e => { e.target.style.borderColor = '#e8e8e8'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.04)' }}
                      />
                    </div>

                    {/* Совет-плашка */}
                    <div style={{
                      background: '#fffde7', border: '1.5px solid #fff176',
                      borderRadius: 12, padding: '10px 14px',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
                      <p style={{ fontSize: 13, color: '#795548', margin: 0, fontFamily: "'Nunito', sans-serif", fontWeight: 600, lineHeight: 1.5 }}>
                        Упомяните вид животного в заголовке — система автоматически подберёт тег и обложку. Переключитесь на «Предпросмотр», чтобы увидеть результат.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Предпросмотр */
                  <div>
                    <p style={{ fontSize: 12, color: '#aaa', fontFamily: "'Nunito', sans-serif", marginBottom: 14, fontWeight: 600 }}>
                      Так статья будет выглядеть после публикации:
                    </p>
                    <div style={{
                      background: '#fff', borderRadius: 16,
                      overflow: 'hidden', border: '1.5px solid #f0f0f0',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    }}>
                      {/* Обложка предпросмотра */}
                      <div style={{
                        height: 100, background: `linear-gradient(135deg, ${previewMeta.color}, ${previewMeta.accent}22)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, position: 'relative',
                      }}>
                        {previewMeta.emoji}
                        <span style={{
                          position: 'absolute', top: 10, left: 10,
                          background: previewMeta.color, color: previewMeta.accent,
                          border: `1px solid ${previewMeta.accent}33`,
                          borderRadius: 12, padding: '2px 10px',
                          fontSize: 11, fontWeight: 800, fontFamily: "'Nunito', sans-serif",
                        }}>
                          {previewMeta.tag}
                        </span>
                      </div>
                      <div style={{ padding: '16px 20px 20px' }}>
                        <h3 style={{ fontFamily: "'Nunito', sans-serif", fontSize: 17, fontWeight: 800, color: '#2d4a2d', margin: '0 0 8px' }}>
                          {form.title || <span style={{ color: '#ccc' }}>Заголовок статьи</span>}
                        </h3>
                        <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: '#888', margin: 0, lineHeight: 1.6 }}>
                          {form.content ? form.content.slice(0, 150) + (form.content.length > 150 ? '…' : '') : <span style={{ color: '#ddd' }}>Текст статьи появится здесь…</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Кнопки */}
              <div style={{ padding: '16px 28px 22px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => setOpen(false)} style={{
                  padding: '11px 22px', borderRadius: 12, border: 'none',
                  background: 'transparent', color: '#999', fontSize: 14, fontWeight: 700,
                  fontFamily: "'Nunito', sans-serif", cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.color = '#555'}
                  onMouseLeave={e => e.currentTarget.style.color = '#999'}
                >
                  Отмена
                </button>
                <button onClick={handleCreate} disabled={!form.title || !form.content} style={{
                  padding: '11px 28px', borderRadius: 12, border: 'none',
                  background: form.title && form.content && form.category
                    ? 'linear-gradient(135deg, #2e7d32, #43a047)'
                    : '#e0e0e0',
                  color: form.title && form.content && form.category ? '#fff' : '#aaa',
                  fontSize: 14, fontWeight: 800,
                  fontFamily: "'Nunito', sans-serif",
                  cursor: form.title && form.content && form.category ? 'pointer' : 'not-allowed',
                  boxShadow: form.title && form.content ? '0 4px 16px rgba(46,125,50,0.35)' : 'none',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { if (form.title && form.content) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(46,125,50,0.4)' } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = form.title && form.content ? '0 4px 16px rgba(46,125,50,0.35)' : 'none' }}
                >
                  🚀 Опубликовать
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Диалог просмотра статьи */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setSelected(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 24, maxWidth: 680, width: '100%',
              maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            {/* Обложка */}
            {(() => {
              const meta = getArticleMeta(selected.title, 0)
              return (
                <div style={{
                  height: 120, background: `linear-gradient(135deg, ${meta.color}, ${meta.accent}33)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, flexShrink: 0,
                }}>
                  {meta.emoji}
                </div>
              )
            })()}

            <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
              <h2 style={{ fontFamily: "'Nunito', sans-serif", fontSize: 22, fontWeight: 800, color: '#2d4a2d', margin: '0 0 8px' }}>
                {selected.title}
              </h2>
              <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: '#bbb', fontStyle: 'italic', margin: '0 0 20px' }}>
                {formatDate(selected.created_at)}
              </p>
              <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, color: '#444', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>
                {selected.content}
              </p>
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelected(null)} style={{
                padding: '9px 22px', borderRadius: 12, border: 'none',
                background: '#f0f0f0', color: '#666', fontSize: 14, fontWeight: 700,
                fontFamily: "'Nunito', sans-serif", cursor: 'pointer',
              }}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
