import api from './axios';

// Auth
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Products
export const productsApi = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
};

// Stock
export const stockApi = {
  in: (data) => api.post('/stock/in', data),
  out: (data) => api.post('/stock/out', data),
  history: (params) => api.get('/stock/history', { params }),
};

// Suppliers
export const suppliersApi = {
  getAll: (params) => api.get('/suppliers', { params }),
  getOne: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
};

// Purchase Orders
export const purchaseOrdersApi = {
  getAll: (params) => api.get('/purchase-orders', { params }),
  getOne: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post('/purchase-orders', data),
  updateStatus: (id, status) => api.patch(`/purchase-orders/${id}/status`, { status }),
  delete: (id) => api.delete(`/purchase-orders/${id}`),
};

// Warehouses
export const warehousesApi = {
  getAll: () => api.get('/warehouses'),
  create: (data) => api.post('/warehouses', data),
  update: (id, data) => api.put(`/warehouses/${id}`, data),
  delete: (id) => api.delete(`/warehouses/${id}`),
};

// Dashboard
export const dashboardApi = {
  summary: () => api.get('/dashboard/summary'),
};

// Reports
export const reportsApi = {
  inventory: (params) => api.get('/reports/inventory', { params }),
  lowStock: (params) => api.get('/reports/low-stock', { params }),
  movements: (params) => api.get('/reports/movements', { params }),
  suppliers: (params) => api.get('/reports/suppliers', { params }),
};

// Logs
export const logsApi = {
  getAll: (params) => api.get('/logs', { params }),
};

// Users
export const usersApi = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
};
