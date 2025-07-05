// Alternative robust import for Vercel compatibility
import { Configuration, OpenAIApi } from 'openai';

// Fallback configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

// Alternative: Direct fetch if OpenAI package fails
const makeOpenAIRequest = async (messages, retryWithFetch = false) => {
  if (!retryWithFetch) {
    try {
      // Try with OpenAI package first
      const completion = await openai.createChatCompletion({
        model: 'gpt-4',
        messages: messages,
        temperature: 0.75,
        max_tokens: 500,
        presence_penalty: 0.1,
        frequency_penalty: 0.4,
        top_p: 0.9
      });
      return completion.data.choices[0].message.content;
    } catch (packageError) {
      console.log('📦 OpenAI package failed, trying direct fetch...', packageError.message);
      return makeOpenAIRequest(messages, true);
    }
  }
  
  // Fallback: Direct fetch to OpenAI API
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: messages,
      temperature: 0.75,
      max_tokens: 500,
      presence_penalty: 0.1,
      frequency_penalty: 0.4,
      top_p: 0.9
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

// Fallback System Instructions
const FALLBACK_SYSTEM_INSTRUCTIONS = `Du bist ein achtsamer, tiefgründiger KI-Coach mit Spezialisierung auf den Übergang in den Ruhestand.

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

  try {
    console.log('🔧 Starting robust API handler...');
    
    // Check API key first
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not found in environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error - API key missing',
        details: 'Please check environment variables'
      });
    }

    console.log('✅ API key found, processing request...');

    const { 
      message, 
      conversationHistory = [], 
      systemPrompt = null,
      chatState = null 
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('📝 Request data:', {
      messageLength: message.length,
      historyLength: conversationHistory.length,
      hasSystemPrompt: !!systemPrompt,
      hasChatState: !!chatState
    });

    // Use dynamic system prompt if available, otherwise fallback
    const systemInstructions = systemPrompt || FALLBACK_SYSTEM_INSTRUCTIONS;

    // Prepare messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: systemInstructions
      }
    ];

    // Add conversation history (limit to last 10 messages)
    const recentHistory = conversationHistory.slice(-10);
    messages.push(...recentHistory);

    // Add current user message
    messages.push({
      role: 'user',
      content: message
    });

    console.log('🚀 Sending request to OpenAI...');
    console.log('📊 Messages count:', messages.length);

    // Make robust OpenAI request
    const response = await makeOpenAIRequest(messages);

    console.log('✅ Response received from OpenAI');
    console.log('📝 Response preview:', response.substring(0, 100) + '...');

    return res.status(200).json({
      response: response,
      conversationHistory: [
        ...recentHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      ],
      metadata: {
        systemPromptUsed: !!systemPrompt,
        chatStateProcessed: !!chatState,
        timestamp: new Date().toISOString(),
        status: 'success'
      }
    });

  } catch (error) {
    console.error('❌ API Handler Error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // More detailed error handling
    let errorMessage = 'Es gab ein technisches Problem. Können Sie Ihre Nachricht bitte wiederholen?';
    let statusCode = 500;
    
    if (error.message?.includes('API key')) {
      errorMessage = 'API-Schlüssel Problem. Bitte kontaktieren Sie den Support.';
      statusCode = 401;
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Zu viele Anfragen. Bitte warten Sie einen Moment.';
      statusCode = 429;
    } else if (error.message?.includes('fetch')) {
      errorMessage = 'Netzwerkproblem. Bitte versuchen Sie es erneut.';
      statusCode = 503;
    }
    
    return res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
      status: 'error'
    });
  }
}