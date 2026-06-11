import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'

const F = { fontFamily: "'Nunito', sans-serif" }
const speciesRu  = { cat:'Кошка', dog:'Собака', rabbit:'Кролик', bird:'Птица', hamster:'Хомяк', other:'Другое' }
const genderRu   = { male:'Мужской', female:'Женский' }

function fmt(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('ru',{day:'numeric',month:'long',year:'numeric'}) } catch { return d } }
function fmtS(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('ru',{day:'2-digit',month:'2-digit',year:'numeric'}) } catch { return d } }

function getAge(b) {
  if (!b) return null
  const m = (new Date().getFullYear()-new Date(b).getFullYear())*12+(new Date().getMonth()-new Date(b).getMonth())
  if (m<1) return 'меньше мес.'; if (m<12) return `${m} мес.`
  const y=Math.floor(m/12),r=m%12; return r===0?`${y} л.`:`${y} л. ${r} мес.`
}

// ── Input helpers ─────────────────────────────────────────────────────────
const fld = (extra={}) => ({
  width:'100%', padding:'7px 10px', border:'1px solid #cbd5e0', borderRadius:6,
  fontSize:13, ...F, outline:'none', background:'#fff', boxSizing:'border-box', ...extra,
})

function Field({ label, value, onChange, type='text', options, multi, readOnly, rows=3 }) {
  const baseStyle = fld({ background: readOnly?'#f8f9fa':'#fff' })
  return (
    <div style={{ marginBottom:10 }}>
      <label style={{ ...F, fontSize:11, fontWeight:700, color:'#64748b', display:'block', marginBottom:3, textTransform:'uppercase', letterSpacing:0.5 }}>{label}</label>
      {options ? (
        <select value={value||''} onChange={e=>onChange(e.target.value)} style={baseStyle} disabled={readOnly}>
          <option value="">— не указано —</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : multi ? (
        <textarea value={value||''} onChange={e=>onChange(e.target.value)} rows={rows} style={{ ...baseStyle, resize:'vertical' }} readOnly={readOnly} />
      ) : (
        <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} style={baseStyle} readOnly={readOnly} />
      )}
    </div>
  )
}

function Btn({ onClick, children, variant='outline', danger, disabled, small }) {
  const base = { ...F, border:'1px solid', borderRadius:6, cursor:disabled?'not-allowed':'pointer', fontWeight:600, opacity:disabled?0.5:1, transition:'all 0.12s', whiteSpace:'nowrap', }
  const sizes = small ? { padding:'4px 10px', fontSize:12 } : { padding:'7px 14px', fontSize:13 }
  const styles = {
    outline: { ...base, ...sizes, background:'#fff', borderColor:'#cbd5e0', color:'#374151' },
    primary: { ...base, ...sizes, background:'#166534', borderColor:'#166534', color:'#fff' },
    danger:  { ...base, ...sizes, background:'#dc2626', borderColor:'#dc2626', color:'#fff' },
    ghost:   { ...base, ...sizes, background:'transparent', borderColor:'transparent', color:'#166534' },
  }
  return <button onClick={onClick} disabled={disabled} style={styles[variant]}>{children}</button>
}

// ── Таблица медзаписей ────────────────────────────────────────────────────
function MedTable({ columns, rows, emptyText }) {
  return (
    <div style={{ border:'1px solid #e2e8f0', borderRadius:6, overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', ...F, fontSize:14 }}>
        <thead>
          <tr style={{ background:'#1e293b' }}>
            {columns.map(c => <th key={c} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, color:'#fff', fontSize:11, textTransform:'uppercase', letterSpacing:0.6 }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={columns.length} style={{ padding:'32px', textAlign:'center', color:'#94a3b8', ...F }}>
                {emptyText || 'Записей нет'}
              </td></tr>
            : rows.map((row, i) => (
              <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background:i%2===0?'#fff':'#f8fafc' }}>
                {row.map((cell, j) => <td key={j} style={{ padding:'10px 14px', color:'#1a202c', verticalAlign:'top', fontSize:14 }}>{cell}</td>)}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  )
}

// ── Модальное окно ────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', zIndex:1400, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:8, width:'100%', maxWidth:520, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', ...F }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontWeight:800, fontSize:15, color:'#1e293b' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94a3b8' }}>×</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>{children}</div>
        {footer && <div style={{ padding:'12px 20px', borderTop:'1px solid #e2e8f0', display:'flex', gap:8, justifyContent:'flex-end' }}>{footer}</div>}
      </div>
    </div>
  )
}

// ── Главный компонент ─────────────────────────────────────────────────────────


// ═══════════════════════════════════════════════════════════════════════════
export default function PetPassport() {
  const { petId } = useParams()
  const navigate  = useNavigate()
  const printRef  = useRef()

  const [data, setData]         = useState(null)
  const [user, setUser]         = useState(null)
  const [tab, setTab]           = useState(0)
  const [vaccineTypes, setVaccineTypes] = useState([])
  const [msg, setMsg]           = useState('')
  const [loadError, setLoadError] = useState(null)

  // Модальные окна
  const [vacOpen, setVacOpen]   = useState(false)
  const [parasiteOpen, setParasiteOpen] = useState(false)
  const [passOpen, setPassOpen] = useState(false)
  const [labOpen, setLabOpen]   = useState(false)
  const [titerOpen, setTiterOpen] = useState(false)
  const [titerForm, setTiterForm] = useState({ sample_date:'', laboratory:'', result:'', record_date:'', vet_name:'' })
  const [examOpen, setExamOpen] = useState(false)
  const [examForm, setExamForm] = useState({ exam_date:'', vet_name:'', authorized_name:'', notes:'' })
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiveForm, setArchiveForm] = useState({ reason:'died', note:'' })
  const [medHistory, setMedHistory] = useState([])
  const [selectedVisit, setSelectedVisit] = useState(null)
  // Вкладка «Анализы»
  const [labFilter, setLabFilter] = useState(null)
  const [addLabOpen, setAddLabOpen] = useState(false)
  const [addLabForm, setAddLabForm] = useState({ service:'', result:'', date: new Date().toISOString().split('T')[0], notes:'' })
  // Назначить анализы (заявка в лабораторию)
  const [orderLabOpen, setOrderLabOpen] = useState(false)
  const [orderLabServices, setOrderLabServices] = useState([])
  const [orderLabDate, setOrderLabDate] = useState('')
  const [orderLabNotes, setOrderLabNotes] = useState('')
  const [labOrders, setLabOrders] = useState([])
  const [labDetailOrder, setLabDetailOrder] = useState(null)
  const [orderSuccess, setOrderSuccess] = useState('')

  // Формы
  const today = new Date().toISOString().split('T')[0]
  const [vacForm, setVacForm]   = useState({ vaccine_name:'', batch_number:'', manufacturer:'', manufacture_date:'', expiry_date:'', date_given: new Date().toISOString().split('T')[0], notes:'' })
  const [parasiteForm, setParasiteForm] = useState({ type:'ecto_parasite', drug_name:'', manufacturer:'', date:'', doctor:'' })
  const [labForm, setLabForm]   = useState({ felv:'negative', fiv:'negative', notes:'' })
  const [passForm, setPassForm] = useState({
    microchip_number:'', passport_number:'', blood_type:'', allergies:'', chronic_diseases:'',
    coat_color:'', special_marks:'', reproduction:'', chip_location:'', chip_date:'',
    tattoo_number:'', tattoo_date:'', owner_address:'', owner_city:'Байконур',
    owner_zip:'468320', issue_date:'',
  })


  const load = async () => {
    try {
      const [me, pass] = await Promise.all([
        api.get('/auth/me'),
        api.get(`/passport/${petId}`),
      ])
      setUser(me.data)
      setData(pass.data)
      if (pass.data.passport) setPassForm(p => ({ ...p, ...pass.data.passport }))
    } catch(e) {
      console.error('passport load error:', e)
      setLoadError(e?.response?.data?.detail || e?.message || 'Неизвестная ошибка')
    }

    // Загружаем историю болезней
    try {
      const hist = await api.get(`/passport/${petId}/medical_history`)
      setMedHistory(hist.data)
    } catch {}

    try {
      const types = await api.get('/passport/vaccines/schedule')
      setVaccineTypes(types.data)
    } catch(e) {
      setVaccineTypes([
        { name: 'Бешенство', interval_days: 365 },
        { name: 'Комплексная (кошки)', interval_days: 365 },
        { name: 'Комплексная (собаки)', interval_days: 365 },
        { name: 'Лептоспироз', interval_days: 365 },
        { name: 'Гепатит', interval_days: 365 },
        { name: 'Парвовироз', interval_days: 365 },
        { name: 'Чума плотоядных', interval_days: 365 },
        { name: 'Бордетеллёз', interval_days: 365 },
        { name: 'Лейкемия кошек', interval_days: 365 },
      ])
    }

    // Загружаем лаб. заявки
    try {
      const orders = await api.get(`/lab/orders/pet/${petId}`)
      setLabOrders(orders.data)
    } catch {}
  }

  useEffect(() => { load() }, [petId])

  if (loadError) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column', gap:12, ...F, padding:32 }}>
      <div style={{ fontSize:36 }}>⚠️</div>
      <div style={{ fontSize:16, color:'#dc2626', fontWeight:700 }}>Ошибка загрузки паспорта</div>
      <div style={{ fontSize:13, color:'#64748b', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'12px 20px', maxWidth:500, textAlign:'center' }}>
        {loadError}
      </div>
      <button onClick={() => { setLoadError(null); load() }} style={{ ...F, padding:'8px 20px', borderRadius:8, border:'none', background:'#166534', color:'#fff', fontWeight:700, cursor:'pointer', marginTop:8 }}>
        Попробовать снова
      </button>
    </div>
  )

  if (!data) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column', gap:12, ...F }}>
      <div style={{ fontSize:36 }}>🐾</div>
      <div style={{ fontSize:15, color:'#94a3b8', fontWeight:600 }}>Загрузка паспорта...</div>
      <div style={{ fontSize:12, color:'#cbd5e0' }}>Если страница не загружается — проверьте что бэкенд запущен</div>
    </div>
  )

  const { pet, passport, vaccinations=[], health_logs=[], procedures=[] } = data
  const owner = data.owner || {}
  const isVet   = user?.role === 'vet' || user?.role === 'assistant' || user?.role === 'head'
  const canEdit = isVet || user?.id === pet?.owner_id

  // FeLV/FIV статус
  const felv = passport?.felv_status
  const fiv  = passport?.fiv_status
  const isCritical = felv === 'positive' || fiv === 'positive'

  // Предстоящие вакцинации
  const upcoming = vaccinations.filter(v => v.is_confirmed && v.next_due_date).map(v => {
    const days = Math.round((new Date(v.next_due_date)-new Date())/(1000*60*60*24))
    return { ...v, days }
  }).filter(v => v.days <= 90).sort((a,b) => a.days-b.days)

  const photoUrl = pet.photo_url
    ? (pet.photo_url.startsWith('http') ? pet.photo_url : `http://localhost:8003${pet.photo_url}`)
    : null

  // Сохранить паспорт
  const confirmPassport = async () => {
    try {
      if (!passport) {
        // Создаём паспорт через POST и сразу подтверждаем
        await api.post(`/passport/${petId}/passport`, { is_confirmed: true })
      } else {
        await api.post(`/passport/${petId}/passport/confirm`)
      }
      await load()
      setMsg('✓ Данные подтверждены')
    } catch(e) {
      console.error('confirm error:', e)
      // Пробуем альтернативный путь
      try {
        await api.post(`/passport/${petId}/confirm`)
        await load()
        setMsg('✓ Данные подтверждены')
      } catch(e2) { console.error('confirm fallback error:', e2) }
    }
  }

  const confirmVaccination = async (vacId) => {
    try {
      await api.post(`/passport/${petId}/vaccination/${vacId}/confirm`)
      await load()
    } catch(e) { console.error(e) }
  }

  const savePassport = async () => {
    try {
      await api.put(`/passport/${petId}`, passForm)
      await load(); setPassOpen(false); setMsg('Паспорт обновлён')
    } catch(e) { console.error(e) }
  }

  // Добавить вакцинацию
  const saveVac = async () => {
    try {
      const fd = new FormData()
      Object.entries(vacForm).forEach(([k,v]) => { if(v) fd.append(k,v) })
      fd.append('is_confirmed', 'true')  // ветеринар вносит — сразу подтверждено
      await api.post(`/passport/${petId}/vaccination`, fd, { headers:{'Content-Type':'multipart/form-data'} })
      await load(); setVacOpen(false)
      setVacForm({ vaccine_name:'', batch_number:'', manufacturer:'', manufacture_date:'', expiry_date:'', date_given: new Date().toISOString().split('T')[0], notes:'', _customVaccine:false })
    } catch(e) { console.error(e) }
  }

  // ── Печать полного паспорта ───────────────────────────────────────────────
  const printPassport = () => {
    const vacs = vaccinations.map(v => `<tr><td>${fmtS(v.date_given)}</td><td>${v.vaccine_name||'—'}</td><td>${v.manufacturer||'—'}</td><td>${v.batch_number||'—'}</td><td>${v.next_due_date?fmtS(v.next_due_date):'—'}</td><td>${v.vet_name||'—'}</td></tr>`).join('')
    const ecto = procedures.filter(p=>p.type==='ecto_parasite').map(p=>`<tr><td>${fmtS(p.date)}</td><td>${p.drug_name||'—'}</td><td>${p.manufacturer||'—'}</td><td>${p.vet_name||'—'}</td></tr>`).join('')
    const dew  = procedures.filter(p=>p.type==='deworming').map(p=>`<tr><td>${fmtS(p.date)}</td><td>${p.drug_name||'—'}</td><td>${p.manufacturer||'—'}</td><td>${p.vet_name||'—'}</td></tr>`).join('')
    const exams = (passport?.clinical_exams||[]).map(e=>`<div style="border:1px solid #ccc;padding:10px;margin:6px 0"><p style="margin-bottom:6px">Животное <b>${pet.name}</b> клинически здорово и может быть транспортировано. ${e.notes||''}</p><table style="width:100%;border:none"><tr><td style="border:none;padding:3px 8px"><b>Дата:</b> ${fmtS(e.exam_date)}</td><td style="border:none;padding:3px 8px"><b>Врач:</b> ${e.vet_name||'—'}</td><td style="border:none;padding:3px 8px"><b>Уполномоченное лицо:</b> ${e.authorized_name||'—'}</td><td style="border:none;padding:3px 8px"><b>Подпись:</b> ______________</td></tr></table></div>`).join('')
    const repro = passport?.reproduction==='intact'?'Не кастрирован':passport?.reproduction==='sterilized'?'Стерилизован':passport?.reproduction==='castrated'?'Кастрирован':'—'
    const w = window.open('','_blank')
    w.document.write(`<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Паспорт — ${pet.name}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Times New Roman',serif;font-size:12pt;color:#000;background:#fff}
.page{max-width:210mm;margin:0 auto;padding:15mm 20mm}
.header{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:14px}
.header .org{font-size:10pt;color:#333;margin-bottom:3px}
.header h1{font-size:16pt;font-weight:bold;text-transform:uppercase;letter-spacing:2px;margin:6px 0}
.header .pname{font-size:22pt;font-weight:bold;margin:4px 0}
.header .meta{font-size:10pt;color:#555}
.verified{border:1px solid #86efac;background:#f0fdf4;padding:5px 10px;font-size:10pt;color:#166534;margin:6px auto;display:inline-block}
.stitle{background:#1e293b;color:#fff;padding:6px 12px;font-size:10pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-top:14px;margin-bottom:0}
table{width:100%;border-collapse:collapse}
td,th{border:1px solid #ccc;padding:5px 8px;font-size:10pt;vertical-align:top}
th{background:#f5f5f5;font-weight:bold;text-align:left;font-size:9pt;text-transform:uppercase}
.lbl{width:25%;font-weight:600;color:#444;background:#fafafa;font-size:9pt;text-transform:uppercase}
.no{color:#999;font-style:italic;padding:8px;text-align:center;border:1px solid #eee}
.footer{margin-top:20px;border-top:1px solid #ccc;padding-top:8px;font-size:9pt;color:#666;text-align:center}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.stitle{background:#1e293b!important;color:#fff!important}}
</style></head><body><div class="page">
<div class="header">
  <div class="org">Администрация города Байконур</div>
  <div class="org">ГБУ «Городская ветеринарная станция города Байконур» (ГБУ «Горветстанция»)</div>
  <div class="org">ул. Носова, д. 14 · +7 (33622) 4-62-68 · gvsbaykonur2005@yandex.ru</div>
  <h1>Ветеринарный паспорт</h1>
  <div class="pname">${pet.name}</div>
  <div class="meta">${speciesRu[pet.species]||pet.species} · ${pet.breed||'—'} · ${genderRu[pet.gender]||'—'} · ${getAge(pet.birth_date)||'—'}</div>
  ${passport?.is_confirmed?'<div class="verified">✓ Паспорт верифицирован ветеринарным врачом</div>':''}
</div>
<div class="stitle">Раздел I — Владелец животного / Owner</div>
<table><tr><td class="lbl">ФИО / Name</td><td>${owner.full_name||'—'}</td><td class="lbl">Телефон / Phone</td><td>${owner.phone||'—'}</td></tr>
<tr><td class="lbl">Адрес / Address</td><td>${passport?.owner_address||'—'}</td><td class="lbl">E-mail</td><td>${owner.email||'—'}</td></tr>
<tr><td class="lbl">Город / City</td><td>${passport?.owner_city||'—'}</td><td class="lbl">Индекс / Postcode</td><td>${passport?.owner_zip||'—'}</td></tr></table>
<div class="stitle">Раздел II — Описание животного / Description of Animal</div>
<table><tr><td class="lbl">Кличка / Name</td><td>${pet.name}</td><td class="lbl">Вид / Species</td><td>${speciesRu[pet.species]||pet.species||'—'}</td></tr>
<tr><td class="lbl">Порода / Breed</td><td>${pet.breed||'—'}</td><td class="lbl">Пол / Sex</td><td>${genderRu[pet.gender]||'—'}</td></tr>
<tr><td class="lbl">Дата рождения</td><td>${fmtS(pet.birth_date)}</td><td class="lbl">Вес / Weight</td><td>${pet.weight?pet.weight+' кг':'—'}</td></tr>
<tr><td class="lbl">Окрас / Coat colour</td><td>${passport?.coat_color||'—'}</td><td class="lbl">Особые отметины</td><td>${passport?.special_marks||'—'}</td></tr></table>
<div class="stitle">Раздел III — Идентификация / Identification</div>
<table><tr><td class="lbl">Микрочип №</td><td>${passport?.microchip_number||'—'}</td><td class="lbl">Дата чипирования</td><td>${passport?.chip_date?fmtS(passport.chip_date):'—'}</td></tr>
<tr><td class="lbl">Расположение чипа</td><td>${passport?.chip_location||'—'}</td><td class="lbl">Клеймо №</td><td>${passport?.tattoo_number||'—'}</td></tr>
<tr><td class="lbl">Паспорт №</td><td>${passport?.passport_number||'—'}</td><td class="lbl">Дата выдачи</td><td>${passport?.issue_date?fmtS(passport.issue_date):'—'}</td></tr>
<tr><td class="lbl">Репродукция</td><td>${repro}</td><td class="lbl">Группа крови</td><td>${passport?.blood_type||'—'}</td></tr></table>
<div class="stitle">Раздел IV — Вакцинация / Vaccination</div>
${vacs?`<table><tr><th>Дата</th><th>Вакцина</th><th>Производитель</th><th>№ партии</th><th>Действ. до</th><th>Ветеринарный врач</th></tr>${vacs}</table>`:'<div class="no">Записей нет</div>'}
<div class="stitle">Раздел VI — Против эктопаразитов / Ectoparasites</div>
${ecto?`<table><tr><th>Дата</th><th>Препарат</th><th>Производитель</th><th>Ветеринарный врач</th></tr>${ecto}</table>`:'<div class="no">Записей нет</div>'}
<div class="stitle">Раздел VII — Дегельминтизация / Deworming</div>
${dew?`<table><tr><th>Дата</th><th>Препарат</th><th>Производитель</th><th>Ветеринарный врач</th></tr>${dew}</table>`:'<div class="no">Записей нет</div>'}
<div class="stitle">Раздел IX — Клиническое обследование / Clinical Examination</div>
${exams||'<div class="no">Записей нет</div>'}
<div class="footer">Документ сформирован: ${new Date().toLocaleDateString('ru')} · ГБУ «Горветстанция г. Байконур»</div>
</div><script>window.onload=()=>window.print()</script></body></html>`)
    w.document.close()
  }

  const exportPDF = () => {
    // Открываем страницу печати и сразу вызываем сохранение как PDF
    const vacs = vaccinations.map(v => `
      <tr>
        <td>${fmtS(v.date_given)}</td><td>${v.vaccine_name||'—'}</td>
        <td>${v.manufacturer||'—'}</td><td>${v.batch_number||'—'}</td>
        <td>${v.next_due_date?fmtS(v.next_due_date):'—'}</td><td>${v.vet_name||'—'}</td>
      </tr>`).join('')
    const ecto = procedures.filter(p=>p.type==='ecto_parasite').map(p=>`<tr><td>${fmtS(p.date)}</td><td>${p.drug_name||'—'}</td><td>${p.manufacturer||'—'}</td><td>${p.vet_name||'—'}</td></tr>`).join('')
    const dew  = procedures.filter(p=>p.type==='deworming').map(p=>`<tr><td>${fmtS(p.date)}</td><td>${p.drug_name||'—'}</td><td>${p.manufacturer||'—'}</td><td>${p.vet_name||'—'}</td></tr>`).join('')
    const repro = passport?.reproduction==='intact'?'Не кастрирован':passport?.reproduction==='sterilized'?'Стерилизован':passport?.reproduction==='castrated'?'Кастрирован':'—'

    const w = window.open('','_blank')
    w.document.write(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Паспорт — ${pet.name}</title>
  <style>
    @charset "UTF-8";
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #000; background: #fff; }
    .page { max-width: 210mm; margin: 0 auto; padding: 12mm 18mm; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 14px; }
    .org { font-size: 9pt; color: #444; margin-bottom: 3px; }
    h1 { font-size: 15pt; font-weight: bold; text-transform: uppercase; margin: 6px 0; }
    .pname { font-size: 20pt; font-weight: bold; margin: 4px 0; color: #1e293b; }
    .meta { font-size: 10pt; color: #555; }
    .verified { display: inline-block; border: 1px solid #86efac; background: #f0fdf4; padding: 4px 10px; font-size: 10pt; color: #166534; margin: 5px 0; border-radius: 4px; }
    .stitle { background: #1e293b; color: #fff; padding: 6px 12px; font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 12px 0 0; }
    table { width: 100%; border-collapse: collapse; }
    td, th { border: 1px solid #ccc; padding: 5px 8px; font-size: 10pt; vertical-align: top; }
    th { background: #f1f5f9; font-weight: bold; text-align: left; font-size: 9pt; text-transform: uppercase; }
    .lbl { width: 25%; font-weight: 600; color: #374151; background: #f8fafc; font-size: 9pt; text-transform: uppercase; }
    .no { color: #999; font-style: italic; padding: 8px; text-align: center; border: 1px solid #eee; margin-top: 4px; }
    .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 9pt; color: #666; text-align: center; }
    .btn { display: block; margin: 16px auto; padding: 10px 28px; background: #1e293b; color: #fff; border: none; border-radius: 6px; font-size: 13pt; cursor: pointer; font-family: Arial, sans-serif; }
    @media print { .btn { display: none; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .stitle { background: #1e293b !important; color: #fff !important; } }
  </style>
</head>
<body>
<div class="page">
  <button class="btn" onclick="window.print()">📥 Сохранить как PDF / Распечатать</button>

  <div class="header">
    <div class="org">Администрация города Байконур</div>
    <div class="org">ГБУ &laquo;Городская ветеринарная станция города Байконур&raquo; (ГБУ &laquo;Горветстанция&raquo;)</div>
    <div class="org">ул. Носова, д. 14 &nbsp;&middot;&nbsp; +7 (33622) 4-62-68 &nbsp;&middot;&nbsp; gvsbaykonur2005@yandex.ru</div>
    <h1>Ветеринарный паспорт</h1>
    <div class="pname">${pet.name}</div>
    <div class="meta">${speciesRu[pet.species]||pet.species||'—'} &middot; ${pet.breed||'—'} &middot; ${genderRu[pet.gender]||'—'} &middot; ${getAge(pet.birth_date)||'—'}</div>
    ${passport?.is_confirmed ? '<div class="verified">&#10003; Паспорт верифицирован ветеринарным врачом</div>' : ''}
  </div>

  <div class="stitle">Раздел I — Владелец животного / Owner</div>
  <table>
    <tr><td class="lbl">ФИО / Name</td><td>${owner.full_name||'—'}</td><td class="lbl">Телефон / Phone</td><td>${owner.phone||'—'}</td></tr>
    <tr><td class="lbl">Адрес / Address</td><td>${passport?.owner_address||'—'}</td><td class="lbl">E-mail</td><td>${owner.email||'—'}</td></tr>
    <tr><td class="lbl">Город / City</td><td>${passport?.owner_city||'—'}</td><td class="lbl">Индекс / Postcode</td><td>${passport?.owner_zip||'—'}</td></tr>
  </table>

  <div class="stitle">Раздел II — Описание животного / Description of Animal</div>
  <table>
    <tr><td class="lbl">Кличка / Name</td><td>${pet.name}</td><td class="lbl">Вид / Species</td><td>${speciesRu[pet.species]||pet.species||'—'}</td></tr>
    <tr><td class="lbl">Порода / Breed</td><td>${pet.breed||'—'}</td><td class="lbl">Пол / Sex</td><td>${genderRu[pet.gender]||'—'}</td></tr>
    <tr><td class="lbl">Дата рождения</td><td>${fmtS(pet.birth_date)}</td><td class="lbl">Вес / Weight</td><td>${pet.weight?pet.weight+' кг':'—'}</td></tr>
    <tr><td class="lbl">Окрас / Coat</td><td>${passport?.coat_color||'—'}</td><td class="lbl">Особые отметины</td><td>${passport?.special_marks||'—'}</td></tr>
  </table>

  <div class="stitle">Раздел III — Идентификация / Identification</div>
  <table>
    <tr><td class="lbl">Микрочип №</td><td>${passport?.microchip_number||'—'}</td><td class="lbl">Дата чипирования</td><td>${passport?.chip_date?fmtS(passport.chip_date):'—'}</td></tr>
    <tr><td class="lbl">Расположение чипа</td><td>${passport?.chip_location||'—'}</td><td class="lbl">Клеймо №</td><td>${passport?.tattoo_number||'—'}</td></tr>
    <tr><td class="lbl">Паспорт №</td><td>${passport?.passport_number||'—'}</td><td class="lbl">Дата выдачи</td><td>${passport?.issue_date?fmtS(passport.issue_date):'—'}</td></tr>
    <tr><td class="lbl">Репродукция</td><td>${repro}</td><td class="lbl">Группа крови</td><td>${passport?.blood_type||'—'}</td></tr>
  </table>

  <div class="stitle">Раздел IV — Вакцинация / Vaccination</div>
  ${vacs ? `<table><tr><th>Дата</th><th>Вакцина</th><th>Производитель</th><th>№ партии</th><th>Действ. до</th><th>Ветеринарный врач</th></tr>${vacs}</table>` : '<div class="no">Записей нет</div>'}

  <div class="stitle">Раздел VI — Против эктопаразитов / Ectoparasites</div>
  ${ecto ? `<table><tr><th>Дата</th><th>Препарат</th><th>Производитель</th><th>Ветеринарный врач</th></tr>${ecto}</table>` : '<div class="no">Записей нет</div>'}

  <div class="stitle">Раздел VII — Дегельминтизация / Deworming</div>
  ${dew ? `<table><tr><th>Дата</th><th>Препарат</th><th>Производитель</th><th>Ветеринарный врач</th></tr>${dew}</table>` : '<div class="no">Записей нет</div>'}

  <div class="footer">
    Документ сформирован: ${new Date().toLocaleDateString('ru')} &nbsp;&middot;&nbsp; ГБУ &laquo;Горветстанция г. Байконур&raquo;
  </div>
</div>
</body>
</html>`)
    w.document.close()
  }


  // Сформировать справку
  const printCertificate = () => {
    const w = window.open('','_blank')
    w.document.write(`
      <html><head><title>Справка</title>
      <style>body{font-family:Times New Roman,serif;margin:40px;font-size:14px;line-height:1.8}
      h2{text-align:center;text-transform:uppercase;font-size:16px}
      .org{text-align:center;font-size:12px;margin-bottom:24px}
      .body{margin-top:24px}.sign{margin-top:48px;display:flex;justify-content:space-between}</style>
      </head><body>
      <div class="org">Администрация города Байконур<br/>ГБУ «Горветстанция» · ул. Носова, 14 · +7 (33622) 4-62-68</div>
      <h2>Ветеринарная справка</h2>
      <div class="body">
      <p>Животное <b>${pet.name}</b> (${speciesRu[pet.species]||pet.species}, ${pet.breed||'порода не указана'}) клинически здорово и может быть транспортировано.</p>
      <p>Владелец: ${owner.full_name||'—'}</p>
      <p>Дата осмотра: <b>${new Date().toLocaleDateString('ru')}</b></p>
      <p>Ветеринарный врач: ${user?.full_name||'—'}</p>
      </div>
      <div class="sign"><span>Подпись врача: ______________</span><span>Печать</span></div>
      </body></html>
    `)
    w.document.close(); w.print()
  }

  const saveParasite = async () => {
    try {
      await api.post(`/passport/${petId}/procedure`, {
        type: parasiteForm.type,
        drug_name: parasiteForm.drug_name || '',
        manufacturer: parasiteForm.manufacturer || '',
        date: parasiteForm.date || new Date().toISOString().split('T')[0],
        doctor: parasiteForm.doctor || user?.full_name || '',
      })
      await load(); setParasiteOpen(false)
    } catch(e) { console.error(e) }
  }

  const saveLabStatus = async () => {
    try {
      await api.put(`/passport/${petId}`, { felv_status: labForm.felv, fiv_status: labForm.fiv })
      await load(); setLabOpen(false)
    } catch(e) { console.error(e) }
  }

  const TABS = ['Паспортные данные', 'Вакцинация', 'Обработки', 'Лаборатория', 'Клиническое обследование', 'История болезней', '🔬 Анализы']

  return (
    <div style={{ height:'calc(100vh - 64px)', display:'flex', flexDirection:'column', background:'#f1f5f9', overflow:'hidden', ...F }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />

      {/* ── Топ-бар ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'10px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Btn onClick={() => navigate(isVet?'/all-pets':'/pets')} small>← Назад</Btn>
          <div>
            <div style={{ fontWeight:800, fontSize:16, color:'#1e293b' }}>
              {pet.name}
              {isCritical && <span style={{ marginLeft:10, background:'#dc2626', color:'#fff', borderRadius:4, padding:'2px 8px', fontSize:11, fontWeight:700 }}>⚠ FeLV/FIV ПОЗИТИВНЫЙ</span>}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {isVet && <Btn onClick={() => setPassOpen(true)} variant="primary" small>✏ Редактировать</Btn>}
          {isVet && <Btn onClick={() => { setOrderLabServices([]); setOrderLabDate(''); setOrderLabNotes(''); setOrderSuccess(''); setOrderLabOpen(true) }} variant="primary" small>🔬 Назначить анализы</Btn>}
        </div>
      </div>

      {msg && <div style={{ background:'#dcfce7', borderBottom:'1px solid #bbf7d0', padding:'8px 24px', fontSize:13, color:'#166534', ...F, flexShrink:0 }}>{msg} <button onClick={()=>setMsg('')} style={{ marginLeft:8, background:'none', border:'none', cursor:'pointer', color:'#166534' }}>×</button></div>}

      {pet?.is_archived && (
        <div style={{ background:'#fef3c7', borderBottom:'1px solid #fde68a', padding:'8px 24px', fontSize:13, color:'#92400e', fontWeight:600, ...F, flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>📦 Карта архивирована
            {pet.archive_reason === 'died'  && ' — животное погибло'}
            {pet.archive_reason === 'moved' && ' — переезд владельца'}
            {pet.archive_reason === 'lost'  && ' — животное пропало'}
            {pet.archive_note && ` · ${pet.archive_note}`}
          </span>
          {isVet && <button onClick={async () => { await api.post(`/passport/${petId}/unarchive`); await load(); setMsg('Карта восстановлена') }}
            style={{ ...F, padding:'4px 12px', borderRadius:6, border:'1px solid #92400e', background:'transparent', color:'#92400e', fontSize:12, fontWeight:700, cursor:'pointer' }}>
            ♻ Восстановить
          </button>}
        </div>
      )}

      {/* ── Основное тело: split-screen ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>

        {/* ═══ ЛЕВАЯ ПАНЕЛЬ (22%) ═══════════════════════════════════════ */}
        <div style={{ width:'22%', minWidth:200, maxWidth:280, background:'#fff', borderRight:'1px solid #e2e8f0', display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>

          {/* Шапка организации */}
          <div style={{ background:'#14532d', color:'#fff', padding:'8px 12px', flexShrink:0 }}>
            <div style={{ fontSize:9, lineHeight:1.4, opacity:0.85 }}>Администрация города Байконур</div>
            <div style={{ fontSize:10, fontWeight:700, lineHeight:1.3 }}>ГБУ «Городская ветеринарная станция города Байконур»</div>
            <div style={{ fontSize:9, opacity:0.7, marginTop:1 }}>ул. Носова, 14 · +7 (33622) 4-62-68</div>
          </div>

          {/* Скроллируемая часть левой панели */}
          <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ width:'100%', height:200, borderRadius:6, overflow:'hidden', border:'1px solid #e2e8f0', background:'#f8fafc', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', marginBottom:10, position:'relative' }}>
              {photoUrl
                ? <img src={photoUrl} alt={pet.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <>
                    {/* SVG силуэт */}
                    <svg width="72" height="72" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <ellipse cx="40" cy="48" rx="22" ry="18" fill="#cbd5e0"/>
                      <ellipse cx="40" cy="32" rx="16" ry="15" fill="#cbd5e0"/>
                      <ellipse cx="28" cy="20" rx="7" ry="10" fill="#cbd5e0" transform="rotate(-15 28 20)"/>
                      <ellipse cx="52" cy="20" rx="7" ry="10" fill="#cbd5e0" transform="rotate(15 52 20)"/>
                      <ellipse cx="35" cy="35" rx="3" ry="3.5" fill="#94a3b8"/>
                      <ellipse cx="45" cy="35" rx="3" ry="3.5" fill="#94a3b8"/>
                      <ellipse cx="40" cy="40" rx="2.5" ry="2" fill="#94a3b8"/>
                    </svg>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:6, marginBottom:8 }}>Фото не загружено</div>
                    {canEdit && (
                      <label style={{ fontSize:11, color:'#475569', background:'#f1f5f9', border:'1px solid #cbd5e0', borderRadius:5, padding:'4px 10px', cursor:'pointer', ...F }}>
                        📸 Загрузить фото
                        <input type="file" accept="image/*" style={{ display:'none' }} onChange={async e => {
                          const file = e.target.files[0]; if (!file) return
                          const fd = new FormData(); fd.append('photo', file)
                          fd.append('name', pet.name)
                          try { await api.put(`/pets/${pet.id}`, fd, { headers:{'Content-Type':'multipart/form-data'} }); await load() } catch(err){console.error(err)}
                        }} />
                      </label>
                    )}
                  </>
              }
            </div>

            {/* Статус бешенства */}
            {(() => {
              const rabies = vaccinations.filter(v=>v.vaccine_name?.toLowerCase().includes('бешенств')&&v.is_confirmed).sort((a,b)=>new Date(b.date_given)-new Date(a.date_given))[0]
              const days = rabies ? Math.round((new Date(rabies.next_due_date)-new Date())/(1000*60*60*24)) : null
              const ok = days !== null && days >= 0
              return (
                <div style={{ borderRadius:6, padding:'8px 12px', background:ok?'#dcfce7':'#fee2e2', border:`1px solid ${ok?'#86efac':'#fca5a5'}`, marginBottom:10 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:ok?'#166534':'#991b1b' }}>
                    {ok ? '✓ Бешенство: привит' : '⚠ Бешенство: не привит / просрочено'}
                  </div>
                  {rabies && <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>до {fmtS(rabies.next_due_date)}</div>}
                </div>
              )
            })()}

            {/* Статус верификации паспорта */}
            {isVet && (
              <div style={{ marginBottom:10 }}>
                {passport?.is_confirmed ? (
                  <div style={{ borderRadius:6, padding:'8px 12px', background:'#dcfce7', border:'1px solid #86efac', display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:14 }}>✓</span>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:'#166534' }}>Паспорт верифицирован</div>
                      <div style={{ fontSize:10, color:'#16a34a' }}>подтверждено ветеринаром</div>
                    </div>
                  </div>
                ) : (
                  <button onClick={confirmPassport} style={{
                    ...F, width:'100%', padding:'9px 12px', borderRadius:6,
                    border:'2px dashed #166534', background:'#f0fdf4',
                    color:'#166534', fontSize:12, fontWeight:700,
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                    transition:'all 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background='#166534'; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderStyle='solid' }}
                    onMouseLeave={e => { e.currentTarget.style.background='#f0fdf4'; e.currentTarget.style.color='#166534'; e.currentTarget.style.borderStyle='dashed' }}
                  >
                    ☑ Подтвердить данные
                  </button>
                )}
              </div>
            )}
            {!isVet && passport && !passport.is_confirmed && (
              <div style={{ borderRadius:6, padding:'8px 12px', background:'#fef3c7', border:'1px solid #fde68a', marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#92400e' }}>⏳ Ожидает верификации</div>
                <div style={{ fontSize:10, color:'#b45309' }}>ветеринар ещё не подтвердил</div>
              </div>
            )}
          </div>

          {/* Кнопки внизу */}
          <div style={{ marginTop:'auto', padding:'12px 14px', borderTop:'1px solid #e2e8f0', display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
            <Btn onClick={printCertificate} variant="outline" small>🖨 Справка для транспортировки</Btn>
            <Btn onClick={printPassport} variant="primary" small>🖨 Распечатать паспорт</Btn>
            <Btn onClick={exportPDF} variant="outline" small>📄 Экспорт в PDF</Btn>
            {isVet && (
              pet?.is_archived
                ? <Btn onClick={async () => { await api.post(`/passport/${petId}/unarchive`); await load(); setMsg('Карта восстановлена') }} variant="outline" small>♻ Восстановить карту</Btn>
                : <Btn onClick={() => setArchiveOpen(true)} danger small>📦 Архивировать карту</Btn>
            )}
          </div>
        </div>


        {/* ═══ ПРАВАЯ ПАНЕЛЬ (70%) ═══════════════════════════════════════ */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
          <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', display:'flex', flexShrink:0 }}>
            {TABS.map((t,i) => (
              <button key={t} onClick={() => setTab(i)} style={{
                ...F, padding:'12px 20px', border:'none', cursor:'pointer', fontSize:13, fontWeight:tab===i?700:500,
                color:tab===i?'#166534':'#64748b', borderBottom:tab===i?'2px solid #166534':'2px solid transparent',
                background:'transparent', transition:'all 0.12s', whiteSpace:'nowrap',
              }}>{t}</button>
            ))}
          </div>

          {/* Предупреждения о вакцинациях */}
          {upcoming.length > 0 && tab === 1 && (
            <div style={{ padding:'8px 20px', background:'#fffbeb', borderBottom:'1px solid #fde68a', flexShrink:0 }}>
              {upcoming.slice(0,2).map((v,i) => (
                <div key={i} style={{ fontSize:12, color: v.days<0?'#991b1b':'#92400e' }}>
                  {v.days<0 ? `⚠ Просрочена: ${v.vaccine_name} (${Math.abs(v.days)} дн. назад)` : `💉 ${v.vaccine_name} — через ${v.days} дн.`}
                </div>
              ))}
            </div>
          )}

          {/* Контент вкладок */}
          <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', minHeight:0 }}>

            {/* ── Вкладка 0: Паспортные данные ── */}
            {tab === 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

                {/* РАЗДЕЛ I — ВЛАДЕЛЕЦ */}
                <div style={{ border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden' }}>
                  <div style={{ background:'#1e293b', padding:'10px 16px' }}>
                    <div style={{ color:'#fff', fontWeight:800, fontSize:13, letterSpacing:0.5 }}>РАЗДЕЛ I — ВЛАДЕЛЕЦ ЖИВОТНОГО</div>
                    <div style={{ color:'#94a3b8', fontSize:11, marginTop:1 }}>Owner</div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
                    {[
                      ['ФИО / Name', owner.full_name||'—'],
                      ['Телефон / Phone', owner.phone||'—'],
                      ['Адрес / Address', passForm.owner_address||'—'],
                      ['E-mail', owner.email||'—'],
                      ['Город / City', passForm.owner_city||'—'],
                      ['Страна / Country', 'Россия'],
                      ['Почтовый индекс / Postcode', passForm.owner_zip||'—'],
                      ['', ''],
                    ].map(([l,v],i) => l ? (
                      <div key={i} style={{ display:'flex', borderBottom:'1px solid #f1f5f9', borderRight:i%2===0?'1px solid #f1f5f9':'none', background:Math.floor(i/2)%2===0?'#fff':'#f8fafc' }}>
                        <div style={{ width:'45%', padding:'8px 12px', fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:0.3 }}>{l}</div>
                        <div style={{ flex:1, padding:'8px 12px', fontSize:14, color:'#1a202c', fontWeight:500 }}>{v}</div>
                      </div>
                    ) : <div key={i} />)}
                  </div>
                </div>

                {/* РАЗДЕЛ II — ОПИСАНИЕ ЖИВОТНОГО */}
                <div style={{ border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden' }}>
                  <div style={{ background:'#1e293b', padding:'10px 16px' }}>
                    <div style={{ color:'#fff', fontWeight:800, fontSize:13, letterSpacing:0.5 }}>РАЗДЕЛ II — ОПИСАНИЕ ЖИВОТНОГО</div>
                    <div style={{ color:'#94a3b8', fontSize:11, marginTop:1 }}>Description of Animal</div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
                    {[
                      ['Кличка / Name', pet.name],
                      ['Вид / Species', speciesRu[pet.species]||pet.species||'—'],
                      ['Порода / Breed', pet.breed||'—'],
                      ['Пол / Sex', genderRu[pet.gender]||'—'],
                      ['Дата рождения / Date of birth', fmt(pet.birth_date)],
                      ['Вес / Weight', pet.weight?`${pet.weight} кг`:'—'],
                      ['Окрас и вид / Coat colour and type', passForm.coat_color||'—'],
                      ['Особые отметины / Distinguishing marks', passForm.special_marks||'—'],
                    ].map(([l,v],i) => (
                      <div key={i} style={{ display:'flex', borderBottom:'1px solid #f1f5f9', borderRight:i%2===0?'1px solid #f1f5f9':'none', background:Math.floor(i/2)%2===0?'#fff':'#f8fafc' }}>
                        <div style={{ width:'50%', padding:'8px 12px', fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:0.3 }}>{l}</div>
                        <div style={{ flex:1, padding:'8px 12px', fontSize:14, color:'#1a202c', fontWeight:500 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* РАЗДЕЛ III — ИДЕНТИФИКАЦИЯ */}
                <div style={{ border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden' }}>
                  <div style={{ background:'#1e293b', padding:'10px 16px' }}>
                    <div style={{ color:'#fff', fontWeight:800, fontSize:13, letterSpacing:0.5 }}>РАЗДЕЛ III — ИДЕНТИФИКАЦИЯ ЖИВОТНОГО</div>
                    <div style={{ color:'#94a3b8', fontSize:11, marginTop:1 }}>Identification of Animal</div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
                    {[
                      ['Микрочип № / Microchip number', passport?.microchip_number||'—'],
                      ['Дата чипирования / Date of chipping', passForm.chip_date ? fmtS(passForm.chip_date) : '—'],
                      ['Расположение чипа / Location of microchip', passForm.chip_location||'—'],
                      ['Клеймо № / Tattoo number', passForm.tattoo_number||'—'],
                      ['Дата клеймения / Date of tattooing', passForm.tattoo_date ? fmtS(passForm.tattoo_date) : '—'],
                      ['Сведения о репродукции', (() => { const r=passForm.reproduction; if(r==='intact') return 'Не кастрирован'; if(r==='sterilized') return 'Стерилизован'; if(r==='castrated') return 'Кастрирован'; return '—' })()],
                      ['Паспорт № / Passport No', passport?.passport_number||'—'],
                      ['Дата выдачи / Date of issue', passForm.issue_date ? fmtS(passForm.issue_date) : '—'],
                    ].map(([l,v],i) => (
                      <div key={i} style={{ display:'flex', borderBottom:'1px solid #f1f5f9', borderRight:i%2===0?'1px solid #f1f5f9':'none', background:Math.floor(i/2)%2===0?'#fff':'#f8fafc' }}>
                        <div style={{ width:'50%', padding:'8px 12px', fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:0.3 }}>{l}</div>
                        <div style={{ flex:1, padding:'8px 12px', fontSize:14, color:'#1a202c', fontWeight:500 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Аллергии и болезни */}
                {(passport?.allergies || passport?.chronic_diseases) && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    {passport?.allergies && <div style={{ background:'#fef3c7', border:'1px solid #fde68a', borderRadius:6, padding:'10px 14px' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#92400e', marginBottom:4, textTransform:'uppercase' }}>Аллергии</div>
                      <div style={{ fontSize:13, color:'#1e293b' }}>{passport.allergies}</div>
                    </div>}
                    {passport?.chronic_diseases && <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:6, padding:'10px 14px' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#991b1b', marginBottom:4, textTransform:'uppercase' }}>Хронические заболевания</div>
                      <div style={{ fontSize:13, color:'#1e293b' }}>{passport.chronic_diseases}</div>
                    </div>}
                  </div>
                )}

                {passport?.is_confirmed && (
                  <div style={{ background:'#f0fdf4', border:'1.5px solid #86efac', borderRadius:6, padding:'10px 14px', fontSize:13, color:'#166534', fontWeight:700 }}>
                    ✓ Паспорт верифицирован · подтверждено ветеринаром {passport.confirmed_by_name||''}
                  </div>
                )}
              </div>
            )}

            {/* ── Вкладка 1: Вакцинация ── */}
            {tab === 1 && (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div style={{ fontWeight:800, fontSize:14, color:'#1e293b' }}>История вакцинаций</div>
                  {isVet && <Btn onClick={() => setVacOpen(true)} variant="primary" small>+ Добавить запись</Btn>}
                </div>
                <MedTable
                  columns={['Дата вакцинации','Наименование вакцины','Производитель','№ партии / Серия','Дата изгот.','Срок годности','Действ. до','Ветеринарный врач','Статус']}
                  rows={vaccinations.map(v => [
                    fmtS(v.date_given),
                    v.vaccine_name||'—',
                    v.manufacturer||'—',
                    v.batch_number||'—',
                    v.manufacture_date ? fmtS(v.manufacture_date) : '—',
                    v.expiry_date ? fmtS(v.expiry_date) : '—',
                    v.next_due_date ? fmtS(v.next_due_date) : '—',
                    v.vet_name||'—',
                    v.is_confirmed
                      ? <span style={{ background:'#dcfce7', color:'#166534', padding:'2px 7px', borderRadius:4, fontSize:11, fontWeight:700 }}>✓ Подтверждено</span>
                      : isVet
                        ? <button onClick={() => confirmVaccination(v.id)} style={{ ...F, background:'#166534', color:'#fff', border:'none', borderRadius:4, padding:'3px 8px', fontSize:11, fontWeight:700, cursor:'pointer' }}>☑ Подтвердить</button>
                        : <span style={{ background:'#fef3c7', color:'#92400e', padding:'2px 7px', borderRadius:4, fontSize:11, fontWeight:700 }}>⏳ Ожидает</span>
                  ])}
                  emptyText="Записей о вакцинациях нет"
                />
              </div>
            )}

            {/* ── Вкладка 2: Обработки от паразитов ── */}
            {tab === 2 && (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontWeight:800, fontSize:14, color:'#1e293b' }}>Обработки от паразитов</div>
                  {isVet && <Btn onClick={() => setParasiteOpen(true)} variant="primary" small>+ Добавить</Btn>}
                </div>

                {/* Эктопаразиты */}
                <div>
                  <div style={{ background:'#1e293b', borderRadius:'6px 6px 0 0', padding:'8px 14px' }}>
                    <div style={{ color:'#fff', fontWeight:700, fontSize:12, letterSpacing:0.5 }}>VI. ПРОТИВ ЭКТОПАРАЗИТОВ (БЛОХИ, КЛЕЩИ)</div>
                  </div>
                  <MedTable
                    columns={['Дата обработки','Наименование препарата','Производитель','Ветеринарный врач']}
                    rows={procedures.filter(p=>p.type==='ecto_parasite').map(p=>[
                      fmtS(p.date),
                      p.drug_name || p.description || '—',
                      p.manufacturer || '—',
                      p.vet_name || '—',
                    ])}
                    emptyText="Записей нет"
                  />
                </div>

                {/* Дегельминтизация */}
                <div>
                  <div style={{ background:'#1e293b', borderRadius:'6px 6px 0 0', padding:'8px 14px' }}>
                    <div style={{ color:'#fff', fontWeight:700, fontSize:12, letterSpacing:0.5 }}>VII. ДЕГЕЛЬМИНТИЗАЦИЯ (ГЛИСТЫ)</div>
                  </div>
                  <MedTable
                    columns={['Дата обработки','Наименование препарата','Производитель','Ветеринарный врач']}
                    rows={procedures.filter(p=>p.type==='deworming').map(p=>[
                      fmtS(p.date),
                      p.drug_name || p.description || '—',
                      p.manufacturer || '—',
                      p.vet_name || '—',
                    ])}
                    emptyText="Записей нет"
                  />
                </div>
              </div>
            )}

            {/* ── Вкладка 3: Лаборатория ── */}
            {tab === 3 && (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontWeight:800, fontSize:14, color:'#1e293b' }}>Лабораторные исследования</div>
                  {isVet && <Btn onClick={() => setLabOpen(true)} variant="primary" small>Обновить статус</Btn>}
                </div>

                {/* FeLV / FIV статусы — только для кошек */}
                {pet.species === 'cat' && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    {[
                      { key:'felv_status', label:'FeLV — Вирусная лейкемия', val:passport?.felv_status },
                      { key:'fiv_status',  label:'FIV — Иммунодефицит',      val:passport?.fiv_status  },
                    ].map(s => {
                      const pos = s.val === 'positive'
                      const neg = s.val === 'negative'
                      return (
                        <div key={s.key} style={{ border:`2px solid ${pos?'#fca5a5':neg?'#86efac':'#e2e8f0'}`, borderRadius:8, padding:'14px 16px', background:pos?'#fff1f2':neg?'#f0fdf4':'#f8fafc' }}>
                          <div style={{ fontSize:12, fontWeight:700, color:'#64748b', marginBottom:6 }}>{s.label}</div>
                          <div style={{ fontSize:20, fontWeight:800, color:pos?'#dc2626':neg?'#166534':'#94a3b8' }}>
                            {pos ? '⊕ ПОЗИТИВНЫЙ' : neg ? '⊖ Негативный' : '— Не тестировался'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <MedTable
                  columns={['Дата','Тест','Результат','Врач','Примечание']}
                  rows={health_logs.filter(h=>h.lab_test).map(h=>[fmtS(h.log_date),h.lab_test||'—',h.lab_result||'—',h.vet_name||'—',h.notes||'—'])}
                  emptyText="Лабораторных записей нет"
                />

                {/* ── Подраздел: Титры антител к вирусу бешенства ── */}
                <div style={{ border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden' }}>
                  <div style={{ background:'#1e293b', padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ color:'#fff', fontWeight:800, fontSize:13, letterSpacing:0.5 }}>
                        Определение титров антител к вирусу бешенства
                      </div>
                      <div style={{ color:'#94a3b8', fontSize:11, marginTop:1 }}>Rabies Antibody Titration</div>
                    </div>
                    {isVet && (
                      <button onClick={() => setTiterOpen(true)} style={{
                        ...F, padding:'5px 12px', borderRadius:6, border:'1px solid #94a3b8',
                        background:'transparent', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer',
                      }}>+ Добавить запись</button>
                    )}
                  </div>

                  {/* Таблица записей о титрах */}
                  {passport?.rabies_titers?.length > 0 ? (
                    <div>
                      {passport.rabies_titers.map((t, i) => (
                        <div key={i} style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', background:i%2===0?'#fff':'#f8fafc' }}>
                          {/* Официальный текст */}
                          <div style={{ ...F, fontSize:13, color:'#1e293b', lineHeight:1.8, marginBottom:12, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:6, padding:'12px 16px' }}>
                            Я ознакомлен с официальной записью о результатах определения титров антител к вирусу бешенства в сыворотке крови, взятой{' '}
                            <strong>«{t.sample_date ? fmtS(t.sample_date) : '___'}»</strong>,
                            проведённого в <strong>{t.laboratory || '___'}</strong>, имеющей международную аккредитацию по данному исследованию, которая констатирует, что нейтрализующий бешенство титр антител был{' '}
                            <strong style={{ color:'#166534' }}>равен или превышал 0,5 МЕ/мл</strong>.
                          </div>
                          {/* Данные */}
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                            {[
                              ['Дата взятия крови', t.sample_date ? fmtS(t.sample_date) : '—'],
                              ['Лаборатория', t.laboratory||'—'],
                              ['Результат (МЕ/мл)', t.result||'—'],
                              ['Ветеринарный врач', t.vet_name||'—'],
                              ['Дата записи', t.record_date ? fmtS(t.record_date) : '—'],
                              ['Статус', t.status === 'confirmed'
                                ? <span style={{ color:'#166534', fontWeight:700 }}>✓ Подтверждено</span>
                                : <span style={{ color:'#92400e', fontWeight:700 }}>⏳ Ожидает</span>
                              ],
                            ].map(([l,v], j) => (
                              <div key={j} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:6, padding:'8px 12px' }}>
                                <div style={{ fontSize:10, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:0.3, marginBottom:3 }}>{l}</div>
                                <div style={{ fontSize:13, color:'#1e293b', fontWeight:500 }}>{v}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding:'32px', textAlign:'center', color:'#94a3b8', ...F, fontSize:13 }}>
                      Записей об определении титров антител нет
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Вкладка 4: Клиническое обследование ── */}
            {tab === 4 && (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

                {/* Кнопка печати */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:14, color:'#1e293b' }}>Клиническое обследование</div>
                    <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>Clinical examination</div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    {isVet && <Btn onClick={() => setExamOpen(true)} variant="primary" small>+ Добавить запись</Btn>}
                    <Btn onClick={printCertificate} variant="outline" small>🖨 Распечатать</Btn>
                  </div>
                </div>

                {/* Список записей об обследовании */}
                {(passport?.clinical_exams || []).length === 0 ? (
                  <div style={{ border:'1px solid #e2e8f0', borderRadius:8, padding:'32px', textAlign:'center', color:'#94a3b8', ...F, fontSize:13 }}>
                    Записей о клиническом обследовании нет
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {(passport?.clinical_exams || []).map((exam, i) => (
                      <div key={i} style={{ border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden' }}>
                        {/* Заключение */}
                        <div style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0', padding:'14px 18px' }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Заключение / Conclusion</div>
                          <div style={{ fontSize:14, color:'#1e293b', fontWeight:500, lineHeight:1.7 }}>
                            Животное <strong>{pet.name}</strong> клинически здорово и может быть транспортировано.
                            {exam.notes && <span style={{ color:'#64748b' }}> {exam.notes}</span>}
                          </div>
                        </div>
                        {/* Данные */}
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)' }}>
                          {[
                            ['Дата обследования', fmtS(exam.exam_date)],
                            ['Ветеринарный врач', exam.vet_name||'—'],
                            ['', ''],
                          ].map(([l,v],j) => l ? (
                            <div key={j} style={{ padding:'10px 16px', borderRight:j<2?'1px solid #f1f5f9':'none', background:'#fff' }}>
                              <div style={{ fontSize:10, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:0.3, marginBottom:3 }}>{l}</div>
                              <div style={{ fontSize:13, color:'#1e293b', fontWeight:600 }}>{v}</div>
                            </div>
                          ) : <div key={j} />)}
                        </div>
                        {/* Подпись уполномоченного лица */}
                        <div style={{ background:'#f8fafc', borderTop:'1px solid #e2e8f0', padding:'14px 18px' }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>
                            Подпись уполномоченного лица / Signature of authorised officer
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                            <div>
                              <div style={{ fontSize:10, color:'#94a3b8', marginBottom:4 }}>ФИО / Name</div>
                              <div style={{ fontSize:13, color:'#1e293b', fontWeight:600 }}>{exam.authorized_name || exam.vet_name || '—'}</div>
                            </div>
                            <div>
                              <div style={{ fontSize:10, color:'#94a3b8', marginBottom:4 }}>Дата / Date</div>
                              <div style={{ fontSize:13, color:'#1e293b', fontWeight:600 }}>{fmtS(exam.exam_date)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize:10, color:'#94a3b8', marginBottom:4 }}>Подпись / Signature</div>
                              <div style={{ fontSize:13, color:'#94a3b8', fontStyle:'italic' }}>______________</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Вкладка 5: История болезней ── */}
            {tab === 5 && (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:14, color:'#1e293b' }}>История болезней</div>
                    <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>Автоматически пополняется при завершении приёма</div>
                  </div>
                  {medHistory.length > 0 && (
                    <button onClick={() => {
                      const rows = medHistory.map((r,i) => `
                        <tr style="background:${i%2===0?'#fff':'#f8fafc'}">
                          <td>${r.visit_date ? new Date(r.visit_date).toLocaleDateString('ru',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—'}</td>
                          <td>${r.diagnosis||'—'}</td>
                          <td>${r.vet_name||'—'}</td>
                          <td style="white-space:pre-wrap">${r.medications||'—'}</td>
                          <td style="white-space:pre-wrap">${r.recommendations||'—'}</td>
                          <td>${r.notes||'—'}</td>
                        </tr>`).join('')
                      const w = window.open('','_blank')
                      w.document.write(`<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">
                      <title>История болезней — ${pet.name}</title>
                      <style>
                        *{box-sizing:border-box;margin:0;padding:0}
                        body{font-family:'Times New Roman',serif;font-size:11pt;color:#000}
                        .page{max-width:297mm;margin:0 auto;padding:12mm 18mm}
                        .header{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:14px}
                        .org{font-size:9pt;color:#444;margin-bottom:3px}
                        h1{font-size:14pt;font-weight:bold;text-transform:uppercase;margin:6px 0}
                        .meta{font-size:10pt;color:#555;margin-bottom:4px}
                        table{width:100%;border-collapse:collapse;margin-top:10px}
                        th{background:#1e293b;color:#fff;padding:7px 10px;text-align:left;font-size:9pt;text-transform:uppercase;letter-spacing:0.5px}
                        td{border:1px solid #ddd;padding:7px 10px;font-size:10pt;vertical-align:top}
                        tr:nth-child(even) td{background:#f8fafc}
                        .footer{margin-top:16px;border-top:1px solid #ccc;padding-top:8px;font-size:9pt;color:#777;text-align:center}
                        @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}th{background:#1e293b!important;color:#fff!important}}
                      </style></head><body><div class="page">
                      <div class="header">
                        <div class="org">Администрация города Байконур · ГБУ «Городская ветеринарная станция города Байконур»</div>
                        <div class="org">ул. Носова, д. 14 · +7 (33622) 4-62-68</div>
                        <h1>История болезней</h1>
                        <div class="meta"><b>Животное:</b> ${pet.name} (${speciesRu[pet.species]||pet.species||'—'}, ${pet.breed||'—'})</div>
                        <div class="meta"><b>Владелец:</b> ${owner.full_name||'—'} · ${owner.phone||'—'}</div>
                      </div>
                      <table>
                        <tr><th>Дата</th><th>Диагноз</th><th>Врач</th><th>Назначения</th><th>Рекомендации</th><th>Заметки</th></tr>
                        ${rows}
                      </table>
                      <div class="footer">Сформировано: ${new Date().toLocaleDateString('ru')} · ГБУ «Горветстанция г. Байконур» · Всего записей: ${medHistory.length}</div>
                      </div><script>window.onload=()=>window.print()</script></body></html>`)
                      w.document.close()
                    }} style={{ ...F, padding:'7px 14px', borderRadius:6, border:'1px solid #1e293b', background:'#1e293b', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                      🖨 Распечатать историю
                    </button>
                  )}
                </div>
                {medHistory.length === 0 ? (
                  <div style={{ border:'1px solid #e2e8f0', borderRadius:8, padding:'40px', textAlign:'center', color:'#94a3b8', fontFamily:"'Nunito',sans-serif" }}>
                    <div style={{ fontSize:36, marginBottom:8 }}>📋</div>
                    <div style={{ fontWeight:700 }}>Записей о приёмах нет</div>
                    <div style={{ fontSize:12, marginTop:4 }}>История пополняется автоматически после каждого завершённого приёма</div>
                  </div>
                ) : (
                  <div style={{ border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:"'Nunito',sans-serif" }}>
                      <thead>
                        <tr style={{ background:'#1e293b' }}>
                          {['Дата приёма','Анамнез / Жалобы','Диагноз / Причина','Ветеринарный врач','Назначения','Действие'].map(h => (
                            <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#fff', textTransform:'uppercase', letterSpacing:0.5 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {medHistory.map((r, i) => (
                          <tr key={r.id} style={{ borderBottom:'1px solid #f1f5f9', background:i%2===0?'#fff':'#f8fafc' }}>
                            <td style={{ padding:'10px 14px', fontSize:13, color:'#1a202c', fontWeight:600, whiteSpace:'nowrap' }}>
                              {r.visit_date ? new Date(r.visit_date).toLocaleDateString('ru',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—'}
                            </td>
                            <td style={{ padding:'10px 14px', fontSize:13, color:'#475569', maxWidth:160 }}>
                              {r.anamnesis ? <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:150 }} title={r.anamnesis}>{r.anamnesis}</div> : '—'}
                            </td>
                            <td style={{ padding:'10px 14px', fontSize:13, color:'#1a202c', maxWidth:200 }}>{r.diagnosis||'—'}</td>
                            <td style={{ padding:'10px 14px', fontSize:13, color:'#475569', whiteSpace:'nowrap' }}>{r.vet_name}</td>
                            <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b', maxWidth:180 }}>
                              {r.medications ? <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:160 }} title={r.medications}>{r.medications.split('\n')[0]}</div> : '—'}
                            </td>
                            <td style={{ padding:'10px 14px' }}>
                              <button onClick={() => setSelectedVisit(r)} style={{ fontFamily:"'Nunito',sans-serif", padding:'4px 10px', borderRadius:6, border:'1px solid #3a7d44', background:'transparent', color:'#3a7d44', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                                👁 Подробнее
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Вкладка 6: Анализы ── */}
            {tab === 6 && (() => {
              const LAB_SERVICES_LIST = [
                'Взятие крови',
                'Исследование крови: общий анализ крови',
                'Исследование крови: биохимическое',
                'Исследование крови: уровень тромбоцитов',
                'Исследование крови: по методу Кнотта',
                'Исследование крови: серологическое',
                'Исследование фекалий (паразитологическое)',
                'Исследование фекалий развёрнутая форма',
                'Взятие и микроскопия соскобов',
                'Люминисцентная диагностика микроспории',
                'Общий анализ мочи на приборе',
                'Исследование мочи экспресс методом',
                'Исследование мочи специальными методами',
                'Исследование пунктатов',
                'Взятие проб на инфекционный вагинит, постит',
              ]
              const labRows = procedures
                .filter(p => p.type === 'lab')
                .filter(p => !labFilter || p.description?.startsWith(labFilter))
                .sort((a, b) => new Date(b.date) - new Date(a.date))
              return (
                <div>
                  {/* Панель фильтра + кнопка */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <label style={{ ...F, fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5 }}>Фильтр:</label>
                      <select value={labFilter||''} onChange={e => setLabFilter(e.target.value||null)}
                        style={{ ...F, padding:'7px 12px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', minWidth:280, cursor:'pointer' }}>
                        <option value="">— все виды анализов —</option>
                        {LAB_SERVICES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {labFilter && (
                        <button onClick={() => setLabFilter(null)}
                          style={{ ...F, padding:'6px 12px', borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', fontSize:12, color:'#64748b', cursor:'pointer', fontWeight:700 }}>
                          ✕ Сбросить
                        </button>
                      )}
                    </div>
                  </div>

                  {labRows.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'40px 0', color:'#94a3b8', ...F }}>
                      <div style={{ fontSize:40, marginBottom:8 }}>🔬</div>
                      <p style={{ fontWeight:700 }}>{labFilter ? `Нет анализов «${labFilter}»` : 'Записей об анализах пока нет'}</p>
                    </div>
                  ) : (
                    <table style={{ width:'100%', borderCollapse:'collapse', ...F, fontSize:13 }}>
                      <thead>
                        <tr style={{ background:'#1e293b', color:'#fff' }}>
                          {['Дата','Вид анализа','Результат / описание'].map(h => (
                            <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:700, letterSpacing:0.5 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {labRows.map(p => {
                          const [svc, ...rest] = (p.description || '').split(': ')
                          return (
                            <tr key={p.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                              <td style={{ padding:'9px 14px', whiteSpace:'nowrap', color:'#475569' }}>{fmtS(p.date)}</td>
                              <td style={{ padding:'9px 14px', fontWeight:700, color:'#1e293b' }}>{svc}</td>
                              <td style={{ padding:'9px 14px', color:'#475569' }}>{rest.join(': ') || '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}

                  {/* Заявки в лабораторию */}
                  {labOrders.length > 0 && (
                    <div style={{ marginTop:20 }}>
                      <div style={{ ...F, fontWeight:800, fontSize:13, color:'#1e293b', marginBottom:10, textTransform:'uppercase', letterSpacing:0.5 }}>
                        📋 Заявки в лабораторию
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {labOrders.map(o => {
                          const STATUS = {
                            pending:   { label:'Ожидает забора', color:'#1e40af', bg:'#eff6ff', border:'#bfdbfe' },
                            collected: { label:'В работе',       color:'#92400e', bg:'#fffbeb', border:'#fde68a' },
                            ready:     { label:'Готово',         color:'#166534', bg:'#f0fdf4', border:'#86efac' },
                          }
                          const s = STATUS[o.status] || STATUS.pending
                          return (
                            <div key={o.id} style={{ border:`1px solid ${s.border}`, borderRadius:8, padding:'10px 14px', background:s.bg }}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                                <span style={{ ...F, fontWeight:800, fontSize:13, color:s.color }}>
                                  {o.order_number}
                                  <span style={{ marginLeft:8, background:s.color, color:'#fff', borderRadius:4, padding:'2px 8px', fontSize:11 }}>{s.label}</span>
                                </span>
                                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                                  <span style={{ ...F, fontSize:11, color:'#64748b' }}>{o.scheduled_date || o.created_at?.split('T')[0]}</span>
                                  {o.status === 'ready' && (
                                    <button onClick={() => setLabDetailOrder(o)}
                                      style={{ ...F, padding:'3px 10px', borderRadius:6, border:'1px solid #86efac', background:'#fff', color:'#166534', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                                      Подробнее
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div style={{ ...F, fontSize:12, color:'#475569' }}>{(o.services||[]).join(' · ')}</div>
                              {o.status === 'ready' && o.results && Object.keys(o.results).length > 0 && (
                                <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:3 }}>
                                  {Object.entries(o.results).map(([svc, res]) => (
                                    <div key={svc} style={{ ...F, fontSize:12, display:'flex', gap:8 }}>
                                      <span style={{ color:'#64748b' }}>{svc}:</span>
                                      <span style={{ fontWeight:700, color: res.flag === 'H' ? '#dc2626' : res.flag === 'L' ? '#2563eb' : '#166534' }}>
                                        {res.value} {res.unit} {res.flag ? `[${res.flag}]` : ''}
                                      </span>
                                      {res.ref && <span style={{ color:'#94a3b8', fontSize:11 }}>реф: {res.ref}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>

      {/* ══ Модал: Назначить анализы (заявка в лабораторию) ══ */}
      {/* ══ Модал: Подробный результат анализа ══ */}
      {labDetailOrder && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setLabDetailOrder(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:600, maxHeight:'80vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', fontFamily:"'Nunito',sans-serif" }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #f0f0f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:800, fontSize:16, color:'#1e293b' }}>🔬 {labDetailOrder.order_number}</div>
                <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{(labDetailOrder.services||[]).join(', ')}</div>
              </div>
              <button onClick={() => setLabDetailOrder(null)}
                style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#94a3b8' }}>×</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
              {labDetailOrder.results && Object.keys(labDetailOrder.results).length > 0 ? (
                Object.entries(labDetailOrder.results).map(([svc, res]) => {
                  const type = res?.type || 'generic'
                  const flagColor = (f) => f==='H'?'#dc2626':f==='L'?'#2563eb':'#166534'
                  const flagBg    = (f) => f==='H'?'#fef2f2':f==='L'?'#eff6ff':'#f0fdf4'
                  const ParamTable = ({ rows }) => (
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, fontFamily:"'Nunito',sans-serif", marginBottom:8 }}>
                      <thead>
                        <tr style={{ background:'#1e293b', color:'#fff' }}>
                          {['Параметр','Результат','Ед. изм.','Реф. норма','Флаг'].map(h => (
                            <th key={h} style={{ padding:'7px 12px', textAlign:'left', fontSize:11, fontWeight:700 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(([param, r], i) => (
                          <tr key={param} style={{ borderBottom:'1px solid #f1f5f9', background:i%2===0?'#fff':'#f8fafc' }}>
                            <td style={{ padding:'8px 12px', fontWeight:600, color:'#334155' }}>{param}</td>
                            <td style={{ padding:'8px 12px', fontWeight:800, color:flagColor(r?.flag) }}>{r?.value||'—'}</td>
                            <td style={{ padding:'8px 12px', color:'#64748b' }}>{r?.unit||'—'}</td>
                            <td style={{ padding:'8px 12px', color:'#94a3b8' }}>{r?.ref||'—'}</td>
                            <td style={{ padding:'8px 12px' }}>
                              {r?.flag
                                ? <span style={{ background:flagBg(r.flag), color:flagColor(r.flag), padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:700 }}>{r.flag}</span>
                                : <span style={{ color:'#94a3b8', fontSize:11 }}>норма</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                  return (
                    <div key={svc} style={{ marginBottom:16, border:'1px solid #e2e8f0', borderRadius:10, overflow:'hidden' }}>
                      <div style={{ background:'#1e293b', padding:'9px 14px' }}>
                        <span style={{ color:'#fff', fontWeight:800, fontSize:13 }}>🧪 {svc}</span>
                      </div>

                      {/* ОАК и биохимия — таблица параметров */}
                      {(type === 'oak' || type === 'biohim') && res.params && (
                        <>
                          <ParamTable rows={Object.entries(res.params)} />
                          {type === 'oak' && res.leiko && Object.values(res.leiko).some(v=>v) && (
                            <div style={{ borderTop:'1px solid #e2e8f0', padding:'8px 14px', background:'#f8fafc' }}>
                              <div style={{ fontSize:11, fontWeight:700, color:'#64748b', marginBottom:6, textTransform:'uppercase' }}>Лейкоцитарная формула (%)</div>
                              <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontSize:12 }}>
                                {[['baso','Баз'],['eozino','Эоз'],['neut_m','Нейтр(М)'],['neut_yu','Нейтр(Ю)'],['neut_p','Нейтр(П)'],['neut_s','Нейтр(С)'],['limfo','Лимф'],['mono','Моно']].map(([k,l]) => (
                                  res.leiko[k] ? <span key={k}><span style={{ color:'#64748b' }}>{l}:</span> <b>{res.leiko[k]}</b></span> : null
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Анализ мочи */}
                      {type === 'mocha' && res.params && (
                        <>
                          <ParamTable rows={Object.entries(res.params)} />
                          {res.osadok && Object.values(res.osadok).some(v=>v) && (
                            <div style={{ borderTop:'1px solid #e2e8f0', padding:'8px 14px', background:'#f8fafc' }}>
                              <div style={{ fontSize:11, fontWeight:700, color:'#64748b', marginBottom:6, textTransform:'uppercase' }}>Микроскопия осадка</div>
                              <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontSize:12 }}>
                                {Object.entries(res.osadok).map(([k,v]) => v ? <span key={k}><span style={{ color:'#64748b' }}>{k}:</span> <b>{v}</b></span> : null)}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Экспресс моча / специальные */}
                      {(type === 'mocha_express' || type === 'mocha_special') && res.params && (
                        <ParamTable rows={Object.entries(res.params).map(([k,v]) => [k, { value:v?.value, unit:v?.unit||'', ref:v?.ref||'', flag:'' }])} />
                      )}

                      {/* Метод Кнотта */}
                      {type === 'knotta' && (
                        <div style={{ padding:'12px 14px', fontSize:13, fontWeight:700, color: res.value?.includes('не обнаружены')?'#166534':'#dc2626' }}>
                          {res.value || '—'}
                        </div>
                      )}

                      {/* Серология */}
                      {type === 'serology' && res.items && (
                        <div style={{ padding:'10px 14px' }}>
                          {Object.entries(res.items).map(([inf, val], i) => (
                            <div key={inf} style={{ display:'flex', justifyContent:'space-between', padding:'6px 10px', background:i%2===0?'#fff':'#f8fafc', borderRadius:5, marginBottom:3 }}>
                              <span style={{ fontSize:12, color:'#334155' }}>{inf}</span>
                              <span style={{ fontWeight:700, fontSize:12, color: val==='Положительно'?'#dc2626':val==='Отрицательно'?'#166534':'#92400e' }}>{val||'—'}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Тромбоциты */}
                      {type === 'plt' && (
                        <div style={{ padding:'12px 14px', fontSize:13 }}>
                          <span style={{ color:'#334155' }}>PLT: </span>
                          <span style={{ fontWeight:700, color:flagColor(res.flag) }}>{res.value||'—'} 10⁹/л</span>
                          {res.aggregates && <span style={{ color:'#64748b', marginLeft:12 }}>Агрегаты: {res.aggregates}</span>}
                        </div>
                      )}

                      {/* Фекалии паразитологические */}
                      {type === 'feces_para' && (
                        <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:6, fontSize:12 }}>
                          <div><span style={{ color:'#64748b' }}>Яйца гельминтов: </span><b style={{ color:res.helminth?.includes('Обнаружены')?'#dc2626':'#166534' }}>{res.helminth||'—'}</b>{res.helminth_name && <span style={{ color:'#dc2626', marginLeft:6 }}>({res.helminth_name})</span>}</div>
                          <div><span style={{ color:'#64748b' }}>Простейшие: </span><b style={{ color:res.protozoa?.includes('Обнаружены')?'#dc2626':'#166534' }}>{res.protozoa||'—'}</b></div>
                        </div>
                      )}

                      {/* Соскобы */}
                      {type === 'scrap' && (
                        <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:6, fontSize:12 }}>
                          <div><span style={{ color:'#64748b' }}>Эктопаразиты: </span><b style={{ color:res.ectoparasites?.includes('Не обнаружены')?'#166534':'#dc2626' }}>{res.ectoparasites||'—'}</b></div>
                          <div><span style={{ color:'#64748b' }}>Грибы: </span><b style={{ color:res.fungi?.includes('Не обнаружены')?'#166534':'#dc2626' }}>{res.fungi||'—'}</b></div>
                        </div>
                      )}

                      {/* Лампа Вуда */}
                      {type === 'wood' && (
                        <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:6, fontSize:12 }}>
                          <div><span style={{ color:'#64748b' }}>Свечение: </span><b style={{ color:res.glow?.includes('Отрицательное')?'#166534':'#dc2626' }}>{res.glow||'—'}</b></div>
                          {res.location && <div><span style={{ color:'#64748b' }}>Локализация: </span><b>{res.location}</b></div>}
                        </div>
                      )}

                      {/* Вагинит */}
                      {type === 'vagina' && (
                        <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:6, fontSize:12 }}>
                          <div><span style={{ color:'#64748b' }}>Микрофлора: </span><b>{res.flora||'—'}</b></div>
                          <div><span style={{ color:'#64748b' }}>Цитологическая картина: </span><b>{res.cytology||'—'}</b></div>
                        </div>
                      )}

                      {/* Копрограмма */}
                      {type === 'kopro' && (
                        <div style={{ padding:'10px 14px' }}>
                          <div style={{ display:'flex', gap:16, flexWrap:'wrap', fontSize:12, marginBottom:8 }}>
                            {res.params && Object.entries(res.params).map(([k,v]) => v ? <span key={k}><span style={{ color:'#64748b' }}>{k}: </span><b>{v}</b></span> : null)}
                          </div>
                          {res.digest && (
                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                              <thead><tr style={{ background:'#f8fafc' }}>
                                <th style={{ padding:'5px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>Компонент</th>
                                <th style={{ padding:'5px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>Результат</th>
                              </tr></thead>
                              <tbody>
                                {Object.entries(res.digest).map(([k,v],i) => (
                                  <tr key={k} style={{ borderTop:'1px solid #f1f5f9', background:i%2===0?'#fff':'#fafafa' }}>
                                    <td style={{ padding:'6px 10px', color:'#334155' }}>{k}</td>
                                    <td style={{ padding:'6px 10px', fontWeight:600, color:v==='не обнаружено'?'#166534':'#dc2626' }}>{v}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}

                      {/* Пунктат */}
                      {type === 'punkt' && (
                        <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:6, fontSize:12 }}>
                          {res.props && Object.entries(res.props).map(([k,v]) => v ? <div key={k}><span style={{ color:'#64748b' }}>{k}: </span><b>{v}</b></div> : null)}
                          {res.punkt_type && <div><span style={{ color:'#64748b' }}>Тип выпота: </span><b>{res.punkt_type}</b></div>}
                          {res.microscopy && <div style={{ background:'#f8fafc', padding:'8px 10px', borderRadius:6, marginTop:4, lineHeight:1.5 }}><span style={{ color:'#64748b' }}>Микроскопия: </span>{res.microscopy}</div>}
                        </div>
                      )}

                      {/* Старый формат (generic) */}
                      {(type === 'generic' || !type) && (
                        <div style={{ padding:'10px 14px', fontSize:13 }}>
                          <span style={{ fontWeight:700, color:flagColor(res?.flag) }}>{res?.value||'—'}</span>
                          {res?.unit && <span style={{ color:'#64748b', marginLeft:6 }}>{res.unit}</span>}
                          {res?.ref && <span style={{ color:'#94a3b8', marginLeft:8, fontSize:11 }}>реф: {res.ref}</span>}
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <div style={{ textAlign:'center', padding:'32px 0', color:'#94a3b8' }}>Результаты не найдены</div>
              )}
              {labDetailOrder.lab_notes && (
                <div style={{ marginTop:12, background:'#f8fafc', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#475569' }}>
                  <span style={{ fontWeight:700 }}>Примечание лаборанта:</span> {labDetailOrder.lab_notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {orderLabOpen && (() => {
        const LAB_SERVICES_ALL = [
          'Взятие крови',
          'Исследование крови: общий анализ крови',
          'Исследование крови: биохимическое',
          'Исследование крови: уровень тромбоцитов',
          'Исследование крови: по методу Кнотта',
          'Исследование крови: серологическое',
          'Исследование фекалий (паразитологическое)',
          'Исследование фекалий развёрнутая форма',
          'Взятие и микроскопия соскобов',
          'Люминисцентная диагностика микроспории',
          'Общий анализ мочи на приборе',
          'Исследование мочи экспресс методом',
          'Исследование мочи специальными методами',
          'Исследование пунктатов',
          'Взятие проб на инфекционный вагинит, постит',
        ]
        return (
          <Modal open={orderLabOpen} onClose={() => setOrderLabOpen(false)} title="🔬 Назначить анализы"
            footer={[
              <Btn key="c" onClick={() => setOrderLabOpen(false)}>Отмена</Btn>,
              <Btn key="s" variant="primary" onClick={async () => {
                if (orderLabServices.length === 0) return
                try {
                  await api.post('/lab/orders', {
                    pet_id: parseInt(petId),
                    services: orderLabServices,
                    scheduled_date: orderLabDate || null,
                    notes: orderLabNotes || null,
                  })
                  setOrderSuccess('✓ Заявка отправлена в лабораторию')
                  await load()
                  setTimeout(() => { setOrderLabOpen(false); setOrderSuccess('') }, 1500)
                } catch(e) { console.error(e) }
              }}>
                Отправить в лабораторию
              </Btn>
            ]}>
            {orderSuccess
              ? <div style={{ textAlign:'center', padding:'24px', color:'#166534', fontWeight:800, fontSize:16, ...F }}>{orderSuccess}</div>
              : <>
                  <div style={{ ...F, fontSize:12, color:'#64748b', marginBottom:12 }}>
                    Отметьте галочками нужные анализы из прейскуранта:
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:320, overflowY:'auto', marginBottom:14 }}>
                    {LAB_SERVICES_ALL.map(svc => (
                      <label key={svc} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:7, border:`1.5px solid ${orderLabServices.includes(svc)?'#166534':'#e2e8f0'}`, background:orderLabServices.includes(svc)?'#f0fdf4':'#fff', cursor:'pointer', ...F, fontSize:13 }}>
                        <input type="checkbox" checked={orderLabServices.includes(svc)}
                          onChange={e => setOrderLabServices(prev => e.target.checked ? [...prev, svc] : prev.filter(s => s !== svc))}
                          style={{ accentColor:'#166534', width:16, height:16 }} />
                        {svc}
                      </label>
                    ))}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <Field label="Планируемая дата забора" type="date" value={orderLabDate} onChange={setOrderLabDate} />
                    <Field label="Примечания для лаборанта" value={orderLabNotes} onChange={setOrderLabNotes} />
                  </div>
                  {orderLabServices.length > 0 && (
                    <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:7, padding:'8px 12px', marginTop:8, ...F, fontSize:12, color:'#166534' }}>
                      Выбрано: {orderLabServices.length} анализ(ов)
                    </div>
                  )}
                </>
            }
          </Modal>
        )
      })()}

      {/* ══ Модал: добавить вакцинацию ══ */}
      <Modal open={vacOpen} onClose={() => setVacOpen(false)} title="Добавить запись о вакцинации"
        footer={[<Btn key="c" onClick={() => setVacOpen(false)}>Отмена</Btn>, <Btn key="s" onClick={saveVac} variant="primary">Сохранить</Btn>]}>
        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#64748b', display:'block', marginBottom:3, textTransform:'uppercase', letterSpacing:0.5 }}>Наименование вакцины</label>
          <select
            value={vaccineTypes.find(x=>x.name===vacForm.vaccine_name) ? vacForm.vaccine_name : (vacForm.vaccine_name ? '__custom__' : '')}
            onChange={e => {
              if (e.target.value === '__custom__') {
                setVacForm({...vacForm, vaccine_name:'', vaccine_type:'', next_due_date:'', _customVaccine: true})
              } else {
                const t = vaccineTypes.find(x=>x.name===e.target.value)
                const nd = t && vacForm.date_given ? new Date(new Date(vacForm.date_given).getTime()+t.interval_days*86400000).toISOString().split('T')[0] : ''
                setVacForm({...vacForm, vaccine_name:e.target.value, vaccine_type:t?.type||'', next_due_date:nd, _customVaccine: false})
              }
            }}
            style={{ width:'100%', padding:'8px 10px', borderRadius:6, border:'1px solid #cbd5e0', fontSize:14, background:'#fff' }}
          >
            <option value="">— не указано —</option>
            {vaccineTypes.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
            <option value="__custom__">✏️ Ввести вручную...</option>
          </select>
          {(vacForm._customVaccine || (vacForm.vaccine_name && !vaccineTypes.find(x=>x.name===vacForm.vaccine_name))) && (
            <input
              style={{ width:'100%', padding:'8px 10px', borderRadius:6, border:'1px solid #cbd5e0', fontSize:14, marginTop:6, boxSizing:'border-box' }}
              placeholder="Введите название вакцины..."
              value={vacForm.vaccine_name}
              onChange={e => setVacForm({...vacForm, vaccine_name:e.target.value, _customVaccine:true, next_due_date:''})}
            />
          )}
        </div>
        <Field label="Производитель" value={vacForm.manufacturer} onChange={v => setVacForm({...vacForm,manufacturer:v})} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <Field label="№ партии / Серия" value={vacForm.batch_number} onChange={v => setVacForm({...vacForm,batch_number:v})} />
          <Field label="Дата вакцинации" type="date" value={vacForm.date_given} onChange={v => {
            const t = vaccineTypes.find(x=>x.name===vacForm.vaccine_name)
            const nd = t && v ? new Date(new Date(v).getTime()+t.interval_days*86400000).toISOString().split('T')[0] : ''
            setVacForm({...vacForm,date_given:v,next_due_date:nd})
          }} />
          <Field label="Дата изготовления" type="date" value={vacForm.manufacture_date} onChange={v => setVacForm({...vacForm,manufacture_date:v})} />
          <Field label="Срок годности" type="date" value={vacForm.expiry_date} onChange={v => setVacForm({...vacForm,expiry_date:v})} />
        </div>
        {vacForm.next_due_date && (
          <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:6, padding:'7px 12px', fontSize:12, color:'#166534', marginBottom:10 }}>
            Действительно до: <strong>{fmtS(vacForm.next_due_date)}</strong> (рассчитано автоматически)
          </div>
        )}
        <Field label="Примечания" value={vacForm.notes} multi onChange={v => setVacForm({...vacForm,notes:v})} rows={2} />
      </Modal>

      {/* ══ Модал: паразиты ══ */}
      <Modal open={parasiteOpen} onClose={() => setParasiteOpen(false)} title="Добавить обработку от паразитов"
        footer={[<Btn key="c" onClick={() => setParasiteOpen(false)}>Отмена</Btn>, <Btn key="s" onClick={saveParasite} variant="primary">Сохранить</Btn>]}>
        <Field label="Тип обработки" value={parasiteForm.type} options={[{value:'ecto_parasite',label:'VI. Эктопаразиты (блохи, клещи)'},{value:'deworming',label:'VII. Дегельминтизация (глисты)'}]} onChange={v => setParasiteForm({...parasiteForm,type:v})} />
        <Field label="Наименование препарата" value={parasiteForm.drug_name} onChange={v => setParasiteForm({...parasiteForm,drug_name:v})} />
        <Field label="Производитель" value={parasiteForm.manufacturer} onChange={v => setParasiteForm({...parasiteForm,manufacturer:v})} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px' }}>
          <Field label="Дата обработки" type="date" value={parasiteForm.date} onChange={v => setParasiteForm({...parasiteForm,date:v})} />
          <Field label="Ветеринарный врач" value={parasiteForm.doctor||user?.full_name} onChange={v => setParasiteForm({...parasiteForm,doctor:v})} />
        </div>
      </Modal>

      {/* ══ Модал: редактировать паспорт ══ */}
      <Modal open={passOpen} onClose={() => setPassOpen(false)} title="Редактировать паспортные данные"
        footer={[<Btn key="c" onClick={() => setPassOpen(false)}>Отмена</Btn>, <Btn key="s" onClick={savePassport} variant="primary">Сохранить</Btn>]}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
          <Field label="Паспорт №" value={passForm.passport_number} onChange={v => setPassForm({...passForm,passport_number:v})} />
          <Field label="Дата выдачи" type="date" value={passForm.issue_date} onChange={v => setPassForm({...passForm,issue_date:v})} />
          <Field label="Микрочип №" value={passForm.microchip_number} onChange={v => setPassForm({...passForm,microchip_number:v})} />
          <Field label="Дата чипирования" type="date" value={passForm.chip_date} onChange={v => setPassForm({...passForm,chip_date:v})} />
          <Field label="Расположение чипа" value={passForm.chip_location} onChange={v => setPassForm({...passForm,chip_location:v})} />
          <Field label="Клеймо №" value={passForm.tattoo_number} onChange={v => setPassForm({...passForm,tattoo_number:v})} />
          <Field label="Дата клеймения" type="date" value={passForm.tattoo_date} onChange={v => setPassForm({...passForm,tattoo_date:v})} />
          <Field label="Группа крови" value={passForm.blood_type} onChange={v => setPassForm({...passForm,blood_type:v})} />
          <Field label="Репродукция" value={passForm.reproduction} options={[{value:'intact',label:'Не кастрирован'},{value:'sterilized',label:'Стерилизован'},{value:'castrated',label:'Кастрирован'}]} onChange={v => setPassForm({...passForm,reproduction:v})} />
          <div style={{ gridColumn:'1/-1' }}><Field label="Окрас / волосяной покров" value={passForm.coat_color} onChange={v => setPassForm({...passForm,coat_color:v})} /></div>
          <div style={{ gridColumn:'1/-1' }}><Field label="Особые отметины / Distinguishing marks" value={passForm.special_marks} onChange={v => setPassForm({...passForm,special_marks:v})} /></div>
          <div style={{ gridColumn:'1/-1' }}><Field label="Аллергии" value={passForm.allergies} multi rows={2} onChange={v => setPassForm({...passForm,allergies:v})} /></div>
          <div style={{ gridColumn:'1/-1' }}><Field label="Хронические заболевания" value={passForm.chronic_diseases} multi rows={2} onChange={v => setPassForm({...passForm,chronic_diseases:v})} /></div>
          <div style={{ gridColumn:'1/-1', borderTop:'1px solid #e2e8f0', paddingTop:12, marginTop:4, fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5 }}>Данные владельца</div>
          <div style={{ gridColumn:'1/-1' }}><Field label="Адрес проживания" value={passForm.owner_address} onChange={v => setPassForm({...passForm,owner_address:v})} /></div>
          <Field label="Город" value={passForm.owner_city} onChange={v => setPassForm({...passForm,owner_city:v})} />
          <Field label="Почтовый индекс" value={passForm.owner_zip} onChange={v => setPassForm({...passForm,owner_zip:v})} />
        </div>
      </Modal>

      {/* ══ Модал: Титры антител к бешенству ══ */}
      <Modal open={titerOpen} onClose={() => setTiterOpen(false)} title="Определение титров антител к вирусу бешенства"
        footer={[
          <Btn key="c" onClick={() => setTiterOpen(false)}>Отмена</Btn>,
          <Btn key="s" onClick={async () => {
            try {
              await api.post(`/passport/${petId}/titer`, {
                sample_date: titerForm.sample_date || '',
                laboratory: titerForm.laboratory || '',
                result: titerForm.result || '',
                record_date: titerForm.record_date || new Date().toISOString().split('T')[0],
                vet_name: titerForm.vet_name || user?.full_name || '',
              })
              await load(); setTiterOpen(false)
              setTiterForm({ sample_date:'', laboratory:'', result:'', record_date:'', vet_name:'' })
            } catch(e) { console.error(e) }
          }} variant="primary">Сохранить</Btn>
        ]}>
        {/* Превью официального текста */}
        <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:6, padding:'12px 14px', marginBottom:16, fontSize:12, color:'#475569', lineHeight:1.8, ...F }}>
          Я ознакомлен с официальной записью о результатах определения титров антител к вирусу бешенства в сыворотке крови, взятой{' '}
          <strong>«{titerForm.sample_date ? fmtS(titerForm.sample_date) : '___'}»</strong>,
          проведённого в <strong>{titerForm.laboratory || '___'}</strong>, имеющей международную аккредитацию по данному исследованию, которая констатирует, что нейтрализующий бешенство титр антител был <strong style={{ color:'#166534' }}>равен или превышал 0,5 МЕ/мл</strong>.
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px' }}>
          <Field label="Дата взятия крови" type="date" value={titerForm.sample_date} onChange={v => setTiterForm({...titerForm,sample_date:v})} />
          <Field label="Результат (МЕ/мл)" value={titerForm.result} onChange={v => setTiterForm({...titerForm,result:v})} />
          <div style={{ gridColumn:'1/-1' }}>
            <Field label="Название лаборатории" value={titerForm.laboratory} onChange={v => setTiterForm({...titerForm,laboratory:v})} />
          </div>
          <Field label="ФИО ветеринарного врача" value={titerForm.vet_name || user?.full_name} onChange={v => setTiterForm({...titerForm,vet_name:v})} />
          <Field label="Дата записи" type="date" value={titerForm.record_date || new Date().toISOString().split('T')[0]} onChange={v => setTiterForm({...titerForm,record_date:v})} />
        </div>
      </Modal>

      {/* ══ Модал: FeLV/FIV ══ */}
      <Modal open={labOpen} onClose={() => setLabOpen(false)} title="Обновить статус FeLV / FIV"
        footer={[<Btn key="c" onClick={() => setLabOpen(false)}>Отмена</Btn>, <Btn key="s" onClick={saveLabStatus} variant="primary">Сохранить</Btn>]}>
        <Field label="FeLV — Вирусная лейкемия" value={labForm.felv} options={[{value:'negative',label:'Негативный'},{value:'positive',label:'Позитивный'},{value:'unknown',label:'Не тестировался'}]} onChange={v => setLabForm({...labForm,felv:v})} />
        <Field label="FIV — Иммунодефицит" value={labForm.fiv} options={[{value:'negative',label:'Негативный'},{value:'positive',label:'Позитивный'},{value:'unknown',label:'Не тестировался'}]} onChange={v => setLabForm({...labForm,fiv:v})} />
        {(labForm.felv==='positive'||labForm.fiv==='positive') && (
          <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:6, padding:'10px 12px', fontSize:12, color:'#991b1b', fontWeight:600 }}>
            ⚠ Внимание: позитивный статус будет отображён как красный информер в шапке профиля животного
          </div>
        )}
      </Modal>

      {/* ══ Модал: Клиническое обследование ══ */}
      {data && <Modal open={examOpen} onClose={() => setExamOpen(false)} title="Клиническое обследование"
        footer={[
          <Btn key="c" onClick={() => setExamOpen(false)}>Отмена</Btn>,
          <Btn key="s" onClick={async () => {
            try {
              const fd = new FormData()
              fd.append('exam_date', examForm.exam_date || new Date().toISOString().split('T')[0])
              fd.append('vet_name', examForm.vet_name || user?.full_name || '')
              fd.append('authorized_name', examForm.authorized_name || user?.full_name || '')
              fd.append('notes', examForm.notes || '')
              await api.post(`/passport/${petId}/clinical_exam`, fd, { headers:{'Content-Type':'multipart/form-data'} })
              await load(); setExamOpen(false)
              setExamForm({ exam_date:'', vet_name:'', authorized_name:'', notes:'' })
            } catch(e) { console.error(e) }
          }} variant="primary">Сохранить</Btn>
        ]}>
        <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:6, padding:'12px 14px', marginBottom:14, fontSize:13, color:'#1e293b', lineHeight:1.8, ...F }}>
          Животное <strong>{pet?.name}</strong> клинически здорово и может быть транспортировано.
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px' }}>
          <Field label="Дата обследования" type="date" value={examForm.exam_date || new Date().toISOString().split('T')[0]} onChange={v => setExamForm({...examForm,exam_date:v})} />
          <Field label="Ветеринарный врач" value={examForm.vet_name || user?.full_name} onChange={v => setExamForm({...examForm,vet_name:v})} />
        </div>
        <Field label="Дополнительные примечания" value={examForm.notes} multi rows={2} onChange={v => setExamForm({...examForm,notes:v})} />
        <div style={{ borderTop:'1px solid #e2e8f0', marginTop:14, paddingTop:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Подпись уполномоченного лица</div>
          <Field label="ФИО уполномоченного лица" value={examForm.authorized_name || user?.full_name} onChange={v => setExamForm({...examForm,authorized_name:v})} />
        </div>
      </Modal>}

      {/* ══ Модал: Подробности приёма ══ */}
      {selectedVisit && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', zIndex:1400, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setSelectedVisit(null)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:8, width:'100%', maxWidth:540, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', ...F }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#1e293b', borderRadius:'8px 8px 0 0' }}>
              <div>
                <div style={{ fontWeight:800, fontSize:15, color:'#fff' }}>Карта приёма</div>
                <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>
                  {selectedVisit.visit_date ? new Date(selectedVisit.visit_date).toLocaleDateString('ru',{day:'numeric',month:'long',year:'numeric'}) : '—'} · {selectedVisit.vet_name}
                </div>
              </div>
              <button onClick={() => setSelectedVisit(null)} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:22, cursor:'pointer' }}>×</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { label:'Анамнез и жалобы', value:selectedVisit.anamnesis, color:'#1e40af', bg:'#eff6ff', border:'#bfdbfe' },
                { label:'Диагноз / Заключение', value:selectedVisit.diagnosis, color:'#166534', bg:'#f0fdf4', border:'#86efac' },
                { label:'Назначенные препараты', value:selectedVisit.medications, color:'#1e40af', bg:'#eff6ff', border:'#bfdbfe' },
                { label:'Рекомендации по уходу', value:selectedVisit.recommendations, color:'#92400e', bg:'#fffbeb', border:'#fde68a' },
                { label:'Дополнительные заметки', value:selectedVisit.notes, color:'#475569', bg:'#f8fafc', border:'#e2e8f0' },
              ].map(s => s.value ? (
                <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:6, padding:'10px 14px' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:s.color, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:13, color:'#1e293b', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{s.value}</div>
                </div>
              ) : null)}
              {!selectedVisit.anamnesis && !selectedVisit.diagnosis && !selectedVisit.medications && !selectedVisit.recommendations && !selectedVisit.notes && (
                <div style={{ textAlign:'center', padding:'24px', color:'#94a3b8', fontSize:13 }}>Рецепт не был заполнен при завершении приёма</div>
              )}
            </div>
            <div style={{ padding:'12px 20px', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'flex-end' }}>
              <Btn onClick={() => setSelectedVisit(null)}>Закрыть</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ══ Модал: Архивировать карту ══ */}
      {data && <Modal open={archiveOpen} onClose={() => setArchiveOpen(false)} title="Архивировать карту питомца"
        footer={[
          <Btn key="c" onClick={() => setArchiveOpen(false)}>Отмена</Btn>,
          <Btn key="s" onClick={async () => {
            try {
              await api.post(`/passport/${petId}/archive`, archiveForm)
              await load(); setArchiveOpen(false)
              setMsg('Карта питомца архивирована')
            } catch(e) { console.error(e) }
          }} danger>📦 Архивировать</Btn>
        ]}>
        <div style={{ background:'#fff1f2', border:'1px solid #fca5a5', borderRadius:6, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#991b1b', ...F }}>
          ⚠ После архивирования карта питомца <strong>{pet?.name}</strong> будет скрыта из активного реестра. Данные сохранятся и карту можно восстановить.
        </div>
        <Field label="Причина архивирования" value={archiveForm.reason}
          options={[
            { value:'died',   label:'🌈 Животное погибло' },
            { value:'moved',  label:'🏠 Переезд владельца' },
            { value:'lost',   label:'❓ Животное пропало' },
            { value:'other',  label:'📝 Другая причина' },
          ]}
          onChange={v => setArchiveForm({...archiveForm, reason:v})} />
        <Field label="Примечание (необязательно)" value={archiveForm.note} multi rows={2}
          onChange={v => setArchiveForm({...archiveForm, note:v})} />
      </Modal>}

      {/* ══ Модал: добавить анализ ══ */}
      {addLabOpen && (
        <Modal open={addLabOpen} onClose={() => setAddLabOpen(false)} title="🔬 Добавить результат анализа"
          footer={[
            <Btn key="c" onClick={() => setAddLabOpen(false)}>Отмена</Btn>,
            <Btn key="s" variant="primary"
              onClick={async () => {
                if (!addLabForm.service || !addLabForm.date) return
                try {
                  await api.post('/procedures/', {
                    pet_id: parseInt(petId),
                    type: 'lab',
                    description: `${addLabForm.service}: ${addLabForm.result}${addLabForm.notes ? ' | ' + addLabForm.notes : ''}`,
                    date: addLabForm.date,
                    cost: 0
                  })
                  await load()
                  setAddLabOpen(false)
                  setAddLabForm({ service:'', result:'', date: new Date().toISOString().split('T')[0], notes:'' })
                } catch(e) { console.error(e) }
              }}>
              Сохранить
            </Btn>
          ]}>
          <Field label="Вид анализа *" value={addLabForm.service}
            options={[
              { value:'Взятие крови', label:'Взятие крови' },
              { value:'Исследование крови: общий анализ крови', label:'Исследование крови: общий анализ крови' },
              { value:'Исследование крови: биохимическое', label:'Исследование крови: биохимическое' },
              { value:'Исследование крови: уровень тромбоцитов', label:'Исследование крови: уровень тромбоцитов' },
              { value:'Исследование крови: по методу Кнотта', label:'Исследование крови: по методу Кнотта' },
              { value:'Исследование крови: серологическое', label:'Исследование крови: серологическое' },
              { value:'Исследование фекалий (паразитологическое)', label:'Исследование фекалий (паразитологическое)' },
              { value:'Исследование фекалий развёрнутая форма', label:'Исследование фекалий развёрнутая форма' },
              { value:'Взятие и микроскопия соскобов', label:'Взятие и микроскопия соскобов' },
              { value:'Люминисцентная диагностика микроспории', label:'Люминисцентная диагностика микроспории' },
              { value:'Общий анализ мочи на приборе', label:'Общий анализ мочи на приборе' },
              { value:'Исследование мочи экспресс методом', label:'Исследование мочи экспресс методом' },
              { value:'Исследование мочи специальными методами', label:'Исследование мочи специальными методами' },
              { value:'Исследование пунктатов', label:'Исследование пунктатов' },
              { value:'Взятие проб на инфекционный вагинит, постит', label:'Взятие проб на инфекционный вагинит, постит' },
            ]}
            onChange={v => setAddLabForm({...addLabForm, service:v})} />
          <Field label="Дата проведения *" type="date" value={addLabForm.date}
            onChange={v => setAddLabForm({...addLabForm, date:v})} />
          <Field label="Результат / описание" value={addLabForm.result} multi rows={3}
            onChange={v => setAddLabForm({...addLabForm, result:v})}/>
          <Field label="Примечания" value={addLabForm.notes}
            onChange={v => setAddLabForm({...addLabForm, notes:v})} />
        </Modal>
      )}

      </div>
      </div>
  )
}
