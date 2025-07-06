// /api/simple-checkout.js
// FIXED: Consistent CommonJS syntax for Vercel

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 SIMPLE CHECKOUT - NO VALIDATION');
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${req.headers.origin}/coach-dashboard.html?success=true`,
      cancel_url: `${req.headers.origin}/coach-registration.html`,
    });

    console.log('✅ Session created:', session.id);
    
    return res.status(200).json({
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ 
      error: error.message 
    });
  }
}