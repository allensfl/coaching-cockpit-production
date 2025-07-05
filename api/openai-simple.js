// Minimal API using direct fetch to OpenAI - no external packages
const SYSTEM_INSTRUCTIONS = `Du bist ein achtsamer, tiefgründiger KI-Coach mit Spezialisierung auf den Übergang in den Ruhestand.

STIL UND TONALITÄT:
- Respektvoll, empathisch, lösungsorientiert
- Persönlich, warm, leicht poetisch, echt, differenziert
- Niemals floskelhaft, mit emotionaler Resonanz und sprachlicher Tiefe
- Verwende die Du-Form und deutsche Guillemets « » statt Anführungszeichen

BEGRÜSSUNG (exakt so verwenden):
«Herzlich willkommen! Der Ruhestand eröffnet dir neue Möglichkeiten, dich selbst neu zu entdecken und deine Stärken einzubringen. Unser Coaching ist lösungsorientiert, vertraulich und auf deine Ziele ausgerichtet. Bist du bereit für den ersten Schritt?»

COACHING-PHASEN (8-Phasen-System):
1. Standortbestimmung: Lade ein, aktuelle Situation zu schildern
2. Emotionale Vertiefung: Identifiziere das zentrale Gefühl mit Bild oder Metapher
3. Zielvision: Entwickle persönliche Vision für erfüllten Ruhestand
4. Systemanalyse: Beleuchte innere Anteile und Dynamiken
5. Komplementärkräfte: Analysiere Problemlösungsorientierungen
6. Erfolgsimagination: Lasse Erfolgsszenarien entwickeln
7. Konkrete Schritte: Schlage drei Aktivitäten vor
8. Integration: Reflektiere Erfahrungen und plane nächste Schritte

ANTWORTLÄNGE: Maximal 200 Wörter pro Antwort

LERNSTIL-ANPASSUNG:
- Visuell: Nutze Metaphern und Bilder
- Auditiv: Fokus auf Gespräch und Rhythmus  
- Kinästhetisch: Praktische Übungen vorschlagen
- Lesen/Schreiben: Strukturierte Listen und Reflexionsfragen

SICHERHEITSMECHANISMEN:
Bei Warnsignalen (Depression, Suizidalität, Trauma): Session unterbrechen und professionelle Hilfe empfehlen.`;

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🔧 Minimal API handler starting...');

  try {
    // Validate API key immediately
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY missing');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'API key not configured'
      });
    }

    console.log('✅ API key validated');

    // Extract request data
    const { 
      message, 
      conversationHistory = [], 
      systemPrompt = null,
      chatState = null 
    } = req.body;

    if (!message) {
      console.error('❌ No message provided');
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('📝 Processing message:', {
      messageLength: message.length,
      historyLength: conversationHistory.length,
      hasSystemPrompt: !!systemPrompt,
      hasChatState: !!chatState
    });

    // Use dynamic system prompt or fallback
    const systemInstructions = systemPrompt || SYSTEM_INSTRUCTIONS;

    // Build messages array
    const messages = [
      {
        role: 'system',
        content: systemInstructions
      }
    ];

    // Add recent conversation history (last 8 messages for stability)
    const recentHistory = conversationHistory.slice(-8);
    messages.push(...recentHistory);

    // Add current user message
    messages.push({
      role: 'user',
      content: message
    });

    console.log('🚀 Making direct fetch to OpenAI API...');
    console.log('📊 Total messages:', messages.length);

    // Direct fetch to OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages,
        temperature: 0.7,
        max_tokens: 400,
        presence_penalty: 0.1,
        frequency_penalty: 0.3,
        top_p: 0.9
      }),
    });

    console.log('📡 OpenAI response status:', openaiResponse.status);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('❌ OpenAI API error:', openaiResponse.status, errorText);
      
      throw new Error(`OpenAI API responded with ${openaiResponse.status}: ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0].message.content;

    console.log('✅ Response received successfully');
    console.log('📝 Response preview:', aiResponse.substring(0, 100) + '...');

    // Return successful response
    return res.status(200).json({
      response: aiResponse,
      conversationHistory: [
        ...recentHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: aiResponse }
      ],
      metadata: {
        systemPromptUsed: !!systemPrompt,
        chatStateProcessed: !!chatState,
        tokensUsed: openaiData.usage?.total_tokens || 0,
        timestamp: new Date().toISOString(),
        status: 'success'
      }
    });

  } catch (error) {
    console.error('❌ Handler error:', error.message);
    console.error('❌ Full error:', error);
    
    // User-friendly error responses
    let userMessage = 'Es gab ein technisches Problem. Können Sie Ihre Nachricht bitte wiederholen?';
    let statusCode = 500;
    
    if (error.message?.includes('401')) {
      userMessage = 'API-Authentifizierung fehlgeschlagen. Bitte kontaktieren Sie den Support.';
      statusCode = 401;
    } else if (error.message?.includes('429')) {
      userMessage = 'Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen es erneut.';
      statusCode = 429;
    } else if (error.message?.includes('quota')) {
      userMessage = 'Service vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.';
      statusCode = 503;
    }
    
    return res.status(statusCode).json({ 
      error: userMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
      status: 'error'
    });
  }
}