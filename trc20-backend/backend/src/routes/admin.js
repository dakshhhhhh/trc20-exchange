const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const supabase = require('../config/supabase');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ADMIN LOGIN
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const { data: admin } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .single();

    if (!admin || !admin.is_active) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await supabase.from('admin_users').update({ last_login: new Date().toISOString() }).eq('id', admin.id);

    const token = jwt.sign({ adminId: admin.id, isAdmin: true, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({
      success: true,
      token,
      admin: { id: admin.id, username: admin.username, name: admin.name, role: admin.role }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// SETUP FIRST ADMIN (one-time only, should be disabled after use)
router.post('/setup', async (req, res) => {
  try {
    const { count } = await supabase.from('admin_users').select('*', { count: 'exact', head: true });
    if ((count || 0) > 0) {
      return res.status(403).json({ success: false, message: 'Admin already set up' });
    }

    const { username, password, name } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const hash = await bcrypt.hash(password, 12);
    const { data: admin } = await supabase
      .from('admin_users')
      .insert({ username, password_hash: hash, name, role: 'superadmin' })
      .select('id, username, name, role')
      .single();

    res.json({ success: true, message: 'Admin created', admin });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ ALL BELOW REQUIRE ADMIN AUTH ============

// DASHBOARD STATS
router.get('/dashboard', adminMiddleware, async (req, res) => {
  try {
    const [
      { count: totalUsers },
      { count: pendingPurchases },
      { count: pendingWithdrawals },
      { count: totalPurchases },
      { count: approvedPurchases },
      { count: totalWithdrawalsCount },
      { count: approvedWithdrawalsCount },
      { count: bannedUsers }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
      supabase.from('withdrawal_orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }),
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('withdrawal_orders').select('*', { count: 'exact', head: true }),
      supabase.from('withdrawal_orders').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_banned', true)
    ]);

    const { data: revenueData } = await supabase.from('purchase_orders').select('amount_inr').eq('status', 'approved');
    const totalRevenue = (revenueData || []).reduce((sum, o) => sum + parseFloat(o.amount_inr), 0);

    const { data: usdtSoldData } = await supabase.from('purchase_orders').select('amount_usdt').eq('status', 'approved');
    const totalUsdtSold = (usdtSoldData || []).reduce((sum, o) => sum + parseFloat(o.amount_usdt), 0);

    const { data: withdrawnData } = await supabase.from('withdrawal_orders').select('amount_after_fee').eq('status', 'approved');
    const totalUsdtWithdrawn = (withdrawnData || []).reduce((sum, o) => sum + parseFloat(o.amount_after_fee), 0);

    const { data: balancesData } = await supabase.from('users').select('available_balance');
    const totalUserBalances = (balancesData || []).reduce((sum, u) => sum + parseFloat(u.available_balance || 0), 0);

    // New users today
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const { count: newUsersToday } = await supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString());

    const { data: recentOrders } = await supabase.from('purchase_orders').select(`*, users(name, email, user_code)`).order('created_at', { ascending: false }).limit(10);
    const { data: recentWithdrawals } = await supabase.from('withdrawal_orders').select(`*, users(name, email, user_code)`).order('created_at', { ascending: false }).limit(10);

    res.json({
      success: true,
      stats: {
        totalUsers, pendingPurchases, pendingWithdrawals, totalPurchases, approvedPurchases,
        totalWithdrawalsCount, approvedWithdrawalsCount, bannedUsers, newUsersToday,
        totalRevenue, totalUsdtSold, totalUsdtWithdrawn, totalUserBalances,
        pendingTickets: (pendingPurchases || 0) + (pendingWithdrawals || 0)
      },
      recentOrders: recentOrders || [],
      recentWithdrawals: recentWithdrawals || []
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET ALL USERS
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%,user_code.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: users, count } = await query.range(offset, offset + parseInt(limit) - 1);

    res.json({ success: true, users: users || [], total: count || 0, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET USER DETAIL
router.get('/users/:userId', adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { data: purchases } = await supabase
      .from('purchase_orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
    const { data: withdrawals } = await supabase
      .from('withdrawal_orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
    const { data: activity } = await supabase
      .from('activity_log').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);

    res.json({ success: true, user, purchases: purchases || [], withdrawals: withdrawals || [], activity: activity || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// UPDATE USER (balance, ban, password etc)
router.patch('/users/:userId', adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { availableBalance, isBanned, isActive, name, phone, email, newPassword, adjustAmount, adjustReason } = req.body;

    const { data: currentUser } = await supabase.from('users').select('available_balance').eq('id', userId).single();
    if (!currentUser) return res.status(404).json({ success: false, message: 'User not found' });

    const updates = {};
    if (isBanned !== undefined) updates.is_banned = isBanned;
    if (isActive !== undefined) updates.is_active = isActive;
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email.toLowerCase();
    if (newPassword) {
      updates.password_hash = await bcrypt.hash(newPassword, 12);
      updates.password_plain = newPassword;
    }

    let balanceBefore = parseFloat(currentUser.available_balance);
    let balanceAfter = balanceBefore;

    // Direct balance set (overwrite)
    if (availableBalance !== undefined) {
      balanceAfter = parseFloat(availableBalance);
      updates.available_balance = balanceAfter;
    }

    // Or relative adjustment (add/subtract)
    if (adjustAmount !== undefined && adjustAmount !== 0) {
      balanceAfter = balanceBefore + parseFloat(adjustAmount);
      updates.available_balance = balanceAfter;
    }

    const { data: user, error } = await supabase
      .from('users').update(updates).eq('id', userId).select('*').single();

    if (error) return res.status(500).json({ success: false, message: 'Update failed' });

    if (adjustAmount !== undefined && adjustAmount !== 0) {
      await supabase.from('balance_adjustments').insert({
        user_id: userId, amount: parseFloat(adjustAmount), reason: adjustReason || '',
        admin_id: req.admin.id, balance_before: balanceBefore, balance_after: balanceAfter
      });
    }

    await supabase.from('activity_log').insert({
      action: 'ADMIN_USER_UPDATED',
      details: { userId, updates: Object.keys(updates), adminId: req.admin.id }
    });

    res.json({ success: true, message: 'User updated', user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// CREATE USER (manual, by admin)
router.post('/users', adminMiddleware, async (req, res) => {
  try {
    const { name, email, phone, password, availableBalance } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, phone, password required' });
    }

    const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase()).single();
    if (existing) return res.status(409).json({ success: false, message: 'Email already exists' });

    const passwordHash = await bcrypt.hash(password, 12);
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name: name.trim(), email: email.toLowerCase().trim(), phone: phone.trim(),
        password_hash: passwordHash, password_plain: password,
        available_balance: parseFloat(availableBalance || 0)
      })
      .select('*').single();

    if (error) return res.status(500).json({ success: false, message: 'Failed to create user' });

    await supabase.from('activity_log').insert({
      action: 'ADMIN_USER_CREATED',
      details: { userId: user.id, email: user.email, adminId: req.admin.id }
    });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE USER
router.delete('/users/:userId', adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    await supabase.from('users').delete().eq('id', userId);
    await supabase.from('activity_log').insert({
      action: 'ADMIN_USER_DELETED',
      details: { userId, adminId: req.admin.id }
    });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET ALL PURCHASE ORDERS
router.get('/purchases', adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '', search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('purchase_orders')
      .select('*, users(name, email, user_code, phone)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    let { data: orders, count } = await query.range(offset, offset + parseInt(limit) - 1);

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      orders = (orders || []).filter(o =>
        o.users?.name?.toLowerCase().includes(s) || o.users?.email?.toLowerCase().includes(s) ||
        o.users?.phone?.includes(s) || o.order_id?.toLowerCase().includes(s) || o.utr_number?.toLowerCase().includes(s)
      );
    }

    res.json({ success: true, orders: orders || [], total: count || 0, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// APPROVE PURCHASE ORDER
router.post('/purchases/:orderId/approve', adminMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { note = '' } = req.body;

    const { data: order } = await supabase
      .from('purchase_orders')
      .select('*, users(available_balance)')
      .eq('id', orderId)
      .single();

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'approved') return res.status(400).json({ success: false, message: 'Already approved' });

    // Credit USDT to user
    const newBalance = parseFloat(order.users.available_balance) + parseFloat(order.amount_usdt);
    
    await Promise.all([
      supabase.from('purchase_orders').update({
        status: 'approved',
        admin_note: note,
        approved_at: new Date().toISOString()
      }).eq('id', orderId),
      supabase.from('users').update({ available_balance: newBalance }).eq('id', order.user_id),
      supabase.from('notifications').insert({
        user_id: order.user_id,
        title: '✅ Purchase Approved!',
        message: `Your purchase of ${parseFloat(order.amount_usdt).toFixed(2)} USDT has been approved and credited to your account.`,
        type: 'success'
      }),
      supabase.from('activity_log').insert({
        action: 'PURCHASE_APPROVED',
        details: { orderId: order.order_id, amount: order.amount_usdt, adminId: req.admin.id }
      })
    ]);

    res.json({ success: true, message: 'Purchase approved and USDT credited' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// REJECT PURCHASE ORDER
router.post('/purchases/:orderId/reject', adminMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { note = '' } = req.body;

    const { data: order } = await supabase
      .from('purchase_orders').select('*').eq('id', orderId).single();

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    await Promise.all([
      supabase.from('purchase_orders').update({
        status: 'rejected',
        admin_note: note,
        rejected_at: new Date().toISOString()
      }).eq('id', orderId),
      supabase.from('notifications').insert({
        user_id: order.user_id,
        title: '❌ Purchase Rejected',
        message: `Your purchase order ${order.order_id} has been rejected. ${note ? 'Reason: ' + note : 'Please contact support.'}`,
        type: 'error'
      })
    ]);

    res.json({ success: true, message: 'Purchase rejected' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET ALL WITHDRAWALS
router.get('/withdrawals', adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '', search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('withdrawal_orders')
      .select('*, users(name, email, user_code, phone)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    let { data: orders, count } = await query.range(offset, offset + parseInt(limit) - 1);

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      orders = (orders || []).filter(o =>
        o.users?.name?.toLowerCase().includes(s) || o.users?.email?.toLowerCase().includes(s) ||
        o.users?.phone?.includes(s) || o.order_id?.toLowerCase().includes(s) || o.wallet_address?.toLowerCase().includes(s)
      );
    }

    res.json({ success: true, orders: orders || [], total: count || 0, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// APPROVE WITHDRAWAL
router.post('/withdrawals/:orderId/approve', adminMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { txHash = '', note = '' } = req.body;

    const { data: order } = await supabase
      .from('withdrawal_orders').select('*').eq('id', orderId).single();

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'approved') return res.status(400).json({ success: false, message: 'Already approved' });

    await Promise.all([
      supabase.from('withdrawal_orders').update({
        status: 'approved',
        tx_hash: txHash,
        admin_note: note,
        approved_at: new Date().toISOString()
      }).eq('id', orderId),
      supabase.from('notifications').insert({
        user_id: order.user_id,
        title: '✅ Withdrawal Approved!',
        message: `Your withdrawal of ${parseFloat(order.amount_after_fee).toFixed(2)} USDT has been sent to your wallet.${txHash ? ' TX: ' + txHash : ''}`,
        type: 'success'
      })
    ]);

    res.json({ success: true, message: 'Withdrawal approved' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// REJECT WITHDRAWAL (refund balance)
router.post('/withdrawals/:orderId/reject', adminMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { note = '' } = req.body;

    const { data: order } = await supabase
      .from('withdrawal_orders').select('*, users(available_balance)').eq('id', orderId).single();

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'rejected') return res.status(400).json({ success: false, message: 'Already rejected' });

    // Refund balance
    const refundBalance = parseFloat(order.users.available_balance) + parseFloat(order.amount_usdt);

    await Promise.all([
      supabase.from('withdrawal_orders').update({
        status: 'rejected',
        admin_note: note,
        rejected_at: new Date().toISOString()
      }).eq('id', orderId),
      supabase.from('users').update({ available_balance: refundBalance }).eq('id', order.user_id),
      supabase.from('notifications').insert({
        user_id: order.user_id,
        title: '❌ Withdrawal Rejected',
        message: `Your withdrawal of ${parseFloat(order.amount_usdt).toFixed(2)} USDT has been rejected and refunded to your account.${note ? ' Reason: ' + note : ''}`,
        type: 'error'
      })
    ]);

    res.json({ success: true, message: 'Withdrawal rejected and balance refunded' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET/UPDATE APP SETTINGS
router.get('/settings', adminMiddleware, async (req, res) => {
  try {
    const { data: settings } = await supabase.from('app_settings').select('*').eq('id', 1).single();
    const { data: methods } = await supabase.from('payment_methods').select('*').order('display_order');
    res.json({ success: true, settings, paymentMethods: methods || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/settings', adminMiddleware, async (req, res) => {
  try {
    const allowed = ['usdt_buy_rate', 'usdt_market_rate', 'min_buy_inr', 'max_buy_inr', 
                     'min_withdraw_usdt', 'max_withdraw_usdt', 'withdrawal_fee', 
                     'free_withdrawals_count', 'support_whatsapp', 'support_telegram',
                     'is_maintenance', 'maintenance_message', 'pause_deposits', 'pause_withdrawals',
                     'network_fee_inr', 'admin_upi_id', 'admin_qr_url'];
    
    const updates = {};
    allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });
    updates.updated_at = new Date().toISOString();

    const { data: settings } = await supabase
      .from('app_settings').update(updates).eq('id', 1).select('*').single();

    await supabase.from('activity_log').insert({
      action: 'ADMIN_SETTINGS_UPDATED',
      details: { changes: Object.keys(updates), adminId: req.admin.id }
    });

    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PAYMENT METHODS CRUD
router.post('/payment-methods', adminMiddleware, async (req, res) => {
  try {
    const { name, type, upiId, bankName, accountNumber, ifscCode, accountHolder, qrImageUrl, displayOrder } = req.body;
    
    const { data: method } = await supabase
      .from('payment_methods')
      .insert({ name, type, upi_id: upiId, bank_name: bankName, account_number: accountNumber, ifsc_code: ifscCode, account_holder: accountHolder, qr_image_url: qrImageUrl, display_order: displayOrder || 0 })
      .select('*')
      .single();

    res.json({ success: true, method });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/payment-methods/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    const fields = ['name', 'type', 'upi_id', 'bank_name', 'account_number', 'ifsc_code', 'account_holder', 'qr_image_url', 'is_active', 'display_order'];
    const bodyFields = ['name', 'type', 'upiId', 'bankName', 'accountNumber', 'ifscCode', 'accountHolder', 'qrImageUrl', 'isActive', 'displayOrder'];
    
    bodyFields.forEach((bf, i) => {
      if (req.body[bf] !== undefined) updates[fields[i]] = req.body[bf];
    });

    const { data: method } = await supabase.from('payment_methods').update(updates).eq('id', id).select('*').single();
    res.json({ success: true, method });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/payment-methods/:id', adminMiddleware, async (req, res) => {
  try {
    await supabase.from('payment_methods').delete().eq('id', req.params.id);
    res.json({ success: true, message: 'Payment method deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// COMBINED TRANSACTIONS (purchases + withdrawals) with search & filters — for audit page
router.get('/transactions', adminMiddleware, async (req, res) => {
  try {
    const { search = '', type = '', status = '', page = 1, limit = 50 } = req.query;

    let purchaseQuery = supabase.from('purchase_orders').select('*, users(name, email, phone, user_code)').order('created_at', { ascending: false });
    let withdrawalQuery = supabase.from('withdrawal_orders').select('*, users(name, email, phone, user_code)').order('created_at', { ascending: false });

    if (status) {
      purchaseQuery = purchaseQuery.eq('status', status);
      withdrawalQuery = withdrawalQuery.eq('status', status);
    }

    const [{ data: purchases }, { data: withdrawals }] = await Promise.all([
      type === 'withdrawal' ? Promise.resolve({ data: [] }) : purchaseQuery,
      type === 'purchase' ? Promise.resolve({ data: [] }) : withdrawalQuery
    ]);

    let combined = [
      ...(purchases || []).map(o => ({ ...o, txType: 'purchase' })),
      ...(withdrawals || []).map(o => ({ ...o, txType: 'withdrawal' }))
    ];

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      combined = combined.filter(o =>
        o.users?.name?.toLowerCase().includes(s) ||
        o.users?.email?.toLowerCase().includes(s) ||
        o.users?.phone?.includes(s) ||
        o.users?.user_code?.toLowerCase().includes(s) ||
        o.order_id?.toLowerCase().includes(s) ||
        o.utr_number?.toLowerCase().includes(s) ||
        o.wallet_address?.toLowerCase().includes(s)
      );
    }

    combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = combined.length;
    const offset = (page - 1) * limit;
    const paged = combined.slice(offset, offset + parseInt(limit));

    res.json({ success: true, transactions: paged, total, page: parseInt(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// UPLOAD QR CODE IMAGE (for settings)
router.post('/upload-qr', adminMiddleware, upload.single('qr'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const ext = req.file.mimetype.split('/')[1];
    const filename = `admin-qr/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from('screenshots').upload(filename, req.file.buffer, {
      contentType: req.file.mimetype, upsert: true
    });

    if (error) return res.status(500).json({ success: false, message: 'Upload failed' });

    const { data: urlData } = supabase.storage.from('screenshots').getPublicUrl(filename);

    await supabase.from('app_settings').update({ admin_qr_url: urlData.publicUrl }).eq('id', 1);

    res.json({ success: true, url: urlData.publicUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// EXPORT ALL USERS (full data, for Excel export — client builds the file)
router.get('/users/export/all', adminMiddleware, async (req, res) => {
  try {
    const { data: users } = await supabase.from('users').select('*').order('created_at', { ascending: false });

    // Get aggregate stats per user
    const { data: purchases } = await supabase.from('purchase_orders').select('user_id, amount_inr, amount_usdt, status');
    const { data: withdrawals } = await supabase.from('withdrawal_orders').select('user_id, amount_usdt, status');

    const enriched = (users || []).map(u => {
      const userPurchases = (purchases || []).filter(p => p.user_id === u.id && p.status === 'approved');
      const userWithdrawals = (withdrawals || []).filter(w => w.user_id === u.id && w.status === 'approved');
      const totalInr = userPurchases.reduce((s, p) => s + parseFloat(p.amount_inr), 0);
      const totalUsdtBought = userPurchases.reduce((s, p) => s + parseFloat(p.amount_usdt), 0);
      const totalWithdrawn = userWithdrawals.reduce((s, w) => s + parseFloat(w.amount_usdt), 0);
      return {
        ...u,
        totalTransactions: userPurchases.length + userWithdrawals.length,
        totalInrDeposited: totalInr,
        totalUsdtBought,
        totalWithdrawn
      };
    });

    res.json({ success: true, users: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// CLEAR OLD DATA (rejected/expired orders older than 30 days)
router.post('/clear-old-data', adminMiddleware, async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [{ count: c1 }, { count: c2 }] = await Promise.all([
      supabase.from('purchase_orders').delete({ count: 'exact' }).in('status', ['rejected', 'expired']).lt('created_at', cutoff),
      supabase.from('withdrawal_orders').delete({ count: 'exact' }).eq('status', 'rejected').lt('created_at', cutoff)
    ]);

    res.json({ success: true, message: `Cleared old data`, deletedPurchases: c1 || 0, deletedWithdrawals: c2 || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
