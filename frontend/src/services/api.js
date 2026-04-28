import axios from 'axios';

const NODE_BASE   = import.meta.env.VITE_NODE_API_URL   || 'http://localhost:3001/api';
const PYTHON_BASE = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000/api';

const NODE_API = axios.create({
  baseURL: NODE_BASE,
  headers: { 'Content-Type': 'application/json' }
});

const PYTHON_API = axios.create({
  baseURL: PYTHON_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor para adicionar token JWT
NODE_API.interceptors.request.use((config) => {
  const token = localStorage.getItem('qualiqa_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

PYTHON_API.interceptors.request.use((config) => {
  const token = localStorage.getItem('qualiqa_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const authAPI = {
  register: (data) => NODE_API.post('/auth/register', data),
  login: (data) => NODE_API.post('/auth/login', data),
  me: () => NODE_API.get('/auth/me'),
};

// Projects
export const projectsAPI = {
  list: () => NODE_API.get('/projects'),
  create: (data) => NODE_API.post('/projects', data),
  get: (id) => NODE_API.get(`/projects/${id}`),
  update: (id, data) => NODE_API.put(`/projects/${id}`, data),
  delete: (id) => NODE_API.delete(`/projects/${id}`),
};

// Sprints
export const sprintsAPI = {
  create: (projectId, data) => NODE_API.post(`/projects/${projectId}/sprints`, data),
  update: (id, data) => NODE_API.put(`/sprints/${id}`, data),
  delete: (id) => NODE_API.delete(`/sprints/${id}`),
};

// Steps
export const stepsAPI = {
  create: (sprintId, data) => NODE_API.post(`/sprints/${sprintId}/steps`, data),
  update: (id, data) => NODE_API.put(`/steps/${id}`, data),
  delete: (id) => NODE_API.delete(`/steps/${id}`),
};

// Comments
export const commentsAPI = {
  list: (projectId) => NODE_API.get(`/comments/project/${projectId}`),
  create: (projectId, data) => NODE_API.post(`/comments/project/${projectId}`, data),
  recent: () => NODE_API.get('/comments/recent'),
};

// Bugs
export const bugsAPI = {
  list: (projectId) => NODE_API.get('/bugs', { params: { projectId } }),
  create: (data) => NODE_API.post('/bugs', data),
  update: (id, data) => NODE_API.put(`/bugs/${id}`, data),
};

// Users
export const usersAPI = {
  list: () => NODE_API.get('/users'),
  listRequests: () => NODE_API.get('/users/permission-requests'),
  myRequest: () => NODE_API.get('/users/my-request'),
  createRequest: (justification) => NODE_API.post('/users/permission-requests', { justification }),
  approveRequest: (requestId) => NODE_API.put(`/users/permission-requests/${requestId}/approve`),
  rejectRequest: (requestId, reason) => NODE_API.put(`/users/permission-requests/${requestId}/reject`, { rejection_reason: reason }),
  changeRole: (userId, newRole) => NODE_API.put(`/users/${userId}/role`, { role: newRole })
};

// Parameters
export const parametersAPI = {
  list: () => NODE_API.get('/parameters'),
  create: (data) => NODE_API.post('/parameters', data),
  delete: (id) => NODE_API.delete(`/parameters/${id}`)
};

// Analytics (Python API)
export const analyticsAPI = {
  dashboard: (userId) => PYTHON_API.get(`/analytics/dashboard?user_id=${userId}`),
  project: (projectId) => PYTHON_API.get(`/analytics/project/${projectId}`),
};

// Uploads (Python API)
export const uploadsAPI = {
  uploadScope: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return PYTHON_API.post('/uploads/scope', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadEvidence: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return PYTHON_API.post('/uploads/scope', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export { NODE_API, PYTHON_API };
