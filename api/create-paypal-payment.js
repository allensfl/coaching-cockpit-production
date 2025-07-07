export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { coachId, email } = req.body;

  // PayPal Test-Link (1 CHF)
  const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=info@allenspach-coaching.ch&item_name=KI-Coaching-Test&amount=1.00&currency_code=CHF&return=${req.headers.origin}/coach-dashboard.html?success=true`;

  return res.status(200).json({
    success: true,
    url: paypalUrl,
    message: "PayPal Payment ready"
  });
}
