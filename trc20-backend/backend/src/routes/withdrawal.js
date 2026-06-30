const express = require('express');
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// CREATE WITHDRAWAL REQUEST
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { amountUsdt, walletAddress } = req.body;
    const userId = req.user.id;

    if (!amountUsdt || !walletAddress) {
      return res.status(400).json({ success: false, message: 'Amount and wallet address required' });
    }

    if (!walletAddress.trim().startsWith('T') || walletAddress.trim().length < 30) {
      return res.status(400).json({ success: false, message: 'Invalid TRC20 wallet address. Must start with T.' });
    }

    const { data: settings } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .single();

    const minWithdraw = parseFloat(settings?.min_withdraw_usdt || 10);
    const maxWithdraw = parseFloat(settings?.max_withdraw_usdt || 10000);
    const feeAmount = parseFloat(settings?.withdrawal_fee || 1);
    const freeTotal = parseInt(settings?.free_withdrawals_count || 3);
    const amount = parseFloat(amountUsdt);

    if (amount < minWithdraw) {
      return res.status(400).json({ success: false, message: `Minimum withdrawal is ${minWithdraw} USDT` });
    }
    if (amount > maxWithdraw) {
      return res.status(400).json({ success: false, message: `Maximum withdrawal is ${maxWithdraw} USDT` });
    }

    // Get user balance
    const { data: user } = await supabase
      .from('users')
      .select('available_balance')
      .eq('id', userId)
      .single();

    if (parseFloat(user.available_balance) < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // Check free withdrawals used
    const { count: freeUsed } = await supabase
      .from('withdrawal_orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_free_withdrawal', true);

    const isFree = (freeUsed || 0) < freeTotal;
    const actualFee = isFree ? 0 : feeAmount;
    const amountAfterFee = amount - actualFee;

    if (amountAfterFee <= 0) {
      return res.status(400).json({ success: false, message: 'Amount too small after fee deduction' });
    }

    // Deduct from balance immediately (reserve it)
    const { error: balanceError } = await supabase
      .from('users')
      .update({ available_balance: parseFloat(user.available_balance) - amount })
      .eq('id', userId);

    if (balanceError) {
      return res.status(500).json({ success: false, message: 'Failed to update balance' });
    }

    const { data: withdrawal, error } = await supabase
      .from('withdrawal_orders')
      .insert({
        user_id: userId,
        amount_usdt: amount,
        wallet_address: walletAddress.trim(),
        network: 'TRC20',
        fee_usdt: actualFee,
        amount_after_fee: amountAfterFee,
        is_free_withdrawal: isFree,
        status: 'pending'
      })
      .select('*')
      .single();

    if (error) {
      // Rollback balance
      await supabase.from('users')
        .update({ available_balance: parseFloat(user.available_balance) })
        .eq('id', userId);
      return res.status(500).json({ success: false, message: 'Failed to create withdrawal' });
    }

    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Withdrawal Requested',
      message: `Your withdrawal of ${amount} USDT has been submitted and is pending admin approval.`,
      type: 'info'
    });

    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'WITHDRAWAL_CREATED',
      details: { orderId: withdrawal.order_id, amount, walletAddress: walletAddress.trim() }
    });

    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      withdrawal: {
        id: withdrawal.id,
        orderId: withdrawal.order_id,
        amountUsdt: parseFloat(withdrawal.amount_usdt),
        amountAfterFee: parseFloat(withdrawal.amount_after_fee),
        feeUsdt: parseFloat(withdrawal.fee_usdt),
        isFree: withdrawal.is_free_withdrawal,
        walletAddress: withdrawal.wallet_address,
        status: withdrawal.status,
        createdAt: withdrawal.created_at
      }
    });
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
