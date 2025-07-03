export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message } = req.body;
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

        // Direkter Chat Completion Call (einfacher)
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Du bist ein professioneller Coach. Antworte auf Deutsch mit warmherzigen, einfühlsamen Coaching-Fragen."
                    },
                    {
                        role: "user", 
                        content: message
                    }
                ],
                max_tokens: 300,
                temperature: 0.7
            })
        });

        const data = await response.json();
        return res.json({
            response: data.choices[0].message.content,
            success: true
        });

    } catch (error) {
        return res.json({
            response: "Das ist eine interessante Perspektive. Kannst du mir mehr darüber erzählen?",
            success: false,
            error: error.message
        });
    }
}
