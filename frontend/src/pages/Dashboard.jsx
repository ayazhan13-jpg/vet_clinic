import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const PAW_POSITIONS = [
  { top: '8%',  left: '3%',  rot: -20, size: 28, op: 0.07 },
  { top: '18%', left: '91%', rot: 30,  size: 22, op: 0.06 },
  { top: '35%', left: '6%',  rot: 10,  size: 18, op: 0.05 },
  { top: '55%', left: '88%', rot: -15, size: 32, op: 0.07 },
  { top: '72%', left: '4%',  rot: 25,  size: 24, op: 0.06 },
  { top: '85%', left: '93%', rot: -30, size: 20, op: 0.05 },
]

function PawSVG({ size, color = '#4a7c59' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill={color}>
      <ellipse cx="32" cy="46" rx="14" ry="11" />
      <ellipse cx="14" cy="30" rx="7" ry="9" />
      <ellipse cx="50" cy="30" rx="7" ry="9" />
      <ellipse cx="22" cy="18" rx="6" ry="8" />
      <ellipse cx="42" cy="18" rx="6" ry="8" />
    </svg>
  )
}

const CLIENT_CARDS = [
  {
    key: 'pets', path: '/pets',
    color: '#d4edd8', accent: '#3a7d44', border: '#b5d8bc',
    icon: (
      <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="#3a7d44" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="22" cy="20" rx="8" ry="10" /><ellipse cx="42" cy="20" rx="8" ry="10" />
        <path d="M14 38 Q10 52 32 56 Q54 52 50 38 Q44 28 32 30 Q20 28 14 38Z" />
        <circle cx="26" cy="38" r="2" fill="#3a7d44" /><circle cx="38" cy="38" r="2" fill="#3a7d44" />
        <path d="M28 44 Q32 47 36 44" />
      </svg>
    ),
    title: 'Мои любимцы', desc: 'Просмотр и управление питомцами',
  },
  {
    key: 'appointments', path: '/appointments',
    color: '#cde3f5', accent: '#1e6fa8', border: '#a8cfe8',
    icon: (
      <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="#1e6fa8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="14" width="48" height="42" rx="6" />
        <path d="M8 26h48M20 8v12M44 8v12" />
        <path d="M20 36h6v6h-6zM29 36h6v6h-6zM38 36h6v6h-6z" />
        <circle cx="44" cy="48" r="10" fill="#cde3f5" stroke="#1e6fa8" strokeWidth="2" />
        <path d="M40 48h8M44 44v8" />
      </svg>
    ),
    title: 'Записаться к врачу', desc: 'Онлайн-запись на приём',
  },
  {
    key: 'articles', path: '/articles',
    color: '#fde8d0', accent: '#b85c1a', border: '#f5c9a0',
    icon: (
      <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="#b85c1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="8" width="36" height="46" rx="4" />
        <rect x="16" y="4" width="36" height="46" rx="4" fill="#fde8d0" stroke="#b85c1a" strokeWidth="2" />
        <path d="M24 18h16M24 26h16M24 34h10" />
        <circle cx="44" cy="46" r="8" fill="#fde8d0" stroke="#b85c1a" strokeWidth="2" />
        <path d="M41 46h6M44 43v6" />
      </svg>
    ),
    title: 'Полезные советы', desc: 'Статьи и справочная информация',
  },
]

const VET_CARDS = [
  {
    key: 'all-pets', path: '/all-pets',
    color: '#d4edd8', accent: '#3a7d44', border: '#b5d8bc',
    icon: (
      <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="#3a7d44" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="20" r="10" />
        <path d="M4 54 Q4 40 24 40 Q44 40 44 54" />
        <circle cx="48" cy="22" r="8" />
        <path d="M40 50 Q40 38 48 38 Q56 38 60 50" />
      </svg>
    ),
    title: 'Реестр пациентов', desc: 'Все животные ветстанции',
  },
  {
    key: 'appointments', path: '/appointments',
    color: '#cde3f5', accent: '#1e6fa8', border: '#a8cfe8',
    icon: (
      <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="#1e6fa8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="14" width="48" height="42" rx="6" />
        <path d="M8 26h48M20 8v12M44 8v12" />
        <circle cx="20" cy="38" r="3" fill="#1e6fa8" />
        <circle cx="32" cy="38" r="3" fill="#1e6fa8" />
        <circle cx="44" cy="38" r="3" fill="#1e6fa8" />
        <circle cx="20" cy="48" r="3" fill="#1e6fa8" />
        <circle cx="32" cy="48" r="3" fill="#1e6fa8" />
      </svg>
    ),
    title: 'График приёмов', desc: 'Расписание и управление записями',
  },
  {
    key: 'articles', path: '/articles',
    color: '#ede7f6', accent: '#5e35b1', border: '#d1c4e9',
    icon: (
      <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="#5e35b1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="8" width="48" height="48" rx="8" />
        <path d="M18 20h28M18 30h28M18 40h18" />
        <circle cx="46" cy="46" r="10" fill="#ede7f6" stroke="#5e35b1" strokeWidth="2" />
        <path d="M46 41v10M41 46h10" />
      </svg>
    ),
    title: 'База знаний', desc: 'Справочник препаратов и статьи',
  },
]

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [todayCount, setTodayCount] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/auth/me').then(res => {
      setUser(res.data)
      const role = res.data.role
      const isVetRole = role === 'vet' || role === 'assistant' || role === 'head'
      if (isVetRole) {
        navigate('/all-pets', { replace: true })
      }
      if (isVetRole) {
        api.get('/appointments/vet/schedule').then(r => {
          const today = new Date().toISOString().split('T')[0]
          setTodayCount(r.data.filter(a => a.date === today && ['pending', 'confirmed'].includes(a.status)).length)
        }).catch(() => {})
        api.get('/chat/unread/count').then(r => setUnreadCount(r.data.unread)).catch(() => {})
      }
    }).catch(console.error)
  }, [])

  const roleLabel = { client: 'Владелец питомца', vet: 'Ветеринар', assistant: 'Ассистент' }
  const isVet  = user?.role === 'vet' || user?.role === 'assistant' || user?.role === 'head'
  const isHead = user?.role === 'head'
  const greeting = getGreeting()
  const cards = isVet ? VET_CARDS : CLIENT_CARDS

  const VET_QUICK = [
    ...(isHead ? [{ path: '/reports', label: '📊 Отчёты', color: '#f3e5f5', accent: '#7b1fa2', count: null }] : []),
    { path: '/all-pets',     label: '🐾 Все питомцы',    color: '#e8f5e9', accent: '#2e7d32', count: null },
    { path: '/appointments', label: '📅 Приёмы сегодня', color: '#e3f2fd', accent: '#1565c0', count: todayCount },
    { path: '/chat',         label: '💬 Чат',             color: '#fff8e1', accent: '#f57c00', count: unreadCount || null },
  ]

  // Ветеринар уже перенаправлен в useEffect — здесь только клиент
  if (!user) return null

  return (
    <div style={{ height: '100%', overflow: 'hidden', background: '#f4f8f4', fontFamily: "'Nunito', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Приветственная шапка */}
      <div style={{ flexShrink: 0, background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>
            {greeting}{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}! 🐾
          </div>
          <div style={{ fontSize: 12, color: '#a5d6a7', marginTop: 2 }}>
            Личный кабинет клиента · ГБУ «Горветстанция г. Байконур»
          </div>
        </div>
      </div>

      {/* Основная сетка — 3 блока */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 16, padding: '16px 24px', overflow: 'hidden', minHeight: 0 }}>

        {/* Карта — занимает 2 строки слева */}
        <div style={{ gridRow: '1 / 3', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#1b5e20' }}>📍 Как нас найти</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>г. Байконур, ул. Носова, д. 14</div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <iframe
              title="Карта ГВС"
              width="100%" height="100%"
              style={{ border: 0, display: 'block' }}
              loading="lazy"
              src="https://www.openstreetmap.org/export/embed.html?bbox=63.3131%2C45.6127%2C63.3331%2C45.6227&layer=mapnik&marker=45.6177%2C63.3231"
            />
          </div>
          <div style={{ padding: '12px 18px', borderTop: '1px solid #f0f0f0', flexShrink: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[['📞', '+7 (33622) 4-62-68'], ['✉️', 'gvsbaykonur2005@yandex.ru'], ['🕐', 'Пн–Пт, 09:00–18:30']].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f1f8e9', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#2e7d32' }}>
                <span>{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Наши врачи */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#1b5e20' }}>👨‍⚕️ Наши специалисты</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { name: 'Рыбалкина Екатерина Евгеньевна', role: 'Руководитель, главный ветеринар', emoji: '👩‍⚕️', color: '#e8f5e9', accent: '#2e7d32' },
              { name: 'Алимбаев Бексапа Кожантаевич',   role: 'Ветеринарный врач-хирург',        emoji: '👨‍⚕️', color: '#e3f2fd', accent: '#1565c0' },
              { name: 'Исаева Дана Кумисбековна',        role: 'Ветеринарный врач-терапевт',      emoji: '👩‍⚕️', color: '#fce4ec', accent: '#c2185b' },
            ].map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: d.color, borderRadius: 12, padding: '12px 14px', border: `1px solid ${d.accent}22` }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, boxShadow: `0 2px 8px ${d.accent}22` }}>
                  {d.emoji}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: d.accent, fontWeight: 600, marginTop: 2 }}>{d.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* График работы */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#1b5e20' }}>🕐 Режим работы</div>
          </div>
          <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
            {[
              { title: 'Лечебный отдел', days: 'Пн – Пт', hours: '09:00 – 18:30', note: 'Перерыв: 13:30 – 15:00', color: '#e8f5e9', accent: '#2e7d32' },
              { title: 'Диагностическая лаборатория', days: 'Пн – Пт', hours: 'Приём до 17:30', note: '', color: '#e3f2fd', accent: '#1565c0' },
              { title: 'Выходные дни', days: 'Сб, Вс', hours: 'Закрыто', note: 'Экстренные случаи — по телефону', color: '#fff3e0', accent: '#e65100' },
            ].map((s, i) => (
              <div key={i} style={{ background: s.color, borderRadius: 10, padding: '10px 14px', borderLeft: `3px solid ${s.accent}` }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{s.title}</div>
                <div style={{ fontSize: 12, color: s.accent, fontWeight: 600, marginTop: 3 }}>{s.days} · {s.hours}</div>
                {s.note && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{s.note}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionCard({ color, accent, border, icon, title, desc, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      background: '#fff', borderRadius: 24, padding: '44px 32px', textAlign: 'center', cursor: 'pointer',
      border: `2px solid ${hovered ? accent + '66' : border}`,
      boxShadow: hovered ? `0 16px 48px ${accent}28` : '0 2px 16px rgba(0,0,0,0.07)',
      transform: hovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
      transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
      position: 'relative', overflow: 'hidden',
      minHeight: 260,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: accent, borderRadius: '24px 24px 0 0', opacity: hovered ? 1 : 0.6, transition: 'opacity 0.2s' }} />
      <div style={{
        width: 100, height: 100, borderRadius: '50%', background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 24px',
        transition: 'transform 0.2s',
        transform: hovered ? 'scale(1.12)' : 'scale(1)',
        boxShadow: `0 4px 20px ${accent}22`,
      }}>
        {/* Увеличиваем SVG иконки */}
        <div style={{ transform: 'scale(1.2)' }}>{icon}</div>
      </div>
      <h3 style={{ fontFamily: "'Nunito', sans-serif", fontSize: 22, fontWeight: 800, color: '#2d4a2d', margin: '0 0 10px' }}>{title}</h3>
      <p style={{ fontSize: 15, color: '#8aaa8a', fontWeight: 600, margin: 0, lineHeight: 1.6 }}>{desc}</p>
    </div>
  )
}

function QuickBtn({ label, color, accent, count, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '12px 8px', borderRadius: 14,
        border: `1.5px solid ${accent}33`,
        background: hovered ? accent : color,
        color: hovered ? '#fff' : accent,
        fontSize: 13, fontWeight: 700,
        fontFamily: "'Nunito', sans-serif",
        cursor: 'pointer',
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        boxShadow: hovered ? `0 6px 16px ${accent}33` : 'none',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}>
      {label}
      {count > 0 && (
        <span style={{
          background: hovered ? 'rgba(255,255,255,0.3)' : accent,
          color: '#fff', borderRadius: 10,
          padding: '1px 7px', fontSize: 11, fontWeight: 800, flexShrink: 0,
        }}>
          {count}
        </span>
      )}
    </button>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Доброе утро'
  if (h >= 12 && h < 17) return 'Добрый день'
  if (h >= 17 && h < 22) return 'Добрый вечер'
  return 'Доброй ночи'
}
