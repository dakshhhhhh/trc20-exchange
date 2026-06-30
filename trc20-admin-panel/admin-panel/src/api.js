const BASE = import.meta.env.VITE_API_URL || 'https://your-app.onrender.com';

async function req(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || 'Error');
  return d;
}

const t = () => localStorage.getItem('admin_token');

export const adminLogin = (u, p) => req('/api/admin/login', 'POST', { username: u, password: p });
export const adminSetup = (d) => req('/api/admin/setup', 'POST', d);
export const getDashboard = () => req('/api/admin/dashboard', 'GET', null, t());
export const getUsers = (page = 1, search = '') => req(`/api/admin/users?page=${page}&search=${search}`, 'GET', null, t());
export const getUserDetail = (id) => req(`/api/admin/users/${id}`, 'GET', null, t());
export const updateUser = (id, d) => req(`/api/admin/users/${id}`, 'PATCH', d, t());
export const getPurchases = (page = 1, status = '') => req(`/api/admin/purchases?page=${page}&status=${status}`, 'GET', null, t());
export const approvePurchase = (id, note = '') => req(`/api/admin/purchases/${id}/approve`, 'POST', { note }, t());
export const rejectPurchase = (id, note) => req(`/api/admin/purchases/${id}/reject`, 'POST', { note }, t());
export const getWithdrawals = (page = 1, status = '') => req(`/api/admin/withdrawals?page=${page}&status=${status}`, 'GET', null, t());
export const approveWithdrawal = (id, txHash, note) => req(`/api/admin/withdrawals/${id}/approve`, 'POST', { txHash, note }, t());
export const rejectWithdrawal = (id, note) => req(`/api/admin/withdrawals/${id}/reject`, 'POST', { note }, t());
export const getSettings = () => req('/api/admin/settings', 'GET', null, t());
export const updateSettings = (d) => req('/api/admin/settings', 'PATCH', d, t());
export const addPaymentMethod = (d) => req('/api/admin/payment-methods', 'POST', d, t());
export const updatePaymentMethod = (id, d) => req(`/api/admin/payment-methods/${id}`, 'PATCH', d, t());
export const deletePaymentMethod = (id) => req(`/api/admin/payment-methods/${id}`, 'DELETE', null, t());
