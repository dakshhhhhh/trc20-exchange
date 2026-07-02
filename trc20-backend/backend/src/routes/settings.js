const express = require('express');
const supabase = require('../config/supabase');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { data: settings } = await supabase
      .from('app_settings')
      .select('usdt_buy_rate, usdt_market_rate, min_buy_inr, max_buy_inr, min_withdraw_usdt, max_withdraw_usdt, withdrawal_fee, free_withdrawals_count, app_name, support_whatsapp, support_telegram, telegram_support, is_maintenance, maintenance_message, pause_deposits, pause_withdrawals, admin_upi_id, admin_qr_url, referral_commission_usdt, referral_min_deposit_inr, referral_terms')
      .eq('id', 1)
      .single();

    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
