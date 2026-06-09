import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Pets from './pages/Pets'
import Appointments from './pages/Appointments'
import Articles from './pages/Articles'
import Navbar from './components/Navbar'
import PetPassport from './pages/PetPassport'
import Reports from './pages/Reports'
import AllPets from './pages/AllPets'
import Chat from './pages/Chat'
import Lab from './pages/Lab'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" />
}

export default function App() {
  const location = useLocation()
  const isPublic = location.pathname === '/login' || location.pathname === '/register'

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#f4f8f4',
    }}>
      <Navbar />
      {/* Контент — скролл только на публичных страницах или внутри компонентов */}
      <div style={{
        flex: 1,
        width: '100%',
        overflow: isPublic ? 'auto' : 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,  /* важно для flex-дочерних с overflow */
      }}>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/"         element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/pets"     element={<PrivateRoute><Pets /></PrivateRoute>} />
          <Route path="/all-pets" element={<PrivateRoute><AllPets /></PrivateRoute>} />
          <Route path="/appointments" element={<PrivateRoute><Appointments /></PrivateRoute>} />
          <Route path="/articles" element={<PrivateRoute><Articles /></PrivateRoute>} />
          <Route path="/pets/:petId/passport" element={<PrivateRoute><PetPassport /></PrivateRoute>} />
          <Route path="/reports"  element={<PrivateRoute><Reports /></PrivateRoute>} />
          <Route path="/chat"     element={<PrivateRoute><Chat /></PrivateRoute>} />
          <Route path="/lab"      element={<PrivateRoute><Lab /></PrivateRoute>} />
        </Routes>
      </div>
    </div>
  )
}
