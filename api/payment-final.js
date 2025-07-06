export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  return res.status(200).json({ 
    message: "BRAND NEW API WORKS!",
    timestamp: new Date().toISOString(),
    api: "payment-final"
  });
}
