// api/openai.js - Vercel API Route für OpenAI Assistant Integration

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, threadId, assistantId = 'asst_qau7z8cAfCNEycKyAnlj69y1' } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        if (!OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
        }

        let currentThreadId = threadId;

        // Create new thread if none exists
        if (!currentThreadId) {
            const threadResponse = await fetch('https://api.openai.com/v1/threads', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                }
            });

            if (!threadResponse.ok) {
                throw new Error(`Failed to create thread: ${threadResponse.statusText}`);
            }

            const threadData = await threadResponse.json();
            currentThreadId = threadData.id;
        }

        // Add message to thread
        const messageResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            },
            body: JSON.stringify({
                role: 'user',
                content: message
            })
        });

        if (!messageResponse.ok) {
            throw new Error(`Failed to add message: ${messageResponse.statusText}`);
        }

        // Run the assistant
        const runResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            },
            body: JSON.stringify({
                assistant_id: assistantId,
                model: 'gpt-4o-mini', // Updated model
                temperature: 0.7,
                max_prompt_tokens: 4000,
                max_completion_tokens: 500
            })
        });

        if (!runResponse.ok) {
            throw new Error(`Failed to run assistant: ${runResponse.statusText}`);
        }

        const runData = await runResponse.json();
        const runId = runData.id;

        // Poll for completion
        let runStatus = 'queued';
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds timeout

        while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            
            const statusResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${runId}`, {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'assistants=v2'
                }
            });

            if (!statusResponse.ok) {
                throw new Error(`Failed to get run status: ${statusResponse.statusText}`);
            }

            const statusData = await statusResponse.json();
            runStatus = statusData.status;
            attempts++;

            // Handle requires_action status (for function calls)
            if (runStatus === 'requires_action') {
                // For now, we'll just wait - you can implement function calling here later
                continue;
            }
        }

        if (runStatus !== 'completed') {
            throw new Error(`Assistant run failed or timed out. Status: ${runStatus}`);
        }

        // Get the assistant's response
        const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'OpenAI-Beta': 'assistants=v2'
            }
        });

        if (!messagesResponse.ok) {
            throw new Error(`Failed to get messages: ${messagesResponse.statusText}`);
        }

        const messagesData = await messagesResponse.json();
        
        // Get the latest assistant message
        const assistantMessages = messagesData.data.filter(msg => msg.role === 'assistant');
        
        if (assistantMessages.length === 0) {
            throw new Error('No assistant response found');
        }

        const latestMessage = assistantMessages[0];
        const responseText = latestMessage.content[0]?.text?.value || 'Entschuldigung, ich konnte keine Antwort generieren.';

        // Return response with thread ID for continuation
        return res.status(200).json({
            response: responseText,
            threadId: currentThreadId,
            success: true
        });

    } catch (error) {
        console.error('OpenAI Assistant API Error:', error);
        
        // Return fallback response
        return res.status(200).json({
            response: getFallbackResponse(),
            threadId: null,
            success: false,
            error: error.message
        });
    }
}

// Fallback responses for error cases
function getFallbackResponse() {
    const fallbackResponses = [
        "Das ist eine interessante Perspektive. Kannst du mir mehr darüber erzählen?",
        "Ich verstehe. Lass uns das gemeinsam durchdenken. Was ist dein wichtigstes Anliegen?",
        "Das klingt bedeutsam für dich. Wie fühlst du dich dabei?",
        "Vielen Dank fürs Teilen. Was denkst du, wäre der nächste Schritt?",
        "Ich höre heraus, dass das wichtig für dich ist. Magst du das vertiefen?"
    ];
    
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
}
