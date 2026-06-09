import { useState, useEffect, useRef } from 'react'
import api from '../api'

const F = { fontFamily: "'Nunito', sans-serif" }

const STATUS_CONFIG = {
  pending:   { label: 'Ожидает забора', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6' },
  collected: { label: 'В работе',       color: '#92400e', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
  ready:     { label: 'Готово',         color: '#166534', bg: '#f0fdf4', border: '#86efac', dot: '#22c55e' },
}

function StatusBadge({ status }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span style={{ ...F, display:'inline-flex', alignItems:'center', gap:5, background:s.bg, color:s.color, border:`1px solid ${s.border}`, borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700 }}>
      <span style={{ width:7, height:7, borderRadius:'50%', background:s.dot, display:'inline-block' }} />
      {s.label}
    </span>
  )
}

// ── Нормы для ОАК по видам ──────────────────────────────────────────────────
const OAK_NORMS = {
  dog: {
    'WBC (Лейкоциты)':      { unit:'10⁹/л',   ref:'6.0–17.0',    req:true },
    'RBC (Эритроциты)':     { unit:'10¹²/л',  ref:'5.5–8.5',     req:true },
    'HGB (Гемоглобин)':     { unit:'г/л',     ref:'120–180',     req:true },
    'HCT (Гематокрит)':     { unit:'%',       ref:'37–55',       req:false },
    'MCV':                  { unit:'фл',      ref:'60–77',       req:false },
    'MCH':                  { unit:'пг',      ref:'19.5–24.5',   req:false },
    'MCHC':                 { unit:'г/л',     ref:'310–360',     req:false },
    'RDW':                  { unit:'%',       ref:'12.0–17.0',   req:false },
    'PLT (Тромбоциты)':     { unit:'10⁹/л',   ref:'200–500',     req:true },
    'MPV':                  { unit:'фл',      ref:'7–12',        req:false },
    'PDW':                  { unit:'%',       ref:'10–17',       req:false },
    'PCT':                  { unit:'%',       ref:'0.1–0.5',     req:false },
    'СОЭ':                  { unit:'мм/ч',    ref:'2.0–5.0',     req:false },
  },
  cat: {
    'WBC (Лейкоциты)':      { unit:'10⁹/л',   ref:'5.5–19.5',   req:true },
    'RBC (Эритроциты)':     { unit:'10¹²/л',  ref:'5.0–10.0',   req:true },
    'HGB (Гемоглобин)':     { unit:'г/л',     ref:'80–150',     req:true },
    'HCT (Гематокрит)':     { unit:'%',       ref:'24–45',      req:false },
    'MCV':                  { unit:'фл',      ref:'39–55',      req:false },
    'MCH':                  { unit:'пг',      ref:'12.5–17.5',  req:false },
    'MCHC':                 { unit:'г/л',     ref:'300–360',    req:false },
    'RDW':                  { unit:'%',       ref:'14.0–18.0',  req:false },
    'PLT (Тромбоциты)':     { unit:'10⁹/л',   ref:'100–400',    req:true },
    'MPV':                  { unit:'фл',      ref:'7–10',       req:false },
    'PDW':                  { unit:'%',       ref:'10–15',      req:false },
    'PCT':                  { unit:'%',       ref:'0.05–0.4',   req:false },
    'СОЭ':                  { unit:'мм/ч',    ref:'7.0–9.0',    req:false },
  },
}

const LEIKO_FIELDS = [
  { key:'baso',   label:'Баз:' },
  { key:'eozino', label:'Эоз:' },
  { key:'neut_m', label:'Нейтр (М):' },
  { key:'neut_yu',label:'Нейтр (Ю):' },
  { key:'neut_p', label:'Нейтр (П):' },
  { key:'neut_s', label:'Нейтр (С):' },
  { key:'limfo',  label:'Лимф:' },
  { key:'mono',   label:'Моно:' },
]

// ── Нормы биохимии ──────────────────────────────────────────────────────────
const BIOHIM_NORMS = {
  dog: {
    'Мочевина':          { unit:'ммоль/л', ref:'3.5–9.0',   req:true },
    'Креатинин':         { unit:'мкмоль/л',ref:'44–159',    req:true },
    'АЛТ':               { unit:'Ед/л',    ref:'10–58',     req:true },
    'АСТ':               { unit:'Ед/л',    ref:'0–50',      req:true },
    'Билирубин общий':   { unit:'мкмоль/л',ref:'0–15',      req:false },
    'Щелочная фосфатаза':{ unit:'Ед/л',    ref:'10–150',    req:false },
    'Амилаза':           { unit:'Ед/л',    ref:'50–1500',   req:false },
    'Общий белок':       { unit:'г/л',     ref:'52–82',     req:true },
    'Альбумин':          { unit:'г/л',     ref:'25–40',     req:false },
    'Глюкоза':           { unit:'ммоль/л', ref:'3.3–6.5',   req:true },
    'Холестерин':        { unit:'ммоль/л', ref:'2.8–8.3',   req:false },
    'Калий':             { unit:'ммоль/л', ref:'3.6–5.5',   req:false },
    'Натрий':            { unit:'ммоль/л', ref:'140–155',   req:false },
    'Кальций':           { unit:'ммоль/л', ref:'2.3–3.0',   req:false },
    'Фосфор':            { unit:'ммоль/л', ref:'0.8–1.9',   req:false },
  },
  cat: {
    'Мочевина':          { unit:'ммоль/л', ref:'5.4–12.1',  req:true },
    'Креатинин':         { unit:'мкмоль/л',ref:'71–212',    req:true },
    'АЛТ':               { unit:'Ед/л',    ref:'10–75',     req:true },
    'АСТ':               { unit:'Ед/л',    ref:'0–48',      req:true },
    'Билирубин общий':   { unit:'мкмоль/л',ref:'0–15',      req:false },
    'Щелочная фосфатаза':{ unit:'Ед/л',    ref:'10–90',     req:false },
    'Амилаза':           { unit:'Ед/л',    ref:'500–1500',  req:false },
    'Общий белок':       { unit:'г/л',     ref:'57–89',     req:true },
    'Альбумин':          { unit:'г/л',     ref:'23–40',     req:false },
    'Глюкоза':           { unit:'ммоль/л', ref:'3.9–8.8',   req:true },
    'Холестерин':        { unit:'ммоль/л', ref:'1.8–3.9',   req:false },
    'Калий':             { unit:'ммоль/л', ref:'3.5–5.8',   req:false },
    'Натрий':            { unit:'ммоль/л', ref:'145–158',   req:false },
    'Кальций':           { unit:'ммоль/л', ref:'2.1–2.8',   req:false },
    'Фосфор':            { unit:'ммоль/л', ref:'0.9–2.1',   req:false },
  },
}

// ── Серология по видам ──────────────────────────────────────────────────────
const SEROLOGY_BY_SPECIES = {
  cat: [
    'Вирусный лейкоз кошек (FeLV)',
    'Вирусный иммунодефицит кошек (FIV)',
    'Панлейкопения кошек (FPV)',
    'Коронавирус кошек (FCoV)',
  ],
  dog: [
    'Дирофиляриоз (Dirofilaria immitis)',
    'Лептоспироз (Leptospira)',
    'Чума плотоядных (CDV)',
    'Парвовирусный энтерит (CPV)',
  ],
}
const SEROLOGY_RESULTS = ['Отрицательно', 'Положительно', 'Сомнительно']


// ── Общий анализ мочи ───────────────────────────────────────────────────────
const MOCHA_PARAMS = {
  'Цвет':              { unit:'',       ref:'соломенно-жёлтый', req:false },
  'Прозрачность':      { unit:'',       ref:'прозрачная',       req:false },
  'Удельный вес':      { unit:'',       ref:'1.015–1.050',      req:false },
  'pH':                { unit:'',       ref:'5.5–7.5',          req:true  },
  'Белок':             { unit:'г/л',    ref:'0–0.3',            req:true  },
  'Глюкоза':           { unit:'',       ref:'отрицательно',     req:true  },
  'Кетоны':            { unit:'',       ref:'отрицательно',     req:false },
  'Билирубин':         { unit:'',       ref:'отрицательно',     req:false },
  'Уробилиноген':      { unit:'',       ref:'отрицательно',     req:false },
  'Кровь/Гемоглобин':  { unit:'',       ref:'отрицательно',     req:false },
}
const MOCHA_OSADOK = [
  { key:'eritro',  label:'Эритроциты' },
  { key:'leiko',   label:'Лейкоциты' },
  { key:'epitel',  label:'Эпителий' },
  { key:'cilindry',label:'Цилиндры' },
  { key:'soli',    label:'Соли' },
  { key:'bakt',    label:'Бактерии' },
]
const MOCHA_EXPRESS = ['pH','Белок','Глюкоза','Кетоны','Кровь']
const MOCHA_SPECIAL = [
  { key:'protein',    label:'Белок мочи',                 unit:'г/л', ref:'0–0.3' },
  { key:'creatinine', label:'Креатинин мочи',             unit:'мкмоль/л', ref:'44–159' },
  { key:'upc',        label:'Соотношение белок/креатинин', unit:'', ref:'< 0.2' },
]

// ── Фекалии паразитологические ───────────────────────────────────────────────
// ── Соскобы ──────────────────────────────────────────────────────────────────
// ── Лампа Вуда ───────────────────────────────────────────────────────────────
// ── Вагинит / постит ─────────────────────────────────────────────────────────
// ── Копрограмма ──────────────────────────────────────────────────────────────
const KOPRO_PARAMS = [
  { key:'consistency', label:'Консистенция', options:['оформленный','кашицеобразный','жидкий','водянистый'] },
  { key:'color',       label:'Цвет',         options:['коричневый','жёлтый','зелёный','дегтеобразный','красный'] },
  { key:'sterkobilin', label:'Стеркобилин',  options:['есть','нет'] },
  { key:'blood',       label:'Скрытая кровь',options:['отрицательно','положительно'] },
]
const KOPRO_DIGEST = [
  { key:'muscle',    label:'Мышечные волокна' },
  { key:'connective',label:'Соединительная ткань' },
  { key:'fat',       label:'Нейтральный жир' },
  { key:'fatacid',   label:'Жирные кислоты' },
  { key:'fiber',     label:'Растительная клетчатка' },
  { key:'starch',    label:'Крахмал' },
]
const DIGEST_OPTIONS = ['не обнаружено','+','++','+++']

// ── Пунктат ───────────────────────────────────────────────────────────────────
const PUNKT_PROPS = [
  { key:'color',    label:'Цвет',               type:'text' },
  { key:'clarity',  label:'Прозрачность',       type:'text' },
  { key:'density',  label:'Относительная плотность', type:'text' },
  { key:'protein',  label:'Общий белок (г/л)',  type:'text' },
]
const PUNKT_TYPES = ['Транссудат','Модифицированный транссудат','Экссудат','Хилез','Геморрагический']

// ── Определяем тип анализа по названию сервиса ─────────────────────────────
function getServiceType(svcName) {
  const n = svcName.toLowerCase()
  if (n.includes('общий анализ крови') || n.includes('клинический анализ') || n.includes('гематология')) return 'oak'
  if (n.includes('биохим')) return 'biohim'
  if (n.includes('кнотта') || n.includes('кнотт')) return 'knotta'
  if (n.includes('серолог') || n.includes('ифа')) return 'serology'
  if (n.includes('тромбоцит')) return 'plt'
  if (n.includes('общий анализ мочи')) return 'mocha'
  if (n.includes('экспресс') && n.includes('мочи')) return 'mocha_express'
  if (n.includes('специальн') && n.includes('мочи')) return 'mocha_special'
  if (n.includes('паразитолог')) return 'feces_para'
  if (n.includes('соскоб')) return 'scrap'
  if (n.includes('люминес') || n.includes('вуда') || n.includes('микроспор')) return 'wood'
  if (n.includes('вагинит') || n.includes('постит')) return 'vagina'
  if (n.includes('копрограмм') || n.includes('развёрн') && n.includes('фекал')) return 'kopro'
  if (n.includes('пунктат')) return 'punkt'
  return 'generic'
}

// ── Утилита: инициализация результатов по типу ─────────────────────────────
function initResults(order) {
  const species = order.pet_species || 'other'
  const init = {}
  ;(order.services || []).forEach(svc => {
    const type = getServiceType(svc)
    const existing = order.results?.[svc]
    if (type === 'oak') {
      const norms = OAK_NORMS[species] || {}
      const params = {}
      Object.entries(norms).forEach(([param, meta]) => {
        params[param] = existing?.params?.[param] || { value:'', unit:meta.unit, ref:meta.ref, flag:'' }
      })
      const leiko = {}
      LEIKO_FIELDS.forEach(f => { leiko[f.key] = existing?.leiko?.[f.key] || '' })
      init[svc] = { type:'oak', params, leiko }
    } else if (type === 'biohim') {
      const norms = BIOHIM_NORMS[species] || {}
      const params = {}
      Object.entries(norms).forEach(([param, meta]) => {
        params[param] = existing?.params?.[param] || { value:'', unit:meta.unit, ref:meta.ref, flag:'' }
      })
      init[svc] = { type:'biohim', params }
    } else if (type === 'knotta') {
      init[svc] = { type:'knotta', value: existing?.value || '' }
    } else if (type === 'serology') {
      const infList = SEROLOGY_BY_SPECIES[species] || []
      const items = {}
      infList.forEach(inf => { items[inf] = existing?.items?.[inf] || '' })
      init[svc] = { type:'serology', items }
    } else if (type === 'plt') {
      init[svc] = { type:'plt', value: existing?.value || '', flag: existing?.flag || '', aggregates: existing?.aggregates || '' }
    } else if (type === 'mocha') {
      const params = {}
      Object.entries(MOCHA_PARAMS).forEach(([p, m]) => {
        params[p] = existing?.params?.[p] || { value:'', unit:m.unit, ref:m.ref, flag:'' }
      })
      const osadok = {}
      MOCHA_OSADOK.forEach(f => { osadok[f.key] = existing?.osadok?.[f.key] || '' })
      init[svc] = { type:'mocha', params, osadok }
    } else if (type === 'mocha_express') {
      const params = {}
      MOCHA_EXPRESS.forEach(p => { params[p] = existing?.params?.[p] || { value:'', ref: MOCHA_PARAMS[p]?.ref||'' } })
      init[svc] = { type:'mocha_express', params }
    } else if (type === 'mocha_special') {
      const params = {}
      MOCHA_SPECIAL.forEach(f => { params[f.key] = existing?.params?.[f.key] || { value:'', unit:f.unit, ref:f.ref } })
      init[svc] = { type:'mocha_special', params }
    } else if (type === 'feces_para') {
      init[svc] = { type:'feces_para', helminth: existing?.helminth||'', helminth_name: existing?.helminth_name||'', protozoa: existing?.protozoa||'' }
    } else if (type === 'scrap') {
      init[svc] = { type:'scrap', ectoparasites: existing?.ectoparasites||'', fungi: existing?.fungi||'' }
    } else if (type === 'wood') {
      init[svc] = { type:'wood', glow: existing?.glow||'', location: existing?.location||'' }
    } else if (type === 'vagina') {
      init[svc] = { type:'vagina', flora: existing?.flora||'', cytology: existing?.cytology||'' }
    } else if (type === 'kopro') {
      const params = {}
      KOPRO_PARAMS.forEach(p => { params[p.key] = existing?.params?.[p.key] || '' })
      const digest = {}
      KOPRO_DIGEST.forEach(d => { digest[d.key] = existing?.digest?.[d.key] || 'не обнаружено' })
      init[svc] = { type:'kopro', params, digest }
    } else if (type === 'punkt') {
      const props = {}
      PUNKT_PROPS.forEach(p => { props[p.key] = existing?.props?.[p.key] || '' })
      init[svc] = { type:'punkt', props, punkt_type: existing?.punkt_type||'', microscopy: existing?.microscopy||'' }
    } else {
      init[svc] = existing || { type:'generic', value:'', unit:'', ref:'', flag:'' }
    }
  })
  return init
}

// ── Утилита: результаты в плоский формат для бэкенда ───────────────────────
function flattenResults(results) {
  const flat = {}
  Object.entries(results).forEach(([svc, data]) => {
    flat[svc] = data
  })
  return flat
}

// ── Валидация ───────────────────────────────────────────────────────────────
function validateResults(results, services) {
  const errs = {}
  services.forEach(svc => {
    const data = results[svc]
    if (!data) { errs[svc] = 'Нет данных'; return }
    const type = data.type || 'generic'
    if (type === 'oak' || type === 'biohim') {
      const norms = type === 'oak' ? OAK_NORMS : BIOHIM_NORMS
      const speciesNorms = norms.dog || {}
      Object.entries(data.params || {}).forEach(([param]) => {
        const meta = speciesNorms[param]
        if (meta?.req && !data.params[param]?.value?.trim()) {
          errs[`${svc}::${param}`] = 'Обязательное поле'
          errs[svc] = 'Заполните обязательные поля'
        }
      })
    } else if (type === 'knotta') {
      if (!data.value) { errs[svc] = 'Выберите результат' }
    } else if (type === 'serology') {
      const empty = Object.values(data.items || {}).some(v => !v)
      if (empty) errs[svc] = 'Выберите результат для каждой инфекции'
    } else if (type === 'plt') {
      if (!data.value?.trim()) errs[svc] = 'Введите значение тромбоцитов'
    } else {
      if (!data.value?.trim()) errs[svc] = 'Обязательное поле'
    }
  })
  return errs
}

// ── Компонент: форма ОАК ────────────────────────────────────────────────────
function OAKForm({ svc, data, species, readOnly, onChange }) {
  const norms = OAK_NORMS[species] || OAK_NORMS.dog
  const setParam = (param, field, val) => {
    onChange(svc, { ...data, params: { ...data.params, [param]: { ...data.params[param], [field]: val } } })
  }
  const setLeiko = (key, val) => {
    onChange(svc, { ...data, leiko: { ...data.leiko, [key]: val } })
  }
  const inp = (val, onCh, w='100%', ph='') => (
    <input value={val} onChange={e => onCh(e.target.value)} readOnly={readOnly}
      style={{ width:w, padding:'5px 7px', borderRadius:6, border:'1.5px solid #e2e8f0', fontSize:12, ...F, outline:'none', boxSizing:'border-box', background: readOnly?'#f8fafc':'#fff' }}
      placeholder={ph} />
  )
  return (
    <div>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead>
          <tr style={{ background:'#f8fafc' }}>
            {['Параметр','Результат','Ед. изм.','Реф. норма','Флаг'].map(h => (
              <th key={h} style={{ padding:'7px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(norms).map(([param, meta], i) => {
            const r = data.params?.[param] || { value:'', unit:meta.unit, ref:meta.ref, flag:'' }
            const flagColor = r.flag==='H'?'#dc2626':r.flag==='L'?'#2563eb':'#22c55e'
            return (
              <tr key={param} style={{ borderTop:'1px solid #f1f5f9', background: i%2===0?'#fff':'#fafafa' }}>
                <td style={{ padding:'7px 10px', fontWeight: meta.req?700:500, color: meta.req?'#1e293b':'#475569' }}>
                  {param}{meta.req && <span style={{ color:'#dc2626', marginLeft:2 }}>*</span>}
                </td>
                <td style={{ padding:'5px 8px', minWidth:90 }}>
                  {readOnly
                    ? <span style={{ fontWeight:700, color:flagColor }}>{r.value||'—'}</span>
                    : inp(r.value, v => setParam(param,'value',v), '100%')}
                </td>
                <td style={{ padding:'5px 8px', color:'#64748b', fontSize:11 }}>{r.unit}</td>
                <td style={{ padding:'5px 8px', minWidth:90 }}>
                  {readOnly
                    ? <span style={{ color:'#64748b' }}>{r.ref||'—'}</span>
                    : inp(r.ref, v => setParam(param,'ref',v), 110, '0–5')}
                </td>
                <td style={{ padding:'5px 8px' }}>
                  {readOnly
                    ? <span style={{ fontWeight:700, color:flagColor }}>{r.flag||'—'}</span>
                    : <select value={r.flag} onChange={e => setParam(param,'flag',e.target.value)}
                        style={{ padding:'5px 7px', borderRadius:6, border:'1.5px solid #e2e8f0', fontSize:12, ...F, outline:'none' }}>
                        <option value="">норма</option>
                        <option value="H">↑ H</option>
                        <option value="L">↓ L</option>
                      </select>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {/* Лейкоцитарная формула */}
      <div style={{ borderTop:'2px solid #e2e8f0', padding:'10px 12px', background:'#f8fafc' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#64748b', marginBottom:8, textTransform:'uppercase', letterSpacing:0.4 }}>
          Лейкоцитарная формула (%)
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {LEIKO_FIELDS.map(f => (
            <div key={f.key} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ fontSize:11, color:'#475569', whiteSpace:'nowrap' }}>{f.label}</span>
              {readOnly
                ? <span style={{ fontSize:12, fontWeight:600, color:'#334155', minWidth:30 }}>{data.leiko?.[f.key]||'—'}</span>
                : <input value={data.leiko?.[f.key]||''} onChange={e => setLeiko(f.key, e.target.value)}
                    style={{ width:50, padding:'4px 6px', borderRadius:5, border:'1.5px solid #e2e8f0', fontSize:12, ...F, outline:'none', textAlign:'center' }}
                    placeholder="%" />
              }
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Компонент: форма биохимии ───────────────────────────────────────────────
function BiohimForm({ svc, data, species, readOnly, onChange }) {
  const norms = BIOHIM_NORMS[species] || BIOHIM_NORMS.dog
  const setParam = (param, field, val) => {
    onChange(svc, { ...data, params: { ...data.params, [param]: { ...data.params[param], [field]: val } } })
  }
  const inp = (val, onCh, w='100%') => (
    <input value={val} onChange={e => onCh(e.target.value)} readOnly={readOnly}
      style={{ width:w, padding:'5px 7px', borderRadius:6, border:'1.5px solid #e2e8f0', fontSize:12, ...F, outline:'none', boxSizing:'border-box', background: readOnly?'#f8fafc':'#fff' }} />
  )
  return (
    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
      <thead>
        <tr style={{ background:'#f8fafc' }}>
          {['Показатель','Результат','Ед. изм.','Реф. норма','Флаг'].map(h => (
            <th key={h} style={{ padding:'7px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Object.entries(norms).map(([param, meta], i) => {
          const r = data.params?.[param] || { value:'', unit:meta.unit, ref:meta.ref, flag:'' }
          const flagColor = r.flag==='H'?'#dc2626':r.flag==='L'?'#2563eb':'#22c55e'
          return (
            <tr key={param} style={{ borderTop:'1px solid #f1f5f9', background: i%2===0?'#fff':'#fafafa' }}>
              <td style={{ padding:'7px 10px', fontWeight: meta.req?700:500, color: meta.req?'#1e293b':'#475569' }}>
                {param}{meta.req && <span style={{ color:'#dc2626', marginLeft:2 }}>*</span>}
              </td>
              <td style={{ padding:'5px 8px', minWidth:90 }}>
                {readOnly
                  ? <span style={{ fontWeight:700, color:flagColor }}>{r.value||'—'}</span>
                  : inp(r.value, v => setParam(param,'value',v))}
              </td>
              <td style={{ padding:'5px 8px', color:'#64748b', fontSize:11 }}>{r.unit}</td>
              <td style={{ padding:'5px 8px' }}>
                {readOnly
                  ? <span style={{ color:'#64748b' }}>{r.ref||'—'}</span>
                  : inp(r.ref, v => setParam(param,'ref',v), 100)}
              </td>
              <td style={{ padding:'5px 8px' }}>
                {readOnly
                  ? <span style={{ fontWeight:700, color:flagColor }}>{r.flag||'—'}</span>
                  : <select value={r.flag} onChange={e => setParam(param,'flag',e.target.value)}
                      style={{ padding:'5px 7px', borderRadius:6, border:'1.5px solid #e2e8f0', fontSize:12, ...F, outline:'none' }}>
                      <option value="">норма</option>
                      <option value="H">↑ H</option>
                      <option value="L">↓ L</option>
                    </select>}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Компонент: форма Кнотта ─────────────────────────────────────────────────
function KnottaForm({ svc, data, readOnly, onChange }) {
  const options = [
    'Микрофилярии не обнаружены',
    'Обнаружены Dirofilaria immitis',
    'Обнаружены Dirofilaria repens',
  ]
  return (
    <div style={{ padding:'16px 12px' }}>
      <div style={{ fontSize:12, color:'#64748b', marginBottom:8 }}>
        Результат микроскопии осадка крови:
      </div>
      {readOnly
        ? <span style={{ fontWeight:700, color: data.value?.includes('не обнаружены')?'#166534':'#dc2626', fontSize:14 }}>
            {data.value || '—'}
          </span>
        : <select value={data.value||''} onChange={e => onChange(svc, { ...data, value:e.target.value })}
            style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, ...F, outline:'none' }}>
            <option value="">— выберите результат —</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>}
    </div>
  )
}

// ── Компонент: форма серологии ──────────────────────────────────────────────
function SerologyForm({ svc, data, species, readOnly, onChange }) {
  const infList = SEROLOGY_BY_SPECIES[species] || [...(SEROLOGY_BY_SPECIES.cat), ...(SEROLOGY_BY_SPECIES.dog)]
  return (
    <div style={{ padding:'12px' }}>
      {infList.map((inf, i) => (
        <div key={inf} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 10px', background: i%2===0?'#fff':'#f8fafc', borderRadius:6, marginBottom:4 }}>
          <span style={{ flex:1, fontSize:12, color:'#334155', fontWeight:500 }}>{inf}</span>
          {readOnly
            ? <span style={{ fontWeight:700, fontSize:12,
                color: data.items?.[inf]==='Положительно'?'#dc2626': data.items?.[inf]==='Отрицательно'?'#166534':'#92400e' }}>
                {data.items?.[inf]||'—'}
              </span>
            : <select value={data.items?.[inf]||''} onChange={e => onChange(svc, { ...data, items:{ ...data.items, [inf]:e.target.value } })}
                style={{ padding:'5px 10px', borderRadius:7, border:'1.5px solid #e2e8f0', fontSize:12, ...F, outline:'none', minWidth:160 }}>
                <option value="">— не выбрано —</option>
                {SEROLOGY_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>}
        </div>
      ))}
    </div>
  )
}

// ── Компонент: уровень тромбоцитов ─────────────────────────────────────────
function PLTForm({ svc, data, species, readOnly, onChange }) {
  const ref = species==='cat'?'100–400':'200–500'
  return (
    <div style={{ padding:'16px 12px', display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:12, fontWeight:700, color:'#334155', minWidth:160 }}>PLT (Тромбоциты), 10⁹/л *</span>
        {readOnly
          ? <span style={{ fontWeight:700, color: data.flag==='H'?'#dc2626':data.flag==='L'?'#2563eb':'#166534' }}>{data.value||'—'}</span>
          : <>
              <input value={data.value||''} onChange={e => onChange(svc, {...data, value:e.target.value})}
                style={{ width:100, padding:'6px 9px', borderRadius:7, border:'1.5px solid #e2e8f0', fontSize:13, ...F, outline:'none' }}
                placeholder="напр. 250" />
              <span style={{ fontSize:11, color:'#64748b' }}>Реф. норма: {ref}</span>
              <select value={data.flag||''} onChange={e => onChange(svc, {...data, flag:e.target.value})}
                style={{ padding:'6px 9px', borderRadius:7, border:'1.5px solid #e2e8f0', fontSize:12, ...F, outline:'none' }}>
                <option value="">норма</option>
                <option value="H">↑ H</option>
                <option value="L">↓ L</option>
              </select>
            </>}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:12, color:'#64748b', minWidth:160 }}>Агрегаты тромбоцитов:</span>
        {readOnly
          ? <span style={{ fontSize:12 }}>{data.aggregates||'—'}</span>
          : <input value={data.aggregates||''} onChange={e => onChange(svc, {...data, aggregates:e.target.value})}
              style={{ flex:1, padding:'6px 9px', borderRadius:7, border:'1.5px solid #e2e8f0', fontSize:12, ...F, outline:'none' }}
              placeholder="не обнаружены / обнаружены" />}
      </div>
    </div>
  )
}

// ── Компонент: универсальная строка (старый формат) ─────────────────────────
function GenericRow({ svc, data, readOnly, onChange, hasErr }) {
  const r = data || { value:'', unit:'', ref:'', flag:'' }
  return (
    <tr style={{ borderTop:'1px solid #f1f5f9', background: hasErr?'#fef2f2':'#fff' }}>
      <td style={{ padding:'10px 12px', fontWeight:600, color:'#334155' }}>{svc}</td>
      <td style={{ padding:'6px 8px' }}>
        {readOnly
          ? <span style={{ fontWeight:700, color: r.flag==='H'?'#dc2626':r.flag==='L'?'#2563eb':'#166534' }}>{r.value||'—'}</span>
          : <input value={r.value||''} onChange={e => onChange(svc, {...r, value:e.target.value})}
              style={{ width:'100%', padding:'6px 8px', borderRadius:6, border:`1.5px solid ${hasErr?'#fca5a5':'#e2e8f0'}`, fontSize:13, ...F, outline:'none', boxSizing:'border-box' }}
              placeholder="обязательно" />}
        {hasErr && <div style={{ color:'#dc2626', fontSize:10, marginTop:2 }}>⚠ обязательное поле</div>}
      </td>
      <td style={{ padding:'6px 8px' }}>
        {readOnly ? <span style={{ color:'#64748b' }}>{r.unit||'—'}</span>
          : <input value={r.unit||''} onChange={e => onChange(svc, {...r, unit:e.target.value})}
              style={{ width:80, padding:'6px 8px', borderRadius:6, border:'1.5px solid #e2e8f0', fontSize:13, ...F, outline:'none' }}
              placeholder="ед/л" />}
      </td>
      <td style={{ padding:'6px 8px' }}>
        {readOnly ? <span style={{ color:'#64748b' }}>{r.ref||'—'}</span>
          : <input value={r.ref||''} onChange={e => onChange(svc, {...r, ref:e.target.value})}
              style={{ width:100, padding:'6px 8px', borderRadius:6, border:'1.5px solid #e2e8f0', fontSize:13, ...F, outline:'none' }}
              placeholder="0–5" />}
      </td>
      <td style={{ padding:'6px 8px' }}>
        {readOnly
          ? <span style={{ fontWeight:700, color: r.flag==='H'?'#dc2626':r.flag==='L'?'#2563eb':'#22c55e' }}>{r.flag||'—'}</span>
          : <select value={r.flag||''} onChange={e => onChange(svc, {...r, flag:e.target.value})}
              style={{ padding:'6px 8px', borderRadius:6, border:'1.5px solid #e2e8f0', fontSize:13, ...F, outline:'none' }}>
              <option value="">норма</option>
              <option value="H">↑ H</option>
              <option value="L">↓ L</option>
            </select>}
      </td>
    </tr>
  )
}


// ── Компонент: анализ мочи (полный) ────────────────────────────────────────
function MochaForm({ svc, data, readOnly, onChange }) {
  const setParam = (p, v) => onChange(svc, { ...data, params:{ ...data.params, [p]:{ ...data.params?.[p], value:v } } })
  const setOsadok = (k, v) => onChange(svc, { ...data, osadok:{ ...data.osadok, [k]:v } })
  const inp = (val, onCh, w=120) => (
    <input value={val} onChange={e => onCh(e.target.value)} readOnly={readOnly}
      style={{ width:w, padding:'5px 7px', borderRadius:6, border:'1.5px solid #e2e8f0', fontSize:12, fontFamily:"'Nunito',sans-serif", outline:'none', background:readOnly?'#f8fafc':'#fff' }} />
  )
  return (
    <div>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead><tr style={{ background:'#f8fafc' }}>
          {['Параметр','Результат','Реф. норма'].map(h => (
            <th key={h} style={{ padding:'7px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {Object.entries(MOCHA_PARAMS).map(([p, m], i) => {
            const r = data.params?.[p] || { value:'', ref:m.ref }
            return (
              <tr key={p} style={{ borderTop:'1px solid #f1f5f9', background:i%2===0?'#fff':'#fafafa' }}>
                <td style={{ padding:'7px 10px', fontWeight:m.req?700:500 }}>{p}{m.req&&<span style={{color:'#dc2626',marginLeft:2}}>*</span>}</td>
                <td style={{ padding:'5px 8px' }}>
                  {readOnly ? <span style={{ fontWeight:600 }}>{r.value||'—'}</span> : inp(r.value, v => setParam(p,v))}
                </td>
                <td style={{ padding:'5px 8px', color:'#64748b', fontSize:11 }}>{m.ref}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{ borderTop:'2px solid #e2e8f0', padding:'10px 12px', background:'#f8fafc' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#64748b', marginBottom:8, textTransform:'uppercase' }}>Микроскопия осадка</div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          {MOCHA_OSADOK.map(f => (
            <div key={f.key} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ fontSize:11, color:'#475569' }}>{f.label}:</span>
              {readOnly ? <span style={{ fontSize:12, fontWeight:600 }}>{data.osadok?.[f.key]||'—'}</span>
                : inp(data.osadok?.[f.key]||'', v => setOsadok(f.key, v), 80)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Экспресс-анализ мочи ───────────────────────────────────────────────────
function MochaExpressForm({ svc, data, readOnly, onChange }) {
  const setParam = (p, v) => onChange(svc, { ...data, params:{ ...data.params, [p]:{ ...data.params?.[p], value:v } } })
  return (
    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
      <thead><tr style={{ background:'#f8fafc' }}>
        {['Параметр','Результат','Реф. норма'].map(h => (
          <th key={h} style={{ padding:'7px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {MOCHA_EXPRESS.map((p, i) => {
          const r = data.params?.[p] || { value:'' }
          const meta = MOCHA_PARAMS[p] || { ref:'—' }
          return (
            <tr key={p} style={{ borderTop:'1px solid #f1f5f9', background:i%2===0?'#fff':'#fafafa' }}>
              <td style={{ padding:'7px 10px', fontWeight:600 }}>{p}</td>
              <td style={{ padding:'5px 8px' }}>
                {readOnly ? <span style={{ fontWeight:600 }}>{r.value||'—'}</span>
                  : <input value={r.value||''} onChange={e => setParam(p, e.target.value)} readOnly={readOnly}
                      style={{ width:120, padding:'5px 7px', borderRadius:6, border:'1.5px solid #e2e8f0', fontSize:12, fontFamily:"'Nunito',sans-serif", outline:'none' }} />}
              </td>
              <td style={{ padding:'5px 8px', color:'#64748b', fontSize:11 }}>{meta.ref}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Специальные методы мочи ────────────────────────────────────────────────
function MochaSpecialForm({ svc, data, readOnly, onChange }) {
  const setParam = (k, v) => onChange(svc, { ...data, params:{ ...data.params, [k]:{ ...data.params?.[k], value:v } } })
  return (
    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
      <thead><tr style={{ background:'#f8fafc' }}>
        {['Показатель','Результат','Ед. изм.','Реф. норма'].map(h => (
          <th key={h} style={{ padding:'7px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {MOCHA_SPECIAL.map((f, i) => {
          const r = data.params?.[f.key] || { value:'' }
          return (
            <tr key={f.key} style={{ borderTop:'1px solid #f1f5f9', background:i%2===0?'#fff':'#fafafa' }}>
              <td style={{ padding:'7px 10px', fontWeight:600 }}>{f.label}</td>
              <td style={{ padding:'5px 8px' }}>
                {readOnly ? <span style={{ fontWeight:600 }}>{r.value||'—'}</span>
                  : <input value={r.value||''} onChange={e => setParam(f.key, e.target.value)}
                      style={{ width:120, padding:'5px 7px', borderRadius:6, border:'1.5px solid #e2e8f0', fontSize:12, fontFamily:"'Nunito',sans-serif", outline:'none' }} />}
              </td>
              <td style={{ padding:'5px 8px', color:'#64748b', fontSize:11 }}>{f.unit}</td>
              <td style={{ padding:'5px 8px', color:'#64748b', fontSize:11 }}>{f.ref}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Фекалии паразитологические ─────────────────────────────────────────────
function FecesParaForm({ svc, data, readOnly, onChange }) {
  const sel = (val, opts, onCh) => (
    <select value={val} onChange={e => onCh(e.target.value)} disabled={readOnly}
      style={{ padding:'6px 10px', borderRadius:7, border:'1.5px solid #e2e8f0', fontSize:12, fontFamily:"'Nunito',sans-serif", outline:'none', minWidth:200, background:readOnly?'#f8fafc':'#fff' }}>
      <option value="">— не выбрано —</option>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
  return (
    <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:12, fontWeight:600, minWidth:220 }}>Яйца гельминтов:</span>
        {sel(data.helminth||'', ['Не обнаружены','Обнаружены'], v => onChange(svc, {...data, helminth:v}))}
        {data.helminth === 'Обнаружены' && !readOnly && (
          <input value={data.helminth_name||''} onChange={e => onChange(svc, {...data, helminth_name:e.target.value})}
            placeholder="Название паразита (напр. Toxocara)"
            style={{ flex:1, padding:'6px 9px', borderRadius:7, border:'1.5px solid #e2e8f0', fontSize:12, fontFamily:"'Nunito',sans-serif", outline:'none' }} />
        )}
        {readOnly && data.helminth_name && <span style={{ fontSize:12, color:'#dc2626', fontWeight:600 }}>{data.helminth_name}</span>}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:12, fontWeight:600, minWidth:220 }}>Простейшие (лямблии, изоспоры):</span>
        {sel(data.protozoa||'', ['Не обнаружены','Обнаружены'], v => onChange(svc, {...data, protozoa:v}))}
      </div>
    </div>
  )
}

// ── Соскобы ────────────────────────────────────────────────────────────────
function ScrapForm({ svc, data, readOnly, onChange }) {
  const sel = (val, opts, onCh) => (
    <select value={val} onChange={e => onCh(e.target.value)} disabled={readOnly}
      style={{ padding:'6px 10px', borderRadius:7, border:'1.5px solid #e2e8f0', fontSize:12, fontFamily:"'Nunito',sans-serif", outline:'none', minWidth:280, background:readOnly?'#f8fafc':'#fff' }}>
      <option value="">— не выбрано —</option>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
  return (
    <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:12, fontWeight:600, minWidth:160 }}>Эктопаразиты:</span>
        {sel(data.ectoparasites||'', ['Не обнаружены','Обнаружен Demodex','Обнаружен Sarcoptes','Обнаружен Otodectes'], v => onChange(svc, {...data, ectoparasites:v}))}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:12, fontWeight:600, minWidth:160 }}>Грибы (дерматофиты):</span>
        {sel(data.fungi||'', ['Не обнаружены','Обнаружены элементы гриба'], v => onChange(svc, {...data, fungi:v}))}
      </div>
    </div>
  )
}

// ── Лампа Вуда ────────────────────────────────────────────────────────────
function WoodForm({ svc, data, readOnly, onChange }) {
  return (
    <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:12, fontWeight:600, minWidth:120 }}>Свечение:</span>
        {readOnly
          ? <span style={{ fontWeight:700, color: data.glow?.includes('Отрицательное')?'#166534':'#dc2626' }}>{data.glow||'—'}</span>
          : <select value={data.glow||''} onChange={e => onChange(svc, {...data, glow:e.target.value})}
              style={{ padding:'6px 10px', borderRadius:7, border:'1.5px solid #e2e8f0', fontSize:12, fontFamily:"'Nunito',sans-serif", outline:'none', minWidth:260, background:'#fff' }}>
              <option value="">— не выбрано —</option>
              <option value="Отрицательное">Отрицательное</option>
              <option value="Положительное (изумрудно-зелёное)">Положительное (изумрудно-зелёное)</option>
            </select>}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:12, fontWeight:600, minWidth:120 }}>Локализация:</span>
        {readOnly
          ? <span style={{ fontSize:12 }}>{data.location||'—'}</span>
          : <input value={data.location||''} onChange={e => onChange(svc, {...data, location:e.target.value})}
              style={{ flex:1, padding:'6px 9px', borderRadius:7, border:'1.5px solid #e2e8f0', fontSize:12, fontFamily:"'Nunito',sans-serif", outline:'none' }}
              placeholder="Например: в области правого уха и морды" />}
      </div>
    </div>
  )
}

// ── Вагинит / постит ──────────────────────────────────────────────────────
function VaginaForm({ svc, data, readOnly, onChange }) {
  const sel = (val, opts, onCh) => (
    <select value={val} onChange={e => onCh(e.target.value)} disabled={readOnly}
      style={{ padding:'6px 10px', borderRadius:7, border:'1.5px solid #e2e8f0', fontSize:12, fontFamily:"'Nunito',sans-serif", outline:'none', minWidth:280, background:readOnly?'#f8fafc':'#fff' }}>
      <option value="">— не выбрано —</option>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
  return (
    <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:12, fontWeight:600, minWidth:160 }}>Микрофлора:</span>
        {sel(data.flora||'', ['Скудная','Умеренная (кокки)','Умеренная (палочки)','Обильная (кокки)','Обильная (палочки)'], v => onChange(svc, {...data, flora:v}))}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:12, fontWeight:600, minWidth:160 }}>Цитологическая картина:</span>
        {sel(data.cytology||'', ['Без признаков воспаления','Воспалительный тип мазка (нейтрофилы единичные)','Воспалительный тип мазка (нейтрофилы обильные)'], v => onChange(svc, {...data, cytology:v}))}
      </div>
    </div>
  )
}

// ── Копрограмма ───────────────────────────────────────────────────────────
function KoproForm({ svc, data, readOnly, onChange }) {
  const setParam = (k, v) => onChange(svc, { ...data, params:{ ...data.params, [k]:v } })
  const setDigest = (k, v) => onChange(svc, { ...data, digest:{ ...data.digest, [k]:v } })
  return (
    <div>
      <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:10 }}>
        {KOPRO_PARAMS.map(p => (
          <div key={p.key} style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:12, fontWeight:600, minWidth:160 }}>{p.label}:</span>
            {readOnly
              ? <span style={{ fontSize:12 }}>{data.params?.[p.key]||'—'}</span>
              : <select value={data.params?.[p.key]||''} onChange={e => setParam(p.key, e.target.value)}
                  style={{ padding:'6px 10px', borderRadius:7, border:'1.5px solid #e2e8f0', fontSize:12, fontFamily:"'Nunito',sans-serif", outline:'none', minWidth:200 }}>
                  <option value="">— не выбрано —</option>
                  {p.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>}
          </div>
        ))}
      </div>
      <div style={{ borderTop:'2px solid #e2e8f0', padding:'10px 16px', background:'#f8fafc' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#64748b', marginBottom:8, textTransform:'uppercase' }}>Перевариваемость</div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead><tr style={{ background:'#f0f4f0' }}>
            <th style={{ padding:'6px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>Компонент</th>
            <th style={{ padding:'6px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>Результат</th>
          </tr></thead>
          <tbody>
            {KOPRO_DIGEST.map((d, i) => (
              <tr key={d.key} style={{ borderTop:'1px solid #e8f0e8', background:i%2===0?'#fff':'#fafafa' }}>
                <td style={{ padding:'6px 10px', fontWeight:500 }}>{d.label}</td>
                <td style={{ padding:'5px 8px' }}>
                  {readOnly
                    ? <span style={{ fontSize:12 }}>{data.digest?.[d.key]||'—'}</span>
                    : <select value={data.digest?.[d.key]||'не обнаружено'} onChange={e => setDigest(d.key, e.target.value)}
                        style={{ padding:'5px 9px', borderRadius:6, border:'1.5px solid #e2e8f0', fontSize:12, fontFamily:"'Nunito',sans-serif", outline:'none' }}>
                        {DIGEST_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Пунктат ───────────────────────────────────────────────────────────────
function PunktForm({ svc, data, readOnly, onChange }) {
  const setProp = (k, v) => onChange(svc, { ...data, props:{ ...data.props, [k]:v } })
  return (
    <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:10 }}>
      {PUNKT_PROPS.map(p => (
        <div key={p.key} style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:12, fontWeight:600, minWidth:200 }}>{p.label}:</span>
          {readOnly
            ? <span style={{ fontSize:12 }}>{data.props?.[p.key]||'—'}</span>
            : <input value={data.props?.[p.key]||''} onChange={e => setProp(p.key, e.target.value)}
                style={{ flex:1, padding:'6px 9px', borderRadius:7, border:'1.5px solid #e2e8f0', fontSize:12, fontFamily:"'Nunito',sans-serif", outline:'none' }} />}
        </div>
      ))}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:12, fontWeight:600, minWidth:200 }}>Тип выпота:</span>
        {readOnly
          ? <span style={{ fontSize:12, fontWeight:700 }}>{data.punkt_type||'—'}</span>
          : <select value={data.punkt_type||''} onChange={e => onChange(svc, {...data, punkt_type:e.target.value})}
              style={{ flex:1, padding:'6px 10px', borderRadius:7, border:'1.5px solid #e2e8f0', fontSize:12, fontFamily:"'Nunito',sans-serif", outline:'none' }}>
              <option value="">— не выбрано —</option>
              {PUNKT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        <span style={{ fontSize:12, fontWeight:600 }}>Микроскопия (клеточный состав):</span>
        {readOnly
          ? <div style={{ fontSize:12, color:'#334155', background:'#f8fafc', padding:'8px 10px', borderRadius:7, lineHeight:1.5 }}>{data.microscopy||'—'}</div>
          : <textarea value={data.microscopy||''} onChange={e => onChange(svc, {...data, microscopy:e.target.value})} rows={3}
              placeholder="Например: В мазке преобладают дегенеративные нейтрофилы, обнаружены макрофаги..."
              style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1.5px solid #e2e8f0', fontSize:12, fontFamily:"'Nunito',sans-serif", outline:'none', resize:'vertical', boxSizing:'border-box' }} />}
      </div>
    </div>
  )
}

// ── Главный компонент ───────────────────────────────────────────────────────
export default function Lab() {
  const [user, setUser]              = useState(null)
  const [orders, setOrders]          = useState([])
  const [filter, setFilter]          = useState('all')
  const [search, setSearch]          = useState('')
  const [selectedOrder, setSelected] = useState(null)
  const [results, setResults]        = useState({})
  const [labNotes, setLabNotes]      = useState('')
  const [errors, setErrors]          = useState({})
  const [saving, setSaving]          = useState(false)
  const [successMsg, setSuccessMsg]  = useState('')
  const searchRef = useRef(null)

  const isVet = user?.role === 'vet' || user?.role === 'assistant' || user?.role === 'head'
  const isLab = user?.role === 'lab'

  const load = async () => {
    try {
      const [me, ord] = await Promise.all([api.get('/auth/me'), api.get('/lab/orders')])
      setUser(me.data)
      setOrders(ord.data)
    } catch(e) { console.error(e) }
  }

  useEffect(() => { load() }, [])

  const visible = orders.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return o.order_number.toLowerCase().includes(q)
          || o.pet_name?.toLowerCase().includes(q)
          || o.owner_name?.toLowerCase().includes(q)
    }
    return true
  })

  const handleSearchKey = e => {
    if (e.key === 'Enter' && search.trim()) {
      const found = orders.find(o => o.order_number.toLowerCase() === search.trim().toLowerCase())
      if (found) openOrder(found)
    }
  }

  const openOrder = (order) => {
    setSelected(order)
    setResults(initResults(order))
    setLabNotes(order.lab_notes || '')
    setErrors({})
    setSuccessMsg('')
  }

  const handleChange = (svc, newData) => {
    setResults(prev => ({ ...prev, [svc]: newData }))
  }

  const handleCollect = async (id) => {
    try {
      await api.put(`/lab/orders/${id}/collect`)
      await load()
      if (selectedOrder?.id === id) {
        const updated = (await api.get(`/lab/orders/${id}`)).data
        setSelected(updated)
        setResults(initResults(updated))
      }
    } catch(e) { alert(e?.response?.data?.detail || 'Ошибка') }
  }

  const handleSubmitResults = async () => {
    const errs = validateResults(results, selectedOrder.services || [])
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)
    try {
      await api.put(`/lab/orders/${selectedOrder.id}/results`, {
        results: flattenResults(results),
        lab_notes: labNotes,
      })
      setSuccessMsg('✓ Результаты утверждены и отправлены врачу и клиенту')
      await load()
      setTimeout(() => { setSelected(null); setSuccessMsg('') }, 2000)
    } catch(e) {
      alert(e?.response?.data?.detail || 'Ошибка сохранения')
    } finally { setSaving(false) }
  }

  const handleDeleteOrder = async (id) => {
    if (!confirm('Удалить заявку?')) return
    try { await api.delete(`/lab/orders/${id}`); await load() }
    catch(e) { alert(e?.response?.data?.detail || 'Ошибка') }
  }

  const counts = {
    all:       orders.length,
    pending:   orders.filter(o => o.status === 'pending').length,
    collected: orders.filter(o => o.status === 'collected').length,
    ready:     orders.filter(o => o.status === 'ready').length,
  }

  const species = selectedOrder?.pet_species || 'other'
  const readOnly = !isLab || selectedOrder?.status === 'ready'

  return (
    <div style={{ display:'flex', height:'calc(100vh - 64px)', overflow:'hidden', background:'#f8fafc', ...F }}>

      {/* ── ЛЕВАЯ ПАНЕЛЬ ── */}
      <div style={{ width:380, minWidth:380, display:'flex', flexDirection:'column', borderRight:'1px solid #e2e8f0', background:'#fff', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0' }}>
          <div style={{ fontWeight:900, fontSize:18, color:'#1e293b', marginBottom:2 }}>🔬 Журнал лаборатории</div>
          <div style={{ fontSize:12, color:'#94a3b8' }}>ГБУ «Горветстанция» г. Байконур</div>
        </div>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9' }}>
          <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchKey}
            placeholder="🔍 Поиск или сканировать штрих-код..."
            style={{ width:'100%', padding:'9px 13px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:13, ...F, outline:'none', boxSizing:'border-box' }} />
          <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>Нажмите Enter для поиска по номеру заявки</div>
        </div>
        <div style={{ display:'flex', borderBottom:'1px solid #e2e8f0', flexShrink:0 }}>
          {[['all','Все','#475569'],['pending','Ожидают','#3b82f6'],['collected','В работе','#f59e0b'],['ready','Готово','#22c55e']].map(([key,label,color]) => (
            <button key={key} onClick={() => setFilter(key)}
              style={{ flex:1, border:'none', background:'none', padding:'10px 4px', cursor:'pointer', borderBottom: filter===key?`2.5px solid ${color}`:'2.5px solid transparent',
                color: filter===key?color:'#94a3b8', fontWeight: filter===key?800:600, fontSize:12, ...F }}>
              {label}
              <span style={{ marginLeft:4, background: filter===key?color:'#f1f5f9', color: filter===key?'#fff':'#64748b', borderRadius:10, padding:'1px 6px', fontSize:10 }}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {visible.length === 0
            ? <div style={{ textAlign:'center', padding:'40px 20px', color:'#94a3b8', fontSize:13 }}><div style={{ fontSize:32, marginBottom:8 }}>📋</div>Нет заявок</div>
            : visible.map(o => {
              const isSelected = selectedOrder?.id === o.id
              return (
                <div key={o.id} onClick={() => openOrder(o)}
                  style={{ padding:'14px 16px', borderBottom:'1px solid #f8fafc', cursor:'pointer',
                    background: isSelected?'#f0fdf4':'#fff', borderLeft: isSelected?'3px solid #166534':'3px solid transparent' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:5 }}>
                    <div>
                      <span style={{ fontWeight:800, fontSize:13, color:'#1e293b' }}>{o.order_number}</span>
                      <span style={{ marginLeft:8, fontSize:12, color:'#64748b' }}>{o.scheduled_date || o.created_at?.split('T')[0]}</span>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                  <div style={{ fontWeight:700, fontSize:13, color:'#334155' }}>
                    {o.pet_name} <span style={{ color:'#94a3b8', fontWeight:500 }}>· {o.owner_name}</span>
                  </div>
                  <div style={{ fontSize:11, color:'#64748b', marginTop:3 }}>
                    {(o.services||[]).slice(0,2).join(' · ')}{o.services?.length>2?` +${o.services.length-2}`:''}
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* ── ПРАВАЯ ПАНЕЛЬ ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {!selectedOrder ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', color:'#94a3b8', gap:12 }}>
            <div style={{ fontSize:56 }}>🔬</div>
            <div style={{ fontWeight:700, fontSize:16 }}>Выберите заявку из списка</div>
            <div style={{ fontSize:13 }}>или введите номер / отсканируйте штрих-код</div>
          </div>
        ) : (
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {/* Шапка */}
            <div style={{ padding:'16px 28px', borderBottom:'1px solid #e2e8f0', background:'#fff', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
                  <span style={{ fontWeight:900, fontSize:20, color:'#1e293b' }}>{selectedOrder.order_number}</span>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <div style={{ fontSize:14, color:'#334155' }}>
                  <strong>{selectedOrder.pet_name}</strong>
                  <span style={{ color:'#94a3b8' }}> · {selectedOrder.owner_name}</span>
                  {selectedOrder.scheduled_date && <span style={{ color:'#64748b' }}> · Дата забора: {selectedOrder.scheduled_date}</span>}
                </div>
                {selectedOrder.notes && (
                  <div style={{ marginTop:6, background:'#fffbeb', border:'1px solid #fde68a', borderRadius:7, padding:'5px 10px', fontSize:12, color:'#92400e' }}>
                    🧾 Назначено врачом при завершении приёма
                  </div>
                )}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {isLab && selectedOrder.status === 'pending' && (
                  <button onClick={() => handleCollect(selectedOrder.id)}
                    style={{ ...F, padding:'9px 18px', borderRadius:10, border:'none', background:'#f59e0b', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer' }}>
                    📥 Материал забран
                  </button>
                )}
                {isVet && selectedOrder.status === 'pending' && (
                  <button onClick={() => handleDeleteOrder(selectedOrder.id)}
                    style={{ ...F, padding:'9px 14px', borderRadius:10, border:'1px solid #fca5a5', background:'#fff', color:'#dc2626', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                    🗑
                  </button>
                )}
              </div>
            </div>

            {successMsg ? (
              <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ textAlign:'center', color:'#166534', fontWeight:800, fontSize:20, ...F }}>
                  <div style={{ fontSize:56, marginBottom:12 }}>✅</div>{successMsg}
                </div>
              </div>
            ) : (
              <div style={{ flex:1, overflowY:'auto', padding:'20px 28px' }}>

                {/* Динамические формы по каждому сервису */}
                {(selectedOrder.services || []).map(svc => {
                  const type = getServiceType(svc)
                  const data = results[svc] || {}
                  const hasErr = errors[svc]
                  return (
                    <div key={svc} style={{ background:'#fff', border:`1.5px solid ${hasErr?'#fca5a5':'#e2e8f0'}`, borderRadius:12, overflow:'hidden', marginBottom:16 }}>
                      <div style={{ background:'#1e293b', padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ color:'#fff', fontWeight:800, fontSize:13 }}>🧪 {svc}</span>
                        {hasErr && <span style={{ color:'#fca5a5', fontSize:11 }}>⚠ {hasErr}</span>}
                      </div>

                      {type === 'oak' && (
                        <OAKForm svc={svc} data={data} species={species} readOnly={readOnly} onChange={handleChange} />
                      )}
                      {type === 'biohim' && (
                        <BiohimForm svc={svc} data={data} species={species} readOnly={readOnly} onChange={handleChange} />
                      )}
                      {type === 'knotta' && (
                        <KnottaForm svc={svc} data={data} readOnly={readOnly} onChange={handleChange} />
                      )}
                      {type === 'serology' && (
                        <SerologyForm svc={svc} data={data} species={species} readOnly={readOnly} onChange={handleChange} />
                      )}
                      {type === 'plt' && (
                        <PLTForm svc={svc} data={data} species={species} readOnly={readOnly} onChange={handleChange} />
                      )}
                      {type === 'mocha' && (
                        <MochaForm svc={svc} data={data} readOnly={readOnly} onChange={handleChange} />
                      )}
                      {type === 'mocha_express' && (
                        <MochaExpressForm svc={svc} data={data} readOnly={readOnly} onChange={handleChange} />
                      )}
                      {type === 'mocha_special' && (
                        <MochaSpecialForm svc={svc} data={data} readOnly={readOnly} onChange={handleChange} />
                      )}
                      {type === 'feces_para' && (
                        <FecesParaForm svc={svc} data={data} readOnly={readOnly} onChange={handleChange} />
                      )}
                      {type === 'scrap' && (
                        <ScrapForm svc={svc} data={data} readOnly={readOnly} onChange={handleChange} />
                      )}
                      {type === 'wood' && (
                        <WoodForm svc={svc} data={data} readOnly={readOnly} onChange={handleChange} />
                      )}
                      {type === 'vagina' && (
                        <VaginaForm svc={svc} data={data} readOnly={readOnly} onChange={handleChange} />
                      )}
                      {type === 'kopro' && (
                        <KoproForm svc={svc} data={data} readOnly={readOnly} onChange={handleChange} />
                      )}
                      {type === 'punkt' && (
                        <PunktForm svc={svc} data={data} readOnly={readOnly} onChange={handleChange} />
                      )}
                      {type === 'generic' && (
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                          <thead>
                            <tr style={{ background:'#f8fafc' }}>
                              {['Исследование','Результат *','Ед. изм.','Реф. норма','Флаг'].map(h => (
                                <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <GenericRow svc={svc} data={data} readOnly={readOnly} onChange={(s,d) => handleChange(s,{...d,type:'generic'})} hasErr={!!hasErr} />
                          </tbody>
                        </table>
                      )}
                    </div>
                  )
                })}

                {/* Примечания */}
                {!readOnly && (
                  <div style={{ marginBottom:16 }}>
                    <label style={{ ...F, fontSize:11, fontWeight:700, color:'#64748b', display:'block', marginBottom:4, textTransform:'uppercase' }}>Примечания лаборанта</label>
                    <textarea value={labNotes} onChange={e => setLabNotes(e.target.value)} rows={2}
                      placeholder="Особенности материала, замечания..."
                      style={{ width:'100%', padding:'9px 13px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, ...F, outline:'none', resize:'vertical', boxSizing:'border-box' }} />
                  </div>
                )}
                {readOnly && selectedOrder.lab_notes && (
                  <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#475569' }}>
                    <span style={{ fontWeight:700 }}>Примечание лаборанта:</span> {selectedOrder.lab_notes}
                  </div>
                )}

                {isLab && selectedOrder.status === 'collected' && (
                  <button onClick={handleSubmitResults} disabled={saving}
                    style={{ ...F, width:'100%', padding:'13px', borderRadius:12, border:'none',
                      background: saving?'#86efac':'#166534', color:'#fff', fontWeight:900, fontSize:15, cursor: saving?'not-allowed':'pointer' }}>
                    {saving ? '⏳ Сохранение...' : '✅ Утвердить результаты'}
                  </button>
                )}
                {isVet && selectedOrder.status === 'collected' && (
                  <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'12px 16px', fontSize:13, color:'#92400e', fontWeight:600, ...F }}>
                    ⏳ Материал в работе — лаборант вносит результаты
                  </div>
                )}
                {selectedOrder.status === 'pending' && (
                  <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'12px 16px', fontSize:13, color:'#1e40af', fontWeight:600, ...F }}>
                    {isLab ? 'ℹ Сначала нажмите «Материал забран» чтобы начать ввод результатов' : 'ℹ Ожидает забора материала лаборантом'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
