import axios from 'axios';
import { readAuth } from '../../utils/storage';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:3000',
});
api.interceptors.request.use((config) => {
  const token = readAuth().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default api;
