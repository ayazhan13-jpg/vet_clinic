import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const F = { fontFamily: "'Nunito', sans-serif" }

const inputStyle = {
  padding: '14px 16px', borderRadius: 14,
  border: '1.5px solid rgba(255,255,255,0.3)',
  fontSize: 15, fontFamily: "'Nunito', sans-serif", fontWeight: 500,
  outline: 'none', width: '100%', boxSizing: 'border-box',
  color: '#fff', background: 'rgba(255,255,255,0.12)',
  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
  transition: 'border-color 0.2s',
}

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm]       = useState({ login: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('username', form.login)
      fd.append('password', form.password)
      const res = await api.post('/auth/login', fd)
      localStorage.setItem('token', res.data.access_token)
      navigate('/')
    } catch {
      setError('Неверный логин или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      ...F,
      height: '100vh', overflow: 'hidden',
      background: 'radial-gradient(ellipse at 30% 50%, #2e7d32 0%, #1b5e20 55%, #0d3b12 100%)',
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      {/* Декоративные пятна */}
      <div style={{ position:'absolute', top:'8%', left:'4%', width:300, height:300, borderRadius:'50%', background:'rgba(100,200,100,0.06)', filter:'blur(60px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'10%', right:'6%', width:260, height:260, borderRadius:'50%', background:'rgba(150,255,150,0.05)', filter:'blur(80px)', pointerEvents:'none' }} />

      {/* Основной контент */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 80, padding: '0 60px', overflow: 'hidden',
      }}>

        {/* Левая колонка */}
        <div style={{ color: '#fff', flex: '1 1 420px', maxWidth: 520 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🐾</div>
          <h1 style={{ ...F, fontSize: 'clamp(24px, 2.8vw, 44px)', fontWeight: 800, margin: '0 0 10px', lineHeight: 1.2 }}>
            ГБУ «Городская<br/>ветеринарная<br/>станция»
          </h1>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.1)', borderRadius:20, padding:'5px 14px', fontSize:13, fontWeight:600, color:'#a5d6a7', marginBottom:28, border:'1px solid rgba(255,255,255,0.15)' }}>
            📍 г. Байконур, ул. Носова, д. 14
          </div>
          <p style={{ ...F, fontSize:16, fontWeight:500, color:'#c8e6c9', margin:'0 0 36px', lineHeight:1.7 }}>
            Ваш питомец в надёжных руках.<br/>Давайте познакомимся!
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            {[
              ['📅', 'Запись онлайн за 1 минуту'],
              ['📋', 'Цифровой паспорт питомца всегда под рукой'],
              ['💬', 'Чат с ветеринаром после приёма'],
              ['🔔', 'Напоминания о прививках и приёмах'],
            ].map(([icon, text], i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:14 }}>
                <span style={{ fontSize:22, flexShrink:0 }}>{icon}</span>
                <span style={{ fontSize:15, color:'#c8e6c9', fontWeight:600 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Форма */}
        <div style={{
          background: 'rgba(255,255,255,0.13)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 28, padding: '48px 44px',
          border: '1px solid rgba(255,255,255,0.22)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
          flex: '0 0 auto', width: 420,
        }}>
          <h2 style={{ ...F, fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 28px', textAlign:'center' }}>
            Вход в систему
          </h2>

          {error && (
            <div style={{ background:'rgba(255,235,238,0.9)', border:'1px solid #ffcdd2', borderRadius:12, padding:'10px 14px', marginBottom:16, color:'#c62828', fontSize:13, ...F }}>
              {error}
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <input placeholder="Логин" value={form.login}
              onChange={e => setForm({...form, login: e.target.value})}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={inputStyle} />
            <input type="password" placeholder="Пароль" value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={inputStyle} />
            <button onClick={handleSubmit} disabled={loading} style={{
              ...F, padding:'14px', borderRadius:14, border:'none',
              background: loading ? 'rgba(165,214,167,0.5)' : 'rgba(255,255,255,0.95)',
              color: loading ? '#aaa' : '#2e7d32',
              fontSize:16, fontWeight:800, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow:'0 4px 20px rgba(0,0,0,0.15)', transition:'all 0.15s',
            }}
              onMouseEnter={e => { if (!loading) { e.target.style.transform='translateY(-2px)'; e.target.style.boxShadow='0 8px 24px rgba(0,0,0,0.2)' }}}
              onMouseLeave={e => { e.target.style.transform='translateY(0)'; e.target.style.boxShadow='0 4px 20px rgba(0,0,0,0.15)' }}
            >
              {loading ? 'Входим...' : 'Войти'}
            </button>
          </div>

          <div style={{ textAlign:'center', marginTop:20 }}>
            <span style={{ color:'rgba(255,255,255,0.6)', fontSize:14 }}>Нет аккаунта? </span>
            <button onClick={() => navigate('/register')} style={{ ...F, background:'none', border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3 }}>
              Зарегистрироваться
            </button>
          </div>

          <div style={{ marginTop:20, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.12)', textAlign:'center' }}>
            <span style={{ ...F, fontSize:11, color:'rgba(255,255,255,0.4)', letterSpacing:0.3 }}>
              Разработка АИС: Жалгауова А. А.
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}
