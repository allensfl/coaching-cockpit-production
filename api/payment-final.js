export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  console.log("🚀 PAYMENT-FINAL API SUCCESS!");
  
  return res.status(200).json({
    message: "PAYMENT-FINAL API WORKS!",
    success: true,
    sessionId: "test_session_123",
    url: "https://checkout.stripe.com/test",
    timestamp: new Date().toISOString()
  });
}
