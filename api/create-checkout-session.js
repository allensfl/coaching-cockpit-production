const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { coachId, email } = req.body;
    
    if (!coachId || !email) {
      return res.status(400).json({ error: 'Coach ID und Email sind erforderlich' });
    }

    console.log('🚀 Creating Stripe session for:', email);

    // Echte Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'KI-Online.Coach Pro',
            description: 'KI-gestütztes Coaching System - €49/Monat',
          },
          unit_amount: 4900, // €49.00
          recurring: {
            interval: 'month',
          },
        },
        quantity: 1,
      }],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          coachId: coachId,
        },
      },
      customer_email: email,
      success_url: `${req.headers.origin}/coach-dashboard.html?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${req.headers.origin}/coach-dashboard.html?canceled=true`,
      metadata: {
        coachId: coachId,
      },
    });

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('❌ Stripe Error:', error);
    return res.status(500).json({ 
      error: 'Payment session konnte nicht erstellt werden',
      details: error.message 
    });
  }
}
