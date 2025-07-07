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

    console.log('🧪 Creating 1 CHF test payment for:', email);

    // Simple 1 CHF Einmalzahlung
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment', // Einmalzahlung statt Subscription
      line_items: [{
        price_data: {
          currency: 'chf', // Schweizer Franken
          product_data: {
            name: 'KI-Online.Coach - Test Access',
            description: 'Test-Zugang für 1 CHF',
          },
          unit_amount: 100, // 1.00 CHF (in Rappen)
        },
        quantity: 1,
      }],
      customer_email: email,
      success_url: `${req.headers.origin}/coach-dashboard.html?session_id={CHECKOUT_SESSION_ID}&success=true&test=true`,
      cancel_url: `${req.headers.origin}/coach-dashboard.html?canceled=true`,
      metadata: {
        coachId: coachId,
        testPurchase: 'true',
      },
    });

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
      amount: '1.00 CHF',
      type: 'test-purchase'
    });

  } catch (error) {
    console.error('❌ Stripe Error:', error);
    return res.status(500).json({ 
      error: 'Payment session konnte nicht erstellt werden',
      details: error.message 
    });
  }
}
