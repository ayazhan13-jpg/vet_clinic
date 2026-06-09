import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

// Эмодзи и цвета для каждого вида
const SPECIES_CONFIG = {
  cat:     { emoji: '🐱', color: '#f3e5f5', accent: '#ab47bc', label: 'Кошка' },
  dog:     { emoji: '🐶', color: '#e3f2fd', accent: '#1e88e5', label: 'Собака' },
  rabbit:  { emoji: '🐰', color: '#fce4ec', accent: '#e91e63', label: 'Кролик' },
  bird:    { emoji: '🐦', color: '#e8f5e9', accent: '#43a047', label: 'Птица' },
  hamster: { emoji: '🐹', color: '#fff8e1', accent: '#fb8c00', label: 'Хомяк' },
  other:   { emoji: '🐾', color: '#f5f5f5', accent: '#757575', label: 'Другое' },
}

function getAge(birthDate) {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const now = new Date()
  const years = now.getFullYear() - birth.getFullYear()
  const months = now.getMonth() - birth.getMonth()
  const totalMonths = years * 12 + months
  if (totalMonths < 1) return 'меньше месяца'
  if (totalMonths < 12) return `${totalMonths} мес.`
  const y = Math.floor(totalMonths / 12)
  const m = totalMonths % 12
  if (m === 0) return `${y} л.`
  return `${y} л. ${m} мес.`
}

function PetCard({ pet, onEdit, onDelete, onPassport }) {
  const cfg = SPECIES_CONFIG[pet.species] || SPECIES_CONFIG.other
  const age = getAge(pet.birth_date)
  const genderIcon = pet.gender === 'male' ? '♂' : pet.gender === 'female' ? '♀' : ''
  const genderColor = pet.gender === 'male' ? '#1e88e5' : pet.gender === 'female' ? '#e91e63' : '#999'

  return (
    <div style={{
      background: '#fff',
      borderRadius: 20,
      boxShadow: '0 2px 16px rgba(0,0,0,0.09)',
      overflow: 'hidden',
      transition: 'transform 0.18s, box-shadow 0.18s',
      cursor: 'default',
      display: 'flex',
      flexDirection: 'column',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.15)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.09)'
      }}
    >
      {/* Шапка с цветом вида */}
      <div style={{
        background: cfg.color,
        padding: '24px 24px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        borderBottom: `3px solid ${cfg.accent}22`,
      }}>
        {/* Аватар */}
        <div style={{
          width: 72, height: 72,
          borderRadius: '50%',
          background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36,
          boxShadow: `0 0 0 4px ${cfg.accent}33`,
          flexShrink: 0,
        }}>
          {pet.photo_url
            ? <img
                src={pet.photo_url.startsWith('http') ? pet.photo_url : `http://localhost:8004${pet.photo_url}`}
                alt={pet.name}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : cfg.emoji
          }
        </div>

        {/* Имя и вид */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontFamily: 'Georgia, serif',
              fontSize: 22, fontWeight: 700,
              color: '#222',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              {pet.name}
            </span>
            {genderIcon && (
              <span style={{ fontSize: 18, color: genderColor, fontWeight: 700 }}>
                {genderIcon}
              </span>
            )}
          </div>
          <div style={{
            display: 'inline-block',
            marginTop: 4,
            padding: '2px 10px',
            borderRadius: 20,
            background: cfg.accent,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.5,
          }}>
            {cfg.label}
          </div>
        </div>
      </div>

      {/* Данные питомца */}
      <div style={{ padding: '16px 24px', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <InfoRow label="Порода" value={pet.breed} />
          <InfoRow label="Возраст" value={age} />
          <InfoRow label="Вес" value={pet.weight ? `${pet.weight} кг` : null} />
        </div>
      </div>

      {/* Кнопки */}
      <div style={{
        padding: '12px 16px 16px',
        display: 'flex', gap: 8, flexWrap: 'wrap',
        borderTop: '1px solid #f0f0f0',
      }}>
        <ActionButton
          label="📋 Паспорт"
          color={cfg.accent}
          onClick={onPassport}
        />
        <ActionButton
          label="✏️ Изменить"
          color="#546e7a"
          onClick={onEdit}
        />
        <ActionButton
          label="🗑️"
          color="#ef5350"
          onClick={onDelete}
          small
        />
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#999', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#333', fontSize: 14, fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function ActionButton({ label, color, onClick, small }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: small ? '6px 10px' : '6px 14px',
        borderRadius: 10,
        border: `1.5px solid ${color}`,
        background: hovered ? color : 'transparent',
        color: hovered ? '#fff' : color,
        fontSize: 13, fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

// ─── Стили для полей формы ────────────────────────────────────────────────────

const fieldStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 12,
  border: '1.5px solid #e0e0e0',
  fontSize: 15,
  fontFamily: "'Nunito', 'Segoe UI', sans-serif",
  color: '#333',
  background: '#fafafa',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
}

const selectStyle = {
  ...fieldStyle,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
  paddingRight: 36,
  cursor: 'pointer',
}

function FormField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: '#666', fontFamily: "'Nunito', sans-serif" }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function PetForm({ form, setForm, error, photoFile, setPhotoFile, currentPhoto }) {
  const today = new Date().toISOString().split('T')[0]
  const focus = e => { e.target.style.borderColor = '#3a7d44'; e.target.style.boxShadow = '0 0 0 3px rgba(58,125,68,0.12)' }
  const blur = e => { e.target.style.borderColor = '#e0e0e0'; e.target.style.boxShadow = 'none' }
  const previewUrl = photoFile
    ? URL.createObjectURL(photoFile)
    : currentPhoto
      ? (currentPhoto.startsWith('http') ? currentPhoto : `http://localhost:8004${currentPhoto}`)
      : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '8px 0 4px' }}>
      {error && (
        <div style={{ background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: 10, padding: '10px 14px', color: '#c62828', fontSize: 14, fontFamily: "'Nunito', sans-serif" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Фото питомца */}
      <FormField label="📷 Фото питомца">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Превью */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#f0f0f0', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', border: '2px solid #e0e0e0',
            fontSize: 28,
          }}>
            {previewUrl
              ? <img src={previewUrl} alt="фото" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '🐾'
            }
          </div>
          <div style={{ flex: 1 }}>
            <label style={{
              display: 'inline-block', padding: '8px 16px',
              borderRadius: 10, border: '1.5px solid #3a7d44',
              color: '#3a7d44', fontSize: 13, fontWeight: 700,
              fontFamily: "'Nunito', sans-serif", cursor: 'pointer',
              background: '#f1f8e9',
            }}>
              {photoFile ? '✓ Фото выбрано' : currentPhoto ? '🔄 Заменить фото' : '+ Выбрать фото'}
              <input
                type="file" accept="image/*"
                style={{ display: 'none' }}
                onChange={e => setPhotoFile(e.target.files[0] || null)}
              />
            </label>
            {photoFile && (
              <button onClick={() => setPhotoFile(null)} style={{
                marginLeft: 8, background: 'none', border: 'none',
                color: '#e53935', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
              }}>
                ✕ Убрать
              </button>
            )}
            <div style={{ fontSize: 11, color: '#bbb', marginTop: 4, fontFamily: "'Nunito', sans-serif" }}>
              JPG, PNG до 5 МБ
            </div>
          </div>
        </div>
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <FormField label="Кличка *">
          <input
            style={fieldStyle}
            value={form.name}
            placeholder="Напр. Барсик"
            onChange={e => setForm({ ...form, name: e.target.value })}
            onFocus={focus} onBlur={blur}
          />
        </FormField>

        <FormField label="Вид животного">
          <select
            style={selectStyle}
            value={form.species}
            onChange={e => setForm({ ...form, species: e.target.value })}
            onFocus={focus} onBlur={blur}
          >
            <option value="">— выберите —</option>
            <option value="cat">🐱 Кошка</option>
            <option value="dog">🐶 Собака</option>
            <option value="rabbit">🐰 Кролик</option>
            <option value="bird">🐦 Птица</option>
            <option value="hamster">🐹 Хомяк</option>
            <option value="other">🐾 Другое</option>
          </select>
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <FormField label="Порода">
          <input
            style={fieldStyle}
            value={form.breed}
            placeholder="Напр. Сиамская"
            onChange={e => setForm({ ...form, breed: e.target.value })}
            onFocus={focus} onBlur={blur}
          />
        </FormField>

        <FormField label="Пол">
          <select
            style={selectStyle}
            value={form.gender}
            onChange={e => setForm({ ...form, gender: e.target.value })}
            onFocus={focus} onBlur={blur}
          >
            <option value="">— выберите —</option>
            <option value="male">♂ Мужской</option>
            <option value="female">♀ Женский</option>
          </select>
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <FormField label="Вес (кг)">
          <input
            style={fieldStyle}
            type="number"
            value={form.weight}
            placeholder="Напр. 4.5"
            min={0.1} max={200} step={0.1}
            onChange={e => setForm({ ...form, weight: e.target.value })}
            onFocus={focus} onBlur={blur}
          />
        </FormField>

        <FormField label="Дата рождения">
          <input
            style={fieldStyle}
            type="date"
            value={form.birth_date}
            max={today}
            onChange={e => setForm({ ...form, birth_date: e.target.value })}
            onFocus={focus} onBlur={blur}
          />
        </FormField>
      </div>
    </div>
  )
}

// ─── Модальное окно ───────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children, onSave, onSaveLabel = 'Сохранить', saveColor = '#3a7d44', danger }) {
  if (!open) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1300,
      background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: '32px 32px 24px',
          width: '100%', maxWidth: 520,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          fontFamily: "'Nunito', 'Segoe UI', sans-serif",
        }}
      >
        <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 800, color: '#2d4a2d' }}>
          {title}
        </h2>
        {children}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28 }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 12,
            border: 'none', background: 'transparent',
            color: '#999', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
            transition: 'color 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = '#555'}
            onMouseLeave={e => e.currentTarget.style.color = '#999'}
          >
            Отмена
          </button>
          {onSave && (
            <button onClick={onSave} style={{
              padding: '10px 24px', borderRadius: 12,
              border: 'none',
              background: danger ? '#e53935' : saveColor,
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
              boxShadow: `0 4px 14px ${danger ? 'rgba(229,57,53,0.3)' : 'rgba(58,125,68,0.3)'}`,
              transition: 'transform 0.1s, box-shadow 0.1s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 7px 18px ${danger ? 'rgba(229,57,53,0.35)' : 'rgba(58,125,68,0.35)'}` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 14px ${danger ? 'rgba(229,57,53,0.3)' : 'rgba(58,125,68,0.3)'}` }}
            >
              {onSaveLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Главный компонент ────────────────────────────────────────────────────────

function Pets() {
  const [pets, setPets] = useState([])
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedPet, setSelectedPet] = useState(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const emptyForm = { name: '', species: '', breed: '', birth_date: '', gender: '', weight: '' }
  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)
  const [photoFile, setPhotoFile] = useState(null)
  const [editPhotoFile, setEditPhotoFile] = useState(null)

  const loadPets = async () => {
    try {
      const res = await api.get('/pets/my')
      setPets(res.data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => { loadPets() }, [])

  const handleCreate = async () => {
    if (!form.name) { setError('Введите кличку питомца'); return }
    if (form.weight && (parseFloat(form.weight) < 0.1 || parseFloat(form.weight) > 200)) {
      setError('Вес должен быть от 0.1 до 200 кг'); return
    }
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      if (form.species) fd.append('species', form.species)
      if (form.breed) fd.append('breed', form.breed)
      if (form.gender) fd.append('gender', form.gender)
      if (form.weight) fd.append('weight', parseFloat(form.weight))
      if (form.birth_date) fd.append('birth_date', form.birth_date)
      if (photoFile) fd.append('photo', photoFile)
      await api.post('/pets/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setOpen(false); setForm(emptyForm); setPhotoFile(null); setError(''); loadPets()
    } catch (e) { console.error(e) }
  }

  const handleEditOpen = (pet) => {
    setSelectedPet(pet)
    setEditForm({
      name: pet.name || '', species: pet.species || '', breed: pet.breed || '',
      birth_date: pet.birth_date || '', gender: pet.gender || '', weight: pet.weight || '',
      photo_url: pet.photo_url || '',
    })
    setEditPhotoFile(null)
    setEditOpen(true)
  }

  const handleEdit = async () => {
    try {
      const fd = new FormData()
      fd.append('name', editForm.name)
      if (editForm.species) fd.append('species', editForm.species)
      if (editForm.breed) fd.append('breed', editForm.breed)
      if (editForm.gender) fd.append('gender', editForm.gender)
      if (editForm.weight) fd.append('weight', parseFloat(editForm.weight))
      if (editForm.birth_date) fd.append('birth_date', editForm.birth_date)
      if (editPhotoFile) fd.append('photo', editPhotoFile)
      await api.put(`/pets/${selectedPet.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setEditOpen(false); setEditPhotoFile(null); loadPets()
    } catch (e) { console.error(e) }
  }

  const handleDeleteOpen = (pet) => { setSelectedPet(pet); setDeleteOpen(true) }

  const handleDelete = async () => {
    try {
      await api.post(`/pets/${selectedPet.id}/delete`)
      setDeleteOpen(false); loadPets()
    } catch (e) { console.error(e) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f8f4', fontFamily: "'Nunito', 'Segoe UI', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#2d4a2d', margin: 0 }}>Мои питомцы</h1>
          <button
            onClick={() => { setForm(emptyForm); setError(''); setOpen(true) }}
            style={{
              padding: '11px 24px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #3a7d44, #52a85e)',
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
              boxShadow: '0 4px 14px rgba(58,125,68,0.3)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(58,125,68,0.35)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(58,125,68,0.3)' }}
          >
            + Добавить питомца
          </button>
        </div>

        {pets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#aaa' }}>
            <div style={{ fontSize: 64 }}>🐾</div>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#999', margin: '16px 0 8px' }}>У вас пока нет питомцев</p>
            <p style={{ fontSize: 14, color: '#bbb', margin: 0 }}>Нажмите «+ Добавить питомца», чтобы начать</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {pets.map(pet => (
              <PetCard
                key={pet.id}
                pet={pet}
                onEdit={() => handleEditOpen(pet)}
                onDelete={() => handleDeleteOpen(pet)}
                onPassport={() => navigate(`/pets/${pet.id}/passport`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Модал добавления */}
      <Modal
        open={open}
        onClose={() => { setOpen(false); setError(''); setPhotoFile(null) }}
        title="Добавить питомца"
        onSave={handleCreate}
        onSaveLabel="Сохранить"
      >
        <PetForm form={form} setForm={setForm} error={error} photoFile={photoFile} setPhotoFile={setPhotoFile} />
      </Modal>

      {/* Модал редактирования */}
      <Modal
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditPhotoFile(null) }}
        title="Изменить данные питомца"
        onSave={handleEdit}
        onSaveLabel="Сохранить"
      >
        <PetForm form={editForm} setForm={setEditForm} error="" photoFile={editPhotoFile} setPhotoFile={setEditPhotoFile} currentPhoto={selectedPet?.photo_url} />
      </Modal>

      {/* Модал удаления */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Подтвердите удаление"
        onSave={handleDelete}
        onSaveLabel="Удалить"
        danger
      >
        <p style={{ margin: 0, fontSize: 15, color: '#555', lineHeight: 1.6 }}>
          Вы уверены, что хотите удалить питомца <strong style={{ color: '#2d4a2d' }}>{selectedPet?.name}</strong>?<br />
          Это действие нельзя отменить.
        </p>
      </Modal>
    </div>
  )
}

export default Pets
