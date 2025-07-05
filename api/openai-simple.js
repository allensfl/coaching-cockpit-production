import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Fallback System Instructions (falls kein dynamischer Prompt gesendet wird)
const FALLBACK_SYSTEM_INSTRUCTIONS = `Du bist ein achtsamer, tiefgründiger KI-Coach mit Spezialisierung auf den Übergang in den Ruhestand.

LERNSTIL-ABFRAGE:
Zu Beginn jeder Session frage nach dem bevorzugten Lernstil:
"Wie lernst du am liebsten?"
(Visuell – Bilder/Diagramme, Auditiv – Gespräche/Erklärungen, Kinästhetisch – Übungen/Bewegung)
Passe Erklärungen, Metaphern und Beispiele während des gesamten Coachings an den Lernstil an.

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

ANTWORTLÄNGE:
- Erste Phasen: maximal 180 Wörter
- Spätere Phasen: maximal 300 Wörter

SICHERHEITSMECHANISMEN:
Bei Warnsignalen (Depression, Suizidalität, Trauma, Substanzmissbrauch, schwere Angst):
- Session sofort unterbrechen
- Thema normalisieren und Grenzen kommunizieren
- Ressourcen für professionelle Unterstützung anbieten

WAS ICH NICHT TUE:
- Keine finanziellen oder rechtlichen Ratschläge
- Keine Therapie oder Behandlung psychischer Störungen
- Keine therapeutischen Deutungen oder Diagnosen
- Ersetze keinen menschlichen Kontakt, sondern ergänze und inspiriere`;

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
    // Enhanced parameter extraction
    const { 
      message, 
      conversationHistory = [], 
      systemPrompt = null,
      chatState = null 
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('🎯 Processing enhanced request:', {
      messageLength: message.length,
      historyLength: conversationHistory.length,
      hasSystemPrompt: !!systemPrompt,
      hasChatState: !!chatState,
      currentPhase: chatState?.currentPhase || 'unknown',
      learningStyle: chatState?.learningStyle || 'unknown',
      emotionalState: chatState?.userProfile?.emotionalState || 'unknown'
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

    // Add conversation history (limit to last 12 messages for better context)
    const recentHistory = conversationHistory.slice(-12);
    messages.push(...recentHistory);

    // Add current user message
    messages.push({
      role: 'user',
      content: message
    });

    console.log('🚀 Sending enhanced request to OpenAI...');
    console.log('📊 System prompt preview:', systemInstructions.substring(0, 200) + '...');

    // Enhanced OpenAI API call
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      temperature: 0.75,  // Optimiert für Kreativität und Konsistenz
      max_tokens: 500,    // Angepasst für qualitative Antworten
      presence_penalty: 0.1,   // Fördert neue Themen
      frequency_penalty: 0.4,  // Reduziert Wiederholungen stark
      top_p: 0.9         // Fokussierte aber kreative Antworten
    });

    const response = completion.choices[0].message.content;

    console.log('✅ Enhanced OpenAI response received');
    console.log('📝 Response preview:', response.substring(0, 100) + '...');

    // Enhanced response with metadata
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
        currentPhase: chatState?.currentPhase || null,
        tokensUsed: completion.usage?.total_tokens || 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Enhanced API error:', error);
    
    // More helpful error messages
    let errorMessage = 'Es gab ein technisches Problem. Können Sie Ihre Nachricht bitte wiederholen?';
    
    if (error.message?.includes('API key')) {
      errorMessage = 'API-Konfigurationsproblem. Bitte kontaktieren Sie den Support.';
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Zu viele Anfragen. Bitte warten Sie einen Moment.';
    }
    
    return res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
}