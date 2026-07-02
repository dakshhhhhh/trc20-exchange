const express = require('express');
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET USER DASHBOARD DATA
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      { data: user },
      { data: settings },
      { data: recentPurchases },
      { data: recentWithdrawals },
      { count: pendingPurchasesCount },
      { count: withdrawalCount }
    ] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('app_settings').select('*').eq('id', 1).single(),
      supabase.from('purchase_orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
      supabase.from('withdrawal_orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'pending'),
      supabase.from('withdrawal_orders').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_free_withdrawal', true)
    ]);

    const freeWithdrawalsTotal = settings?.free_withdrawals_count || 3;
    const freeWithdrawalsRemaining = Math.max(0, freeWithdrawalsTotal - (withdrawalCount || 0));

    // Calculate pending amounts
    const { data: pendingPurchases } = await supabase
      .from('purchase_orders')
      .select('amount_usdt')
      .eq('user_id', userId)
      .eq('status', 'pending');
    
    const { data: pendingWithdrawals } = await supabase
      .from('withdrawal_orders')
      .select('amount_usdt')
      .eq('user_id', userId)
      .eq('status', 'pending');

    const pendingPurchaseAmount = (pendingPurchases || []).reduce((sum, o) => sum + parseFloat(o.amount_usdt), 0);
    const pendingWithdrawalAmount = (pendingWithdrawals || []).reduce((sum, o) => sum + parseFloat(o.amount_usdt), 0);

    // Combine recent activity
    const recentActivity = [
      ...(recentPurchases || []).map(o => ({ ...o, orderType: 'purchase' })),
      ...(recentWithdrawals || []).map(o => ({ ...o, orderType: 'withdrawal' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          userCode: user.user_code,
          availableBalance: parseFloat(user.available_balance),
          referralCode: user.referral_code,
          referralEarned: parseFloat(user.referral_earned || 0),
          createdAt: user.created_at
        },
        stats: {
          availableBalance: parseFloat(user.available_balance),
          pendingPurchases: pendingPurchaseAmount,
          pendingWithdrawals: pendingWithdrawalAmount,
          freeWithdrawalsRemaining
        },
        settings: {
          usdtBuyRate: parseFloat(settings?.usdt_buy_rate || 97.44),
          usdtMarketRate: parseFloat(settings?.usdt_market_rate || 97.44),
          minBuyInr: parseFloat(settings?.min_buy_inr || 500),
          maxBuyInr: parseFloat(settings?.max_buy_inr || 500000),
          minWithdrawUsdt: parseFloat(settings?.min_withdraw_usdt || 10),
          maxWithdrawUsdt: parseFloat(settings?.max_withdraw_usdt || 10000),
          withdrawalFee: parseFloat(settings?.withdrawal_fee || 1),
          supportWhatsapp: settings?.support_whatsapp || '',
          supportTelegram: settings?.support_telegram || ''
        },
        recentActivity
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET NOTIFICATIONS
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    res.json({ success: true, notifications: notifications || [], unreadCount: unreadCount || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// REFERRAL STATS for current user
router.get('/referral-stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all users referred by this user
    const { data: referredUsers } = await supabase
      .from('users')
      .select('id, name, email, created_at, referral_commission_paid, available_balance')
      .eq('referred_by', userId);

    // Get referral settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('referral_commission_usdt, referral_min_deposit_inr, referral_terms')
      .eq('id', 1)
      .single();

    // Get current user's referral earned
    const { data: me } = await supabase
      .from('users')
      .select('referral_earned, referral_code')
      .eq('id', userId)
      .single();

    const totalReferred = (referredUsers || []).length;
    const qualifiedReferrals = (referredUsers || []).filter(u => u.referral_commission_paid).length;
    const pendingReferrals = totalReferred - qualifiedReferrals;

    res.json({
      success: true,
      stats: {
        totalReferred,
        qualifiedReferrals,
        pendingReferrals,
        totalEarned: parseFloat(me?.referral_earned || 0),
        commissionPerReferral: parseFloat(settings?.referral_commission_usdt || 50),
        minDepositInr: parseFloat(settings?.referral_min_deposit_inr || 500),
        terms: settings?.referral_terms || '',
        referralCode: me?.referral_code
      },
      referredUsers: (referredUsers || []).map(u => ({
        name: u.name,
        email: u.email,
        joinedAt: u.created_at,
        hasDeposited: u.referral_commission_paid,
        status: u.referral_commission_paid ? 'Qualified ✅' : 'Pending deposit ⏳'
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// MARK NOTIFICATIONS READ
router.post('/notifications/read', authMiddleware, async (req, res) => {
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
