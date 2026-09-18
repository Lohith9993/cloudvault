import axios from 'axios';

const API_URL = 'https://timebase-todo-backend.onrender.com/api'; // Use http://localhost:5000/api if testing on physical device on same WiFi

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = (global as any).token || '';
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) => api.post('/auth/register', { name, email, password }),
};

export const taskAPI = {
  getTasks: () => api.get('/tasks'),
  createTask: (data: any) => api.post('/tasks', data),
  updateTask: (id: string, data: any) => api.patch(`/tasks/${id}`, data),
  deleteTask: (id: string) => api.delete(`/tasks/${id}`),
};

export default api;
