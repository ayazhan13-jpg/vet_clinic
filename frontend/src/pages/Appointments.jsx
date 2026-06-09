import { useState, useEffect } from 'react'
import {
  Container, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Alert, TextField, MenuItem
} from '@mui/material'
import { LocalizationProvider, DateCalendar } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { useNavigate } from 'react-router-dom'
import api from '../api'

dayjs.locale('ru')

// ─── Константы ───────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pending:   { label: 'Записан',   color: '#2e7d32', bg: '#e8f5e9', border: '#a5d6a7' },
  confirmed: { label: 'Записан',   color: '#2e7d32', bg: '#e8f5e9', border: '#a5d6a7' },
  cancelled: { label: 'Отменён',   color: '#c62828', bg: '#ffebee', border: '#ffcdd2' },
  completed: { label: 'Завершён',  color: '#1565c0', bg: '#e3f2fd', border: '#90caf9' },
}

const SPECIES_EMOJI = {
  cat: '🐱', dog: '🐶', rabbit: '🐰',
  bird: '🐦', hamster: '🐹', other: '🐾',
}

const CLIENT_TABS = [
  { key: 'all',       label: 'Все' },
  { key: 'active',    label: 'Активные' },
  { key: 'completed', label: 'Завершённые' },
  { key: 'cancelled', label: 'Отменённые' },
]

// ─── Вспомогательные компоненты ──────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { label: status, color: '#888', bg: '#f5f5f5', border: '#ddd' }
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      border: `1.5px solid ${cfg.border}`,
      fontSize: 12, fontWeight: 700,
      fontFamily: "'Nunito', sans-serif",
    }}>
      {cfg.label}
    </span>
  )
}

function TabBar({ tabs, active, onSelect, counts }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
      {tabs.map(t => {
        const isActive = active === t.key
        const count = counts?.[t.key]
        return (
          <button key={t.key} onClick={() => onSelect(t.key)} style={{
            padding: '7px 14px',
            borderRadius: 20,
            border: `1.5px solid ${isActive ? '#3a7d44' : '#e0e0e0'}`,
            background: isActive ? '#3a7d44' : '#fff',
            color: isActive ? '#fff' : '#666',
            fontSize: 13, fontWeight: 700,
            fontFamily: "'Nunito', sans-serif",
            cursor: 'pointer',
            transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {t.label}
            {count > 0 && (
              <span style={{
                background: isActive ? 'rgba(255,255,255,0.3)' : '#3a7d44',
                color: '#fff',
                borderRadius: 10, padding: '0 6px',
                fontSize: 11, fontWeight: 800,
              }}>{count}</span>
            )}
          </button>
        )
      })}

    </div>
  )
}

function AppCard({ app, isVet, getVetName, getClientName, getPetInfo, getPetEmoji,
                   getTimeLabel, onConfirm, onComplete, onCancel, onChat }) {
  const cfg = STATUS_CFG[app.status] || STATUS_CFG.pending
  const timeLabel = getTimeLabel(app)
  const petInfo = getPetInfo(app.pet_id)
  const petEmoji = getPetEmoji(app.pet_id)
  const todayStr = dayjs().format('YYYY-MM-DD')
  const isToday = app.date === todayStr

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      borderLeft: `4px solid ${cfg.color}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      padding: '18px 20px',
      transition: 'box-shadow 0.18s, transform 0.18s',
      position: 'relative',
      overflow: 'hidden',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* Номер записи — мелко в углу */}
      <span style={{ position: 'absolute', top: 10, right: 14, fontSize: 11, color: '#ccc', fontFamily: "'Nunito', sans-serif" }}>
        #{app.id}
      </span>

      {/* Шапка карточки */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: cfg.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, flexShrink: 0,
        }}>
          {petEmoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#2d4a2d', fontFamily: "'Nunito', sans-serif", marginBottom: 2 }}>
            {petInfo}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <StatusBadge status={app.status} />
            {isToday && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#e53935', background: '#ffebee', borderRadius: 10, padding: '2px 8px' }}>
                📌 Сегодня
              </span>
            )}
            {!isToday && timeLabel && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#ff6f00', background: '#fff8e1', borderRadius: 10, padding: '2px 8px' }}>
                {timeLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Детали */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
        <InfoLine icon="📅" text={`${dayjs(app.date).format('D MMMM YYYY')} в ${app.time?.slice(0,5)}`} bold />
        <InfoLine icon="👨‍⚕️" text={getVetName(app.vet_id)} />
        {app.notes && <InfoLine icon="📝" text={app.notes} />}
      </div>

      {/* Кнопки */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={onChat} style={chatBtnStyle}>
          💬 Написать врачу
        </button>
        {!isVet && ['pending','confirmed'].includes(app.status) && (
          <button onClick={onCancel} style={cancelTextBtnStyle}>Отменить запись</button>
        )}
      </div>
    </div>
  )
}

function InfoLine({ icon, text, bold }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: "'Nunito', sans-serif", color: bold ? '#333' : '#666', fontWeight: bold ? 700 : 500 }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span>{text}</span>
    </div>
  )
}

const chatBtnStyle = {
  padding: '7px 14px', borderRadius: 10,
  border: '1.5px solid #3a7d44', background: 'transparent',
  color: '#3a7d44', fontSize: 13, fontWeight: 700,
  fontFamily: "'Nunito', sans-serif", cursor: 'pointer',
}
const confirmBtnStyle = {
  padding: '7px 14px', borderRadius: 10,
  border: 'none', background: '#3a7d44',
  color: '#fff', fontSize: 13, fontWeight: 700,
  fontFamily: "'Nunito', sans-serif", cursor: 'pointer',
}
const completeBtnStyle = {
  padding: '7px 14px', borderRadius: 10,
  border: 'none', background: '#1565c0',
  color: '#fff', fontSize: 13, fontWeight: 700,
  fontFamily: "'Nunito', sans-serif", cursor: 'pointer',
}
const cancelTextBtnStyle = {
  background: 'none', border: 'none',
  color: '#e53935', fontSize: 13, fontWeight: 700,
  fontFamily: "'Nunito', sans-serif", cursor: 'pointer',
  padding: '7px 4px',
}

// ─── Прейскурант ГБУ «Горветстанция» г. Байконур ────────────────────────────
const VET_SERVICES = [
  { group: 'Первичный осмотр',             name: 'Клинический осмотр животных' },
  { group: 'Первичный осмотр',             name: 'Взвешивание животного' },
  { group: 'Первичный осмотр',             name: 'Консультация по уходу и содержанию животных' },
  { group: 'Лабораторные исследования',    name: 'Взятие крови' },
  { group: 'Лабораторные исследования',    name: 'Исследование крови: общий анализ крови' },
  { group: 'Лабораторные исследования',    name: 'Исследование крови: биохимическое' },
  { group: 'Лабораторные исследования',    name: 'Исследование крови: уровень тромбоцитов' },
  { group: 'Лабораторные исследования',    name: 'Исследование крови: по методу Кнотта' },
  { group: 'Лабораторные исследования',    name: 'Исследование крови: серологическое' },
  { group: 'Лабораторные исследования',    name: 'Исследование фекалий (паразитологическое)' },
  { group: 'Лабораторные исследования',    name: 'Исследование фекалий развёрнутая форма' },
  { group: 'Лабораторные исследования',    name: 'Взятие и микроскопия соскобов' },
  { group: 'Лабораторные исследования',    name: 'Люминисцентная диагностика микроспории' },
  { group: 'Лабораторные исследования',    name: 'Общий анализ мочи на приборе' },
  { group: 'Лабораторные исследования',    name: 'Исследование мочи экспресс методом' },
  { group: 'Лабораторные исследования',    name: 'Исследование мочи специальными методами' },
  { group: 'Лабораторные исследования',    name: 'Исследование пунктатов' },
  { group: 'Лабораторные исследования',    name: 'Взятие проб на инфекционный вагинит, постит' },
  { group: 'Профилактическая иммунизация', name: 'Вакцинация домашних животных' },
  { group: 'Профилактическая иммунизация', name: 'Вакцинация птиц' },
  { group: 'Профилактическая иммунизация', name: 'Вакцинация свиней' },
  { group: 'Процедуры',                    name: 'Инъекции внутримышечные, подкожные' },
  { group: 'Процедуры',                    name: 'Инъекции внутривенные, внутрибрюшные домашних животных' },
  { group: 'Процедуры',                    name: 'Дача лекарственных средств, снятие иксодового клеща' },
  { group: 'Процедуры',                    name: 'Инфузия жидкостей капельно' },
  { group: 'Процедуры',                    name: 'Оксигенотерапия' },
  { group: 'Процедуры',                    name: 'Физиопроцедуры (1 сеанс)' },
  { group: 'Процедуры',                    name: 'Катетеризация мочевого пузыря' },
  { group: 'Процедуры',                    name: 'Пункция мочевого пузыря через брюшную стенку' },
  { group: 'Процедуры',                    name: 'Лапароцентез с эвакуацией жидкости' },
  { group: 'Процедуры',                    name: 'Лапароцентез диагностический' },
  { group: 'Процедуры',                    name: 'Перитониальный диализ' },
  { group: 'Процедуры',                    name: 'Промывание носослёзного канала' },
  { group: 'Процедуры',                    name: 'Очистка кишечника с помощью клизмы (кошки)' },
  { group: 'Процедуры',                    name: 'Очистка кишечника с помощью клизмы (собаки)' },
  { group: 'Процедуры',                    name: 'Очистка параанальных желез' },
  { group: 'Процедуры',                    name: 'Обработка против эктопаразитов домашних животных' },
  { group: 'Диагностика и лечение',        name: 'Инфекционные болезни' },
  { group: 'Диагностика и лечение',        name: 'Болезни органов дыхания' },
  { group: 'Диагностика и лечение',        name: 'Болезни сердечно-сосудистой системы' },
  { group: 'Диагностика и лечение',        name: 'Болезни нервной системы' },
  { group: 'Диагностика и лечение',        name: 'Болезни органов размножения мелких животных' },
  { group: 'Диагностика и лечение',        name: 'Болезни органов пищеварения' },
  { group: 'Диагностика и лечение',        name: 'Диагностическая лапаротомия' },
  { group: 'Диагностика и лечение',        name: 'Удаление зуба без ушивания раны' },
  { group: 'Диагностика и лечение',        name: 'Удаление зуба с ушиванием раны' },
  { group: 'Диагностика и лечение',        name: 'Парадонтоз, снятие зубного камня' },
  { group: 'Диагностика и лечение',        name: 'Извлечение инородных тел из глотки, пищевода' },
  { group: 'Диагностика и лечение',        name: 'Диагностика болезней опорно-двигательного аппарата' },
  { group: 'Диагностика и лечение',        name: 'Диагностика болезней органов мочеотделения' },
  { group: 'Диагностика и лечение',        name: 'Обработка наружных половых органов' },
  { group: 'Диагностика и лечение',        name: 'Отделение последа у мелких животных' },
  { group: 'Диагностика и лечение',        name: 'Определение беременности' },
  { group: 'Диагностика и лечение',        name: 'Гинекологические обработки у мелких животных (курс)' },
  { group: 'Диагностика и лечение',        name: 'Родовспоможение при патологических родах домашним животным' },
  { group: 'Диагностика и лечение',        name: 'Диагностика скрытого мастита' },
  { group: 'Диагностика и лечение',        name: 'Лечение маститов мелких животных' },
  { group: 'Диагностика и лечение',        name: 'Диагностика болезней глаз' },
  { group: 'Диагностика и лечение',        name: 'Удаление инородного предмета с роговицы, конъюнктивы' },
  { group: 'Диагностика и лечение',        name: 'Субконъюнктивальные инъекции (курс 5 инъекций)' },
  { group: 'Диагностика и лечение',        name: 'Диагностика ЛОР-заболеваний' },
  { group: 'Диагностика и лечение',        name: 'Диагностика болезней кожи' },
  { group: 'Диагностика и лечение',        name: 'Диагностика нарушения обмена веществ, гормональные' },
  { group: 'Диагностика и лечение',        name: 'Диагностика аутоиммунных заболеваний' },
  { group: 'Диагностика и лечение',        name: 'Диагностика паразитарных болезней' },
  { group: 'Хирургия',                     name: 'Кастрация хряков, кобелей' },
  { group: 'Хирургия',                     name: 'Кастрация сук' },
  { group: 'Хирургия',                     name: 'Кастрация котов' },
  { group: 'Хирургия',                     name: 'Кастрация кошек' },
  { group: 'Хирургия',                     name: 'Купирование хвостов до 7 дней' },
  { group: 'Хирургия',                     name: 'Купирование хвостов старше 7 дней' },
  { group: 'Хирургия',                     name: 'Удаление прибылых пальцев до 7 дней' },
  { group: 'Хирургия',                     name: 'Удаление прибылых пальцев старше 7 дней' },
  { group: 'Хирургия',                     name: 'Купирование ушных раковин до 14 дней' },
  { group: 'Хирургия',                     name: 'Купирование ушных раковин старше 14 дней' },
  { group: 'Хирургия',                     name: 'Стрижка кошек' },
  { group: 'Хирургия',                     name: 'Стрижка собак: мелких пород' },
  { group: 'Хирургия',                     name: 'Стрижка собак: средних пород' },
  { group: 'Хирургия',                     name: 'Стрижка собак: крупных пород' },
  { group: 'Хирургия',                     name: 'Обрезка клюва у попугаев, резцов у грызунов' },
  { group: 'Хирургия',                     name: 'Обрезка когтей у плотоядных' },
  { group: 'Оперативная хирургия',         name: 'Кесарево сечение у собаки' },
  { group: 'Оперативная хирургия',         name: 'Кесарево сечение у кошки' },
  { group: 'Оперативная хирургия',         name: 'Удаление матки у собаки (овариогистерэктомия)' },
  { group: 'Оперативная хирургия',         name: 'Удаление матки у кошки (овариогистерэктомия)' },
  { group: 'Оперативная хирургия',         name: 'Первичная обработка, ушивание раны (до 3 швов)' },
  { group: 'Оперативная хирургия',         name: 'Повторная обработка ран' },
  { group: 'Оперативная хирургия',         name: 'Ушивание обширных ран с остановкой кровотечения' },
  { group: 'Оперативная хирургия',         name: 'Удаление больших новообразований (в т.ч. молочные железы)' },
  { group: 'Оперативная хирургия',         name: 'Операции на веках, ушивание роговицы, резекция носовой складки' },
  { group: 'Оперативная хирургия',         name: 'Извлечение инородных тел из передней камеры глаза' },
  { group: 'Оперативная хирургия',         name: 'Вправление вывиха глазного яблока' },
  { group: 'Оперативная хирургия',         name: 'Удаление глазного яблока' },
  { group: 'Оперативная хирургия',         name: 'Урологические операции' },
  { group: 'Оперативная хирургия',         name: 'Грыжесечение' },
  { group: 'Оперативная хирургия',         name: 'Извлечение инородных тел из ротовой полости' },
  { group: 'Оперативная хирургия',         name: 'Операции на желудке, кишечнике' },
  { group: 'Травматология',                name: 'Вправление вывихов закрытым способом' },
  { group: 'Травматология',                name: 'Вправление вывихов открытым способом' },
  { group: 'Травматология',                name: 'Вправление закрытых переломов с фиксирующей повязкой' },
  { group: 'Травматология',                name: 'Остеосинтез' },
  { group: 'Травматология',                name: 'Наложение фиксирующих повязок' },
  { group: 'Травматология',                name: 'Оперативное лечение гематомы ушной раковины' },
  { group: 'Травматология',                name: 'Рентгенография (одна проекция)' },
  { group: 'Травматология',                name: 'Рентгенография (две проекции)' },
  { group: 'Травматология',                name: 'Рентгенография (три проекции)' },
]

const VET_GROUPS = Object.entries(
  VET_SERVICES.reduce((acc, s) => { if (!acc[s.group]) acc[s.group] = []; acc[s.group].push(s.name); return acc }, {})
)

const PROC_TYPES = [
  { value: 'operation',   label: '🔪 Операция',           color: '#fee2e2' },
  { value: 'revisit',     label: '🔄 Повторный осмотр',   color: '#dbeafe' },
  { value: 'procedure',   label: '💉 Процедура/укол',     color: '#dcfce7' },
  { value: 'analysis',    label: '🧪 Сдача анализов',     color: '#fef3c7' },
  { value: 'grooming',    label: '✂ Груминг',             color: '#ede9fe' },
]

// ─── Справочник препаратов ──────────────────────────────────────────────────
const DRUG_CATALOG = [
  { name: 'Амоксициллин',           category: 'Антибиотики',       unit: 'таб.' },
  { name: 'Амоксиклав',             category: 'Антибиотики',       unit: 'таб.' },
  { name: 'Синулокс',               category: 'Антибиотики',       unit: 'таб.' },
  { name: 'Байтрил',                category: 'Антибиотики',       unit: 'мл'   },
  { name: 'Метронидазол',           category: 'Антибиотики',       unit: 'таб.' },
  { name: 'Тилозин',                category: 'Антибиотики',       unit: 'мл'   },
  { name: 'Дронтал',                category: 'Антигельминтики',   unit: 'таб.' },
  { name: 'Мильбемакс',             category: 'Антигельминтики',   unit: 'таб.' },
  { name: 'Каниквантел',            category: 'Антигельминтики',   unit: 'таб.' },
  { name: 'Пирантел',               category: 'Антигельминтики',   unit: 'таб.' },
  { name: 'Стронгхолд',             category: 'Антипаразитарные',  unit: 'пипетка' },
  { name: 'Адвантейдж',             category: 'Антипаразитарные',  unit: 'пипетка' },
  { name: 'Фронтлайн',              category: 'Антипаразитарные',  unit: 'пипетка' },
  { name: 'Мелоксикам',             category: 'НПВС',              unit: 'мл'   },
  { name: 'Превикокс',              category: 'НПВС',              unit: 'таб.' },
  { name: 'Кетофен',                category: 'НПВС',              unit: 'мл'   },
  { name: 'Локсиком',               category: 'НПВС',              unit: 'мл'   },
  { name: 'Гамавит',                category: 'Витамины',          unit: 'мл'   },
  { name: 'Катозал',                category: 'Витамины',          unit: 'мл'   },
  { name: 'Фоспренил',              category: 'Иммуномодуляторы',  unit: 'мл'   },
  { name: 'Максидин',               category: 'Иммуномодуляторы',  unit: 'мл'   },
  { name: 'Смекта',                 category: 'ЖКТ',               unit: 'пакет'},
  { name: 'Энтеросгель',            category: 'ЖКТ',               unit: 'г'    },
  { name: 'Церукал',                category: 'ЖКТ',               unit: 'таб.' },
  { name: 'Линекс',                 category: 'Пробиотики',        unit: 'капс.'},
  { name: 'Лактобифадол',           category: 'Пробиотики',        unit: 'г'    },
  { name: 'Левомеколь',             category: 'Мази',              unit: 'г'    },
  { name: 'Тетрациклиновая мазь',   category: 'Мази',              unit: 'г'    },
  { name: 'Ветрицин',               category: 'Мази',              unit: 'мл'   },
  { name: 'Хлоргексидин',           category: 'Антисептики',       unit: 'мл'   },
  { name: 'Мирамистин',             category: 'Антисептики',       unit: 'мл'   },
  { name: 'Дигоксин',               category: 'Сердечные',         unit: 'таб.' },
  { name: 'Фуросемид',              category: 'Мочегонные',        unit: 'таб.' },
  { name: 'Верошпирон',             category: 'Мочегонные',        unit: 'таб.' },
  { name: 'Дексаметазон',           category: 'Гормоны',           unit: 'мл'   },
  { name: 'Преднизолон',            category: 'Гормоны',           unit: 'таб.' },
  { name: 'Но-шпа',                 category: 'Спазмолитики',      unit: 'таб.' },
  { name: 'Тавегил',                category: 'Антигистаминные',   unit: 'таб.' },
  { name: 'Супрастин',              category: 'Антигистаминные',   unit: 'таб.' },
]

const CAT_COLORS = {
  'Антибиотики': '#dbeafe', 'Антигельминтики': '#dcfce7', 'Антипаразитарные': '#dcfce7',
  'НПВС': '#fef3c7', 'Витамины': '#ede9fe', 'Иммуномодуляторы': '#ede9fe',
  'ЖКТ': '#ffedd5', 'Пробиотики': '#ffedd5', 'Мази': '#fce7f3',
  'Антисептики': '#e0f2fe', 'Сердечные': '#fee2e2', 'Мочегонные': '#fee2e2',
  'Гормоны': '#fef9c3', 'Спазмолитики': '#f3f4f6', 'Антигистаминные': '#f3f4f6',
}

function DrugSelector({ value, onChange }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState([])
  const F = { fontFamily: "'Nunito', sans-serif" }

  const filtered = DRUG_CATALOG.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.category.toLowerCase().includes(search.toLowerCase())
  )

  const syncValue = (list) => {
    onChange(list.map(s => s.dose ? `${s.name} — ${s.dose}` : s.name).join('\n'))
  }
  const addDrug = (drug) => {
    if (!selected.find(s => s.name === drug.name)) {
      const next = [...selected, { name: drug.name, dose: '', unit: drug.unit, category: drug.category }]
      setSelected(next); syncValue(next)
    }
    setSearch(''); setOpen(false)
  }
  const removeDrug = (name) => { const next = selected.filter(s => s.name !== name); setSelected(next); syncValue(next) }
  const updateDose = (name, dose) => { const next = selected.map(s => s.name === name ? {...s, dose} : s); setSelected(next); syncValue(next) }

  const grouped = filtered.reduce((acc, d) => { if (!acc[d.category]) acc[d.category] = []; acc[d.category].push(d); return acc }, {})

  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#5a7a5a', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 }}>💊 Назначенные препараты</label>

      {selected.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {selected.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, background: CAT_COLORS[s.category] || '#f8fafc', borderRadius: 8, padding: '6px 10px', border: '1px solid #e2e8f0' }}>
              <span style={{ ...F, fontSize: 13, fontWeight: 700, color: '#1e293b', flexShrink: 0, minWidth: 140 }}>{s.name}</span>
              <input value={s.dose} onChange={e => updateDose(s.name, e.target.value)}
                placeholder={`Доза, кратность (${s.unit})`}
                style={{ ...F, flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none', background: 'rgba(255,255,255,0.7)' }} />
              <button onClick={() => removeDrug(s.name)} style={{ background: 'none', border: 'none', color: '#e57373', cursor: 'pointer', fontSize: 18, padding: '0 2px', lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)}
          placeholder="🔍 Найти препарат из справочника..."
          style={{ ...F, width: '100%', padding: '9px 13px', borderRadius: 10, border: '1.5px solid #e0e0e0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          onKeyDown={e => {
            if (e.key === 'Enter' && search.trim()) {
              const found = DRUG_CATALOG.find(d => d.name.toLowerCase() === search.toLowerCase())
              if (found) addDrug(found)
              else { const next = [...selected, { name: search.trim(), dose: '', unit: 'ед.', category: 'Другое' }]; setSelected(next); syncValue(next); setSearch(''); setOpen(false) }
            }
            if (e.key === 'Escape') setOpen(false)
          }} />

        {open && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 600, maxHeight: 260, overflowY: 'auto', marginTop: 2 }}
            onMouseDown={e => e.preventDefault()}>
            {filtered.length === 0 ? (
              <div style={{ ...F, padding: '12px 14px', fontSize: 13, color: '#aaa', textAlign: 'center' }}>
                Не в справочнике. <span style={{ color: '#3a7d44', fontWeight: 700 }}>Enter — добавить «{search}»</span>
              </div>
            ) : Object.entries(grouped).map(([cat, drugs]) => (
              <div key={cat}>
                <div style={{ ...F, padding: '5px 12px 3px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>{cat}</div>
                {drugs.map(d => {
                  const already = !!selected.find(s => s.name === d.name)
                  return (
                    <div key={d.name} onClick={() => !already && addDrug(d)}
                      style={{ ...F, padding: '8px 14px', fontSize: 13, cursor: already ? 'default' : 'pointer', color: already ? '#94a3b8' : '#1e293b', display: 'flex', justifyContent: 'space-between', transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (!already) e.currentTarget.style.background = CAT_COLORS[d.category] || '#f0fdf4' }}
                      onMouseLeave={e => { if (!already) e.currentTarget.style.background = 'transparent' }}>
                      <span>{d.name}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{already ? '✓' : d.unit}</span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ ...F, fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
        Выберите из справочника или нажмите Enter для ручного ввода
      </div>
    </div>
  )
}

// ─── Главный компонент ────────────────────────────────────────────────────────

export default function Appointments() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [pets, setPets] = useState([])
  const [allSlots, setAllSlots] = useState([])
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedVet, setSelectedVet] = useState('')
  const [form, setForm] = useState({ pet_id: '', notes: '' })
  const [error, setError] = useState('')
  const [vets, setVets] = useState([])
  const [allPets, setAllPets] = useState([])
  const [clients, setClients] = useState([])
  const [msgOpen, setMsgOpen] = useState(false)
  const [msgText, setMsgText] = useState('')
  const [msgAction, setMsgAction] = useState(null)
  const [addSlotOpen, setAddSlotOpen] = useState(false)
  const [newSlotTime, setNewSlotTime] = useState('')
  const [addSlotError, setAddSlotError] = useState('')
  const [clientFilter, setClientFilter] = useState('all')
  const [vetFilter, setVetFilter] = useState('all')
  const [vetTab, setVetTab] = useState('schedule')
  const [feedFilter, setFeedFilter] = useState('all')
  const [clientSort, setClientSort] = useState('date_desc')

  const isVet = user?.role === 'vet' || user?.role === 'assistant' || user?.role === 'head'
  const todayStr = dayjs().format('YYYY-MM-DD')

  const loadData = async () => {
    try {
      const meRes = await api.get('/auth/me')
      const currentUser = meRes.data
      setUser(currentUser)
      const isVetRole = currentUser.role === 'vet' || currentUser.role === 'assistant' || currentUser.role === 'head'

      if (isVetRole) {
        const [appRes, slotRes, vetsRes, petsRes, clientsRes] = await Promise.all([
          api.get('/appointments/vet/schedule'),
          api.get('/schedule/all'),
          api.get('/users/vets'),
          api.get('/pets/all/list'),
          api.get('/users/clients'),
        ])
        setAppointments(appRes.data)
        setAllSlots(slotRes.data)
        setVets(vetsRes.data)
        setAllPets(petsRes.data)
        setClients(clientsRes.data)
      } else {
        const [appRes, petRes, slotRes, vetsRes] = await Promise.all([
          api.get('/appointments/my'),
          api.get('/pets/my'),
          api.get('/schedule/free'),
          api.get('/users/vets'),
        ])
        setAppointments(appRes.data)
        setPets(petRes.data)
        setAllSlots(slotRes.data)
        setVets(vetsRes.data)
      }
    } catch (e) { console.error(e) }
  }

  useEffect(() => { loadData() }, [])

  // ─── Вспомогалки ─────────────────────────────────────────────────────────

  const speciesRu = { cat: 'Кошка', dog: 'Собака', rabbit: 'Кролик', bird: 'Птица', hamster: 'Хомяк', other: 'Другое' }
  const getVetName = id => vets.find(v => v.id === id)?.full_name || `Врач #${id}`
  const getClientName = id => clients.find(c => c.id === id)?.full_name || `Клиент #${id}`
  const getPetInfo = id => {
    const list = isVet ? allPets : pets
    const p = list.find(p => p.id === id)
    return p ? `${p.name} (${speciesRu[p.species] || p.species})` : `Питомец #${id}`
  }
  const getPetEmoji = id => {
    const list = isVet ? allPets : pets
    const p = list.find(p => p.id === id)
    return p ? (SPECIES_EMOJI[p.species] || '🐾') : '🐾'
  }
  const getTimeLabel = app => {
    const d = dayjs(app.date)
    if (d.isBefore(dayjs(), 'day')) return '📅 Прошедший'
    if (d.diff(dayjs(), 'day') <= 3 && app.date !== todayStr) return '⚡ Скоро'
    return null
  }

  // ─── Слоты ───────────────────────────────────────────────────────────────

  const slotsForDayRaw = allSlots.filter(s => s.date === selectedDate.format('YYYY-MM-DD'))
  const slotsForDay = isVet ? slotsForDayRaw :
    (selectedVet
      ? slotsForDayRaw.filter(s => s.status === 'free' && s.vet_id === parseInt(selectedVet))
      : slotsForDayRaw.filter(s => s.status === 'free')
          .filter((s, i, arr) => i === arr.findIndex(x => x.time === s.time)))

  // Даты с записями клиента (для точек на календаре)
  const datesWithApps = new Set(appointments.map(a => a.date))

  // ─── Фильтрация ──────────────────────────────────────────────────────────

  const todayApps = appointments.filter(a => a.date === todayStr)
  const pendingCount = appointments.filter(a => a.status === 'pending').length
  const activeCount = appointments.filter(a => ['pending','confirmed'].includes(a.status)).length

  const filteredAppointments = appointments
    .filter(app => {
      if (!isVet) {
        if (clientFilter === 'active') return ['pending','confirmed'].includes(app.status)
        if (clientFilter !== 'all') return app.status === clientFilter
        return true
      } else {
        if (vetFilter === 'today') return app.date === todayStr
        if (vetFilter !== 'all') return app.status === vetFilter
        return true
      }
    })
    .sort((a, b) => {
      const da = new Date(`${a.date} ${a.time}`)
      const db = new Date(`${b.date} ${b.time}`)
      return clientSort === 'date_asc' ? da - db : db - da
    })

  const clientCounts = {
    active: appointments.filter(a => ['pending','confirmed'].includes(a.status)).length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  }

  // ─── Действия ────────────────────────────────────────────────────────────

  const handleSlotClick = slot => {
    if (!isVet && slot.status === 'free') { setSelectedSlot(slot); setOpen(true) }
  }

  const handleCreate = async () => {
    setError('')
    if (!selectedSlot) { setError('Выберите время'); return }
    if (!form.pet_id) { setError('Выберите питомца'); return }
    try {
      const freeSlot = selectedVet
        ? allSlots.find(s => s.time === selectedSlot.time && s.date === selectedSlot.date && s.vet_id === parseInt(selectedVet) && s.status === 'free')
        : allSlots.find(s => s.time === selectedSlot.time && s.date === selectedSlot.date && s.status === 'free')
      if (!freeSlot) { setError('Нет свободных слотов'); return }
      await api.post('/appointments/', {
        pet_id: parseInt(form.pet_id), vet_id: freeSlot.vet_id,
        date: freeSlot.date,
        time: freeSlot.time.length === 5 ? freeSlot.time + ':00' : freeSlot.time,
        notes: form.notes || null,
      })
      setOpen(false); setSelectedSlot(null); setForm({ pet_id: '', notes: '' })
      setAllSlots(prev => prev.map(s => s.id === freeSlot.id ? { ...s, status: 'busy' } : s))
      await loadData()
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка') }
  }

  const [completeOpen, setCompleteOpen] = useState(false)
  const [prescriptionOpen, setPrescriptionOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyPet, setHistoryPet] = useState(null) // { pet_id, pet_name }
  const [petMedHistory, setPetMedHistory] = useState([])
  const [petPassportData, setPetPassportData] = useState(null)
  const [petLabOrders, setPetLabOrders] = useState([])
  const [labDetailOrder, setLabDetailOrder] = useState(null)
  const [completeAppId, setCompleteAppId] = useState(null)
  const [prescription, setPrescription] = useState({ anamnesis: '', diagnosis: '', medications: '', recommendations: '', notes: '' })
  const [plannedProc, setPlannedProc] = useState({ enabled: false, type: 'operation', date: '', time: '09:00', note: '', noteExtra: '', vet_id: null })
  const [busySlots, setBusySlots] = useState([])
  const [allSlotsBusy, setAllSlotsBusy] = useState(false)

  const ALL_TIMES = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30']

  const loadBusySlots = async (date, vetId) => {
    if (!date || !vetId) return
    try {
      const r = await api.get(`/appointments/vet/schedule`)
      const taken = r.data
        .filter(a => a.date === date && a.vet_id === vetId && ['confirmed','pending','completed'].includes(a.status))
        .map(a => a.time?.slice(0,5))
        .filter(Boolean)
      setBusySlots(taken)
      setAllSlotsBusy(ALL_TIMES.every(t => taken.includes(t)))
    } catch { setBusySlots([]); setAllSlotsBusy(false) }
  }

  const findNextFreeDay = async (fromDate, vetId) => {
    try {
      const r = await api.get(`/appointments/vet/schedule`)
      let d = new Date(fromDate)
      for (let i = 1; i <= 30; i++) {
        d.setDate(d.getDate() + 1)
        const ds = d.toISOString().split('T')[0]
        const taken = r.data
          .filter(a => a.date === ds && a.vet_id === vetId && ['confirmed','pending','completed'].includes(a.status))
          .map(a => a.time?.slice(0,5))
        const hasFree = ALL_TIMES.some(t => !taken.includes(t))
        if (hasFree) {
          const firstFree = ALL_TIMES.find(t => !taken.includes(t))
          setPlannedProc(p => ({...p, date: ds, time: firstFree}))
          setBusySlots(taken); setAllSlotsBusy(false)
          return
        }
      }
    } catch {}
  }

  const handleComplete = async (id) => {
    try {
      await api.put(`/appointments/${id}/complete`, { diagnosis:'', medications:'', recommendations:'', notes:'' })
      loadData()
    } catch(e) { console.error(e) }
  }

  const handleOpenPrescription = (id) => {
    setCompleteAppId(id)
    setPrescription({ anamnesis: '', diagnosis: '', medications: '', recommendations: '', notes: '' })
    setPlannedProc({ enabled: false, type: 'operation', date: '', time: '09:00', note: '', noteExtra: '', vet_id: null })
    setBusySlots([]); setAllSlotsBusy(false)
    setPrescriptionOpen(true)
  }

  const handleOpenHistory = async (app) => {
    const pet = pets?.find(p => p.id === app.pet_id)
    setHistoryPet({ pet_id: app.pet_id, pet_name: pet?.name || 'Питомец' })
    setPetMedHistory([]); setPetPassportData(null)
    setHistoryOpen(true)
    try {
      const [hist, pass, labs] = await Promise.all([
        api.get(`/passport/${app.pet_id}/medical_history`),
        api.get(`/passport/${app.pet_id}`),
        api.get(`/lab/orders/pet/${app.pet_id}`),
      ])
      setPetMedHistory(hist.data || [])
      setPetPassportData(pass.data)
      setPetLabOrders((labs.data || []).filter(o => o.status === 'ready'))
    } catch(e) { console.error(e) }
  }

  const handleCompleteSubmit = async () => {
    try {
      await api.put(`/appointments/${completeAppId}/complete`, prescription)

      // Если запланирована операция/процедура — создаём запись в расписании
      if (plannedProc.enabled && plannedProc.date && plannedProc.time) {
        const app = appointments.find(a => a.id === completeAppId)
        if (app) {
          const noteText = `[${PROC_TYPES.find(t=>t.value===plannedProc.type)?.label||plannedProc.type}] ${plannedProc.note||''}${plannedProc.noteExtra ? ' — ' + plannedProc.noteExtra : ''}`
          await api.post('/appointments/', {
            pet_id: app.pet_id,
            vet_id: app.vet_id,
            date: plannedProc.date,
            time: plannedProc.time,
            notes: noteText.trim(),
          }).catch(() => {})
          // Создаём слот в расписании у врача
          await api.post('/appointments/schedule/slot', {
            vet_id: app.vet_id,
            date: plannedProc.date,
            time: plannedProc.time,
          }).catch(() => {})

          // Если тип «Сдача анализов» — автоматически создаём заявку в лабораторию
          if (plannedProc.type === 'analysis' && plannedProc.note) {
            await api.post('/lab/orders', {
              pet_id: app.pet_id,
              services: [plannedProc.note, ...(plannedProc.noteExtra ? [plannedProc.noteExtra] : [])].filter(Boolean),
              scheduled_date: plannedProc.date,
              notes: `Назначено врачом при завершении приёма`,
            }).catch(e => console.error('Ошибка создания заявки в лаб:', e))
          }
        }
      }

      setPrescriptionOpen(false)
      setCompleteOpen(false)
      setCompleteAppId(null)
      setPlannedProc({ enabled: false, type: 'operation', date: '', time: '09:00', note: '', noteExtra: '' })
      loadData()
    } catch(e) { console.error(e) }
  }
  const handleCancel = async id => { try { await api.put(`/appointments/${id}/cancel`); loadData() } catch {} }
  const handleDeleteSlot = async id => { try { await api.delete(`/schedule/${id}`); loadData() } catch (e) { alert(e.response?.data?.detail || 'Ошибка') } }

  const handleAddSlot = async () => {
    if (!newSlotTime) { setAddSlotError('Выберите время'); return }
    const timeVal = newSlotTime.length === 5 ? newSlotTime + ':00' : newSlotTime
    const existing = allSlots.find(s =>
      s.date === selectedDate.format('YYYY-MM-DD') &&
      s.time.slice(0,5) === newSlotTime.slice(0,5)
    )
    if (existing) { setAddSlotError('Слот на это время уже существует'); return }
    try {
      await api.post('/schedule/', {
        date: selectedDate.format('YYYY-MM-DD'),
        time: timeVal,
      })
      setAddSlotOpen(false)
      setNewSlotTime('')
      setAddSlotError('')
      loadData()
    } catch (e) {
      setAddSlotError(e.response?.data?.detail || 'Ошибка создания слота')
    }
  }

  const handleSendMessage = async () => {
    try {
      if (msgAction.type === 'confirm') {
        await api.put(`/appointments/${msgAction.id}/confirm?vet_message=${encodeURIComponent(msgText)}`)
      } else {
        await api.put(`/appointments/${msgAction.id}/cancel?vet_message=${encodeURIComponent(msgText)}`)
      }
      setMsgOpen(false); setMsgText(''); loadData()
    } catch {}
  }

  // ─── Рендер ──────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#f4f8f4', fontFamily: "'Nunito', 'Segoe UI', sans-serif", position: 'relative' }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />

      {/* Космический фон — маленькие звёзды и ракета */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, opacity: 0.07, fontSize: 64, pointerEvents: 'none', zIndex: 0, userSelect: 'none' }}>🚀</div>
      <div style={{ position: 'fixed', top: 80, right: 60, opacity: 0.05, fontSize: 20, pointerEvents: 'none', zIndex: 0 }}>⭐</div>
      <div style={{ position: 'fixed', top: 200, right: 30, opacity: 0.04, fontSize: 14, pointerEvents: 'none', zIndex: 0 }}>✦</div>
      <div style={{ position: 'fixed', bottom: 120, left: 40, opacity: 0.05, fontSize: 18, pointerEvents: 'none', zIndex: 0 }}>⭐</div>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <div style={{ paddingTop: 36, paddingBottom: 60 }}>
          <h1 style={{ fontFamily: "'Nunito', sans-serif", fontSize: 28, fontWeight: 800, color: '#2d4a2d', margin: '0 0 28px' }}>
            {isVet ? '🩺 Расписание приёмов' : '📅 Запись на приём'}
          </h1>

          {/* ─── ВЕТ: вертикальная лента ─── */}
          {isVet && (
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'start' }}>

              {/* Левая панель: мини-фильтры и статистика */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'sticky', top: 16 }}>

                {/* Фильтр периода */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontFamily:"'Nunito',sans-serif", fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Период</div>
                  {[
                    { key: 'all',    label: '📋 Все записи' },
                    { key: 'future', label: '🔜 Предстоящие' },
                    { key: 'today',  label: '📅 Сегодня' },
                    { key: 'past',   label: '✅ Прошедшие' },
                  ].map(f => (
                    <button key={f.key} onClick={() => setFeedFilter(f.key)} style={{
                      fontFamily:"'Nunito',sans-serif", display: 'block', width: '100%', textAlign: 'left',
                      padding: '7px 10px', borderRadius: 8, border: 'none', marginBottom: 4,
                      background: feedFilter === f.key ? '#e8f5e9' : 'transparent',
                      color: feedFilter === f.key ? '#2e7d32' : '#475569',
                      fontSize: 13, fontWeight: feedFilter === f.key ? 800 : 600, cursor: 'pointer',
                    }}>{f.label}</button>
                  ))}
                </div>

                {/* Статистика */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontFamily:"'Nunito',sans-serif", fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Сводка</div>
                  {[
                    { label: 'Сегодня',       v: appointments.filter(a => a.date === dayjs().format('YYYY-MM-DD') && ['confirmed','pending'].includes(a.status)).length, c: '#2e7d32' },
                    { label: 'Предстоит',      v: appointments.filter(a => a.date > dayjs().format('YYYY-MM-DD') && ['confirmed','pending'].includes(a.status)).length, c: '#1565c0' },
                    { label: 'Завершено',      v: appointments.filter(a => a.status === 'completed').length, c: '#555' },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontFamily:"'Nunito',sans-serif", fontSize: 12, color: '#64748b' }}>{s.label}</span>
                      <span style={{ fontFamily:"'Nunito',sans-serif", fontSize: 15, fontWeight: 800, color: s.c }}>{s.v}</span>
                    </div>
                  ))}
                </div>

                {/* Управление слотами */}
                <button onClick={() => setVetTab(vetTab === 'slots' ? 'schedule' : 'slots')} style={{
                  fontFamily:"'Nunito',sans-serif", padding: '10px', borderRadius: 12, border: '1.5px solid #e0e0e0',
                  background: '#fff', color: '#555', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>⚙️ Управление слотами</button>
              </div>

              {/* Правая колонка: лента приёмов со скроллом */}
              <div style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto', paddingRight: 4 }}>
                {vetTab === 'slots' ? (
                  <div style={{ background: '#fff', borderRadius: 16, padding: '18px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight: 800, fontSize: 16, color: '#2d4a2d' }}>⚙️ Управление слотами</div>
                      <button onClick={() => setAddSlotOpen(true)} style={{
                        padding: '8px 16px', borderRadius: 12, border: 'none',
                        background: 'linear-gradient(135deg, #3a7d44, #52a85e)',
                        color: '#fff', fontSize: 13, fontWeight: 700,
                        fontFamily: "'Nunito', sans-serif", cursor: 'pointer',
                      }}>+ Добавить слот</button>
                    </div>
                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label style={{ fontFamily:"'Nunito',sans-serif", fontSize:12, fontWeight:700, color:'#5a7a5a', textTransform:'uppercase', letterSpacing:0.5 }}>Дата:</label>
                      <input type="date" value={selectedDate.format('YYYY-MM-DD')}
                        onChange={e => setSelectedDate(dayjs(e.target.value))}
                        style={{ padding:'7px 12px', borderRadius:8, border:'1.5px solid #e0e0e0', fontSize:13, fontFamily:"'Nunito',sans-serif", outline:'none' }} />
                      <span style={{ fontFamily:"'Nunito',sans-serif", fontSize:13, color:'#64748b', fontWeight:600 }}>
                        {selectedDate.format('D MMMM YYYY')}
                        {selectedDate.isSame(dayjs(),'day') ? ' — сегодня' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {slotsForDay.length === 0
                        ? <p style={{ color: '#aaa', fontFamily: "'Nunito', sans-serif" }}>Нет слотов на этот день</p>
                        : slotsForDay.map(slot => (
                          <SlotChip key={slot.id} slot={slot} isVet onDelete={() => handleDeleteSlot(slot.id)} />
                        ))
                      }
                    </div>
                  </div>
                ) : (
                  // ── Вертикальная лента ──────────────────────────────
                  (() => {
                    const today = dayjs().format('YYYY-MM-DD')

                    // Фильтрация по периоду
                    let filtered = [...appointments].filter(a =>
                      ['confirmed','pending','completed','cancelled'].includes(a.status)
                    )
                    if (feedFilter === 'today')  filtered = filtered.filter(a => a.date === today)
                    if (feedFilter === 'future') filtered = filtered.filter(a => a.date >= today && a.status !== 'completed')
                    if (feedFilter === 'past')   filtered = filtered.filter(a => a.date < today || a.status === 'completed')

                    // Сортировка: будущие по возрастанию, прошедшие по убыванию
                    filtered.sort((a, b) => {
                      const da = a.date + (a.time||'00:00')
                      const db = b.date + (b.time||'00:00')
                      return feedFilter === 'past' ? db.localeCompare(da) : da.localeCompare(db)
                    })

                    // Группируем по дате
                    const groups = {}
                    filtered.forEach(a => {
                      if (!groups[a.date]) groups[a.date] = []
                      groups[a.date].push(a)
                    })

                    if (filtered.length === 0) return (
                      <div style={{ textAlign: 'center', padding: '64px 0', color: '#bbb' }}>
                        <div style={{ fontSize: 56 }}>🗓️</div>
                        <p style={{ fontWeight: 700, fontSize: 16, marginTop: 12, fontFamily: "'Nunito', sans-serif" }}>
                          Записей нет
                        </p>
                      </div>
                    )

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {Object.entries(groups).map(([date, apps]) => {
                          const d = dayjs(date)
                          const isToday = date === today
                          const isPast  = date < today
                          return (
                            <div key={date}>
                              {/* Заголовок дня */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <div style={{
                                  fontFamily:"'Nunito',sans-serif", fontWeight: 800, fontSize: 14,
                                  color: isToday ? '#2e7d32' : isPast ? '#94a3b8' : '#1e293b',
                                  background: isToday ? '#e8f5e9' : isPast ? '#f8fafc' : '#f1f5f9',
                                  borderRadius: 8, padding: '4px 12px',
                                  border: isToday ? '1.5px solid #a5d6a7' : '1.5px solid transparent',
                                }}>
                                  {isToday ? '📅 Сегодня' : d.format('dddd')} · {d.format('D MMMM YYYY')}
                                </div>
                                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                                <span style={{ fontFamily:"'Nunito',sans-serif", fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                                  {apps.length} {apps.length === 1 ? 'запись' : apps.length < 5 ? 'записи' : 'записей'}
                                </span>
                              </div>

                              {/* Карточки приёмов */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {apps.map(app => {
                                  const cfg = STATUS_CFG[app.status] || STATUS_CFG.confirmed
                                  const petEmoji = getPetEmoji(app.pet_id)
                                  const petInfo = getPetInfo(app.pet_id)
                                  const clientName = getClientName(app.client_id)
                                  return (
                                    <div key={app.id} style={{
                                      background: '#fff', borderRadius: 14, padding: '12px 16px',
                                      border: `1.5px solid ${cfg.border}`,
                                      borderLeft: `5px solid ${cfg.color}`,
                                      display: 'flex', alignItems: 'center', gap: 14,
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                      opacity: isPast && app.status !== 'completed' ? 0.6 : 1,
                                    }}>
                                      {/* Время */}
                                      <div style={{ textAlign: 'center', minWidth: 48, flexShrink: 0 }}>
                                        <div style={{ fontWeight: 800, fontSize: 17, color: '#2d4a2d', fontFamily: "'Nunito', sans-serif" }}>
                                          {app.time?.slice(0,5) || '—'}
                                        </div>
                                      </div>
                                      <div style={{ width: 1, height: 44, background: '#f0f0f0', flexShrink: 0 }} />
                                      {/* Аватар */}
                                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                                        {petEmoji}
                                      </div>
                                      {/* Инфо */}
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 800, fontSize: 14, color: '#2d4a2d', fontFamily: "'Nunito', sans-serif" }}>{petInfo}</div>
                                        <div style={{ fontSize: 12, color: '#888', fontFamily: "'Nunito', sans-serif", marginTop: 2 }}>
                                          👤 {clientName}{app.notes ? ` · ${app.notes}` : ''}
                                        </div>
                                      </div>
                                      {/* Статус + кнопки */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end', flexShrink: 0 }}>
                                        <span style={{ padding: '2px 9px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.border}`, fontSize: 11, fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>
                                          {cfg.label}
                                        </span>
                                        <div style={{ display: 'flex', gap: 5 }}>
                                          <button onClick={() => handleOpenHistory(app)} style={{ padding: '4px 8px', borderRadius: 7, border: '1.5px solid #64748b', background: 'transparent', color: '#64748b', fontSize: 11, fontWeight: 700, fontFamily: "'Nunito', sans-serif", cursor: 'pointer' }} title="История болезней">📋</button>
                                          {(() => {
                                            const isAppToday = app.date === dayjs().format('YYYY-MM-DD')
                                            return (
                                              <button
                                                onClick={() => isAppToday && handleOpenPrescription(app.id)}
                                                disabled={!isAppToday}
                                                title={isAppToday ? 'Назначения и рецепт' : 'Доступно только в день приёма'}
                                                style={{ padding: '4px 8px', borderRadius: 7, border: `1.5px solid ${isAppToday ? '#7c3aed' : '#e0e0e0'}`, background: isAppToday ? 'transparent' : '#f8fafc', color: isAppToday ? '#7c3aed' : '#cbd5e0', fontSize: 11, fontWeight: 700, fontFamily: "'Nunito', sans-serif", cursor: isAppToday ? 'pointer' : 'not-allowed', opacity: isAppToday ? 1 : 0.6 }}>
                                                💊 Назначения
                                              </button>
                                            )
                                          })()}
                                          {app.status !== 'completed' && app.status !== 'cancelled' && (
                                            <button onClick={() => handleComplete(app.id)} style={{ padding: '4px 10px', borderRadius: 7, border: 'none', background: '#1565c0', color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: "'Nunito', sans-serif", cursor: 'pointer' }}>✓ Завершить</button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()
                )}
              </div>
            </div>
          )}

          {/* ─── ВЕТ: календарь ─── */}
          {isVet && vetTab === 'calendar' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'start', flexWrap: 'wrap' }}>
              <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
                  <DateCalendar value={selectedDate} onChange={setSelectedDate}
                    shouldDisableDate={d => d.day() === 0 || d.day() === 6} />
                </LocalizationProvider>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: '#2d4a2d', margin: 0 }}>
                    Слоты на {selectedDate.format('D MMMM YYYY')}
                  </h3>
                  <button
                    onClick={() => setAddSlotOpen(true)}
                    style={{
                      padding: '8px 18px', borderRadius: 12, border: 'none',
                      background: 'linear-gradient(135deg, #3a7d44, #52a85e)',
                      color: '#fff', fontSize: 13, fontWeight: 700,
                      fontFamily: "'Nunito', sans-serif", cursor: 'pointer',
                      boxShadow: '0 3px 10px rgba(58,125,68,0.25)',
                    }}>
                    + Добавить слот
                  </button>
                </div>

                {slotsForDay.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#aaa' }}>
                    <div style={{ fontSize: 40 }}>🗓️</div>
                    <p style={{ fontWeight: 700, marginTop: 10, fontFamily: "'Nunito', sans-serif" }}>
                      Нет слотов на этот день
                    </p>
                    <p style={{ fontSize: 13, color: '#bbb', fontFamily: "'Nunito', sans-serif" }}>
                      Нажмите «+ Добавить слот» чтобы создать
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: '#aaa', marginBottom: 10, fontFamily: "'Nunito', sans-serif" }}>
                      Свободных: {slotsForDay.filter(s => s.status === 'free').length} · Занятых: {slotsForDay.filter(s => s.status === 'busy').length}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {slotsForDay.map(slot => (
                        <SlotChip key={slot.id} slot={slot} isVet
                          onDelete={() => handleDeleteSlot(slot.id)} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}



          {/* ─── КЛИЕНТ ─── */}
          {!isVet && (
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 28, alignItems: 'start' }}>

              {/* Левая колонка — Календарь + Врач */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 280 }}>
                <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
                    <DateCalendar
                      value={selectedDate}
                      onChange={setSelectedDate}
                      disablePast
                      shouldDisableDate={d => d.day() === 0 || d.day() === 6}
                      slotProps={{
                        day: { datesWithApps },
                      }}
                    />
                  </LocalizationProvider>
                </div>

                {/* Фильтр по врачу */}
                <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#5a7a5a' }}>👨‍⚕️ Выбрать врача</p>
                  <select
                    value={selectedVet}
                    onChange={e => setSelectedVet(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid #e0e0e0', fontSize: 14, fontFamily: "'Nunito', sans-serif", outline: 'none', background: '#fafafa', cursor: 'pointer' }}
                  >
                    <option value="">Все доступные врачи</option>
                    {vets.map(v => <option key={v.id} value={v.id}>{v.full_name}</option>)}
                  </select>
                </div>
              </div>

              {/* Правая колонка */}
              <div>
                {/* Слоты времени */}
                <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 24 }}>
                  <h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: '#2d4a2d', margin: '0 0 16px', fontSize: 16 }}>
                    🕐 Доступное время — {selectedDate.format('D MMMM YYYY')}
                  </h3>
                  {slotsForDay.length === 0 ? (
                    <p style={{ color: '#aaa', fontSize: 14 }}>На этот день нет доступных слотов</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {slotsForDay.map(slot => (
                        <SlotChip key={slot.id} slot={slot} onClick={() => handleSlotClick(slot)} selected={selectedSlot?.id === slot.id} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Мои записи */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: '#2d4a2d', margin: 0 }}>
                    Мои записи
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {activeCount > 0 && (
                      <span style={{ background: '#e8f5e9', color: '#2e7d32', fontWeight: 800, borderRadius: 12, padding: '3px 10px', fontSize: 13 }}>
                        {activeCount} активных
                      </span>
                    )}
                    <select value={clientSort} onChange={e => setClientSort(e.target.value)} style={{ padding: '6px 10px', borderRadius: 10, border: '1.5px solid #e0e0e0', fontSize: 13, fontFamily: "'Nunito', sans-serif", outline: 'none' }}>
                      <option value="date_desc">Сначала новые</option>
                      <option value="date_asc">Сначала ранние</option>
                    </select>
                  </div>
                </div>

                <TabBar tabs={CLIENT_TABS} active={clientFilter} onSelect={setClientFilter} counts={clientCounts} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {filteredAppointments.map(app => (
                    <AppCard key={app.id} app={app} isVet={false}
                      getVetName={getVetName} getClientName={getClientName}
                      getPetInfo={getPetInfo} getPetEmoji={getPetEmoji} getTimeLabel={getTimeLabel}
                      onConfirm={() => {}} onComplete={() => {}}
                      onCancel={() => handleCancel(app.id)}
                      onChat={() => navigate(`/chat?appointment_id=${app.id}`)}
                    />
                  ))}
                  {filteredAppointments.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>
                      <div style={{ fontSize: 48 }}>🐾</div>
                      <p style={{ fontWeight: 700, marginTop: 12 }}>
                        {appointments.length === 0 ? 'У вас пока нет записей' : 'Нет записей по фильтру'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Container>

      {/* ─── Диалог записи — талон на приём ─── */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        PaperProps={{
          style: {
            borderRadius: 20, overflow: 'hidden',
            fontFamily: "'Nunito', sans-serif",
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          }
        }}
      >
        {/* Шапка талона */}
        <div style={{
          background: 'linear-gradient(135deg, #2e7d32, #3a7d44)',
          padding: '20px 24px 16px',
          color: '#fff',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#a5d6a7', textTransform: 'uppercase', marginBottom: 4 }}>
            ГБУ «Ветстанция г. Байконур» 🚀
          </div>
          <div style={{ fontWeight: 800, fontSize: 20, fontFamily: "'Nunito', sans-serif" }}>
            📋 Талон на приём
          </div>
        </div>

        {/* Пунктирная линия отреза */}
        <div style={{
          borderTop: '2px dashed #c8e6c9',
          margin: '0',
          background: '#f7faf7',
          padding: '16px 24px 4px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 13, color: '#888', fontFamily: "'Nunito', sans-serif" }}>✂ ─────────────────────────</span>
        </div>

        <DialogContent style={{ background: '#f7faf7', padding: '4px 24px 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div style={{ background: '#ffebee', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#c62828', fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
                ⚠️ {error}
              </div>
            )}

            {/* Инфо-плашка — дата, время, врач */}
            <div style={{
              background: '#fff',
              border: '1.5px solid #a5d6a7',
              borderRadius: 14,
              padding: '14px 16px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  👨‍⚕️
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#2d4a2d', fontFamily: "'Nunito', sans-serif" }}>
                    {getVetName(selectedSlot?.vet_id)}
                  </div>
                  <div style={{ fontSize: 13, color: '#3a7d44', fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>
                    📅 {selectedSlot?.date && dayjs(selectedSlot.date).format('D MMMM YYYY')} в {selectedSlot?.time?.slice(0, 5)}
                  </div>
                </div>
              </div>
            </div>

            {/* Выбор питомца — кастомный select */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#5a7a5a', fontFamily: "'Nunito', sans-serif" }}>
                Выберите питомца *
              </label>
              <select
                value={form.pet_id}
                onChange={e => setForm({ ...form, pet_id: e.target.value })}
                style={{
                  padding: '12px 14px', borderRadius: 12,
                  border: '1.5px solid #e0e0e0', fontSize: 14,
                  fontFamily: "'Nunito', sans-serif", outline: 'none',
                  background: '#fff', cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  paddingRight: 36,
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = '#3a7d44'; e.target.style.boxShadow = '0 0 0 3px rgba(58,125,68,0.12)' }}
                onBlur={e => { e.target.style.borderColor = '#e0e0e0'; e.target.style.boxShadow = 'none' }}
              >
                <option value="">— выберите питомца —</option>
                {pets.length === 0
                  ? <option disabled>Сначала добавьте питомца</option>
                  : pets.map(p => <option key={p.id} value={p.id}>{SPECIES_EMOJI[p.species] || '🐾'} {p.name}</option>)
                }
              </select>
            </div>

            {/* Причина обращения */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#5a7a5a', fontFamily: "'Nunito', sans-serif" }}>
                Причина обращения
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Опишите жалобы или цель визита (например: плановая прививка, осмотр, лечение)"
                rows={3}
                style={{
                  padding: '12px 14px', borderRadius: 12,
                  border: '1.5px solid #e0e0e0', fontSize: 14,
                  fontFamily: "'Nunito', sans-serif", outline: 'none',
                  background: '#fff', resize: 'vertical', lineHeight: 1.6,
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = '#3a7d44'; e.target.style.boxShadow = '0 0 0 3px rgba(58,125,68,0.12)' }}
                onBlur={e => { e.target.style.borderColor = '#e0e0e0'; e.target.style.boxShadow = 'none' }}
              />
            </div>
          </div>
        </DialogContent>

        {/* Нижняя часть талона */}
        <div style={{
          background: '#f7faf7',
          borderTop: '2px dashed #c8e6c9',
          padding: '14px 24px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 11, color: '#bbb', fontFamily: "'Nunito', sans-serif" }}>
            🐾 ветстанция-байконур.рф
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setOpen(false); setSelectedSlot(null) }}
              style={{
                padding: '10px 20px', borderRadius: 12,
                border: '1.5px solid #ddd', background: '#fff',
                color: '#888', fontSize: 14, fontWeight: 700,
                fontFamily: "'Nunito', sans-serif", cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5'; e.currentTarget.style.borderColor = '#bbb' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#ddd' }}
            >
              Отмена
            </button>
            <button
              onClick={handleCreate}
              style={{
                padding: '10px 24px', borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #3a7d44, #52a85e)',
                color: '#fff', fontSize: 14, fontWeight: 800,
                fontFamily: "'Nunito', sans-serif", cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(58,125,68,0.35)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(58,125,68,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(58,125,68,0.35)' }}
            >
              ✓ Записаться
            </button>
          </div>
        </div>
      </Dialog>

      {/* ─── Диалог подтверждения/отклонения врача ─── */}
      {msgOpen && (() => {
        const isConfirm = msgAction?.type === 'confirm'
        const app = [...appointments].find(a => a.id === msgAction?.id)
        const petInfo = app ? getPetInfo(app.pet_id) : ''
        const petEmoji = app ? getPetEmoji(app.pet_id) : '🐾'
        const dateStr = app ? `${dayjs(app.date).format('D MMMM YYYY')} в ${app.time?.slice(0,5)}` : ''

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => setMsgOpen(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: '#fff', borderRadius: 20, padding: '32px 32px 24px',
              width: '100%', maxWidth: 480,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              fontFamily: "'Nunito', sans-serif",
            }}>
              {/* Заголовок */}
              <h2 style={{ fontWeight: 800, fontSize: 20, color: isConfirm ? '#2d4a2d' : '#c62828', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 26 }}>{isConfirm ? '✅' : '❌'}</span>
                {isConfirm ? 'Подтвердить запись' : 'Отклонить запись'}
              </h2>

              {/* Инфо о пациенте */}
              {app && (
                <div style={{
                  background: isConfirm ? '#e8f5e9' : '#ffebee',
                  border: `1.5px solid ${isConfirm ? '#a5d6a7' : '#ffcdd2'}`,
                  borderRadius: 14, padding: '12px 16px', marginBottom: 18,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                    {petEmoji}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#2d4a2d' }}>{petInfo}</div>
                    <div style={{ fontSize: 13, color: '#666', fontWeight: 600 }}>📅 {dateStr}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>👤 {getClientName(app.client_id)}</div>
                  </div>
                </div>
              )}

              {/* Поле сообщения */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#5a7a5a', display: 'block', marginBottom: 8 }}>
                  Сообщение владельцу:
                </label>
                <textarea
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  rows={3}
                  placeholder={isConfirm
                    ? 'Можно добавить рекомендации: «Не кормить за 4 часа до приёма»...'
                    : 'Укажите причину отмены...'}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12,
                    border: '1.5px solid #e0e0e0', fontSize: 14,
                    fontFamily: "'Nunito', sans-serif", outline: 'none',
                    resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = isConfirm ? '#3a7d44' : '#e53935'}
                  onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>

              {/* Кнопки */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => setMsgOpen(false)} style={{
                  padding: '10px 22px', borderRadius: 12,
                  border: '1.5px solid #ddd', background: '#fff',
                  color: '#999', fontSize: 14, fontWeight: 700,
                  fontFamily: "'Nunito', sans-serif", cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5'; e.currentTarget.style.borderColor = '#bbb' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#ddd' }}
                >
                  Отмена
                </button>
                <button onClick={handleSendMessage} style={{
                  padding: '12px 28px', borderRadius: 12, border: 'none',
                  background: isConfirm ? 'linear-gradient(135deg, #3a7d44, #52a85e)' : '#e53935',
                  color: '#fff', fontSize: 15, fontWeight: 800,
                  fontFamily: "'Nunito', sans-serif", cursor: 'pointer',
                  boxShadow: isConfirm ? '0 4px 16px rgba(58,125,68,0.35)' : '0 4px 16px rgba(229,57,53,0.35)',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = isConfirm ? '0 8px 20px rgba(58,125,68,0.4)' : '0 8px 20px rgba(229,57,53,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isConfirm ? '0 4px 16px rgba(58,125,68,0.35)' : '0 4px 16px rgba(229,57,53,0.35)' }}
                >
                  {isConfirm ? '✓ Подтвердить' : '✗ Отклонить'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ─── Диалог завершения приёма с рецептом ─── */}
      {(completeOpen || prescriptionOpen) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => { setCompleteOpen(false); setPrescriptionOpen(false) }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 920, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', fontFamily: "'Nunito', sans-serif" }}>
            <div style={{ padding: '20px 28px', borderBottom: '1px solid #f0f0f0' }}>
              <h2 style={{ fontWeight: 800, fontSize: 19, color: '#2d4a2d', margin: '0 0 4px' }}>💊 Назначения и рецепт</h2>
              <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>Заполните рецепт — он будет отправлен владельцу на email</p>
            </div>
            <div style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

              {/* Левая колонка */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#5a7a5a', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 }}>📝 Анамнез и жалобы</label>
                  <textarea value={prescription.anamnesis} onChange={e => setPrescription({...prescription, anamnesis: e.target.value})}
                    placeholder="Рвота после корма, вялость 2 дня, температура 39.1..."
                    rows={3}
                    style={{ width: '100%', padding: '9px 13px', borderRadius: 10, border: '1.5px solid #e0e0e0', fontSize: 13, fontFamily: "'Nunito', sans-serif", outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#5a7a5a', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 }}>🩺 Диагноз / заключение</label>
                  <input value={prescription.diagnosis} onChange={e => setPrescription({...prescription, diagnosis: e.target.value})}
                    placeholder="Например: профилактический осмотр, ОРВИ..."
                    style={{ width: '100%', padding: '9px 13px', borderRadius: 10, border: '1.5px solid #e0e0e0', fontSize: 13, fontFamily: "'Nunito', sans-serif", outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <DrugSelector value={prescription.medications} onChange={v => setPrescription({...prescription, medications: v})} />
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#5a7a5a', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 }}>📋 Рекомендации по уходу</label>
                  <textarea value={prescription.recommendations} onChange={e => setPrescription({...prescription, recommendations: e.target.value})}
                    placeholder="Ограничить активность, не купать..." rows={3}
                    style={{ width: '100%', padding: '9px 13px', borderRadius: 10, border: '1.5px solid #e0e0e0', fontSize: 13, fontFamily: "'Nunito', sans-serif", outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#5a7a5a', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 }}>📝 Дополнительные заметки</label>
                  <input value={prescription.notes} onChange={e => setPrescription({...prescription, notes: e.target.value})}
                    placeholder="Следующий осмотр через 2 недели..."
                    style={{ width: '100%', padding: '9px 13px', borderRadius: 10, border: '1.5px solid #e0e0e0', fontSize: 13, fontFamily: "'Nunito', sans-serif", outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ background: '#e8f5e9', borderRadius: 10, padding: '9px 13px', fontSize: 12, color: '#2e7d32' }}>
                  📧 Рецепт будет отправлен на email владельца
                </div>
              </div>

              {/* Правая колонка — планирование процедуры */}
              <div>
                <div style={{ border: `2px solid ${plannedProc.enabled ? '#1565c0' : '#e0e0e0'}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                  <div onClick={() => setPlannedProc({...plannedProc, enabled: !plannedProc.enabled})}
                    style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: plannedProc.enabled ? '#e3f2fd' : '#f8fafc', userSelect: 'none' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${plannedProc.enabled ? '#1565c0' : '#ccc'}`, background: plannedProc.enabled ? '#1565c0' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {plannedProc.enabled && <span style={{ color: '#fff', fontSize: 13 }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: plannedProc.enabled ? '#1565c0' : '#475569' }}>📅 Запланировать операцию / процедуру</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Автоматически добавит запись в расписание</div>
                    </div>
                  </div>
                  {plannedProc.enabled && (
                    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #e3f2fd' }}>
                      <div>
                        <label style={{ fontFamily:"'Nunito',sans-serif", fontSize: 11, fontWeight: 700, color: '#5a7a5a', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>Тип</label>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {PROC_TYPES.map(t => (
                            <button key={t.value} onClick={() => setPlannedProc({...plannedProc, type: t.value})}
                              style={{ fontFamily:"'Nunito',sans-serif", padding: '4px 8px', borderRadius: 7, border: `2px solid ${plannedProc.type === t.value ? '#1565c0' : '#e0e0e0'}`, background: plannedProc.type === t.value ? t.color : '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: plannedProc.type === t.value ? '#1565c0' : '#64748b' }}>
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontFamily:"'Nunito',sans-serif", fontSize: 11, fontWeight: 700, color: '#5a7a5a', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>Врач-исполнитель</label>
                        <select value={plannedProc.vet_id || (appointments.find(a=>a.id===completeAppId)?.vet_id || '')}
                          onChange={e => { setPlannedProc({...plannedProc, vet_id: Number(e.target.value)}); if (plannedProc.date) loadBusySlots(plannedProc.date, Number(e.target.value)) }}
                          style={{ fontFamily:"'Nunito',sans-serif", width:'100%', padding:'7px 10px', borderRadius:8, border:'1.5px solid #e0e0e0', fontSize:12, outline:'none', boxSizing:'border-box' }}>
                          {vets.map(v => <option key={v.id} value={v.id}>{v.full_name}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <label style={{ fontFamily:"'Nunito',sans-serif", fontSize: 11, fontWeight: 700, color: '#5a7a5a', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>Дата</label>
                          <input type="date" value={plannedProc.date} min={new Date().toISOString().split('T')[0]}
                            onChange={e => { const vetId = plannedProc.vet_id || appointments.find(a=>a.id===completeAppId)?.vet_id; setPlannedProc({...plannedProc, date: e.target.value, time: '09:00'}); loadBusySlots(e.target.value, vetId) }}
                            style={{ fontFamily:"'Nunito',sans-serif", width:'100%', padding:'7px 10px', borderRadius:8, border:'1.5px solid #e0e0e0', fontSize:12, outline:'none', boxSizing:'border-box' }} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={{ fontFamily:"'Nunito',sans-serif", fontSize: 11, fontWeight: 700, color: '#5a7a5a', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>Услуга из прейскуранта</label>
                          <select value={plannedProc.note} onChange={e => setPlannedProc({...plannedProc, note: e.target.value})}
                            style={{ fontFamily:"'Nunito',sans-serif", width:'100%', padding:'7px 10px', borderRadius:8, border:'1.5px solid #e0e0e0', fontSize:12, outline:'none', boxSizing:'border-box', cursor:'pointer', marginBottom: 6 }}>
                            <option value="">— выберите услугу из прейскуранта —</option>
                            {VET_GROUPS.map(([group, names]) => (
                              <optgroup key={group} label={group}>
                                {names.map(n => <option key={n} value={n}>{n}</option>)}
                              </optgroup>
                            ))}
                          </select>
                          <input value={plannedProc.noteExtra || ''} onChange={e => setPlannedProc({...plannedProc, noteExtra: e.target.value})}
                            placeholder="Уточнение (необязательно)..."
                            style={{ fontFamily:"'Nunito',sans-serif", width:'100%', padding:'7px 10px', borderRadius:8, border:'1.5px solid #e0e0e0', fontSize:12, outline:'none', boxSizing:'border-box' }} />
                        </div>
                      </div>
                      {allSlotsBusy && plannedProc.date && (
                        <div style={{ background:'#fff3e0', border:'1.5px solid #ffb74d', borderRadius:8, padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:12, color:'#e65100' }}>⚠ На этот день нет свободного времени</div>
                          <button onClick={() => findNextFreeDay(plannedProc.date, plannedProc.vet_id || appointments.find(a=>a.id===completeAppId)?.vet_id)}
                            style={{ fontFamily:"'Nunito',sans-serif", padding:'4px 10px', borderRadius:7, border:'none', background:'#e65100', color:'#fff', fontSize:11, fontWeight:800, cursor:'pointer' }}>
                            📅 Найти день
                          </button>
                        </div>
                      )}
                      <div>
                        <label style={{ fontFamily:"'Nunito',sans-serif", fontSize: 11, fontWeight: 700, color: '#5a7a5a', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>Время</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 3 }}>
                          {ALL_TIMES.map(t => { const busy = busySlots.includes(t); const selected = plannedProc.time === t; return (
                            <button key={t} disabled={busy} onClick={() => !busy && setPlannedProc({...plannedProc, time: t})}
                              style={{ fontFamily:"'Nunito',sans-serif", padding:'4px 2px', borderRadius:5, fontSize:10, fontWeight:700, cursor:busy?'not-allowed':'pointer', border:selected?'2px solid #1565c0':'1px solid #e0e0e0', background:busy?'#f1f5f9':selected?'#dbeafe':'#fff', color:busy?'#cbd5e1':selected?'#1565c0':'#374151', textDecoration:busy?'line-through':'none' }}>
                              {t}
                            </button>
                          )})}
                        </div>
                      </div>
                      {plannedProc.date && !allSlotsBusy && (
                        <div style={{ background:'#dbeafe', borderRadius:8, padding:'7px 10px', fontSize:11, color:'#1e40af', fontFamily:"'Nunito',sans-serif", fontWeight:600 }}>
                          📅 {PROC_TYPES.find(t=>t.value===plannedProc.type)?.label} — {new Date(plannedProc.date).toLocaleDateString('ru')} в {plannedProc.time}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 28px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => { setCompleteOpen(false); setPrescriptionOpen(false) }} style={{ padding: '10px 20px', borderRadius: 12, border: '1.5px solid #e0e0e0', background: '#fff', color: '#999', fontSize: 14, fontWeight: 700, fontFamily: "'Nunito', sans-serif", cursor: 'pointer' }}>Отмена</button>
              <button onClick={handleCompleteSubmit} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#1565c0,#1e88e5)', color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: "'Nunito', sans-serif", cursor: 'pointer', boxShadow: '0 4px 14px rgba(21,101,192,0.3)' }}>
                ✓ Завершить приём и внести в паспорт
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Модал: История болезней питомца ── */}

      {/* ── Модал: Добавить слот ── */}
      {addSlotOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:1300, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setAddSlotOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:20, padding:'28px 30px 24px', width:'100%', maxWidth:380, boxShadow:'0 20px 60px rgba(0,0,0,0.18)', fontFamily:"'Nunito',sans-serif" }}>
            <h3 style={{ fontWeight:800, fontSize:18, color:'#2d4a2d', margin:'0 0 6px' }}>🕐 Добавить слот</h3>
            <p style={{ fontSize:13, color:'#aaa', margin:'0 0 20px' }}>{selectedDate.format('D MMMM YYYY')}</p>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#5a7a5a', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.8 }}>Время</label>
                <input type="time" value={newSlotTime} onChange={e => setNewSlotTime(e.target.value)}
                  style={{ width:'100%', padding:'11px 14px', borderRadius:12, border:'1.5px solid #e0e0e0', fontSize:15, fontFamily:"'Nunito',sans-serif", outline:'none', boxSizing:'border-box' }} />
              </div>
              <div>
                <p style={{ fontSize:12, color:'#aaa', margin:'0 0 8px' }}>Быстрый выбор:</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {['09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','14:00','15:00','15:30','16:00','16:30','17:00','17:30'].map(t => (
                    <button key={t} onClick={() => setNewSlotTime(t)} style={{ padding:'4px 10px', borderRadius:20, border:`1.5px solid ${newSlotTime===t?'#3a7d44':'#e0e0e0'}`, background:newSlotTime===t?'#3a7d44':'#fff', color:newSlotTime===t?'#fff':'#666', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
            {addSlotError && <div style={{ background:'#ffebee', borderRadius:10, padding:'8px 12px', marginTop:14, fontSize:13, color:'#c62828' }}>⚠️ {addSlotError}</div>}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:22 }}>
              <button onClick={() => { setAddSlotOpen(false); setNewSlotTime(''); setAddSlotError('') }} style={{ padding:'10px 20px', borderRadius:12, border:'1.5px solid #e0e0e0', background:'#fff', color:'#999', fontSize:14, fontWeight:700, fontFamily:"'Nunito',sans-serif", cursor:'pointer' }}>Отмена</button>
              <button onClick={handleAddSlot} style={{ padding:'10px 22px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#3a7d44,#52a85e)', color:'#fff', fontSize:14, fontWeight:800, fontFamily:"'Nunito',sans-serif", cursor:'pointer', boxShadow:'0 4px 14px rgba(58,125,68,0.3)' }}>Создать слот</button>
            </div>
          </div>
        </div>
      )}

      {historyOpen && historyPet && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', zIndex:1400, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setHistoryOpen(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:760, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.3)', fontFamily:"'Nunito',sans-serif" }}>
            <div style={{ padding:'16px 24px', borderBottom:'1px solid #e2e8f0', background:'#1e293b', borderRadius:'20px 20px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:800, fontSize:16, color:'#fff' }}>📋 История болезней — {historyPet.pet_name}</div>
                <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>Медицинская карта питомца</div>
              </div>
              <button onClick={() => setHistoryOpen(false)} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:24, cursor:'pointer', lineHeight:1 }}>×</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'16px 24px' }}>
              {petPassportData?.vaccinations?.length > 0 && (
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontWeight:800, fontSize:13, color:'#1e293b', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>💉 Вакцинации</div>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead><tr style={{ background:'#f8fafc' }}>{['Дата','Вакцина','Производитель','Действ. до','Врач'].map(h=><th key={h} style={{ padding:'6px 10px', textAlign:'left', fontWeight:700, color:'#64748b', fontSize:11, textTransform:'uppercase' }}>{h}</th>)}</tr></thead>
                    <tbody>{petPassportData.vaccinations.map((v,i)=>(<tr key={i} style={{ borderTop:'1px solid #f1f5f9', background:i%2===0?'#fff':'#f8fafc' }}><td style={{ padding:'6px 10px' }}>{v.date_given||'—'}</td><td style={{ padding:'6px 10px', fontWeight:600 }}>{v.vaccine_name||'—'}</td><td style={{ padding:'6px 10px', color:'#64748b' }}>{v.manufacturer||'—'}</td><td style={{ padding:'6px 10px', color:'#2e7d32', fontWeight:700 }}>{v.next_due_date||'—'}</td><td style={{ padding:'6px 10px', color:'#64748b' }}>{v.vet_name||'—'}</td></tr>))}</tbody>
                  </table>
                </div>
              )}
              {(petPassportData?.procedures||[]).filter(p=>['ecto_parasite','deworming'].includes(p.type)).length > 0 && (
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontWeight:800, fontSize:13, color:'#1e293b', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>🦟 Обработки от паразитов</div>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead><tr style={{ background:'#f8fafc' }}>{['Дата','Тип','Препарат','Врач'].map(h=><th key={h} style={{ padding:'6px 10px', textAlign:'left', fontWeight:700, color:'#64748b', fontSize:11, textTransform:'uppercase' }}>{h}</th>)}</tr></thead>
                    <tbody>{(petPassportData.procedures||[]).filter(p=>['ecto_parasite','deworming'].includes(p.type)).map((p,i)=>(<tr key={i} style={{ borderTop:'1px solid #f1f5f9', background:i%2===0?'#fff':'#f8fafc' }}><td style={{ padding:'6px 10px' }}>{p.date||'—'}</td><td style={{ padding:'6px 10px' }}>{p.type==='ecto_parasite'?'Эктопаразиты':'Дегельминтизация'}</td><td style={{ padding:'6px 10px', fontWeight:600 }}>{p.drug_name||'—'}</td><td style={{ padding:'6px 10px', color:'#64748b' }}>{p.vet_name||'—'}</td></tr>))}</tbody>
                  </table>
                </div>
              )}
              {petLabOrders.length > 0 && (
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontWeight:800, fontSize:13, color:'#1e293b', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>🔬 Анализы</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {petLabOrders.map(o => (
                      <div key={o.id} style={{ border:'1px solid #86efac', borderRadius:8, padding:'8px 12px', background:'#f0fdf4', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ fontWeight:800, fontSize:12, color:'#166534', marginBottom:2 }}>
                            {o.order_number}
                            <span style={{ marginLeft:8, background:'#166534', color:'#fff', borderRadius:4, padding:'1px 7px', fontSize:10 }}>Готово</span>
                          </div>
                          <div style={{ fontSize:11, color:'#475569' }}>{(o.services||[]).join(' · ')}</div>
                          <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>{o.scheduled_date || o.created_at?.split('T')[0]}</div>
                        </div>
                        <button onClick={() => setLabDetailOrder(o)}
                          style={{ fontFamily:"'Nunito',sans-serif", padding:'5px 12px', borderRadius:7, border:'1px solid #86efac', background:'#fff', color:'#166534', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                          Подробнее
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontWeight:800, fontSize:13, color:'#1e293b', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>🏥 История приёмов</div>
                {petMedHistory.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'24px', color:'#94a3b8', fontSize:13 }}>История болезней пуста</div>
                ) : petMedHistory.map((r,i) => (
                  <div key={i} style={{ border:'1px solid #e2e8f0', borderRadius:10, padding:'12px 14px', marginBottom:10, background:i===0?'#f0fdf4':'#fff' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:'#1e293b' }}>{r.visit_date ? new Date(r.visit_date).toLocaleDateString('ru',{day:'numeric',month:'long',year:'numeric'}) : '—'}</div>
                      <div style={{ fontSize:11, color:'#64748b' }}>🩺 {r.vet_name}</div>
                    </div>
                    {r.diagnosis && <div style={{ fontSize:13, color:'#166534', fontWeight:600, marginBottom:4 }}>Диагноз: {r.diagnosis}</div>}
                    {r.medications && <div style={{ fontSize:12, color:'#1e40af', marginBottom:3 }}>💊 {r.medications}</div>}
                    {r.recommendations && <div style={{ fontSize:12, color:'#92400e' }}>📋 {r.recommendations}</div>}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding:'12px 24px', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <button onClick={() => { setHistoryOpen(false); navigate(`/pets/${historyPet.pet_id}/passport`) }} style={{ fontFamily:"'Nunito',sans-serif", padding:'8px 16px', borderRadius:10, border:'1.5px solid #1e293b', background:'transparent', color:'#1e293b', fontSize:13, fontWeight:700, cursor:'pointer' }}>📄 Открыть полный паспорт</button>
              <button onClick={() => setHistoryOpen(false)} style={{ fontFamily:"'Nunito',sans-serif", padding:'8px 16px', borderRadius:10, border:'none', background:'#1e293b', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Модал: детальный результат анализа ── */}
      {labDetailOrder && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setLabDetailOrder(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:680, maxHeight:'85vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', fontFamily:"'Nunito',sans-serif" }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#1e293b' }}>
              <div>
                <div style={{ fontWeight:800, fontSize:16, color:'#fff' }}>🔬 {labDetailOrder.order_number}</div>
                <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>{labDetailOrder.pet_name} · {(labDetailOrder.services||[]).join(', ')}</div>
              </div>
              <button onClick={() => setLabDetailOrder(null)} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:'#94a3b8' }}>×</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
              {labDetailOrder.results && Object.keys(labDetailOrder.results).length > 0
                ? Object.entries(labDetailOrder.results).map(([svc, res]) => {
                    const type = res?.type || 'generic'
                    const flagColor = f => f==='H'?'#dc2626':f==='L'?'#2563eb':'#166634'
                    const flagBg    = f => f==='H'?'#fef2f2':f==='L'?'#eff6ff':'#f0fdf4'
                    const ParamTable = ({ rows }) => (
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                        <thead><tr style={{ background:'#f8fafc' }}>
                          {['Параметр','Результат','Ед. изм.','Реф. норма','Флаг'].map(h => (
                            <th key={h} style={{ padding:'6px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {rows.map(([param, r], i) => (
                            <tr key={param} style={{ borderBottom:'1px solid #f1f5f9', background:i%2===0?'#fff':'#f8fafc' }}>
                              <td style={{ padding:'7px 10px', fontWeight:600, color:'#334155' }}>{param}</td>
                              <td style={{ padding:'7px 10px', fontWeight:800, color:flagColor(r?.flag) }}>{r?.value||'—'}</td>
                              <td style={{ padding:'7px 10px', color:'#64748b', fontSize:11 }}>{r?.unit||'—'}</td>
                              <td style={{ padding:'7px 10px', color:'#94a3b8', fontSize:11 }}>{r?.ref||'—'}</td>
                              <td style={{ padding:'7px 10px' }}>
                                {r?.flag
                                  ? <span style={{ background:flagBg(r.flag), color:flagColor(r.flag), padding:'2px 7px', borderRadius:4, fontSize:10, fontWeight:700 }}>{r.flag}</span>
                                  : <span style={{ color:'#94a3b8', fontSize:10 }}>норма</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                    return (
                      <div key={svc} style={{ marginBottom:14, border:'1px solid #e2e8f0', borderRadius:10, overflow:'hidden' }}>
                        <div style={{ background:'#1e293b', padding:'8px 14px' }}>
                          <span style={{ color:'#fff', fontWeight:800, fontSize:12 }}>🧪 {svc}</span>
                        </div>
                        {(type==='oak'||type==='biohim') && res.params && (
                          <>
                            <ParamTable rows={Object.entries(res.params)} />
                            {type==='oak' && res.leiko && Object.values(res.leiko).some(v=>v) && (
                              <div style={{ borderTop:'1px solid #e2e8f0', padding:'8px 12px', background:'#f8fafc' }}>
                                <div style={{ fontSize:10, fontWeight:700, color:'#64748b', marginBottom:5, textTransform:'uppercase' }}>Лейкоцитарная формула (%)</div>
                                <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:11 }}>
                                  {[['baso','Баз'],['eozino','Эоз'],['neut_m','Нейтр(М)'],['neut_yu','Нейтр(Ю)'],['neut_p','Нейтр(П)'],['neut_s','Нейтр(С)'],['limfo','Лимф'],['mono','Моно']].map(([k,l]) =>
                                    res.leiko[k] ? <span key={k}><span style={{color:'#64748b'}}>{l}:</span> <b>{res.leiko[k]}</b></span> : null
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        {(type==='mocha'||type==='mocha_express'||type==='mocha_special') && res.params && (
                          <>
                            <ParamTable rows={Object.entries(res.params).map(([k,v])=>[k,{value:v?.value,unit:v?.unit||'',ref:v?.ref||'',flag:''}])} />
                            {type==='mocha' && res.osadok && Object.values(res.osadok).some(v=>v) && (
                              <div style={{ borderTop:'1px solid #e2e8f0', padding:'8px 12px', background:'#f8fafc' }}>
                                <div style={{ fontSize:10, fontWeight:700, color:'#64748b', marginBottom:5, textTransform:'uppercase' }}>Микроскопия осадка</div>
                                <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:11 }}>
                                  {Object.entries(res.osadok).map(([k,v]) => v ? <span key={k}><span style={{color:'#64748b'}}>{k}:</span> <b>{v}</b></span> : null)}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        {type==='knotta' && <div style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:res.value?.includes('не обнаружены')?'#166534':'#dc2626' }}>{res.value||'—'}</div>}
                        {type==='serology' && res.items && (
                          <div style={{ padding:'8px 12px' }}>
                            {Object.entries(res.items).map(([inf,val],i) => (
                              <div key={inf} style={{ display:'flex', justifyContent:'space-between', padding:'5px 8px', background:i%2===0?'#fff':'#f8fafc', borderRadius:4, marginBottom:2 }}>
                                <span style={{ fontSize:11, color:'#334155' }}>{inf}</span>
                                <span style={{ fontWeight:700, fontSize:11, color:val==='Положительно'?'#dc2626':val==='Отрицательно'?'#166534':'#92400e' }}>{val||'—'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {type==='plt' && <div style={{ padding:'10px 14px', fontSize:12 }}><span style={{color:'#334155'}}>PLT: </span><span style={{ fontWeight:700 }}>{res.value||'—'} 10⁹/л</span>{res.aggregates&&<span style={{color:'#64748b',marginLeft:10}}>Агрегаты: {res.aggregates}</span>}</div>}
                        {type==='feces_para' && (
                          <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:5, fontSize:12 }}>
                            <div><span style={{color:'#64748b'}}>Яйца гельминтов: </span><b style={{color:res.helminth?.includes('Обнаружены')?'#dc2626':'#166534'}}>{res.helminth||'—'}</b>{res.helminth_name&&<span style={{color:'#dc2626',marginLeft:5}}>({res.helminth_name})</span>}</div>
                            <div><span style={{color:'#64748b'}}>Простейшие: </span><b style={{color:res.protozoa?.includes('Обнаружены')?'#dc2626':'#166534'}}>{res.protozoa||'—'}</b></div>
                          </div>
                        )}
                        {type==='scrap' && (
                          <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:5, fontSize:12 }}>
                            <div><span style={{color:'#64748b'}}>Эктопаразиты: </span><b style={{color:res.ectoparasites?.includes('Не обнаружены')?'#166534':'#dc2626'}}>{res.ectoparasites||'—'}</b></div>
                            <div><span style={{color:'#64748b'}}>Грибы: </span><b style={{color:res.fungi?.includes('Не обнаружены')?'#166534':'#dc2626'}}>{res.fungi||'—'}</b></div>
                          </div>
                        )}
                        {type==='wood' && (
                          <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:5, fontSize:12 }}>
                            <div><span style={{color:'#64748b'}}>Свечение: </span><b style={{color:res.glow?.includes('Отрицательное')?'#166534':'#dc2626'}}>{res.glow||'—'}</b></div>
                            {res.location&&<div><span style={{color:'#64748b'}}>Локализация: </span><b>{res.location}</b></div>}
                          </div>
                        )}
                        {type==='vagina' && (
                          <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:5, fontSize:12 }}>
                            <div><span style={{color:'#64748b'}}>Микрофлора: </span><b>{res.flora||'—'}</b></div>
                            <div><span style={{color:'#64748b'}}>Цитология: </span><b>{res.cytology||'—'}</b></div>
                          </div>
                        )}
                        {type==='kopro' && (
                          <div style={{ padding:'10px 14px' }}>
                            <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:11, marginBottom:8 }}>
                              {res.params&&Object.entries(res.params).map(([k,v])=>v?<span key={k}><span style={{color:'#64748b'}}>{k}: </span><b>{v}</b></span>:null)}
                            </div>
                            {res.digest&&<table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}><tbody>{Object.entries(res.digest).map(([k,v],i)=>(<tr key={k} style={{ borderTop:'1px solid #f1f5f9', background:i%2===0?'#fff':'#f8fafc' }}><td style={{ padding:'5px 10px', color:'#334155' }}>{k}</td><td style={{ padding:'5px 10px', fontWeight:600, color:v==='не обнаружено'?'#166534':'#dc2626' }}>{v}</td></tr>))}</tbody></table>}
                          </div>
                        )}
                        {type==='punkt' && (
                          <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:5, fontSize:12 }}>
                            {res.props&&Object.entries(res.props).map(([k,v])=>v?<div key={k}><span style={{color:'#64748b'}}>{k}: </span><b>{v}</b></div>:null)}
                            {res.punkt_type&&<div><span style={{color:'#64748b'}}>Тип выпота: </span><b>{res.punkt_type}</b></div>}
                            {res.microscopy&&<div style={{ background:'#f8fafc', padding:'7px 10px', borderRadius:6, marginTop:4, lineHeight:1.5 }}><span style={{color:'#64748b'}}>Микроскопия: </span>{res.microscopy}</div>}
                          </div>
                        )}
                        {(type==='generic'||!type) && (
                          <div style={{ padding:'10px 14px', fontSize:12 }}>
                            <span style={{ fontWeight:700 }}>{res?.value||'—'}</span>
                            {res?.unit&&<span style={{color:'#64748b',marginLeft:6}}>{res.unit}</span>}
                            {res?.ref&&<span style={{color:'#94a3b8',marginLeft:8,fontSize:10}}>реф: {res.ref}</span>}
                          </div>
                        )}
                      </div>
                    )
                  })
                : <div style={{ textAlign:'center', padding:'32px 0', color:'#94a3b8' }}>Результаты не найдены</div>
              }
              {labDetailOrder.lab_notes && (
                <div style={{ marginTop:8, background:'#f8fafc', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#475569' }}>
                  <span style={{ fontWeight:700 }}>Примечание лаборанта:</span> {labDetailOrder.lab_notes}
                </div>
              )}
            </div>
            <div style={{ padding:'12px 20px', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'flex-end' }}>
              <button onClick={() => setLabDetailOrder(null)}
                style={{ fontFamily:"'Nunito',sans-serif", padding:'8px 20px', borderRadius:10, border:'none', background:'#1e293b', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Чип слота времени ────────────────────────────────────────────────────────

function SlotChip({ slot, onClick, selected, isVet, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const isFree = slot.status === 'free'
  const label = slot.time.slice(0, 5)

  const bg = selected ? '#3a7d44'
    : hovered && isFree ? '#e8f5e9'
    : isFree ? '#fff'
    : slot.status === 'busy' ? '#fff8e1'
    : '#f5f5f5'

  const border = selected ? '#3a7d44'
    : isFree ? '#3a7d44'
    : slot.status === 'busy' ? '#ff9800'
    : '#ccc'

  const color = selected ? '#fff'
    : isFree ? '#3a7d44'
    : slot.status === 'busy' ? '#e65100'
    : '#aaa'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button
        onClick={isFree ? onClick : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          padding: '7px 14px', borderRadius: 20,
          border: `1.5px solid ${border}`,
          background: bg, color,
          fontSize: 14, fontWeight: 700,
          fontFamily: "'Nunito', sans-serif",
          cursor: isFree ? 'pointer' : 'default',
          transition: 'all 0.15s',
        }}
      >
        {label}
      </button>
      {isVet && isFree && (
        <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#e57373', cursor: 'pointer', fontSize: 14, padding: '0 2px' }} title="Удалить слот">×</button>
      )}
    </div>
  )
}
