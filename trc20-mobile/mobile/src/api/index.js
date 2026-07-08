// Your live backend URL — hardcoded so it always works regardless of .env
const API_BASE_URL = 'https://trc20-backend.onrender.com';

async function apiCall(endpoint, method = 'GET', body = null, token = null, isFormData = false) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config = { method, headers };
  if (body) config.body = isFormData ? body : JSON.stringify(body);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  } catch (networkErr) {
    // Server is sleeping (Render free tier) or no internet
    throw new Error('Cannot reach server. It may be waking up — please wait 30 seconds and try again.');
  }

  // Check if the response is actually JSON before parsing
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    // Server returned HTML or plain text — likely a 404 or crash
    const text = await response.text();
    console.error('Non-JSON response:', text.substring(0, 200));
    throw new Error('Server error. Please try again in a moment.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

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

export const referralAPI = {
  getStats: (token) => apiCall('/api/user/referral-stats', 'GET', null, token),
};

export default apiCall;
