export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  return res.status(200).json({ 
    message: "SIMPLE PAYMENT API WORKS!",
    timestamp: new Date().toISOString()
  });
}

// FORCE VERCEL UPDATE So  6 Jul 2025 19:33:48 CEST
// Cache clear attempt 1751823228
console.log('FORCED UPDATE');

// FORCE UPDATE So  6 Jul 2025 19:36:07 CEST
