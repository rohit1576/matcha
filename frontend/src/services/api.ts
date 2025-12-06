import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: async (email: string, password: string, name: string, instagram_handle: string) => {
    const response = await api.post('/auth/register', {
      email,
      password,
      name,
      instagram_handle,
    });
    return response.data;
  },
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
};

// User API
export const userAPI = {
  getMe: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },
  getAllUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  getUserProfile: async (instagram_handle: string) => {
    const response = await api.get(`/users/${instagram_handle}`);
    return response.data;
  },
  verifyAccount: async () => {
    const response = await api.patch('/users/verify');
    return response.data;
  },
  updateProfilePicture: async (profile_picture: string) => {
    const response = await api.patch('/users/profile-picture', { profile_picture });
    return response.data;
  },
};

// Tea API
export const teaAPI = {
  postTea: async (target_instagram_handle: string, content: string) => {
    const response = await api.post('/tea', {
      target_instagram_handle,
      content,
    });
    return response.data;
  },
  getTeaForUser: async (instagram_handle: string) => {
    const response = await api.get(`/tea/${instagram_handle}`);
    return response.data;
  },
};
