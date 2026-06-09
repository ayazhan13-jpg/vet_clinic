import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import api from '../api'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = localStorage.getItem('token')
  const [role, setRole] = useState(null)
  const [unread, setUnread] = useState(0)
  const [labNotif, setLabNotif] = useState({ count: 0, orders: [] })
  const [labPopup, setLabPopup] = useState(false)
  const popupRef = useRef(null)

  useEffect(() => {
    if (token) {
      api.get('/auth/me').then(r => setRole(r.data.role)).catch(() => {})
    } else { setRole(null) }
  }, [token])

  useEffect(() => {
    if (!token) return
    const fetch = () => api.get('/chat/unread/count').then(r => setUnread(r.data.unread)).catch(() => {})
    fetch()
    const t = setInterval(fetch, 10000)
    return () => clearInterval(t)
  }, [token])

  // Polling уведомлений лаборатории для врача
  useEffect(() => {
    if (!token || !role) return
    const isVetRole = role === 'vet' || role === 'assistant' || role === 'head'
    if (!isVetRole) return
    const fetchLabNotif = () =>
      api.get('/lab/notifications/vet')
        .then(r => setLabNotif(r.data))
        .catch(() => {})
    fetchLabNotif()
    const t = setInterval(fetchLabNotif, 15000)
    return () => clearInterval(t)
  }, [token, role])

  // Закрыть popup при клике вне
  useEffect(() => {
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setLabPopup(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setRole(null)
    navigate('/login')
  }

  const isVet  = role === 'vet' || role === 'assistant' || role === 'head'
  const isHead = role === 'head'
  const isLab  = role === 'lab'
  const at = (path) => location.pathname === path

  const NavLink = ({ path, label, badge }) => (
    <button onClick={() => navigate(path)} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      fontFamily: "'Nunito', sans-serif",
      fontWeight: at(path) ? 700 : 500,
      fontSize: 16,
      color: at(path) ? '#2e7d32' : '#444',
      padding: '8px 14px',
      borderBottom: at(path) ? '2.5px solid #2e7d32' : '2.5px solid transparent',
      transition: 'all 0.15s', position: 'relative',
      whiteSpace: 'nowrap',
      letterSpacing: '0.01em',
    }}
      onMouseEnter={e => { if (!at(path)) { e.currentTarget.style.color = '#2e7d32'; e.currentTarget.style.borderBottomColor = '#a5d6a7' } }}
      onMouseLeave={e => { if (!at(path)) { e.currentTarget.style.color = '#444'; e.currentTarget.style.borderBottomColor = 'transparent' } }}
    >
      {label}
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: 2, right: 2,
          background: '#e53935', color: '#fff',
          borderRadius: '50%', width: 17, height: 17,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 800,
        }}>{badge > 9 ? '9+' : badge}</span>
      )}
    </button>
  )

  const isPublic = location.pathname === '/login' || location.pathname === '/register'

  return (
    <>
      <nav style={{
        width: '100%', background: '#fff',
        borderBottom: '1px solid #e8f5e9',
        boxShadow: '0 1px 6px rgba(46,125,50,0.08)',
        position: 'sticky', top: 0, zIndex: 1000, flexShrink: 0,
      }}>
        <div style={{
          width: '100%', padding: '0 36px', height: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          {/* Логотип */}
          <div onClick={() => navigate(token ? '/' : '/login')} style={{
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flexShrink: 0,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #2e7d32, #43a047)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>🐾</div>
            <span style={{
              fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 17,
              color: '#2d4a2d', whiteSpace: 'nowrap',
            }}>Ветстанция г. Байконур</span>
          </div>

          {/* Навигация */}
          {token && !isPublic ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1, justifyContent: 'center' }}>
              <NavLink path="/" label="Главная" />
              {!isLab && <NavLink path={isVet ? '/all-pets' : '/pets'} label={isVet ? 'Реестр' : 'Питомцы'} />}
              {!isLab && <NavLink path="/appointments" label="Записи" />}
              {!isLab && <NavLink path="/chat" label="Чат" badge={unread} />}
              {!isLab && <NavLink path="/articles" label="Статьи" />}
              {isLab  && <NavLink path="/lab" label="🔬 Лаборатория" />}
              {isHead && <NavLink path="/reports" label="Отчёты" />}
            </div>
          ) : (
            <div style={{ flex: 1 }} />
          )}

          {/* Правая часть — колокольчик + выход */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

            {/* Колокольчик уведомлений лаборатории — только для врача */}
            {token && !isPublic && isVet && (
              <div ref={popupRef} style={{ position: 'relative' }}>
                <button onClick={() => setLabPopup(v => !v)} style={{
                  position: 'relative', background: labNotif.count > 0 ? '#f0fdf4' : 'none',
                  border: labNotif.count > 0 ? '1.5px solid #86efac' : '1.5px solid #e0e0e0',
                  borderRadius: 10, width: 38, height: 38, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, transition: 'all .15s',
                }}>
                  🔬
                  {labNotif.count > 0 && (
                    <span style={{
                      position: 'absolute', top: -4, right: -4,
                      background: '#22c55e', color: '#fff',
                      borderRadius: '50%', width: 18, height: 18,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 800, border: '2px solid #fff',
                    }}>{labNotif.count > 9 ? '9+' : labNotif.count}</span>
                  )}
                </button>

                {/* Всплывающее окно */}
                {labPopup && (
                  <div style={{
                    position: 'absolute', top: 46, right: 0, width: 320,
                    background: '#fff', borderRadius: 14,
                    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
                    border: '1px solid #e2e8f0', zIndex: 2000, overflow: 'hidden',
                    fontFamily: "'Nunito', sans-serif",
                  }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>🔬 Анализы</span>
                      {labNotif.count > 0 && (
                        <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                          {labNotif.count} готово
                        </span>
                      )}
                    </div>
                    {labNotif.count === 0 ? (
                      <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                        Нет новых результатов
                      </div>
                    ) : (
                      <div>
                        {labNotif.orders.map(o => (
                          <div key={o.id} style={{
                            padding: '10px 16px', borderBottom: '1px solid #f8fafc',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                                {o.pet_name}
                                <span style={{ marginLeft: 6, background: '#dcfce7', color: '#166534', borderRadius: 4, padding: '1px 6px', fontSize: 11 }}>Готово</span>
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{o.order_number}</div>
                            </div>
                            <button onClick={() => { navigate(`/lab`); setLabPopup(false) }}
                              style={{ fontFamily: "'Nunito', sans-serif", padding: '4px 10px', borderRadius: 7, border: 'none', background: '#166534', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                              Открыть
                            </button>
                          </div>
                        ))}
                        <div style={{ padding: '10px 16px' }}>
                          <button onClick={() => { navigate('/lab'); setLabPopup(false) }}
                            style={{ fontFamily: "'Nunito', sans-serif", width: '100%', padding: '8px', borderRadius: 8, border: 'none', background: '#f0fdf4', color: '#166534', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                            Открыть журнал лаборатории
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {token && !isPublic ? (
              <button onClick={logout} style={{
                fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13,
                padding: '7px 18px', borderRadius: 20,
                border: '1.5px solid #e0e0e0', background: '#fff',
                color: '#888', cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#e53935'; e.currentTarget.style.color = '#e53935' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.color = '#888' }}
              >Выйти</button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} style={{
                  fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13,
                  padding: '7px 18px', borderRadius: 20,
                  border: '1.5px solid #3a7d44', background: 'transparent', color: '#3a7d44', cursor: 'pointer',
                }}>Войти</button>
                <button onClick={() => navigate('/register')} style={{
                  fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13,
                  padding: '7px 18px', borderRadius: 20, border: 'none',
                  background: '#3a7d44', color: '#fff', cursor: 'pointer',
                }}>Регистрация</button>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}

