import axios from 'axios';
import { getAuthToken } from '../middleware/auth';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Apply additional security headers based on operation type
    if (config.method === 'post' || config.method === 'put' || config.method === 'patch') {
      config.headers['CSRF-Token'] = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status } = error.response;
      
      // Handle auth errors
      if (status === 401) {
        // Token expired or invalid
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
      
      // Handle forbidden
      if (status === 403) {
        console.error('Permission denied');
      }
      
      // Handle rate limiting
      if (status === 429) {
        console.error('Rate limit exceeded. Please try again later.');
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('Network error, please check your connection');
    }
    
    return Promise.reject(error);
  }
);

// ===== Authentication API =====
export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const logout = async () => {
  const response = await api.post('/auth/logout');
  localStorage.removeItem('authToken');
  return response.data;
};

export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

// ===== Simulations API =====
export const getSimulations = async (filters = {}) => {
  const response = await api.get('/simulations', { params: filters });
  return response.data;
};

export const getSimulationById = async (id) => {
  const response = await api.get(`/simulations/${id}`);
  return response.data;
};

export const createSimulation = async (simulationData) => {
  const response = await api.post('/simulations', simulationData);
  return response.data;
};

export const updateSimulation = async (id, updateData) => {
  const response = await api.put(`/simulations/${id}`, updateData);
  return response.data;
};

export const deleteSimulation = async (id) => {
  const response = await api.delete(`/simulations/${id}`);
  return response.data;
};

export const runSimulation = async (id, parameters) => {
  const response = await api.post(`/simulations/${id}/run`, parameters);
  return response.data;
};

// ===== Patients API =====
export const getPatients = async (filters = {}) => {
  const response = await api.get('/patients', { params: filters });
  return response.data;
};

export const getPatientById = async (id) => {
  const response = await api.get(`/patients/${id}`);
  return response.data;
};

export const createPatient = async (patientData) => {
  const response = await api.post('/patients', patientData);
  return response.data;
};

export const updatePatient = async (id, updateData) => {
  const response = await api.put(`/patients/${id}`, updateData);
  return response.data;
};

// ===== Drugs API =====
export const getDrugs = async (filters = {}) => {
  const response = await api.get('/drugs', { params: filters });
  return response.data;
};

export const getDrugById = async (id) => {
  const response = await api.get(`/drugs/${id}`);
  return response.data;
};

export const getDrugInteractions = async (drugIds) => {
  const response = await api.get('/drugs/interactions', { params: { drugs: drugIds } });
  return response.data;
};

// ===== Prescriptions API =====
export const getPrescriptions = async (patientId, filters = {}) => {
  const response = await api.get(`/patients/${patientId}/prescriptions`, { params: filters });
  return response.data;
};

export const createPrescription = async (patientId, prescriptionData) => {
  const response = await api.post(`/patients/${patientId}/prescriptions`, prescriptionData);
  return response.data;
};

export default api;