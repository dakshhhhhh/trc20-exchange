const express = require('express');
const multer = require('multer');
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Use memory storage for multer, then upload to Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WEBP images allowed'));
  }
});

// Upload image to Supabase Storage
async function uploadToStorage(buffer, mimetype, folder) {
  const ext = mimetype.split('/')[1];
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
  
  const { data, error } = await supabase.storage
    .from('screenshots')
    .upload(filename, buffer, { contentType: mimetype, upsert: false });

  if (error) throw new Error('Failed to upload image');

  const { data: urlData } = supabase.storage.from('screenshots').getPublicUrl(filename);
  return urlData.publicUrl;
}

// GET PAYMENT METHODS (for user to see where to pay)
router.get('/payment-methods', authMiddleware, async (req, res) => {
  try {
    const { data: methods } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    res.json({ success: true, methods: methods || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// CREATE PURCHASE ORDER (step 1 - user enters amount)
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { amountInr } = req.body;
    const userId = req.user.id;

    if (!amountInr || isNaN(amountInr) || parseFloat(amountInr) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const { data: settings } = await supabase
      .from('app_settings')
      .select('usdt_buy_rate, min_buy_inr, max_buy_inr')
      .eq('id', 1)
      .single();

    const rate = parseFloat(settings?.usdt_buy_rate || 97.44);
    const minBuy = parseFloat(settings?.min_buy_inr || 500);
    const maxBuy = parseFloat(settings?.max_buy_inr || 500000);
    const amount = parseFloat(amountInr);

    if (amount < minBuy) {
      return res.status(400).json({ success: false, message: `Minimum purchase is ₹${minBuy}` });
    }
    if (amount > maxBuy) {
      return res.status(400).json({ success: false, message: `Maximum purchase is ₹${maxBuy}` });
    }

    // Check for existing pending order
    const { data: existingOrder } = await supabase
      .from('purchase_orders')
      .select('id, expires_at, order_id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingOrder) {
      // Return existing unexpired order
      const { data: fullOrder } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', existingOrder.id)
        .single();
      
      const { data: methods } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      return res.json({
        success: true,
        message: 'Existing order resumed',
        order: { ...fullOrder, amountInr: fullOrder.amount_inr, amountUsdt: fullOrder.amount_usdt },
        paymentMethods: methods || []
      });
    }

    const amountUsdt = amount / rate;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    const { data: order, error } = await supabase
      .from('purchase_orders')
      .insert({
        user_id: userId,
        amount_inr: amount,
        amount_usdt: amountUsdt,
        rate_used: rate,
        status: 'pending',
        expires_at: expiresAt
      })
      .select('*')
      .single();

    if (error) {
      console.error('Order creation error:', error);
      return res.status(500).json({ success: false, message: 'Failed to create order' });
    }

    const { data: methods } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'PURCHASE_ORDER_CREATED',
      details: { orderId: order.order_id, amountInr: amount, amountUsdt }
    });

    res.json({
      success: true,
      message: 'Order created',
      order: {
        id: order.id,
        orderId: order.order_id,
        amountInr: parseFloat(order.amount_inr),
        amountUsdt: parseFloat(order.amount_usdt),
        rateUsed: parseFloat(order.rate_used),
        expiresAt: order.expires_at,
        status: order.status
      },
      paymentMethods: methods || []
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// SUBMIT PAYMENT PROOF (step 2 - user uploads screenshot + UTR)
router.post('/submit-proof', authMiddleware, upload.single('screenshot'), async (req, res) => {
  try {
    const { orderId, utrNumber } = req.body;
    const userId = req.user.id;

    if (!orderId || !utrNumber) {
      return res.status(400).json({ success: false, message: 'Order ID and UTR number required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Payment screenshot required' });
    }

    // Get order
    const { data: order } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', userId)
      .single();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Order is already ${order.status}` });
    }

    // Check expiry
    if (new Date(order.expires_at) < new Date()) {
      await supabase.from('purchase_orders').update({ status: 'expired' }).eq('id', order.id);
      return res.status(400).json({ success: false, message: 'Order has expired. Please create a new order.' });
    }

    // Upload screenshot
    let screenshotUrl = null;
    try {
      screenshotUrl = await uploadToStorage(req.file.buffer, req.file.mimetype, 'purchase-proofs');
    } catch (uploadErr) {
      console.error('Upload error:', uploadErr);
      return res.status(500).json({ success: false, message: 'Failed to upload screenshot' });
    }

    // Update order
    await supabase
      .from('purchase_orders')
      .update({
        utr_number: utrNumber.trim(),
        screenshot_url: screenshotUrl,
        status: 'processing',
        submitted_at: new Date().toISOString()
      })
      .eq('id', order.id);

    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'PURCHASE_PROOF_SUBMITTED',
      details: { orderId: order.order_id, utrNumber: utrNumber.trim() }
    });

    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Payment Proof Submitted',
      message: `Your payment proof for order ${order.order_id} has been submitted. We will verify and credit your USDT shortly.`,
      type: 'info'
    });

    res.json({
      success: true,
      message: 'Payment proof submitted successfully. Your USDT will be credited after verification.'
    });
  } catch (err) {
    console.error('Submit proof error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET USER PURCHASE ORDERS
router.get('/purchases', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data: orders, count } = await supabase
      .from('purchase_orders')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    res.json({
      success: true,
      orders: orders || [],
      total: count || 0,
      page: parseInt(page),
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET USER WITHDRAWAL ORDERS
router.get('/withdrawals', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data: orders, count } = await supabase
      .from('withdrawal_orders')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    res.json({
      success: true,
      orders: orders || [],
      total: count || 0,
      page: parseInt(page),
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// CANCEL ORDER
router.post('/cancel/:orderId', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;

    const { data: order } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', req.user.id)
      .single();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!['pending'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel this order' });
    }

    await supabase.from('purchase_orders').update({ status: 'rejected' }).eq('id', order.id);

    res.json({ success: true, message: 'Order cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
