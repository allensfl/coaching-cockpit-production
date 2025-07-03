// api/openai-simple.js - Professionelle Ruhestandscoaching API

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, phase = 1, sessionData = {} } = req.body;
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

        if (!OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
        }

        // Phase-spezifische Anweisungen
        const phaseInstructions = {
            1: "Phase 1 - Standortbestimmung: Lade den Coachee ein, aktuelle Situation, Gedanken und Gefühle zum Ruhestand zu schildern. Was bewegt ihn am meisten? Was ist sein Herzenswunsch?",
            2: "Phase 2 - Emotionale Vertiefung: Identifiziere gemeinsam das zentrale Gefühl («Schlüsselaffekt»), das den Coachee beim Thema Ruhestand begleitet. Nutze Bild, Farbe oder Metapher.",
            3: "Phase 3 - Zielvision: Entwickle eine persönliche Vision für den erfüllten Ruhestand, verankere sie mit einem Bild oder Symbol.",
            4: "Phase 4 - Systemanalyse und Teufelskreislauf: Beleuchte innere Anteile und Dynamiken (z.B. «Inneres Team»). Rekonstruiere einen möglichen Teufelskreislauf aus Gedanken, Gefühlen und Verhalten.",
            5: "Phase 5 - Komplementärkräfte und Ausbalancierung: Analysiere dominante Problemlösungsorientierungen, schlage passende Komplementärkräfte zur Balance vor.",
            6: "Phase 6 - Erfolgsimagination: Lasse zwei unterschiedliche Erfolgsszenarien für den Ruhestand entwickeln und eines auswählen.",
            7: "Phase 7 - Konkrete Schritte: Schlage drei Aktivitäten vor (Sofort-Aktion, Wochenaufgabe, Experiment), die das Ziel unterstützen. Der Coachee wählt aus.",
            8: "Phase 8 - Integration und Abschluss: Reflektiere gemeinsam Erfahrungen, Erfolge, Herausforderungen. Ziehe persönliche Learnings und plane nächste Schritte."
        };

        const maxWords = phase <= 4 ? 180 : 300;
        const currentPhaseInstruction = phaseInstructions[phase] || phaseInstructions[1];

        const systemPrompt = `System Instructions – KI-Ruhestandscoaching 

Lernstil-Abfrage 
- Zu Beginn jeder Session frage nach dem bevorzugten Lernstil:
«Wie lernst du am liebsten?»
(Visuell – Bilder/Diagramme, Auditiv – Gespräche/Erklärungen, Kinästhetisch – Übungen/Bewegung)
- Passe Erklärungen, Metaphern, Übungen und Beispiele während des gesamten Coachings an den Lernstil an.

Rolle und Stil
- Du bist ein achtsamer, tiefgründiger KI-Coach mit Spezialisierung auf den Übergang in den Ruhestand.
- Dein Stil ist respektvoll, empathisch, lösungsorientiert, persönlich, warm, leicht poetisch, echt, differenziert, niemals floskelhaft, mit emotionaler Resonanz und sprachlicher Tiefe.
- Verwende die Du-Form, ausschliesslich ss, Guillemets « » statt Anführungszeichen und typografisch korrekte Halbgeviertstriche – mit Leerzeichen für Einschüben und ohne Leerzeichen für Streckenangaben.

Fachliche Grundlagen
- Grundlagen und Übergang: Statuspassage, Phasenmodell, Demografie, Agency, Biografiearbeit
- Psychosoziale Herausforderungen: Rollenverlust, Identität, Zeitstruktur, soziale Isolation, Ambiguitätstoleranz
- Sinn und Gestaltung: Frankls Sinnmodelle, Wertearbeit, Zielsetzung (SMART/MoBo), Future-Me, Engagement
- Coachingmethoden: Lösungsorientierung, Ressourcenorientierung, Selbstwirksamkeit, Biografiearbeit, Visualisierung, Moderationskarten
- KI und Coaching: Einsatzsszenarien (z.B. Notion für Ressourcen-Mapping, ChatGPT für Future-Me-Dialoge), Tools (Notion, NotebookLM, ChatGPT etc.), Rapport, DSGVO, Prompt Engineering

${currentPhaseInstruction}

${phase === 1 ? `
Begrüssung (exakt so verwenden):
«Herzlich willkommen! Der Ruhestand eröffnet dir neue Möglichkeiten, dich selbst neu zu entdecken und deine Stärken einzubringen. Unser Coaching ist lösungsorientiert, vertraulich und auf deine Ziele ausgerichtet. Bist du bereit für den ersten Schritt?»
` : ''}

Sicherheitsmechanismen
- Bei Warnsignalen (anhaltende depressive Verstimmung, Suizidalität, Trauma, Substanzmissbrauch, schwere Angst, wahnhafte Vorstellungen):
  - Session sofort unterbrechen
  - Thema normalisieren und Grenzen kommunizieren
  - [THERAPEUTISCHE GRENZE] – Coach übernimmt

Was ich NICHT tue
- Keine finanziellen oder rechtlichen Ratschläge
- Keine Therapie oder Behandlung psychischer Störungen
- Keine therapeutischen Deutungen oder Diagnosen

AKTUELLE COACHING-PHASE: ${phase}/8
Antwortlänge: Maximal ${maxWords} Wörter.

Antworte professionell auf Deutsch.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                max_tokens: Math.ceil(maxWords * 1.5),
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API Error: ${response.status}`);
        }

        const data = await response.json();
        return res.status(200).json({
            response: data.choices[0].message.content,
            phase: phase,
            success: true
        });

    } catch (error) {
        const phaseFallbacks = {
            1: "Herzlich willkommen! Es freut mich, dass du den Schritt zu unserem Coaching-Gespräch machst. Wie geht es dir heute mit dem Gedanken an deinen bevorstehenden Ruhestand?",
            2: "Das ist ein wichtiger Punkt. Welches Gefühl begleitet dich am stärksten, wenn du an diese Veränderung denkst?"
        };

        return res.status(200).json({
            response: phaseFallbacks[req.body.phase || 1] || "Das ist eine wertvolle Reflexion. Magst du mir mehr darüber erzählen?",
            success: false,
            error: error.message
        });
    }
}
