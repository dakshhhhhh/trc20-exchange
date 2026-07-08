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
      .select('*, users(available_balance, referred_by, name, referral_commission_paid, referral_earned)')
      .eq('id', orderId)
      .single();

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'approved') return res.status(400).json({ success: false, message: 'Already approved' });

    // Check if this is user's FIRST approved purchase (before we approve this one)
    const { count: priorApproved } = await supabase
      .from('purchase_orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', order.user_id)
      .eq('status', 'approved');

    const isFirstDeposit = (priorApproved || 0) === 0;

    // Credit USDT to user
    const newBalance = parseFloat(order.users.available_balance) + parseFloat(order.amount_usdt);

    await Promise.all([
      supabase.from('purchase_orders').update({
        status: 'approved', admin_note: note, approved_at: new Date().toISOString()
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

    // ── REFERRAL COMMISSION ──
    // Only grant commission on user's FIRST ever approved deposit
    if (isFirstDeposit && order.users.referred_by && !order.users.referral_commission_paid) {
      try {
        const [{ data: referrerData }, { data: settingsData }] = await Promise.all([
          supabase.from('users').select('available_balance, referral_earned, name').eq('id', order.users.referred_by).single(),
          supabase.from('app_settings').select('referral_commission_usdt').eq('id', 1).single()
        ]);

        if (referrerData) {
          const commission = parseFloat(settingsData?.referral_commission_usdt || 50);
          const referrerNewBal = parseFloat(referrerData.available_balance) + commission;
          const referrerNewEarned = parseFloat(referrerData.referral_earned || 0) + commission;

          await Promise.all([
            // Credit referrer
            supabase.from('users').update({
              available_balance: referrerNewBal,
              referral_earned: referrerNewEarned
            }).eq('id', order.users.referred_by),

            // Mark this user's referral as paid (so we don't double-pay)
            supabase.from('users').update({ referral_commission_paid: true }).eq('id', order.user_id),

            // Record in balance adjustments for audit
            supabase.from('balance_adjustments').insert({
              user_id: order.users.referred_by,
              amount: commission,
              reason: `Referral commission — ${order.users.name} made first deposit`,
              balance_before: parseFloat(referrerData.available_balance),
              balance_after: referrerNewBal
            }),

            // Notify referrer
            supabase.from('notifications').insert({
              user_id: order.users.referred_by,
              title: '🎁 Referral Commission Earned!',
              message: `${order.users.name} made their first deposit! You earned ${commission} USDT referral commission.`,
              type: 'success'
            })
          ]);
        }
      } catch (refErr) {
        console.error('Referral commission error:', refErr);
        // Don't fail the approval if referral commission fails
      }
    }

    res.json({ success: true, message: 'Purchase approved and USDT credited' });
  } catch (err) {
    console.error(err);
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

// BULK APPROVE PURCHASES
router.post('/purchases/bulk-approve', adminMiddleware, async (req, res) => {
  try {
    const { orderIds, note = '' } = req.body;
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No orders provided' });
    }
    const results = { approved: [], failed: [], skipped: [] };
    const { data: settings } = await supabase.from('app_settings').select('referral_commission_usdt, referral_min_deposit_inr').eq('id', 1).single();

    for (const orderId of orderIds) {
      try {
        const { data: order } = await supabase
          .from('purchase_orders')
          .select('*, users(available_balance, referred_by, name, referral_commission_paid, referral_earned)')
          .eq('id', orderId).single();
        if (!order || order.status === 'approved') { results.skipped.push(orderId); continue; }
        if (!['pending', 'processing'].includes(order.status)) { results.skipped.push(orderId); continue; }

        const { count: priorApproved } = await supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).eq('user_id', order.user_id).eq('status', 'approved');
        const isFirstDeposit = (priorApproved || 0) === 0;
        const newBalance = parseFloat(order.users.available_balance) + parseFloat(order.amount_usdt);

        await Promise.all([
          supabase.from('purchase_orders').update({ status: 'approved', admin_note: note, approved_at: new Date().toISOString() }).eq('id', orderId),
          supabase.from('users').update({ available_balance: newBalance }).eq('id', order.user_id),
          supabase.from('notifications').insert({ user_id: order.user_id, title: '✅ Purchase Approved!', message: `Your purchase of ${parseFloat(order.amount_usdt).toFixed(2)} USDT has been approved and credited.`, type: 'success' })
        ]);

        // Referral commission check
        if (isFirstDeposit && order.users.referred_by && !order.users.referral_commission_paid) {
          const minDeposit = parseFloat(settings?.referral_min_deposit_inr || 10000);
          if (parseFloat(order.amount_inr) >= minDeposit) {
            const { data: referrerData } = await supabase.from('users').select('available_balance, referral_earned').eq('id', order.users.referred_by).single();
            if (referrerData) {
              const commission = parseFloat(settings?.referral_commission_usdt || 5);
              await Promise.all([
                supabase.from('users').update({ available_balance: parseFloat(referrerData.available_balance) + commission, referral_earned: parseFloat(referrerData.referral_earned || 0) + commission }).eq('id', order.users.referred_by),
                supabase.from('users').update({ referral_commission_paid: true }).eq('id', order.user_id),
                supabase.from('balance_adjustments').insert({ user_id: order.users.referred_by, amount: commission, reason: `Referral commission — ${order.users.name}'s first deposit`, balance_before: parseFloat(referrerData.available_balance), balance_after: parseFloat(referrerData.available_balance) + commission }),
                supabase.from('notifications').insert({ user_id: order.users.referred_by, title: '🎁 Referral Commission!', message: `${order.users.name} made their first deposit! You earned ${commission} USDT.`, type: 'success' })
              ]);
            }
          }
        }
        results.approved.push(orderId);
      } catch (err) { console.error('Bulk approve item error:', err); results.failed.push(orderId); }
    }
    res.json({ success: true, results, message: `Approved ${results.approved.length}, Skipped ${results.skipped.length}, Failed ${results.failed.length}` });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// ANALYTICS
router.get('/analytics', adminMiddleware, async (req, res) => {
  try {
    const { period = '30d', from, to } = req.query;
    let fromDate = new Date(), toDate = new Date();
    toDate.setHours(23, 59, 59, 999);
    if (from && to) {
      fromDate = new Date(from); toDate = new Date(to); toDate.setHours(23, 59, 59, 999);
    } else {
      const days = period === '1d' ? 1 : period === '7d' ? 7 : period === '90d' ? 90 : 30;
      fromDate.setDate(fromDate.getDate() - days); fromDate.setHours(0, 0, 0, 0);
    }
    const fromISO = fromDate.toISOString(), toISO = toDate.toISOString();

    const [{ data: purchases }, { data: withdrawals }, { data: newUsers }, { data: allUsers }, { data: commissions }] = await Promise.all([
      supabase.from('purchase_orders').select('id,amount_inr,amount_usdt,status,created_at,rate_used,user_id,users(name,email,phone,user_code)').gte('created_at', fromISO).lte('created_at', toISO).order('created_at'),
      supabase.from('withdrawal_orders').select('id,amount_usdt,amount_after_fee,fee_usdt,status,created_at,user_id,users(name,email,phone,user_code)').gte('created_at', fromISO).lte('created_at', toISO).order('created_at'),
      supabase.from('users').select('id,name,email,created_at').gte('created_at', fromISO).lte('created_at', toISO),
      supabase.from('users').select('id,available_balance'),
      supabase.from('balance_adjustments').select('user_id,amount,created_at,reason').gte('created_at', fromISO).lte('created_at', toISO)
    ]);

    const approved = (purchases||[]).filter(p => p.status==='approved');
    const approvedW = (withdrawals||[]).filter(w => w.status==='approved');
    const refCommissions = (commissions||[]).filter(c => c.reason?.includes('Referral'));

    const totalRevenue = approved.reduce((s,p) => s+parseFloat(p.amount_inr),0);
    const totalUsdtSold = approved.reduce((s,p) => s+parseFloat(p.amount_usdt),0);
    const totalWithdrawn = approvedW.reduce((s,w) => s+parseFloat(w.amount_after_fee),0);
    const totalFees = approvedW.reduce((s,w) => s+parseFloat(w.fee_usdt||0),0);
    const totalCommission = refCommissions.reduce((s,c) => s+parseFloat(c.amount),0);
    const platformLiability = (allUsers||[]).reduce((s,u) => s+parseFloat(u.available_balance||0),0);

    // Daily grouping
    const dateMap = {};
    const gd = d => d.split('T')[0];
    (purchases||[]).forEach(p => {
      const d = gd(p.created_at);
      if (!dateMap[d]) dateMap[d] = { date:d, depositsInr:0, depositsUsdt:0, depositsCount:0, withdrawalsUsdt:0, withdrawalsCount:0, newUsers:0, approvedD:0, rejectedD:0, pendingD:0 };
      dateMap[d].depositsCount++;
      if (p.status==='approved') { dateMap[d].depositsInr+=parseFloat(p.amount_inr); dateMap[d].depositsUsdt+=parseFloat(p.amount_usdt); dateMap[d].approvedD++; }
      if (p.status==='rejected') dateMap[d].rejectedD++;
      if (['pending','processing'].includes(p.status)) dateMap[d].pendingD++;
    });
    (withdrawals||[]).forEach(w => {
      const d = gd(w.created_at);
      if (!dateMap[d]) dateMap[d] = { date:d, depositsInr:0, depositsUsdt:0, depositsCount:0, withdrawalsUsdt:0, withdrawalsCount:0, newUsers:0, approvedD:0, rejectedD:0, pendingD:0 };
      dateMap[d].withdrawalsCount++;
      if (w.status==='approved') dateMap[d].withdrawalsUsdt+=parseFloat(w.amount_after_fee);
    });
    (newUsers||[]).forEach(u => {
      const d = gd(u.created_at);
      if (!dateMap[d]) dateMap[d] = { date:d, depositsInr:0, depositsUsdt:0, depositsCount:0, withdrawalsUsdt:0, withdrawalsCount:0, newUsers:0, approvedD:0, rejectedD:0, pendingD:0 };
      dateMap[d].newUsers++;
    });
    const dailyData = Object.values(dateMap).sort((a,b) => a.date.localeCompare(b.date));

    // Top users
    const umap = {};
    approved.forEach(p => {
      if (!umap[p.user_id]) umap[p.user_id] = { user:p.users, totalInr:0, totalUsdt:0, count:0 };
      umap[p.user_id].totalInr+=parseFloat(p.amount_inr); umap[p.user_id].totalUsdt+=parseFloat(p.amount_usdt); umap[p.user_id].count++;
    });
    const topUsers = Object.values(umap).sort((a,b) => b.totalInr-a.totalInr).slice(0,10);

    res.json({
      success: true,
      period: { from: fromISO, to: toISO },
      summary: { totalRevenue, totalUsdtSold, totalWithdrawn, totalFees, totalCommission, platformLiability, newUsersCount:(newUsers||[]).length, totalDeposits:(purchases||[]).length, totalWithdrawalsCount:(withdrawals||[]).length, approvalRate:(purchases||[]).length>0?((approved.length/(purchases||[]).length)*100).toFixed(1):0 },
      dailyData, topUsers,
      statusBreakdown: {
        purchases: { approved:approved.length, pending:(purchases||[]).filter(p=>['pending','processing'].includes(p.status)).length, rejected:(purchases||[]).filter(p=>p.status==='rejected').length, expired:(purchases||[]).filter(p=>p.status==='expired').length },
        withdrawals: { approved:approvedW.length, pending:(withdrawals||[]).filter(w=>w.status==='pending').length, rejected:(withdrawals||[]).filter(w=>w.status==='rejected').length }
      }
    });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// REFERRALS AUDIT
router.get('/referrals', adminMiddleware, async (req, res) => {
  try {
    const { search = '', status = '' } = req.query;
    const { data: allUsers } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    const { data: commissions } = await supabase.from('balance_adjustments').select('user_id,amount,created_at,reason').like('reason', '%Referral%');

    const referrersMap = {};
    (allUsers||[]).forEach(u => { if (u.referred_by) { if (!referrersMap[u.referred_by]) referrersMap[u.referred_by] = []; referrersMap[u.referred_by].push(u); } });

    let result = (allUsers||[]).filter(u => referrersMap[u.id]?.length > 0).map(u => {
      const refs = referrersMap[u.id]||[];
      const qualified = refs.filter(r => r.referral_commission_paid);
      const commPaid = (commissions||[]).filter(c => c.user_id===u.id).reduce((s,c) => s+parseFloat(c.amount),0);
      return { referrer:u, referredUsers:refs, totalReferred:refs.length, qualifiedCount:qualified.length, pendingCount:refs.length-qualified.length, totalCommissionEarned:commPaid };
    });

    if (search.trim()) { const s=search.toLowerCase(); result=result.filter(i=>i.referrer.name?.toLowerCase().includes(s)||i.referrer.email?.toLowerCase().includes(s)||i.referrer.phone?.includes(s)||i.referrer.user_code?.toLowerCase().includes(s)); }
    if (status==='qualified') result=result.filter(i=>i.qualifiedCount>0);
    if (status==='pending') result=result.filter(i=>i.pendingCount>0&&i.qualifiedCount===0);

    const totalCommPaid=(commissions||[]).filter(c=>c.reason?.includes('Referral')).reduce((s,c)=>s+parseFloat(c.amount),0);
    const totalReferred=(allUsers||[]).filter(u=>u.referred_by).length;
    const totalQualified=(allUsers||[]).filter(u=>u.referral_commission_paid).length;

    res.json({ success:true, referrers:result, summary:{ totalReferrers:result.length, totalReferredUsers:totalReferred, totalQualified, totalPending:totalReferred-totalQualified, totalCommissionPaid:totalCommPaid } });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

module.exports = router;
