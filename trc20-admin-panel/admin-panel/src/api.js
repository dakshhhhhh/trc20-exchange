const BASE = import.meta.env.VITE_API_URL || 'https://trc20-backend.onrender.com';

async function req(path, method = 'GET', body = null, token = null, isFormData = false) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch(`${BASE}${path}`, { method, headers, body: isFormData ? body : (body ? JSON.stringify(body) : undefined) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || 'Error');
  return d;
}
const t = () => localStorage.getItem('admin_token');

export const adminLogin = (u, p) => req('/api/admin/login', 'POST', { username: u, password: p });
export const getDashboard = () => req('/api/admin/dashboard', 'GET', null, t());
export const getUsers = (page=1, search='') => req(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`, 'GET', null, t());
export const getUserDetail = (id) => req(`/api/admin/users/${id}`, 'GET', null, t());
export const updateUser = (id, d) => req(`/api/admin/users/${id}`, 'PATCH', d, t());
export const createUser = (d) => req('/api/admin/users', 'POST', d, t());
export const deleteUser = (id) => req(`/api/admin/users/${id}`, 'DELETE', null, t());
export const exportAllUsers = () => req('/api/admin/users/export/all', 'GET', null, t());
export const getPurchases = (page=1, status='', search='') => req(`/api/admin/purchases?page=${page}&status=${status}&search=${encodeURIComponent(search)}`, 'GET', null, t());
export const approvePurchase = (id, note='') => req(`/api/admin/purchases/${id}/approve`, 'POST', { note }, t());
export const rejectPurchase = (id, note) => req(`/api/admin/purchases/${id}/reject`, 'POST', { note }, t());
export const bulkApprovePurchases = (orderIds, note='') => req('/api/admin/purchases/bulk-approve', 'POST', { orderIds, note }, t());
export const getWithdrawals = (page=1, status='', search='') => req(`/api/admin/withdrawals?page=${page}&status=${status}&search=${encodeURIComponent(search)}`, 'GET', null, t());
export const approveWithdrawal = (id, txHash, note) => req(`/api/admin/withdrawals/${id}/approve`, 'POST', { txHash, note }, t());
export const rejectWithdrawal = (id, note) => req(`/api/admin/withdrawals/${id}/reject`, 'POST', { note }, t());
export const getTransactions = (params={}) => req(`/api/admin/transactions?${new URLSearchParams(params).toString()}`, 'GET', null, t());
export const getSettings = () => req('/api/admin/settings', 'GET', null, t());
export const updateSettings = (d) => req('/api/admin/settings', 'PATCH', d, t());
export const addPaymentMethod = (d) => req('/api/admin/payment-methods', 'POST', d, t());
export const updatePaymentMethod = (id, d) => req(`/api/admin/payment-methods/${id}`, 'PATCH', d, t());
export const deletePaymentMethod = (id) => req(`/api/admin/payment-methods/${id}`, 'DELETE', null, t());
export const clearOldData = () => req('/api/admin/clear-old-data', 'POST', null, t());
export const uploadQR = async (file) => { const fd = new FormData(); fd.append('qr', file); return req('/api/admin/upload-qr', 'POST', fd, t(), true); };
export const getAnalytics = (period='30d', from='', to='') => req(`/api/admin/analytics?period=${period}&from=${from}&to=${to}`, 'GET', null, t());
export const getReferrals = (search='', status='') => req(`/api/admin/referrals?search=${encodeURIComponent(search)}&status=${status}`, 'GET', null, t());
