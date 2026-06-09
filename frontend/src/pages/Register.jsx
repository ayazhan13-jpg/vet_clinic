import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const F = { fontFamily: "'Nunito', sans-serif" }

const inputStyle = {
  padding: '12px 14px', borderRadius: 12,
  border: '1.5px solid rgba(255,255,255,0.3)',
  fontSize: 14, fontFamily: "'Nunito', sans-serif", fontWeight: 500,
  outline: 'none', width: '100%', boxSizing: 'border-box',
  color: '#fff', background: 'rgba(255,255,255,0.12)',
  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
}

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', login: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.full_name || !form.login || !form.password) {
      setError('Заполните обязательные поля: ФИО, логин, пароль'); return
    }
    setLoading(true); setError('')
    try {
      await api.post('/auth/register', { ...form, role: 'client' })
      navigate('/login')
    } catch {
      setError('Ошибка регистрации. Логин или email уже занят.')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { key: 'full_name', label: 'ФИО *',    placeholder: 'Иванова Мария Сергеевна', type: 'text' },
    { key: 'email',     label: 'Email',     placeholder: 'ivanova@mail.ru',          type: 'email' },
    { key: 'phone',     label: 'Телефон',   placeholder: '+7 (777) 123-45-67',       type: 'tel' },
    { key: 'login',     label: 'Логин *',   placeholder: 'ivanova_m',                type: 'text' },
    { key: 'password',  label: 'Пароль *',  placeholder: '••••••••',                 type: 'password' },
  ]

  return (
    <div style={{
      ...F, height: '100vh', overflow: 'hidden',
      background: 'radial-gradient(ellipse at 70% 50%, #2e7d32 0%, #1b5e20 55%, #0d3b12 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      {/* Декоративные пятна */}
      <div style={{ position:'absolute', top:'10%', right:'8%', width:280, height:280, borderRadius:'50%', background:'rgba(100,200,100,0.06)', filter:'blur(60px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'12%', left:'6%', width:240, height:240, borderRadius:'50%', background:'rgba(150,255,150,0.05)', filter:'blur(70px)', pointerEvents:'none' }} />

      {/* Карточка регистрации */}
      <div style={{
        background: 'rgba(255,255,255,0.13)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 28, padding: '40px 44px',
        border: '1px solid rgba(255,255,255,0.22)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
        width: '100%', maxWidth: 440,
      }}>
        {/* Заголовок */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🐾</div>
          <h2 style={{ ...F, fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
            Регистрация
          </h2>
          <p style={{ ...F, fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0 }}>
            Создайте аккаунт владельца питомца
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(255,235,238,0.9)', border: '1px solid #ffcdd2', borderRadius: 10, padding: '9px 12px', marginBottom: 14, color: '#c62828', fontSize: 13, ...F }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fields.map(f => (
            <div key={f.key}>
              <label style={{ ...F, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                {f.label}
              </label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => setForm({...form, [f.key]: e.target.value})}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={inputStyle}
              />
            </div>
          ))}

          <button onClick={handleSubmit} disabled={loading} style={{
            ...F, marginTop: 4, padding: '13px', borderRadius: 14, border: 'none',
            background: loading ? 'rgba(165,214,167,0.5)' : 'rgba(255,255,255,0.95)',
            color: loading ? '#aaa' : '#2e7d32',
            fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)', transition: 'all 0.15s',
          }}>
            {loading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Уже есть аккаунт? </span>
          <button onClick={() => navigate('/login')} style={{ ...F, background: 'none', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            Войти
          </button>
        </div>

        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
          <span style={{ ...F, fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.3 }}>
            Разработка АИС: Жалгауова А. А.
          </span>
        </div>
      </div>
    </div>
  )
}
