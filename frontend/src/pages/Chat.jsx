import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'

// ─── Константы ───────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pending:   { label: 'Ожидает',     color: '#e65100', bg: '#fff8e1' },
  confirmed: { label: 'Подтверждён', color: '#2e7d32', bg: '#e8f5e9' },
  completed: { label: 'Завершён',    color: '#1565c0', bg: '#e3f2fd' },
  cancelled: { label: 'Отменён',     color: '#c62828', bg: '#ffebee' },
}

// Иконки — для ветеринара показываем клиентов (👤), для клиента — врачей (🩺)
const CLIENT_ICONS = ['👤', '👤', '👤', '👤', '👤']
const DOC_ICONS = ['👩‍⚕️', '👨‍⚕️', '🩺', '👩‍⚕️', '👨‍⚕️']

function getDialogIcon(isVet, name, index) {
  return isVet ? CLIENT_ICONS[index % CLIENT_ICONS.length] : DOC_ICONS[index % DOC_ICONS.length]
}

function formatTime(isoStr) {
  if (!isoStr) return ''
  try {
    return new Date(isoStr).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function formatDate(isoStr) {
  if (!isoStr) return ''
  try {
    return new Date(isoStr).toLocaleDateString('ru', { day: 'numeric', month: 'short' })
  } catch { return isoStr }
}

// ─── Компонент диалога в списке ───────────────────────────────────────────────

function DialogItem({ dialog, index, isSelected, onClick, isVet }) {
  const [hovered, setHovered] = useState(false)
  const cfg = STATUS_CFG[dialog.appointment_status] || { label: dialog.appointment_status, color: '#888', bg: '#f5f5f5' }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '14px 16px',
        cursor: 'pointer',
        background: isSelected ? '#e8f5e9' : hovered ? '#f7faf7' : '#fff',
        borderLeft: `3px solid ${isSelected ? '#3a7d44' : 'transparent'}`,
        borderBottom: '1px solid #f0f0f0',
        transition: 'all 0.15s',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Аватар-иконка */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: isSelected ? '#c8e6c9' : '#e8f5e9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>
            {getDialogIcon(isVet, dialog.other_user_name, index)}
          </div>
          {dialog.unread > 0 && (
            <div style={{
              position: 'absolute', top: -3, right: -3,
              width: 18, height: 18,
              background: '#e53935', color: '#fff',
              borderRadius: '50%', fontSize: 10, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Nunito', sans-serif",
            }}>
              {dialog.unread}
            </div>
          )}
        </div>

        {/* Текстовая часть */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#2d4a2d', fontFamily: "'Nunito', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
              {dialog.other_user_name}
            </span>
            <span style={{ fontSize: 11, color: '#bbb', fontFamily: "'Nunito', sans-serif", flexShrink: 0, marginLeft: 6 }}>
              {dialog.last_message_time ? formatDate(dialog.last_message_time) : ''}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 12, color: '#999', fontFamily: "'Nunito', sans-serif",
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>
              {dialog.last_message || 'Нет сообщений'}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, fontFamily: "'Nunito', sans-serif",
              color: cfg.color, background: cfg.bg,
              borderRadius: 8, padding: '2px 7px', flexShrink: 0,
            }}>
              {cfg.label}
            </span>
          </div>

          <div style={{ fontSize: 11, color: '#bbb', fontFamily: "'Nunito', sans-serif", marginTop: 2 }}>
            📅 {dialog.appointment_date} в {dialog.appointment_time}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Пузырь сообщения ─────────────────────────────────────────────────────────

function MessageBubble({ msg, isMine }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: isMine ? 'flex-end' : 'flex-start',
      marginBottom: 12,
      alignItems: 'flex-end',
      gap: 8,
    }}>
      {!isMine && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: '#e8f5e9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0, marginBottom: 4,
        }}>
          🩺
        </div>
      )}

      <div style={{ maxWidth: '68%' }}>
        {!isMine && (
          <div style={{ fontSize: 11, color: '#aaa', fontFamily: "'Nunito', sans-serif", marginBottom: 3, marginLeft: 2 }}>
            {msg.sender_name}
          </div>
        )}
        <div style={{
          padding: '10px 14px',
          background: isMine ? '#3a7d44' : '#e8f5e9',
          color: isMine ? '#fff' : '#2d4a2d',
          borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          fontSize: 14,
          fontFamily: "'Nunito', sans-serif",
          lineHeight: 1.5,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {msg.text}
        </div>
        <div style={{
          fontSize: 11, color: '#bbb',
          textAlign: isMine ? 'right' : 'left',
          marginTop: 3, fontFamily: "'Nunito', sans-serif",
        }}>
          {formatTime(msg.created_at)}
          {isMine && <span style={{ marginLeft: 3 }}>{msg.is_read ? ' ✓✓' : ' ✓'}</span>}
        </div>
      </div>

      {isMine && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: '#3a7d44',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, color: '#fff', fontWeight: 800,
          fontFamily: "'Nunito', sans-serif", flexShrink: 0, marginBottom: 4,
        }}>
          Я
        </div>
      )}
    </div>
  )
}

// ─── Главный компонент ────────────────────────────────────────────────────────

export default function Chat() {
  const [user, setUser] = useState(null)
  const [dialogs, setDialogs] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const isVet = user?.role === 'vet' || user?.role === 'assistant' || user?.role === 'head'

  const loadDialogs = async () => {
    try { const res = await api.get('/chat/dialogs'); setDialogs(res.data) }
    catch {}
  }

  const loadMessages = async (id) => {
    try { const res = await api.get(`/chat/appointment/${id}`); setMessages(res.data) }
    catch {}
  }

  useEffect(() => {
    const init = async () => {
      const meRes = await api.get('/auth/me')
      setUser(meRes.data)
      await loadDialogs()
      const appId = searchParams.get('appointment_id')
      if (appId) { setSelectedId(parseInt(appId)); await loadMessages(parseInt(appId)) }
    }
    init()
  }, [])

  useEffect(() => {
    if (!selectedId) return
    const interval = setInterval(() => { loadMessages(selectedId); loadDialogs() }, 4000)
    return () => clearInterval(interval)
  }, [selectedId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSelectDialog = async (id) => {
    setSelectedId(id)
    await loadMessages(id)
  }

  const handleSend = async () => {
    if (!text.trim() || !selectedId) return
    setLoading(true)
    try {
      await api.post(`/chat/appointment/${selectedId}`, { text: text.trim() })
      setText('')
      await loadMessages(selectedId)
      await loadDialogs()
    } catch {}
    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const selectedDialog = dialogs.find(d => d.appointment_id === selectedId)
  const cfg = STATUS_CFG[selectedDialog?.appointment_status] || {}

  return (
    <div style={{
      minHeight: '100vh', background: '#f4f8f4',
      fontFamily: "'Nunito', 'Segoe UI', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>

        {/* Заголовок */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: "'Nunito', sans-serif", fontSize: 26, fontWeight: 800, color: '#2d4a2d', margin: 0 }}>
            💬 Чат
          </h1>
          <p style={{ margin: '4px 0 0', color: '#7a9e7a', fontSize: 14, fontWeight: 600 }}>
            {isVet ? 'Переписка с клиентами' : 'Переписка с врачом'}
          </p>
        </div>

        {/* Основной блок */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, minHeight: 0 }}>

          {/* ─── Левая панель — список диалогов ─── */}
          <div style={{
            background: '#fff', borderRadius: 20,
            boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Шапка панели */}
            <div style={{
              padding: '16px 18px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#2d4a2d' }}>Диалоги</span>
              {dialogs.reduce((s, d) => s + d.unread, 0) > 0 && (
                <span style={{
                  background: '#3a7d44', color: '#fff',
                  borderRadius: 12, padding: '2px 10px',
                  fontSize: 12, fontWeight: 800,
                }}>
                  {dialogs.reduce((s, d) => s + d.unread, 0)} новых
                </span>
              )}
            </div>

            {/* Список */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {dialogs.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: '#aaa' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Нет активных диалогов</p>
                  {!isVet && (
                    <button onClick={() => navigate('/appointments')} style={{
                      marginTop: 14, padding: '8px 18px', borderRadius: 12,
                      border: '1.5px solid #3a7d44', background: 'transparent',
                      color: '#3a7d44', fontSize: 13, fontWeight: 700,
                      fontFamily: "'Nunito', sans-serif", cursor: 'pointer',
                    }}>
                      Перейти к записям
                    </button>
                  )}
                </div>
              ) : (
                dialogs.map((d, i) => (
                  <DialogItem
                    key={d.appointment_id}
                    dialog={d}
                    index={i}
                    isVet={isVet}
                    isSelected={selectedId === d.appointment_id}
                    onClick={() => handleSelectDialog(d.appointment_id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ─── Правая панель — окно чата ─── */}
          <div style={{
            background: '#fff', borderRadius: 20,
            boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', minHeight: 0,
          }}>
            {selectedId ? (
              <>
                {/* Шапка чата */}
                <div style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#fff',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      {isVet ? '👤' : '🩺'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#2d4a2d' }}>
                        {selectedDialog?.other_user_name || '...'}
                      </div>
                      <div style={{ fontSize: 12, color: '#aaa' }}>
                        #{selectedId} · {selectedDialog?.appointment_date} в {selectedDialog?.appointment_time}
                      </div>
                    </div>
                  </div>
                  {selectedDialog?.appointment_status && (
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: cfg.color, background: cfg.bg,
                      borderRadius: 12, padding: '4px 12px',
                      fontFamily: "'Nunito', sans-serif",
                    }}>
                      {cfg.label}
                    </span>
                  )}
                </div>

                {/* Сообщения */}
                <div style={{
                  flex: 1, overflowY: 'auto',
                  padding: '20px 20px 8px',
                  background: '#f7faf7',
                }}>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', paddingTop: 60, color: '#bbb' }}>
                      <div style={{ fontSize: 56, marginBottom: 12 }}>😺</div>
                      <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>
                        Нет сообщений
                      </p>
                      <p style={{ fontSize: 13, margin: '6px 0 0' }}>
                        Напишите первым!
                      </p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        isMine={msg.sender_id === user?.id}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Поле ввода */}
                <div style={{
                  padding: '12px 16px',
                  borderTop: '1px solid #f0f0f0',
                  background: '#fff',
                  display: 'flex', gap: 10, alignItems: 'flex-end',
                }}>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Введите сообщение… (Enter — отправить)"
                    rows={1}
                    style={{
                      flex: 1,
                      padding: '11px 14px',
                      borderRadius: 16,
                      border: '1.5px solid #e0e0e0',
                      fontSize: 14,
                      fontFamily: "'Nunito', sans-serif",
                      resize: 'none',
                      outline: 'none',
                      background: '#f7faf7',
                      lineHeight: 1.5,
                      maxHeight: 100,
                      overflowY: 'auto',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = '#3a7d44'}
                    onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!text.trim() || loading}
                    style={{
                      width: 44, height: 44,
                      borderRadius: 14,
                      border: 'none',
                      background: text.trim() && !loading ? '#3a7d44' : '#e0e0e0',
                      color: '#fff',
                      fontSize: 20,
                      cursor: text.trim() && !loading ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s',
                      flexShrink: 0,
                    }}
                  >
                    {loading ? '…' : '➤'}
                  </button>
                </div>
              </>
            ) : (
              /* Заглушка */
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 12, color: '#bbb', padding: 32,
              }}>
                <div style={{ fontSize: 72 }}>{isVet ? '👥' : '😸'}</div>
                <p style={{ fontWeight: 800, fontSize: 17, color: '#aaa', margin: 0, textAlign: 'center' }}>
                  {isVet ? 'Выберите клиента,\nчтобы открыть переписку' : 'Выберите специалиста,\nчтобы начать консультацию'}
                </p>
                {!isVet && (
                  <button onClick={() => navigate('/appointments')} style={{
                    marginTop: 8, padding: '10px 22px',
                    borderRadius: 14, border: '1.5px solid #3a7d44',
                    background: 'transparent', color: '#3a7d44',
                    fontSize: 14, fontWeight: 700,
                    fontFamily: "'Nunito', sans-serif", cursor: 'pointer',
                  }}>
                    📅 Перейти к записям
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
