export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { coachId, email } = req.body;
    
    console.log('💰 PAYPAL PAYMENT for:', email);

    // PayPal 1 CHF Payment URL
    const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=info@allenspach-coaching.ch&item_name=KI-Online.Coach Test&amount=1.00&currency_code=CHF&return=${req.headers.origin}/coach-dashboard.html?success=true`;

    return res.status(200).json({
      success: true,
      url: paypalUrl,
      provider: 'PayPal',
      amount: '1.00 CHF'
    });

  } catch (error) {
    return res.status(500).json({ error: 'PayPal error' });
  }
}
