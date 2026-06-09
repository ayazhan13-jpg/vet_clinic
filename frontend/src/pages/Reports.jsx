import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer
} from 'recharts'
import api from '../api'

const GREEN = '#2e7d32'; const BLUE = '#1565c0'; const ORANGE = '#e65100'
const RED = '#c62828'; const PURPLE = '#6a1b9a'
const PIE_COLORS = [GREEN, BLUE, ORANGE, RED, PURPLE]

const F = { fontFamily: "'Nunito', sans-serif" }

// ── Tooltip ──────────────────────────────────────────────────────────────────
const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: 13 }}>
      {label && <div style={{ fontWeight: 800, color: '#2d4a2d', marginBottom: 6 }}>{label}</div>}
      {payload.map((p, i) => {
        const clr = p.color || p.fill || '#333'
        return <div key={i} style={{ color: clr, fontWeight: 600 }}>{p.name}{': '}<strong>{p.value}</strong></div>
      })}
    </div>
  )
}

// ── Экспорт одного графика в Excel ───────────────────────────────────────────
async function exportSheet(sheetName, columns, rows, filename) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(sheetName)
  ws.columns = columns
  const hRow = ws.addRow(columns.map(c => c.header))
  hRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } }
  hRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  rows.forEach(r => ws.addRow(r))
  const buf = await wb.xlsx.writeBuffer()
  const { saveAs } = await import('file-saver')
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), filename)
}

// ── Кнопка Excel ─────────────────────────────────────────────────────────────
function ExcelBtn({ onClick }) {
  return (
    <button onClick={e => { e.stopPropagation(); onClick() }} style={{
      ...F, padding: '4px 10px', borderRadius: 8, border: '1.5px solid #c8e6c9',
      background: '#f1f8e9', color: '#2e7d32', fontSize: 11, fontWeight: 700,
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
    }}>📥 Excel</button>
  )
}

// ── Модальная таблица ─────────────────────────────────────────────────────────
function DataModal({ title, columns, rows, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640,
        maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', ...F,
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ ...F, fontWeight: 800, fontSize: 16, color: '#2d4a2d', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', ...F }}>
            <thead>
              <tr style={{ background: '#f4f8f4', position: 'sticky', top: 0 }}>
                {columns.map(c => <th key={c} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#5a7a5a', textTransform: 'uppercase', letterSpacing: 0.7, borderBottom: '1px solid #e8e8e8' }}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  {row.map((cell, j) => <td key={j} style={{ padding: '9px 14px', fontSize: 13, color: '#333', borderBottom: '1px solid #f5f5f5' }}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Карточка графика с кнопкой Excel и кликом ─────────────────────────────────
function ChartCard({ title, children, onExcel, onClick, style }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: '#fff', borderRadius: 16, padding: '14px 16px',
        boxShadow: hov && onClick ? '0 6px 24px rgba(46,125,50,0.15)' : '0 2px 10px rgba(0,0,0,0.06)',
        border: hov && onClick ? '1.5px solid #a5d6a7' : '1.5px solid transparent',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s', display: 'flex', flexDirection: 'column',
        minWidth: 0, overflow: 'hidden', minHeight: 0,
        ...style,
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ ...F, fontWeight: 800, fontSize: 14, color: '#2d4a2d' }}>{title}</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {onExcel && <ExcelBtn onClick={onExcel} />}
          {onClick && <span style={{ fontSize: 11, color: '#bbb', ...F }}>нажмите для деталей</span>}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  )
}

function EmptyChart({ text }) {
  return <div style={{ ...F, textAlign: 'center', padding: '40px 0', color: '#ccc', fontSize: 13 }}>{text}</div>
}

// ═══════════════════════════════════════════════════════════════════════════
// ГЛАВНЫЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════
export default function Reports() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('main')
  const [modal, setModal] = useState(null) // { title, columns, rows }
  const [overdueModal, setOverdueModal] = useState(false)
  const [overdueOwners, setOverdueOwners] = useState([])
  const [notifySent, setNotifySent] = useState(false)
  const [notifyLoading, setNotifyLoading] = useState(false)
  const [foreTab, setForeTab] = useState('history')
  const [vacHistory, setVacHistory] = useState([])
  const [vacHistoryLoading, setVacHistoryLoading] = useState(false)
  const [vacOverdue, setVacOverdue] = useState([])
  const [vacOverdueLoading, setVacOverdueLoading] = useState(false)
  const [notifyOverdueSent, setNotifyOverdueSent] = useState(false)
  const [notifyOverdueLoading2, setNotifyOverdueLoading2] = useState(false)
  const [procurement, setProcurement] = useState(null)
  const [procurementLoading, setProcurementLoading] = useState(false)
  const [procPeriod, setProcPeriod] = useState('quarter')
  const [histFilter, setHistFilter] = useState('all')
  const [chartVaccine, setChartVaccine] = useState('Бешенство')
  const [chartData, setChartData] = useState(null)
  const [chartLoading, setChartLoading] = useState(false)

  const today = new Date()
  const [dateFrom, setDateFrom] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0])

  const loadReport = async (f, t) => {
    setLoading(true)
    try {
      const res = await api.get(`/reports/summary?date_from=${f || dateFrom}&date_to=${t || dateTo}`)
      setReport(res.data)
      console.log('Species data:', res.data.species)
      console.log('Diagnoses:', res.data.diagnoses)
    } catch(e) { console.error('Report error:', e) }
    setLoading(false)
  }

  useEffect(() => { loadReport() }, [])

  const setCurrentMonth = () => {
    const f = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
    const t = today.toISOString().split('T')[0]
    setDateFrom(f); setDateTo(t); loadReport(f, t)
  }

  const setCurrentYear = () => {
    const f = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
    const t = today.toISOString().split('T')[0]
    setDateFrom(f); setDateTo(t); loadReport(f, t)
  }

  const statusData = report ? [
    { name: 'Завершено',  value: report.appointments.completed },
    { name: 'Записан',    value: (report.appointments.pending || 0) + (report.appointments.confirmed || 0) },
    { name: 'Отменено',   value: report.appointments.cancelled },
  ].filter(s => s.value > 0) : []

  const DAYS = ['Пн','Вт','Ср','Чт','Пт']
  const weekdayData = report ? (() => {
    const counts = { 'Пн':0,'Вт':0,'Ср':0,'Чт':0,'Пт':0 }
    ;(report.appointments.daily || []).forEach(d => {
      const wd = new Date(d.date).getDay()
      const name = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][wd]
      if (counts[name] !== undefined) counts[name] += d.count
    })
    return DAYS.map(day => ({ day, count: counts[day] }))
  })() : []

  // ── Обработчики открытия модальных таблиц ────────────────────────────────
  const openDailyModal = () => setModal({
    title: '📈 Динамика приёмов по дням',
    columns: ['Дата', 'Количество приёмов'],
    rows: report.appointments.daily.map(d => [d.date, d.count]),
  })

  const openVetModal = () => setModal({
    title: '👨‍⚕️ Приёмы по врачам',
    columns: ['Врач', 'Всего', 'Завершено', 'Отменено', '% завершения'],
    rows: report.appointments.by_vet.map(v => [v.vet, v.total, v.completed, v.cancelled, v.total > 0 ? `${Math.round(v.completed * 100 / v.total)}%` : '0%']),
  })

  // ── Обработчики экспорта ─────────────────────────────────────────────────
  const exDynamic = () => exportSheet('Динамика', [{ header: 'Дата', key: 'd', width: 15 }, { header: 'Приёмов', key: 'c', width: 15 }], report.appointments.daily.map(d => [d.date, d.count]), 'динамика_приемов.xlsx')
  const exVet = () => exportSheet('По врачам', [{ header: 'Врач', key: 'v', width: 30 }, { header: 'Всего', key: 't', width: 12 }, { header: 'Завершено', key: 'c', width: 12 }, { header: 'Отменено', key: 'x', width: 12 }], report.appointments.by_vet.map(v => [v.vet, v.total, v.completed, v.cancelled]), 'приемы_по_врачам.xlsx')
  const exForecast = () => exportSheet('Прогноз вакцинаций', [{ header: 'Питомец', key: 'p', width: 20 }, { header: 'Вакцина', key: 'v', width: 30 }, { header: 'Дата', key: 'd', width: 15 }], (report?.forecast?.upcoming_vaccines || []).map(v => [v.pet_name || '—', v.vaccine, v.due_date]), 'прогноз_вакцинаций.xlsx')

  const handleOpenOverdueModal = async () => {
    setOverdueModal(true)
    setNotifySent(false)
    setOverdueOwners([])
    try {
      const r = await api.get('/passport/overdue/owners')
      setOverdueOwners(r.data)
    } catch(e) {
      setOverdueOwners([])
    }
  }

  const handleNotifyOverdue = async () => {
    setNotifyLoading(true)
    try {
      await api.post('/passport/overdue/notify')
    } catch(e) {
      console.error(e)
    }
    setNotifySent(true)
    setNotifyLoading(false)
  }

  const loadVacHistory = async () => {
    setVacHistoryLoading(true)
    try { const r = await api.get('/reports/vaccines/history'); setVacHistory(r.data) }
    catch(e) { console.error(e) }
    setVacHistoryLoading(false)
  }
  const loadVacOverdue = async () => {
    setVacOverdueLoading(true)
    try { const r = await api.get('/reports/vaccines/overdue'); setVacOverdue(r.data) }
    catch(e) { console.error(e) }
    setVacOverdueLoading(false)
  }
  const loadProcurement = async (p) => {
    const period = p || procPeriod
    setProcurementLoading(true)
    try { const r = await api.get(`/reports/vaccines/procurement?period=${period}`); setProcurement(r.data) }
    catch(e) { console.error(e) }
    setProcurementLoading(false)
  }
  const loadChart = async (vaccine) => {
    const vac = vaccine || chartVaccine
    setChartLoading(true)
    try {
      const r = await api.get(`/reports/vaccines/monthly-chart?vaccine=${encodeURIComponent(vac)}&months_ahead=3`)
      setChartData(r.data)
    } catch(e) { console.error(e) }
    setChartLoading(false)
  }

  const handleNotifyOverdueVaccines = async () => {
    setNotifyOverdueLoading2(true)
    try { await api.post('/reports/vaccines/notify-overdue'); setNotifyOverdueSent(true) }
    catch(e) { console.error(e) }
    setNotifyOverdueLoading2(false)
  }
  const exVacHistory = () => {
    const filtered = vacHistory.filter(v => histFilter === 'all' || v.status === histFilter)
    return exportSheet('История вакцинаций',
      [{header:'Питомец',key:'p',width:16},{header:'Вид',key:'s',width:12},{header:'Владелец',key:'o',width:22},{header:'Телефон',key:'ph',width:16},{header:'Вакцина',key:'v',width:28},{header:'Дата вакцинации',key:'d',width:16},{header:'Следующая',key:'n',width:16},{header:'Статус',key:'st',width:14}],
      filtered.map(v=>[v.pet_name,v.pet_species,v.owner_name,v.owner_phone||'—',v.vaccine_name,v.date_given,v.next_due_date||'—',v.status==='overdue'?'Просрочена':v.status==='soon'?'Скоро':'Ок']),
      'история_вакцинаций.xlsx')
  }
  const exOverdue = () => exportSheet('Просроченные',
    [{header:'Питомец',key:'p',width:16},{header:'Вид',key:'s',width:12},{header:'Владелец',key:'o',width:22},{header:'Телефон',key:'ph',width:16},{header:'Email',key:'em',width:24},{header:'Вакцина',key:'v',width:28},{header:'Срок был',key:'d',width:16},{header:'Просрочено (дн.)',key:'ov',width:16}],
    vacOverdue.map(v=>[v.pet_name,v.pet_species,v.owner_name,v.owner_phone||'—',v.owner_email||'—',v.vaccine_name,v.next_due_date,v.days_overdue]),
    'просроченные_вакцинации.xlsx')
  const exProcurement = async () => {
    if (!procurement) return
    const ExcelJS = (await import('exceljs')).default
    const { saveAs } = await import('file-saver')
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Заявка')
    ws.mergeCells('A1:G1')
    const h1 = ws.getCell('A1')
    h1.value = 'ГБУ «Городская ветеринарная станция г. Байконур»'
    h1.font = { name:'Arial', bold:true, size:12, color:{argb:'FFFFFFFF'} }
    h1.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF2E7D32'} }
    h1.alignment = { horizontal:'center', vertical:'middle' }
    ws.getRow(1).height = 24
    ws.mergeCells('A2:G2')
    const h2 = ws.getCell('A2')
    h2.value = `ЗАЯВКА НА ПРИОБРЕТЕНИЕ ВАКЦИН — следующий ${procurement.period} (${procurement.period_start} — ${procurement.period_end}) · включая запас +10%`
    h2.font = { name:'Arial', bold:true, size:11, color:{argb:'FF1B5E20'} }
    h2.alignment = { horizontal:'center', vertical:'middle' }
    h2.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFE8F5E9'} }
    ws.getRow(2).height = 22
    const headers = ['№','Наименование вакцины','Запланировано','Просрочено','История (пр. год)','Прогноз МНК','Итого (+10% запас)','Примечание']
    const widths = [5,40,14,12,16,14,14,22]
    const hRow = ws.addRow(headers)
    hRow.height = 36
    headers.forEach((_,i) => {
      const c = hRow.getCell(i+1)
      c.font = { name:'Arial', bold:true, color:{argb:'FFFFFFFF'} }
      c.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF2E7D32'} }
      c.alignment = { horizontal:'center', vertical:'middle', wrapText:true }
      ws.getColumn(i+1).width = widths[i]
    })
    procurement.items.forEach((item,idx) => {
      const row = ws.addRow([idx+1, item.vaccine_name, item.upcoming_count, item.overdue_count, item.historical_count, item.mnk_forecast||0, item.total_needed, item.overdue_count>0?'⚠️ Включает просроченные':''])
      row.height = 22
      const fill = idx%2===0 ? {type:'pattern',pattern:'solid',fgColor:{argb:'FFFFFFFF'}} : {type:'pattern',pattern:'solid',fgColor:{argb:'FFF9FBE7'}}
      row.eachCell(c => { c.fill=fill; c.font={name:'Arial',size:10}; c.alignment={vertical:'middle',horizontal:'center'} })
      row.getCell(2).alignment = { vertical:'middle', horizontal:'left' }
      row.getCell(6).font = { name:'Arial', bold:true, size:10, color:{argb:'FF1B5E20'} }
    })
    const totalRow = ws.addRow(['','ИТОГО:','','','','',procurement.total_doses,''])
    totalRow.height = 24
    totalRow.eachCell(c => { c.font={name:'Arial',bold:true,size:11,color:{argb:'FFFFFFFF'}}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF2E7D32'}}; c.alignment={horizontal:'center',vertical:'middle'} })
    const sigRow = ws.rowCount + 2
    ws.mergeCells(`A${sigRow}:D${sigRow}`)
    ws.getCell(`A${sigRow}`).value = 'Руководитель: Рыбалкина Е.Е. _______________'
    ws.getCell(`A${sigRow}`).font = { name:'Arial', size:10 }
    const buf = await wb.xlsx.writeBuffer()
    saveAs(new Blob([buf],{type:'application/octet-stream'}), `заявка_вакцины_${procurement.period}.xlsx`)
  }

  const TABS = [
    { key: 'main',  label: '🏠 Главная панель' },
    { key: 'ops',   label: '📅 Нагрузка' },
    { key: 'diag',  label: '🩺 Диагнозы' },
    { key: 'staff', label: '👨‍⚕️ Персонал' },
    { key: 'fore',  label: '🔮 Прогнозы' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f4f8f4', overflow: 'hidden', ...F }}>

      {/* ── Шапка (фиксированная) ── */}
      <div style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '14px 28px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h1 style={{ ...F, fontSize: 22, fontWeight: 800, color: '#2d4a2d', margin: 0 }}>📊 Отчёты и аналитика</h1>
            <p style={{ ...F, margin: 0, fontSize: 12, color: '#7a9e7a', fontWeight: 600 }}>ГБУ "Ветстанция г. Байконур"</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ ...F, fontSize: 12, fontWeight: 700, color: '#999' }}>С</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 13, ...F, outline: 'none' }} />
            <label style={{ ...F, fontSize: 12, fontWeight: 700, color: '#999' }}>По</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 13, ...F, outline: 'none' }} />
            <button onClick={() => loadReport()} disabled={loading} style={{
              ...F, padding: '7px 16px', borderRadius: 8, border: 'none',
              background: loading ? '#a5d6a7' : '#2e7d32', color: '#fff',
              fontSize: 13, fontWeight: 800, cursor: 'pointer',
            }}>{loading ? '...' : 'Сформировать'}</button>
            {[{ l: 'Месяц', fn: setCurrentMonth }, { l: 'Год', fn: setCurrentYear }].map(b => (
              <button key={b.l} onClick={b.fn} style={{ ...F, padding: '6px 12px', borderRadius: 8, border: '1.5px solid #c8e6c9', background: '#f1f8e9', color: '#2e7d32', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{b.l}</button>
            ))}
          </div>
        </div>

        {/* KPI плитки — только на главной вкладке */}
        {report && tab === 'main' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginTop: 12 }}>
            {[
              { l: 'Всего приёмов', v: report.appointments.total, c: GREEN, i: '📅' },
              { l: 'Завершено', v: report.appointments.completed, c: BLUE, i: '✅' },
              { l: 'Отменено', v: report.appointments.cancelled, c: RED, i: '❌' },
              { l: 'Вакцинаций', v: report.vaccinations.total, c: ORANGE, i: '💉' },
              { l: 'Клиентов', v: report.general.total_clients, c: PURPLE, i: '👤' },
              { l: 'Питомцев', v: report.general.total_pets, c: '#795548', i: '🐾' },
            ].map((s, i) => (
              <div key={i} style={{ background: '#f8faf8', borderRadius: 12, padding: '10px 12px', borderTop: `3px solid ${s.c}`, textAlign: 'center' }}>
                <div style={{ fontSize: 16 }}>{s.i}</div>
                <div style={{ ...F, fontSize: 22, fontWeight: 800, color: s.c, lineHeight: 1.1 }}>{s.v}</div>
                <div style={{ ...F, fontSize: 10, color: '#999', fontWeight: 600, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Вкладки */}
        {report && (
          <div style={{ display: 'flex', gap: 2, marginTop: 12 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                ...F, padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, borderRadius: '8px 8px 0 0',
                background: tab === t.key ? '#f4f8f4' : 'transparent',
                color: tab === t.key ? '#2e7d32' : '#999',
                borderBottom: tab === t.key ? '3px solid #2e7d32' : '3px solid transparent',
                transition: 'all 0.15s',
              }}>{t.label}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── Область графиков ── */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '16px 28px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {!report && !loading && (
          <div style={{ textAlign: 'center', paddingTop: 80, color: '#bbb' }}>
            <div style={{ fontSize: 56 }}>📊</div>
            <p style={{ ...F, fontWeight: 700, fontSize: 16, marginTop: 12 }}>Нажмите "Сформировать" чтобы загрузить отчёт</p>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', paddingTop: 80, color: '#aaa' }}>
            <div style={{ fontSize: 40 }}>⏳</div>
            <p style={{ ...F, fontWeight: 700, marginTop: 12 }}>Загрузка данных...</p>
          </div>
        )}

        {/* ── ГЛАВНАЯ: аналитика + 2 графика ── */}
        {report && tab === 'main' && (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto 1fr', gap: 12, minHeight: 0 }}>
            <div style={{ gridColumn: '1/-1', background: '#fff', borderRadius: 12, padding: '10px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                { l: 'Приёмов в день (сейчас)',      v: report.analytics.avg_per_day,             c: GREEN,  hint: 'Среднее за выбранный период' },
                { l: 'Приёмов в день (пред. период)', v: report.analytics.avg_per_day_prev_period, c: '#888', hint: report.analytics.trend_label },
                { l: 'Самый загруженный день', v: report.analytics.busiest_day, c: BLUE, hint: 'День недели с наибольшим числом приёмов' },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center', background: '#f8faf8', borderRadius: 8, padding: '8px' }} title={s.hint}>
                  <div style={{ ...F, fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
                  <div style={{ ...F, fontSize: 10, color: '#555', fontWeight: 600, marginTop: 3, lineHeight: 1.3 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <ChartCard title="📈 Динамика приёмов" onExcel={exDynamic} onClick={openDailyModal}>
              {report.appointments.daily.length > 0 ? (
                <div style={{ flex: 1, minHeight: 0, height: '100%' }}>
                  <ResponsiveContainer width="99%" height="100%">
                    <LineChart data={report.appointments.daily} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                      <Tooltip content={<CT />} />
                      <Line type="monotone" dataKey="count" name="Приёмов" stroke={GREEN} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyChart text="Нет данных" />}
            </ChartCard>
            <ChartCard title="🐾 Охват вакцинацией по видам животных">
              {report.species_vaccination?.length > 0 ? (<>
                <ResponsiveContainer width="99%" height={280}>
                  <BarChart data={report.species_vaccination} layout="vertical" margin={{ top: 8, right: 60, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload
                      return (
                        <div style={{ ...F, background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
                          <div style={{ fontWeight: 800, marginBottom: 4 }}>{d?.name}</div>
                          <div style={{ color: GREEN }}>{'Привито: '}{d?.vaccinated}{' ('}{d?.pct}{'%)'}</div>
                          <div style={{ color: RED }}>{'Не привито: '}{d?.not_vaccinated}</div>
                          <div style={{ color: '#888' }}>{'Всего: '}{d?.total}</div>
                        </div>
                      )
                    }} />
                    <Bar dataKey="pct" name="Охват %" radius={[0, 6, 6, 0]}>
                      {report.species_vaccination.map((d, i) => (
                        <Cell key={i} fill={d.pct >= 80 ? GREEN : d.pct >= 50 ? ORANGE : RED} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ ...F, fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 4 }}>
                  🟢 ≥80% — хороший охват · 🟠 50–79% — средний · 🔴 &lt;50% — низкий
                </div>
              </>) : <EmptyChart text="Нет данных о питомцах" />}
            </ChartCard>
          </div>
        )}

        {/* ── НАГРУЗКА: дни недели + операции ── */}
        {report && tab === 'ops' && (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, minHeight: 0 }}>
            <ChartCard title="📅 Нагрузка по дням недели" onExcel={() => exportSheet('Дни недели',
              [{header:'День',key:'day',width:10},{header:'Приёмов',key:'count',width:12}],
              weekdayData.map(d=>[d.day, d.count]), 'дни_недели.xlsx')}>
              <div style={{ flex: 1, minHeight: 0, height: '100%' }}>
                <ResponsiveContainer width="99%" height="100%">
                  <BarChart data={weekdayData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 14, fontWeight: 700 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CT />} />
                    <Bar dataKey="count" name="Приёмов" radius={[6,6,0,0]}>
                      {weekdayData.map((d, i) => <Cell key={i} fill={d.day === report.analytics.busiest_day ? GREEN : '#cbd5e1'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ ...F, fontSize: 11, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>Самый загруженный день выделен зелёным</div>
            </ChartCard>
            <ChartCard title={`🏥 Операции и услуги (${report.period?.from} — ${report.period?.to})`} onExcel={() => exportSheet('Операции и услуги',
              [{header:'Категория',key:'n',width:30},{header:'Кол-во',key:'c',width:12}],
              (report.surgery||[]).map(d=>[d.name,d.count]), 'операции_услуги.xlsx')}>
              {report.surgery?.some(d => d.count > 0) ? (() => {
                const CAT_COLORS = { 'Хирургия': '#dc2626', 'Терапия и уколы': '#2563eb', 'Лаборатория': '#16a34a', 'Уход и регистрация': '#d97706' }
                const total = report.surgery.reduce((s, d) => s + d.count, 0)
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 290 }}>
                    <ResponsiveContainer width="55%" height={260}>
                      <PieChart>
                        <Pie data={report.surgery.filter(d => d.count > 0)} dataKey="count" nameKey="name"
                          cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={3}>
                          {report.surgery.filter(d => d.count > 0).map((d, i) => (
                            <Cell key={i} fill={CAT_COLORS[d.name] || PIE_COLORS[i]} />
                          ))}
                        </Pie>
                        <Tooltip content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const d = payload[0]
                          const pct = total > 0 ? Math.round(d.value * 100 / total) : 0
                          return (
                            <div style={{ ...F, background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
                              <div style={{ fontWeight: 800, color: d.payload.fill, marginBottom: 4 }}>{d.name}</div>
                              <div>{d.value} услуг · {pct}%</div>
                            </div>
                          )
                        }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {report.surgery.map((d, i) => {
                        const color = CAT_COLORS[d.name] || PIE_COLORS[i]
                        const pct = total > 0 ? Math.round(d.count * 100 / total) : 0
                        return (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ ...F, fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                                {d.name}
                              </span>
                              <span style={{ ...F, fontSize: 12, fontWeight: 700, color }}>{d.count}</span>
                            </div>
                            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .4s' }} />
                            </div>
                          </div>
                        )
                      })}
                      <div style={{ ...F, fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{'Всего услуг: '}{total}</div>
                    </div>
                  </div>
                )
              })() : <EmptyChart text="Нет данных за выбранный период" />}
            </ChartCard>
          </div>
        )}

        {/* ── ДИАГНОЗЫ: топ + сезонность + виды ── */}
        {report && tab === 'diag' && (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 12, minHeight: 0 }}>
            <ChartCard title={`🩺 Топ диагнозов (${report.period?.from} — ${report.period?.to})`} onExcel={() => exportSheet('Диагнозы',
              [{header:'Диагноз',key:'d',width:50},{header:'Кол-во',key:'c',width:10}],
              (report.diagnoses?.top||[]).map(d=>[d.diagnosis,d.count]), 'диагнозы.xlsx')}
              style={{ gridRow: 'span 2' }}>
              {report.diagnoses?.top?.length > 0 ? (
                <div style={{ flex: 1, minHeight: 0, height: '100%' }}>
                  <ResponsiveContainer width="99%" height="100%">
                    <BarChart data={report.diagnoses.top} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="diagnosis" width={190} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CT />} />
                      <Bar dataKey="count" name="Случаев" radius={[0,4,4,0]}>
                        {report.diagnoses.top.map((_, i) => <Cell key={i} fill={[BLUE,GREEN,ORANGE,PURPLE,RED,'#0097a7','#558b2f','#ef6c00','#6a1b9a','#00695c'][i%10]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyChart text="Диагнозы появятся после завершения приёмов с рецептами" />}
            </ChartCard>
            <ChartCard title={`📅 Сезонность приёмов · 12 мес. до ${report.period?.to}`}>
              {report.seasonality?.length > 0 ? (<>
                <ResponsiveContainer width="99%" height={270}>
                  <LineChart data={report.seasonality} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const top = report.diagnoses?.season_top?.[label] || []
                      return (
                        <div style={{ ...F, background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: 12, maxWidth: 220 }}>
                          <div style={{ fontWeight: 800, color: '#2d4a2d', marginBottom: 6 }}>{label}: <strong>{payload[0]?.value}</strong> приёмов</div>
                          {top.length > 0 && (
                            <>
                              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Топ диагнозы</div>
                              {top.map((d, i) => (
                                <div key={i} style={{ color: [GREEN, BLUE, ORANGE][i], fontWeight: 600, marginBottom: 2 }}>
                                  {i + 1}. {d.diagnosis} ({d.count})
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )
                    }} />
                    <Line type="monotone" dataKey="count" name="Приёмов" stroke={GREEN} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ ...F, fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 4 }}>
                  Наведите на точку — увидите топ-диагнозы месяца
                </div>
              </>) : <EmptyChart text="Нет данных за 12 месяцев" />}
            </ChartCard>
            <ChartCard title="🐾 Виды животных в реестре">
              {report.species?.length > 0 ? (
                <div style={{ flex: 1, minHeight: 0, height: '100%' }}>
                  <ResponsiveContainer width="99%" height="100%">
                    <PieChart>
                      <Pie data={report.species} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={90} innerRadius={40} paddingAngle={3}>
                        {report.species.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CT />} />
                      <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyChart text="Нет данных" />}
            </ChartCard>
          </div>
        )}

        {/* ── ПЕРСОНАЛ ── */}
        {report && tab === 'staff' && (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, minHeight: 0 }}>
            <ChartCard
              title="📅 Приёмы по врачам по месяцам (12 мес.)"
              onExcel={() => exportSheet('Приёмы по врачам',
                [{ header: 'Месяц', key: 'm', width: 10 }, ...(report.staff_monthly?.vets || []).map(v => ({ header: v, key: v, width: 20 }))],
                (report.staff_monthly?.by_month || []).map(r => [r.month, ...(report.staff_monthly?.vets || []).map(v => r[v] || 0)]),
                'приёмы_по_врачам_по_месяцам.xlsx')}
            >
              {report.staff_monthly?.by_month?.length > 0 ? (
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <ResponsiveContainer width="99%" height={300}>
                    <BarChart data={report.staff_monthly.by_month} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CT />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {(report.staff_monthly.vets || []).map((vet, i) => (
                        <Bar key={vet} dataKey={vet} name={vet.split(' ')[0]}
                          stackId="a"
                          fill={[GREEN, BLUE, ORANGE, PURPLE, RED][i % 5]}
                          radius={i === (report.staff_monthly.vets.length - 1) ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                  {report.appointments?.by_vet?.length > 0 && (
                    <div style={{ marginTop: 8, borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                      <div style={{ ...F, fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                        Отмены за выбранный период
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {report.appointments.by_vet.map((v, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: [GREEN, BLUE, ORANGE, PURPLE, RED][i % 5], flexShrink: 0 }} />
                            <span style={{ ...F, fontSize: 12, color: '#475569' }}>{v.vet.split(' ')[0]}:</span>
                            <span style={{ ...F, fontSize: 12, fontWeight: 700, color: v.cancelled > 0 ? RED : '#94a3b8' }}>
                              {v.cancelled} отм.
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : <EmptyChart text="Нет данных по приёмам" />}
            </ChartCard>

            <ChartCard title="📈 Динамика регистрации новых клиентов">
              {report.general?.clients_growth?.length > 0 ? (
                <div style={{ flex: 1, minHeight: 0, height: '100%' }}>
                  <ResponsiveContainer width="99%" height="100%">
                    <LineChart data={report.general.clients_growth} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CT />} />
                      <Line type="monotone" dataKey="count" name="Новые клиенты" stroke={BLUE} strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyChart text="Нет данных по приросту" />}
            </ChartCard>
          </div>
        )}

        {/* ── ПРОГНОЗЫ: ВАКЦИНЫ ── */}
        {report && tab === 'fore' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexShrink: 0 }}>
              {[
                { key: 'history', label: '📋 История вакцинаций', load: loadVacHistory, hasData: vacHistory.length > 0 },
                { key: 'overdue', label: '⚠️ Просроченные', load: loadVacOverdue, hasData: vacOverdue.length > 0 },
                { key: 'procurement', label: '📦 Закупка вакцин', load: () => loadProcurement(procPeriod), hasData: !!procurement },
              ].map(t => (
                <button key={t.key}
                  onClick={() => { setForeTab(t.key); if (!t.hasData) t.load() }}
                  style={{ ...F, padding: '7px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    background: foreTab === t.key ? '#2e7d32' : '#fff',
                    color: foreTab === t.key ? '#fff' : '#555',
                    boxShadow: foreTab === t.key ? '0 2px 8px rgba(46,125,50,0.25)' : '0 1px 4px rgba(0,0,0,0.08)',
                  }}>
                  {t.label}
                  {t.key === 'overdue' && vacOverdue.length > 0 && (
                    <span style={{ marginLeft: 6, background: '#c62828', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>{vacOverdue.length}</span>
                  )}
                </button>
              ))}
            </div>

            {foreTab === 'history' && (
              <div style={{ flex: 1, background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
                  <span style={{ ...F, fontWeight: 800, fontSize: 14, color: '#2d4a2d' }}>📋 История всех вакцинаций</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {[['all','Все','#2e7d32'],['overdue','Просрочены',RED],['soon','Скоро',ORANGE],['ok','Ок',GREEN]].map(([val,lbl,clr]) => (
                      <button key={val} onClick={() => setHistFilter(val)} style={{ ...F, padding: '3px 9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                        background: histFilter===val ? clr : '#f0f0f0', color: histFilter===val ? '#fff' : '#555' }}>{lbl}</button>
                    ))}
                    <ExcelBtn onClick={exVacHistory} />
                  </div>
                </div>
                {vacHistoryLoading
                  ? <div style={{ ...F, textAlign: 'center', padding: 40, color: '#aaa' }}>⏳ Загрузка...</div>
                  : <div style={{ flex: 1, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', ...F, fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f4f8f4', position: 'sticky', top: 0 }}>
                          {['Питомец','Вид','Владелец','Вакцина','Дата','Следующая','Статус'].map(h => (
                            <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#5a7a5a', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e8e8e8' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {vacHistory.filter(v => histFilter==='all' || v.status===histFilter).map((v, i) => (
                          <tr key={i} style={{ background: i%2===0?'#fff':'#fafafa', borderBottom: '1px solid #f5f5f5' }}>
                            <td style={{ padding: '7px 10px', fontWeight: 700 }}>{v.pet_name}</td>
                            <td style={{ padding: '7px 10px', color: '#666' }}>{v.pet_species}</td>
                            <td style={{ padding: '7px 10px' }}>{v.owner_name}</td>
                            <td style={{ padding: '7px 10px' }}>{v.vaccine_name}</td>
                            <td style={{ padding: '7px 10px', color: '#555' }}>{v.date_given}</td>
                            <td style={{ padding: '7px 10px', color: v.status==='overdue'?RED:v.status==='soon'?ORANGE:'#555' }}>{v.next_due_date||'—'}</td>
                            <td style={{ padding: '7px 10px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                                background: v.status==='overdue'?'#ffebee':v.status==='soon'?'#fff3e0':'#e8f5e9',
                                color: v.status==='overdue'?RED:v.status==='soon'?ORANGE:GREEN }}>
                                {v.status==='overdue'?`Просрочена (${Math.abs(v.days_left)} дн.)`:v.status==='soon'?`Скоро (${v.days_left} дн.)`:'Ок'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {vacHistory.filter(v => histFilter==='all'||v.status===histFilter).length===0 && !vacHistoryLoading && (
                      <div style={{ ...F, textAlign: 'center', padding: 40, color: '#ccc', fontSize: 13 }}>
                        {vacHistory.length===0 ? 'Нажмите на вкладку — данные загрузятся' : 'Нет записей с таким фильтром'}
                      </div>
                    )}
                  </div>
                }
              </div>
            )}

            {foreTab === 'overdue' && (
              <div style={{ flex: 1, background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
                  <span style={{ ...F, fontWeight: 800, fontSize: 14, color: '#2d4a2d' }}>
                    ⚠️ Просроченные вакцинации
                    {vacOverdue.length > 0 && <span style={{ marginLeft: 8, background: '#ffebee', color: RED, borderRadius: 12, padding: '2px 8px', fontSize: 11 }}>{vacOverdue.length}</span>}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <ExcelBtn onClick={exOverdue} />
                    <button onClick={handleNotifyOverdueVaccines}
                      disabled={notifyOverdueLoading2 || vacOverdue.length===0 || notifyOverdueSent}
                      style={{ ...F, padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        background: notifyOverdueSent?GREEN:(notifyOverdueLoading2||vacOverdue.length===0)?'#ccc':RED, color: '#fff' }}>
                      {notifyOverdueSent?'✅ Отправлено':notifyOverdueLoading2?'Отправка...':'📢 Уведомить всех'}
                    </button>
                  </div>
                </div>
                {vacOverdueLoading
                  ? <div style={{ ...F, textAlign: 'center', padding: 40, color: '#aaa' }}>⏳ Загрузка...</div>
                  : vacOverdue.length===0
                    ? <div style={{ ...F, textAlign: 'center', padding: 60, color: '#aaa' }}><div style={{ fontSize: 40 }}>✅</div><p style={{ marginTop: 12, fontWeight: 700 }}>Просроченных вакцинаций нет!</p></div>
                    : <div style={{ flex: 1, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', ...F, fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: '#fff5f5', position: 'sticky', top: 0 }}>
                              {['Питомец','Вид','Владелец','Телефон','Вакцина','Срок был','Просрочено'].map(h => (
                                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: RED, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #ffcdd2' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {vacOverdue.map((v, i) => (
                              <tr key={i} style={{ background: i%2===0?'#fff':'#fff5f5', borderBottom: '1px solid #ffebee' }}>
                                <td style={{ padding: '7px 10px', fontWeight: 700 }}>{v.pet_name}</td>
                                <td style={{ padding: '7px 10px', color: '#666' }}>{v.pet_species}</td>
                                <td style={{ padding: '7px 10px' }}>{v.owner_name}</td>
                                <td style={{ padding: '7px 10px', color: '#555' }}>{v.owner_phone||'—'}</td>
                                <td style={{ padding: '7px 10px' }}>{v.vaccine_name}</td>
                                <td style={{ padding: '7px 10px', color: RED }}>{v.next_due_date}</td>
                                <td style={{ padding: '7px 10px' }}>
                                  <span style={{ background: '#ffebee', color: RED, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{v.days_overdue} дн.</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                }
              </div>
            )}

            {foreTab === 'procurement' && (
              <div style={{ flex: 1, background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
                  <span style={{ ...F, fontWeight: 800, fontSize: 14, color: '#2d4a2d' }}>📦 Прогноз закупки вакцин</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {[['quarter','Квартал'],['year','Год']].map(([val,lbl]) => (
                      <button key={val} onClick={() => { setProcPeriod(val); loadProcurement(val) }}
                        style={{ ...F, padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                          background: procPeriod===val?'#2e7d32':'#f0f0f0', color: procPeriod===val?'#fff':'#555' }}>{lbl}</button>
                    ))}
                    {procurement && <ExcelBtn onClick={exProcurement} />}
                  </div>
                </div>
                {procurementLoading
                  ? <div style={{ ...F, textAlign: 'center', padding: 40, color: '#aaa' }}>⏳ Расчёт...</div>
                  : procurement
                    ? <>
                        <div style={{ ...F, fontSize: 12, color: '#7a9e7a', marginBottom: 10, flexShrink: 0 }}>
                          Период: <b>{procurement.period_start}</b> — <b>{procurement.period_end}</b> · Итого доз (с запасом +10%): <b style={{ color: GREEN }}>{procurement.total_doses}</b>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', ...F, fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: '#f4f8f4', position: 'sticky', top: 0 }}>
                                {['Вакцина','Запланировано','Просрочено','История (пр. год)','Прогноз МНК','Итого (+10%)'].map(h => (
                                  <th key={h} style={{ padding: '8px 10px', textAlign: h==='Вакцина'?'left':'center', fontSize: 10, fontWeight: 800, color: '#5a7a5a', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e8e8e8' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {procurement.items.map((item, i) => (
                                <tr key={i} style={{ background: i%2===0?'#fff':'#fafafa', borderBottom: '1px solid #f5f5f5' }}>
                                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{item.vaccine_name}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', color: BLUE }}>{item.upcoming_count}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                    {item.overdue_count>0?<span style={{ color: RED, fontWeight: 700 }}>+{item.overdue_count} ⚠️</span>:<span style={{ color: '#ccc' }}>—</span>}
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#888' }}>{item.historical_count||'—'}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                    {item.mnk_forecast>0
                                      ? <span style={{ color: '#0288d1', fontWeight: 700 }}>{item.mnk_forecast}</span>
                                      : <span style={{ color: '#ccc', fontSize: 10 }}>мало данных</span>}
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                    <span style={{ background: '#e8f5e9', color: GREEN, fontWeight: 800, borderRadius: 8, padding: '3px 12px', fontSize: 13 }}>{item.total_needed}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {procurement.items.length===0 && <div style={{ ...F, textAlign: 'center', padding: 40, color: '#ccc' }}>Нет данных для прогноза</div>}
                        </div>

                        {/* График МНК по месяцам */}
                        <div style={{ marginTop: 16, background: '#f9fafb', borderRadius: 12, padding: 16, flexShrink: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ ...F, fontWeight: 700, fontSize: 13, color: '#2d4a2d' }}>
                              📈 Помесячный прогноз МНК
                            </span>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <select
                                value={chartVaccine}
                                onChange={e => { setChartVaccine(e.target.value); loadChart(e.target.value) }}
                                style={{ ...F, fontSize: 12, padding: '4px 8px', borderRadius: 7, border: '1px solid #e0e0e0', background: '#fff' }}
                              >
                                {(chartData?.available_vaccines || procurement.items.map(i => i.vaccine_name)).map(v => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                              {!chartData && (
                                <button onClick={() => loadChart(chartVaccine)}
                                  style={{ ...F, padding: '4px 12px', borderRadius: 7, border: 'none', background: GREEN, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                  Показать график
                                </button>
                              )}
                            </div>
                          </div>
                          {chartLoading ? (
                            <div style={{ ...F, textAlign: 'center', padding: 24, color: '#aaa' }}>⏳ Загрузка...</div>
                          ) : chartData ? (
                            chartData.actual.length === 0 ? (
                              <div style={{ ...F, textAlign: 'center', padding: 24, color: '#aaa' }}>Нет данных по выбранной вакцине</div>
                            ) : (
                              <>
                                {!chartData.has_enough_data && (
                                  <div style={{ ...F, fontSize: 11, color: ORANGE, marginBottom: 8, textAlign: 'center' }}>
                                    ⚠️ Мало данных для МНК-прогноза (нужно минимум 3 месяца истории)
                                  </div>
                                )}
                                <ResponsiveContainer width="99%" height={220}>
                                  <LineChart margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e8f0e8" />
                                    <XAxis
                                      dataKey="month"
                                      type="category"
                                      allowDuplicatedCategory={false}
                                      tick={{ fontSize: 11, fontFamily: 'Nunito' }}
                                    />
                                    <YAxis tick={{ fontSize: 11, fontFamily: 'Nunito' }} allowDecimals={false} />
                                    <Tooltip
                                      contentStyle={{ fontFamily: 'Nunito', fontSize: 12, borderRadius: 8 }}
                                      formatter={(val, name) => [val + ' доз', name]}
                                    />
                                    <Legend wrapperStyle={{ fontFamily: 'Nunito', fontSize: 12 }} />
                                    <Line
                                      data={chartData.actual}
                                      type="monotone"
                                      dataKey="count"
                                      name="Факт"
                                      stroke={BLUE}
                                      strokeWidth={2.5}
                                      dot={{ r: 4, fill: BLUE }}
                                      activeDot={{ r: 6 }}
                                    />
                                    {chartData.has_enough_data && chartData.forecast.length > 0 && (
                                      <Line
                                        data={[
                                          chartData.actual[chartData.actual.length - 1],
                                          ...chartData.forecast
                                        ]}
                                        type="monotone"
                                        dataKey="count"
                                        name="Прогноз МНК"
                                        stroke={GREEN}
                                        strokeWidth={2}
                                        strokeDasharray="6 3"
                                        dot={{ r: 4, fill: GREEN }}
                                      />
                                    )}
                                  </LineChart>
                                </ResponsiveContainer>
                                <div style={{ ...F, fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 4 }}>
                                  Синяя линия — фактические данные · Зелёная пунктирная — прогноз МНК на 3 месяца
                                </div>
                              </>
                            )
                          ) : (
                            <div style={{ ...F, textAlign: 'center', padding: 24, color: '#aaa', fontSize: 12 }}>
                              Выберите вакцину и нажмите «Показать график»
                            </div>
                          )}
                        </div>
                      </>
                    : <div style={{ ...F, textAlign: 'center', padding: 60, color: '#aaa' }}>
                        <div style={{ fontSize: 40 }}>📦</div>
                        <p style={{ marginTop: 12 }}>Выберите период выше для расчёта</p>
                      </div>
                }
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── ВСЕ МОДАЛЬНЫЕ ОКНА ── */}
      {modal && (
        <DataModal title={modal.title} columns={modal.columns} rows={modal.rows} onClose={() => setModal(null)} />
      )}

      {overdueModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setOverdueModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 550, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', ...F }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 800, fontSize: 16, color: '#2d4a2d', margin: 0 }}>⚠️ Просроченные ветеринарные документы</h3>
              <button onClick={() => setOverdueModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {notifySent ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: GREEN, fontWeight: 700 }}>
                  ✨ Уведомления успешно отправлены владельцам!
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: '#555', margin: '0 0 12px 0' }}>Список владельцев с истекшим сроком обязательной вакцинации:</p>
                  {overdueOwners.length > 0 ? (
                    <div style={{ background: '#fafafa', borderRadius: 8, padding: 8, maxHeight: 200, overflowY: 'auto', border: '1px solid #eee', marginBottom: 16 }}>
                      {overdueOwners.map((o, idx) => (
                        <div key={idx} style={{ fontSize: 13, padding: '4px 0', borderBottom: idx < overdueOwners.length - 1 ? '1px solid #eee' : 'none' }}>
                          👤 <strong>{o.name}</strong> ({o.phone || 'Нет телефона'}) — <span style={{ color: RED }}>{o.pet_name}</span>
                        </div>
                      ))}
                    </div>
                  ) : <div style={{ fontSize: 12, color: '#aaa', margin: '12px 0' }}>Загрузка списка или должников не обнаружено...</div>}

                  <button
                    onClick={handleNotifyOverdue}
                    disabled={notifyLoading || overdueOwners.length === 0}
                    style={{ ...F, width: '100%', padding: '10px', background: notifyLoading || overdueOwners.length === 0 ? '#aaa' : '#c62828', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {notifyLoading ? 'Отправка...' : '📢 Оповестить владельцев'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
