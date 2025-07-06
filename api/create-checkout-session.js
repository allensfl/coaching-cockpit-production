// /api/create-checkout-session.js
// ULTRA-SIMPLE VERSION - OHNE COACH-CHECK

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Creating checkout session...');
    
    // SIMPLE CHECKOUT - OHNE COACH VALIDATION
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PRICE_ID, // Ihre CHF 1.00 Test-Price
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${req.headers.origin}/coach-dashboard.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/coach-registration.html`,
      allow_promotion_codes: true,
    });

    console.log('✅ Checkout session created:', session.id);
    
    return res.status(200).json({
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('❌ Stripe error:', error);
    return res.status(500).json({ 
      error: error.message 
    });
  }
}