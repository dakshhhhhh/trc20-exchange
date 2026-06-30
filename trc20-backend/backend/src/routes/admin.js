const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();

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
      { count: approvedPurchases }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
      supabase.from('withdrawal_orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }),
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).eq('status', 'approved')
    ]);

    const { data: revenueData } = await supabase
      .from('purchase_orders')
      .select('amount_inr')
      .eq('status', 'approved');
    
    const totalRevenue = (revenueData || []).reduce((sum, o) => sum + parseFloat(o.amount_inr), 0);

    const { data: recentOrders } = await supabase
      .from('purchase_orders')
      .select(`*, users(name, email, user_code)`)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: recentWithdrawals } = await supabase
      .from('withdrawal_orders')
      .select(`*, users(name, email, user_code)`)
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      success: true,
      stats: { totalUsers, pendingPurchases, pendingWithdrawals, totalPurchases, approvedPurchases, totalRevenue },
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
    const { availableBalance, isBanned, isActive, name, phone, newPassword } = req.body;

    const updates = {};
    if (availableBalance !== undefined) updates.available_balance = parseFloat(availableBalance);
    if (isBanned !== undefined) updates.is_banned = isBanned;
    if (isActive !== undefined) updates.is_active = isActive;
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (newPassword) updates.password_hash = await bcrypt.hash(newPassword, 12);

    const { data: user, error } = await supabase
      .from('users').update(updates).eq('id', userId).select('*').single();

    if (error) return res.status(500).json({ success: false, message: 'Update failed' });

    await supabase.from('activity_log').insert({
      action: 'ADMIN_USER_UPDATED',
      details: { userId, updates: Object.keys(updates), adminId: req.admin.id }
    });

    res.json({ success: true, message: 'User updated', user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET ALL PURCHASE ORDERS
router.get('/purchases', adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('purchase_orders')
      .select('*, users(name, email, user_code, phone)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data: orders, count } = await query.range(offset, offset + parseInt(limit) - 1);

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
    const { page = 1, limit = 20, status = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('withdrawal_orders')
      .select('*, users(name, email, user_code, phone)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data: orders, count } = await query.range(offset, offset + parseInt(limit) - 1);

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
                     'is_maintenance', 'maintenance_message'];
    
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

module.exports = router;
