import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const speciesRu   = { cat:'Кошка', dog:'Собака', rabbit:'Кролик', bird:'Птица', hamster:'Хомяк', other:'Другое' }
const speciesEmoji = { cat:'🐱', dog:'🐶', rabbit:'🐰', bird:'🐦', hamster:'🐹', other:'🐾' }
const speciesCfg  = {
  cat:    { color:'#f3e5f5', accent:'#ab47bc' },
  dog:    { color:'#e3f2fd', accent:'#1e88e5' },
  rabbit: { color:'#fce4ec', accent:'#e91e63' },
  bird:   { color:'#e8f5e9', accent:'#43a047' },
  hamster:{ color:'#fff8e1', accent:'#fb8c00' },
  other:  { color:'#f5f5f5', accent:'#757575' },
}
const F = { fontFamily:"'Nunito', sans-serif" }
const ROWS_PER_PAGE = 10

function getAge(b) {
  if (!b) return null
  const m = (new Date().getFullYear() - new Date(b).getFullYear())*12 + (new Date().getMonth() - new Date(b).getMonth())
  if (m < 1) return 'меньше мес.'
  if (m < 12) return `${m} мес.`
  const y = Math.floor(m/12), r = m%12
  return r === 0 ? `${y} л.` : `${y} л. ${r} мес.`
}

// ── Модальное окно клиента ─────────────────────────────────────────────────
function ClientModal({ client, pets, onClose, onOpenPassport }) {
  const clientPets = pets.filter(p => p.owner_id === client.id)
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1300, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'#fff', borderRadius:20, width:'100%', maxWidth:560,
        maxHeight:'85vh', overflow:'hidden', display:'flex', flexDirection:'column',
        boxShadow:'0 20px 60px rgba(0,0,0,0.2)', ...F,
      }}>
        <div style={{ background:'linear-gradient(135deg,#2e7d32,#3a7d44)', padding:'20px 24px', color:'#fff' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontWeight:800, fontSize:20 }}>{client.full_name}</div>
              <div style={{ fontSize:13, color:'#a5d6a7', marginTop:4 }}>
                {client.email && `✉️ ${client.email}`}{client.phone && `  📞 ${client.phone}`}
              </div>
            </div>
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', borderRadius:8, padding:'4px 10px', fontSize:18, cursor:'pointer' }}>×</button>
          </div>
          <div style={{ marginTop:10, display:'flex', gap:16 }}>
            <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:10, padding:'6px 14px', fontSize:13 }}>🐾 Животных: <strong>{clientPets.length}</strong></div>
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          <div style={{ fontWeight:700, fontSize:13, color:'#5a7a5a', marginBottom:14, textTransform:'uppercase', letterSpacing:1 }}>Животные клиента</div>
          {clientPets.length === 0
            ? <div style={{ textAlign:'center', padding:'32px 0', color:'#bbb' }}><div style={{ fontSize:40 }}>🐾</div><p style={{ fontWeight:700, marginTop:8 }}>Нет животных</p></div>
            : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {clientPets.map(pet => {
                  const cfg = speciesCfg[pet.species] || speciesCfg.other
                  return (
                    <div key={pet.id} style={{ background:cfg.color, borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:12, border:`1.5px solid ${cfg.accent}33` }}>
                      <div style={{ width:48, height:48, borderRadius:'50%', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0, boxShadow:`0 0 0 2px ${cfg.accent}44` }}>
                        {pet.photo_url
                          ? <img src={pet.photo_url.startsWith('http') ? pet.photo_url : `http://localhost:8003${pet.photo_url}`} alt={pet.name} style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} />
                          : speciesEmoji[pet.species] || '🐾'}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:800, fontSize:15, color:'#2d4a2d' }}>{pet.name}</div>
                        <div style={{ fontSize:12, color:'#666', marginTop:2 }}>
                          {speciesRu[pet.species]}{pet.breed && pet.breed !== 'нет' ? ` · ${pet.breed}` : ''}{getAge(pet.birth_date) ? ` · ${getAge(pet.birth_date)}` : ''}{pet.weight ? ` · ${pet.weight} кг` : ''}
                        </div>
                      </div>
                      <button onClick={() => onOpenPassport(pet.id)} style={{ padding:'7px 14px', borderRadius:10, border:'none', background:cfg.accent, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', ...F }}>
                        📋 История лечения
                      </button>
                    </div>
                  )
                })}
              </div>
          }
        </div>
      </div>
    </div>
  )
}

// ── Пагинация ──────────────────────────────────────────────────────────────
function Pagination({ page, total, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null
  const pages = []
  for (let i = 1; i <= totalPages; i++) pages.push(i)
  const btnStyle = (active) => ({
    ...F, padding:'6px 12px', borderRadius:8, border:'1.5px solid',
    borderColor: active ? '#2e7d32' : '#e0e0e0',
    background: active ? '#2e7d32' : '#fff',
    color: active ? '#fff' : '#555',
    fontSize:13, fontWeight: active ? 800 : 600,
    cursor: active ? 'default' : 'pointer',
    transition:'all 0.12s', minWidth:36,
  })
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
      <button disabled={page === 1} onClick={() => onChange(page-1)} style={{ ...btnStyle(false), opacity: page===1 ? 0.4 : 1, cursor: page===1 ? 'not-allowed' : 'pointer' }}>‹ Назад</button>
      {pages.map(p => (
        <button key={p} onClick={() => onChange(p)} style={btnStyle(page === p)}>{p}</button>
      ))}
      <button disabled={page === totalPages} onClick={() => onChange(page+1)} style={{ ...btnStyle(false), opacity: page===totalPages ? 0.4 : 1, cursor: page===totalPages ? 'not-allowed' : 'pointer' }}>Вперёд ›</button>
    </div>
  )
}

// ══ ГЛАВНЫЙ КОМПОНЕНТ ══════════════════════════════════════════════════════
export default function AllPets() {
  const [tab, setTab]             = useState('clients')
  const [pets, setPets]           = useState([])
  const [clients, setClients]     = useState([])
  const [search, setSearch]       = useState('')
  const [filterSpecies, setFilterSpecies] = useState('')
  const [sortBy, setSortBy]       = useState('name')
  const [selectedClient, setSelectedClient] = useState(null)
  const [page, setPage]           = useState(1)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([api.get('/pets/all/list'), api.get('/users/clients')])
      .then(([p, c]) => { setPets(p.data); setClients(c.data) })
      .catch(console.error)
  }, [])

  // Сброс страницы при смене поиска/вкладки
  useEffect(() => { setPage(1) }, [search, tab, filterSpecies, sortBy])

  const getOwnerName = id => clients.find(c => c.id === id)?.full_name || '—'

  // ── Фильтрованные клиенты ─────────────────────────────────────────────
  const filteredClients = useMemo(() => clients
    .filter(c => {
      if (!search) return true
      const s = search.toLowerCase()
      const cp = pets.filter(p => p.owner_id === c.id)
      return c.full_name?.toLowerCase().includes(s) || c.login?.toLowerCase().includes(s) || cp.some(p => p.name?.toLowerCase().includes(s))
    })
    .sort((a,b) => a.full_name?.localeCompare(b.full_name, 'ru')),
  [clients, pets, search])

  // ── Фильтрованные питомцы ─────────────────────────────────────────────
  const filteredPets = useMemo(() => pets
    .filter(p => {
      const s = search.toLowerCase()
      const owner = clients.find(c => c.id === p.owner_id)
      return (!s || p.name?.toLowerCase().includes(s) || owner?.full_name?.toLowerCase().includes(s))
          && (!filterSpecies || p.species === filterSpecies)
    })
    .sort((a,b) => {
      if (sortBy === 'name')  return a.name?.localeCompare(b.name, 'ru')
      if (sortBy === 'owner') return (getOwnerName(a.owner_id)).localeCompare(getOwnerName(b.owner_id), 'ru')
      if (sortBy === 'weight') return (b.weight||0) - (a.weight||0)
      return 0
    }),
  [pets, clients, search, filterSpecies, sortBy])

  // ── Пагинация ─────────────────────────────────────────────────────────
  const currentList  = tab === 'clients' ? filteredClients : filteredPets
  const totalItems   = currentList.length
  const pagedItems   = currentList.slice((page-1)*ROWS_PER_PAGE, page*ROWS_PER_PAGE)

  const fld = { padding:'9px 14px', borderRadius:12, border:'1.5px solid #e0e0e0', fontSize:14, ...F, outline:'none', background:'#fff', transition:'border-color 0.2s', boxSizing:'border-box' }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'#f4f8f4', ...F, overflow:'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />

      {/* ── Шапка страницы (фиксированная) ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8f5e9', padding:'20px 36px 0', flexShrink:0 }}>
        <h1 style={{ ...F, fontSize:26, fontWeight:800, color:'#2d4a2d', margin:'0 0 4px' }}>🏥 Реестр ветеринарной станции</h1>
        <p style={{ ...F, margin:'0 0 16px', fontSize:13, color:'#7a9e7a', fontWeight:600 }}>ГБУ «Ветстанция г. Байконур»</p>

        {/* Вкладки */}
        <div style={{ display:'flex', gap:0, borderRadius:'12px 12px 0 0', overflow:'hidden', width:'fit-content', border:'1.5px solid #e0e0e0' }}>
          {[{ key:'clients', label:`👤 Клиенты (${clients.length})` }, { key:'animals', label:`🐾 Животные (${pets.length})` }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding:'10px 28px', border:'none', cursor:'pointer', fontSize:14, fontWeight:700, ...F, background:tab===t.key ? '#3a7d44' : '#fff', color:tab===t.key ? '#fff' : '#666', transition:'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Фильтры ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f0', padding:'12px 36px', flexShrink:0, display:'flex', gap:10, alignItems:'center' }}>
        <div style={{ position:'relative', flex:'1 1 320px' }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tab==='clients' ? 'Поиск по имени или кличке...' : 'Поиск по кличке или владельцу...'}
            style={{ ...fld, paddingLeft:36, width:'100%' }}
            onFocus={e => e.target.style.borderColor='#3a7d44'}
            onBlur={e => e.target.style.borderColor='#e0e0e0'} />
        </div>
        {tab === 'animals' && <>
          <select value={filterSpecies} onChange={e => setFilterSpecies(e.target.value)} style={{ ...fld, cursor:'pointer' }}>
            <option value="">🐾 Все виды</option>
            <option value="cat">🐱 Кошки</option>
            <option value="dog">🐶 Собаки</option>
            <option value="rabbit">🐰 Кролики</option>
            <option value="bird">🐦 Птицы</option>
            <option value="hamster">🐹 Хомяки</option>
            <option value="other">🐾 Другое</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...fld, cursor:'pointer' }}>
            <option value="name">А–Я по кличке</option>
            <option value="owner">А–Я по владельцу</option>
            <option value="weight">По весу</option>
          </select>
        </>}
      </div>

      {/* ── Таблица (скролл только здесь) ── */}
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', minHeight:0 }}>
        {tab === 'clients' ? (
          <div style={{ flex:1, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', ...F, tableLayout:'fixed' }}>
              <colgroup>
                <col style={{ width:'28%' }} />
                <col style={{ width:'22%' }} />
                <col style={{ width:'38%' }} />
                <col style={{ width:'12%' }} />
              </colgroup>
              <thead>
                <tr style={{ background:'#f4f8f4', borderBottom:'2px solid #e8f5e9' }}>
                  {['Клиент', 'Контакты', 'Питомцы', ''].map(h => (
                    <th key={h} style={{ padding:'12px 20px', textAlign:'left', fontSize:11, fontWeight:800, color:'#5a7a5a', textTransform:'uppercase', letterSpacing:1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedItems.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign:'center', padding:'48px', color:'#bbb', ...F }}>
                    <div style={{ fontSize:40 }}>👤</div><p style={{ fontWeight:700, marginTop:8 }}>Клиенты не найдены</p>
                  </td></tr>
                ) : pagedItems.map((client, i) => {
                  const cp = pets.filter(p => p.owner_id === client.id)
                  const initials = client.full_name?.charAt(0)?.toUpperCase() || '?'
                  const colors = ['#2e7d32','#1565c0','#6a1b9a','#b71c1c','#e65100','#00695c']
                  const bg = colors[client.id % colors.length]
                  return (
                    <tr key={client.id} style={{
                      height:62, borderBottom:'1px solid #f5f5f5',
                      background: i % 2 === 0 ? '#fff' : '#fafafa',
                      transition:'background 0.12s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background='#f1f8f1'}
                      onMouseLeave={e => e.currentTarget.style.background=i%2===0?'#fff':'#fafafa'}
                    >
                      {/* Клиент */}
                      <td style={{ padding:'0 20px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                          <div style={{ width:38, height:38, borderRadius:'50%', background:bg, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:16, flexShrink:0 }}>
                            {initials}
                          </div>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontWeight:700, fontSize:14, color:'#2d4a2d', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{client.full_name}</div>
                            <div style={{ fontSize:11, color:'#aaa', marginTop:1 }}>@{client.login}</div>
                          </div>
                        </div>
                      </td>
                      {/* Контакты */}
                      <td style={{ padding:'0 20px' }}>
                        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                          {client.email && <span style={{ fontSize:12, color:'#555', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>✉️ {client.email}</span>}
                          {client.phone && <span style={{ fontSize:12, color:'#555' }}>📞 {client.phone}</span>}
                          {!client.email && !client.phone && <span style={{ fontSize:12, color:'#ccc' }}>—</span>}
                        </div>
                      </td>
                      {/* Питомцы */}
                      <td style={{ padding:'0 20px' }}>
                        {cp.length === 0
                          ? <span style={{ fontSize:12, color:'#ccc' }}>Нет животных</span>
                          : <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                              {cp.slice(0, 4).map(p => {
                                const cfg = speciesCfg[p.species] || speciesCfg.other
                                return (
                                  <button key={p.id}
                                    onClick={() => navigate(`/pets/${p.id}/passport`)}
                                    style={{ padding:'3px 9px', borderRadius:20, border:'none', background:cfg.color, color:cfg.accent, fontSize:12, fontWeight:700, cursor:'pointer', ...F, transition:'all 0.12s' }}
                                    onMouseEnter={e => e.currentTarget.style.background=cfg.accent + '22'}
                                    onMouseLeave={e => e.currentTarget.style.background=cfg.color}
                                  >
                                    {speciesEmoji[p.species]} {p.name}
                                  </button>
                                )
                              })}
                              {cp.length > 4 && <span style={{ fontSize:12, color:'#aaa', alignSelf:'center' }}>+{cp.length-4}</span>}
                            </div>
                        }
                      </td>
                      {/* Действие */}
                      <td style={{ padding:'0 20px', textAlign:'center' }}>
                        <button onClick={() => setSelectedClient(client)} style={{
                          padding:'6px 14px', borderRadius:8, border:'1.5px solid #3a7d44',
                          background:'transparent', color:'#3a7d44', fontSize:13, fontWeight:700,
                          cursor:'pointer', ...F, transition:'all 0.15s', whiteSpace:'nowrap',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background='#3a7d44'; e.currentTarget.style.color='#fff' }}
                          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#3a7d44' }}
                        >Открыть →</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Вкладка Животные — таблица ── */
          <div style={{ flex:1, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', ...F, tableLayout:'fixed' }}>
              <colgroup>
                <col style={{ width:'18%' }} />
                <col style={{ width:'12%' }} />
                <col style={{ width:'20%' }} />
                <col style={{ width:'14%' }} />
                <col style={{ width:'8%' }} />
                <col style={{ width:'12%' }} />
                <col style={{ width:'8%' }} />
                <col style={{ width:'8%' }} />
              </colgroup>
              <thead>
                <tr style={{ background:'#f4f8f4', borderBottom:'2px solid #e8f5e9' }}>
                  {['Животное','Вид','Владелец','Порода','Пол','Возраст','Вес',''].map(h => (
                    <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11, fontWeight:800, color:'#5a7a5a', textTransform:'uppercase', letterSpacing:1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedItems.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign:'center', padding:'48px', color:'#bbb', ...F }}>
                    <div style={{ fontSize:40 }}>🐾</div><p style={{ fontWeight:700, marginTop:8 }}>Животные не найдены</p>
                  </td></tr>
                ) : pagedItems.map((pet, i) => {
                  const cfg = speciesCfg[pet.species] || speciesCfg.other
                  const archived = pet.is_archived
                  return (
                    <tr key={pet.id} style={{
                      height:62, borderBottom:'1px solid #f5f5f5',
                      background: archived ? '#fafaf7' : i%2===0?'#fff':'#fafafa',
                      cursor:'pointer', transition:'background 0.12s',
                      opacity: archived ? 0.75 : 1,
                    }}
                      onMouseEnter={e => e.currentTarget.style.background=archived?'#f5f5ee':'#f1f8f1'}
                      onMouseLeave={e => e.currentTarget.style.background=archived?'#fafaf7':i%2===0?'#fff':'#fafafa'}
                      onClick={() => navigate(`/pets/${pet.id}/passport`)}
                    >
                      <td style={{ padding:'0 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ position:'relative', flexShrink:0 }}>
                            <div style={{ width:34, height:34, borderRadius:'50%', background:archived?'#e5e7eb':cfg.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, filter:archived?'grayscale(1)':'none' }}>
                              {pet.photo_url ? <img src={pet.photo_url.startsWith('http')?pet.photo_url:`http://localhost:8003${pet.photo_url}`} alt={pet.name} style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} /> : speciesEmoji[pet.species]||'🐾'}
                            </div>
                            {archived && (
                              <div style={{ position:'absolute', bottom:-2, right:-2, background:'#6b7280', borderRadius:'50%', width:14, height:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#fff', border:'1.5px solid #fff' }}>📦</div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight:700, fontSize:14, color:archived?'#6b7280':'#2d4a2d', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textDecoration:archived?'line-through':'none' }}>{pet.name}</div>
                            {archived && (
                              <div style={{ fontSize:10, color:'#9ca3af', marginTop:1, ...F }}>
                                📦 {pet.archive_reason==='died'?'Погиб':pet.archive_reason==='moved'?'Переезд':pet.archive_reason==='lost'?'Пропал':'Архив'}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'0 14px' }}>
                        <span style={{ padding:'2px 9px', borderRadius:12, background:archived?'#f3f4f6':cfg.color, color:archived?'#6b7280':cfg.accent, fontSize:11, fontWeight:700 }}>{speciesRu[pet.species]||'—'}</span>
                      </td>
                      <td style={{ padding:'0 14px', fontSize:13, color:archived?'#9ca3af':'#555', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{getOwnerName(pet.owner_id)}</td>
                      <td style={{ padding:'0 14px', fontSize:13, color:'#888', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pet.breed||'—'}</td>
                      <td style={{ padding:'0 14px', fontSize:13, color:'#888' }}>{pet.gender==='male'?'♂':pet.gender==='female'?'♀':'—'}</td>
                      <td style={{ padding:'0 14px', fontSize:13, color:'#888' }}>{getAge(pet.birth_date)||'—'}</td>
                      <td style={{ padding:'0 14px', fontSize:13, color:'#888' }}>{pet.weight?`${pet.weight} кг`:'—'}</td>
                      <td style={{ padding:'0 14px', textAlign:'center' }}>
                        <button onClick={e => { e.stopPropagation(); navigate(`/pets/${pet.id}/passport`) }} style={{ padding:'5px 10px', borderRadius:8, border:`1.5px solid ${archived?'#9ca3af':'#3a7d44'}`, background:'transparent', color:archived?'#9ca3af':'#3a7d44', fontSize:12, fontWeight:700, cursor:'pointer', ...F }}>📋</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Пагинация (всегда внизу) ── */}
      <div style={{ background:'#fff', borderTop:'1px solid #e8f5e9', padding:'12px 36px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ ...F, fontSize:13, color:'#aaa', fontWeight:600 }}>
          Найдено: <strong style={{ color:'#2e7d32' }}>{totalItems}</strong> · Страница {page} из {Math.max(1, Math.ceil(totalItems/ROWS_PER_PAGE))}
        </span>
        <Pagination page={page} total={totalItems} perPage={ROWS_PER_PAGE} onChange={setPage} />
        <div style={{ width:180 }} /> {/* выравниватель */}
      </div>

      {/* Модальное окно */}
      {selectedClient && (
        <ClientModal client={selectedClient} pets={pets} onClose={() => setSelectedClient(null)}
          onOpenPassport={id => { setSelectedClient(null); navigate(`/pets/${id}/passport`) }} />
      )}
    </div>
  )
}
