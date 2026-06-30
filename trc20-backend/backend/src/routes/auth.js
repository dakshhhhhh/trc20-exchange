const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, referralCode } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Check if email exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Validate referral code if provided
    let referredByUserId = null;
    if (referralCode) {
      const { data: referrer } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', referralCode)
        .single();
      if (referrer) referredByUserId = referrer.id;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        password_hash: passwordHash,
        referred_by: referredByUserId
      })
      .select('id, name, email, phone, user_code, available_balance, referral_code, created_at')
      .single();

    if (error) {
      console.error('Register error:', error);
      return res.status(500).json({ success: false, message: 'Registration failed' });
    }

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: user.id,
      action: 'USER_REGISTERED',
      details: { email: user.email, name: user.name }
    });

    // Send notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      title: 'Welcome to TRC20!',
      message: `Hi ${user.name}, your account has been created successfully.`,
      type: 'success'
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userCode: user.user_code,
        availableBalance: user.available_balance,
        referralCode: user.referral_code,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.is_banned) {
      return res.status(403).json({ success: false, message: 'Account has been suspended' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Update last login
    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

    await supabase.from('activity_log').insert({
      user_id: user.id,
      action: 'USER_LOGIN',
      details: { email: user.email }
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userCode: user.user_code,
        availableBalance: parseFloat(user.available_balance),
        referralCode: user.referral_code,
        referralEarned: parseFloat(user.referral_earned),
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// CHANGE PASSWORD
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both passwords required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user.id)
      .single();

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await supabase.from('users').update({ password_hash: newHash }).eq('id', req.user.id);

    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      action: 'PASSWORD_CHANGED',
      details: {}
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// VERIFY TOKEN (for app startup)
router.get('/verify', authMiddleware, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, phone, user_code, available_balance, referral_code, referral_earned, created_at, last_login')
      .eq('id', req.user.id)
      .single();

    // Count free withdrawals used
    const { count: withdrawalCount } = await supabase
      .from('withdrawal_orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_free_withdrawal', true);

    const { data: settings } = await supabase
      .from('app_settings')
      .select('free_withdrawals_count')
      .eq('id', 1)
      .single();

    const freeWithdrawalsTotal = settings?.free_withdrawals_count || 3;
    const freeWithdrawalsRemaining = Math.max(0, freeWithdrawalsTotal - (withdrawalCount || 0));

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userCode: user.user_code,
        availableBalance: parseFloat(user.available_balance),
        referralCode: user.referral_code,
        referralEarned: parseFloat(user.referral_earned || 0),
        createdAt: user.created_at,
        lastLogin: user.last_login,
        freeWithdrawalsRemaining
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
