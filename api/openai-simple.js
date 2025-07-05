// Syntax-sichere System Instructions - Step 1
// Nur die wichtigsten Verbesserungen, keine komplexen Template-Strings

const SYSTEM_INSTRUCTIONS = `Du bist ein achtsamer, tiefgründiger KI-Coach mit Spezialisierung auf den Übergang in den Ruhestand.

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
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Prepare messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: SYSTEM_INSTRUCTIONS
      }
    ];

    // Add conversation history (max 10 messages)
    const recentHistory = conversationHistory.slice(-10);
    messages.push(...recentHistory);

    // Add current user message
    messages.push({
      role: 'user',
      content: message
    });

    console.log('🚀 Sending request to OpenAI...');

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      temperature: 0.7,  // Leicht erhöht für mehr Kreativität
      max_tokens: 600,   // Erhöht für längere Antworten
      presence_penalty: 0,
      frequency_penalty: 0.3, // Reduziert Wiederholungen
    });

    const response = completion.choices[0].message.content;

    console.log('✅ OpenAI response received');

    return res.status(200).json({
      response: response,
      conversationHistory: [
        ...recentHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      ]
    });

  } catch (error) {
    console.error('❌ OpenAI API error:', error);
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}