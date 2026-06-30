// ⚠️ IMPORTANT: Replace this URL with your actual Render backend URL
// After deploying to Render, copy the URL here AND set it in .env as EXPO_PUBLIC_API_URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://YOUR-APP-NAME.onrender.com';

async function apiCall(endpoint, method = 'GET', body = null, token = null, isFormData = false) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config = { method, headers };
  if (body) config.body = isFormData ? body : JSON.stringify(body);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const authAPI = {
  register: (data) => apiCall('/api/auth/register', 'POST', data),
  login: (email, password) => apiCall('/api/auth/login', 'POST', { email, password }),
  verify: (token) => apiCall('/api/auth/verify', 'GET', null, token),
  changePassword: (token, data) => apiCall('/api/auth/change-password', 'POST', data, token),
};

export const userAPI = {
  getDashboard: (token) => apiCall('/api/user/dashboard', 'GET', null, token),
  getNotifications: (token) => apiCall('/api/user/notifications', 'GET', null, token),
  markNotificationsRead: (token) => apiCall('/api/user/notifications/read', 'POST', null, token),
};

export const settingsAPI = {
  getSettings: () => apiCall('/api/settings', 'GET'),
};

export const ordersAPI = {
  getPaymentMethods: (token) => apiCall('/api/orders/payment-methods', 'GET', null, token),
  createOrder: (token, amountInr) => apiCall('/api/orders/create', 'POST', { amountInr }, token),
  cancelOrder: (token, orderId) => apiCall(`/api/orders/cancel/${orderId}`, 'POST', null, token),
  getPurchases: (token, page = 1) => apiCall(`/api/orders/purchases?page=${page}`, 'GET', null, token),
  getWithdrawals: (token, page = 1) => apiCall(`/api/orders/withdrawals?page=${page}`, 'GET', null, token),
  submitProof: async (token, orderId, utrNumber, imageUri, imageMimeType) => {
    const formData = new FormData();
    formData.append('orderId', orderId);
    formData.append('utrNumber', utrNumber);
    const filename = imageUri.split('/').pop();
    formData.append('screenshot', {
      uri: imageUri,
      type: imageMimeType || 'image/jpeg',
      name: filename || 'screenshot.jpg',
    });
    return apiCall('/api/orders/submit-proof', 'POST', formData, token, true);
  },
};

export const withdrawalAPI = {
  create: (token, amountUsdt, walletAddress) =>
    apiCall('/api/withdrawal/create', 'POST', { amountUsdt, walletAddress }, token),
};

export default apiCall;
