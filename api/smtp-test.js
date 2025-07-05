// /api/smtp-test.js
// Direct SMTP test to find the exact problem

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email = 'flavien@bluewin.ch' } = req.body;

  try {
    console.log('🧪 Testing SMTP directly...');

    // Direct SendGrid API test (bypass Supabase)
    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: email }],
          subject: '🧪 SMTP Test - Coaching Cockpit'
        }],
        from: {
          email: 'coaching@ki-online.coach',
          name: 'Coaching Cockpit Test'
        },
        content: [{
          type: 'text/html',
          value: `
            <h2>🎉 SMTP Test erfolgreich!</h2>
            <p>Falls du diese Email siehst, funktioniert SendGrid!</p>
            <p>Das Problem liegt dann bei Supabase, nicht bei SendGrid.</p>
          `
        }]
      })
    });

    console.log('📧 SendGrid response status:', sendGridResponse.status);
    
    if (sendGridResponse.ok) {
      return res.status(200).json({
        success: true,
        message: 'Direct SendGrid test successful! Check your email.',
        sendGridStatus: sendGridResponse.status
      });
    } else {
      const errorText = await sendGridResponse.text();
      console.error('❌ SendGrid error:', errorText);
      
      return res.status(500).json({
        success: false,
        error: 'SendGrid API failed',
        details: errorText,
        sendGridStatus: sendGridResponse.status
      });
    }

  } catch (error) {
    console.error('❌ SMTP test error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'SMTP test failed',
      details: error.message
    });
  }
}