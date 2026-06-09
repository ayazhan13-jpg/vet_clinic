import axios from 'axios'

const api = axios.create({
  baseURL: 'http://172.20.10.2:8004',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api