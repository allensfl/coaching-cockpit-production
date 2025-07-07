export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { coachId, email } = req.body;
    
    if (!coachId || !email) {
      return res.status(400).json({ error: 'Coach ID und Email sind erforderlich' });
    }

    console.log('💰 Creating PayPal payment for:', email);

    // PayPal 1 CHF Test-Payment
    const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?` +
      `cmd=_xclick` +
      `&business=info@allenspach-coaching.ch` +
      `&item_name=KI-Online.Coach Test Access` +
      `&item_number=${coachId}` +
      `&amount=1.00` +
      `&currency_code=CHF` +
      `&return=${req.headers.origin}/coach-dashboard.html?success=true&payment=paypal` +
      `&cancel_return=${req.headers.origin}/coach-dashboard.html?canceled=true` +
      `&notify_url=${req.headers.origin}/api/paypal-webhook`;

    return res.status(200).json({
      success: true,
      url: paypalUrl,
      amount: '1.00 CHF',
      provider: 'PayPal',
      message: 'PayPal payment ready!'
    });

  } catch (error) {
    console.error('❌ PayPal Error:', error);
    return res.status(500).json({ 
      error: 'PayPal payment konnte nicht erstellt werden',
      details: error.message 
    });
  }
}
