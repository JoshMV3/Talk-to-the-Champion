export const config = {
    runtime: 'edge', // Runs on global Edge nodes
};

export default async function handler(req) {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }

    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), { status: 500 });
        }

        const { message, personality } = await req.json();
        const lowerMessage = message.toLowerCase().trim();

        // Custom Override Answers
        const customOverrides = [
            {
                keywords: ["who made you", "who created you"],
                response: "I was built by the legend Josh to bring pit-wall telemetry to life! Simply lovely!"
            }
        ];

        for (const rule of customOverrides) {
            if (rule.keywords.some(keyword => lowerMessage.includes(keyword))) {
                const streamData = `data: ${JSON.stringify({
                    candidates: [{ content: { parts: [{ text: rule.response }] } }]
                })}\n\n`;

                return new Response(streamData, {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache, no-transform',
                        'Connection': 'keep-alive',
                        'Access-Control-Allow-Origin': '*',
                    },
                });
            }
        }

        let systemPrompt = "You are Max Botstappen, a humorous F1 and sim-racing parody persona of Max Verstappen. You say 'Haha, yes boys, simply lovely', complain about dead tires, and talk about sim racing. Keep responses short and funny (under 3 sentences).";

        if (personality === 'iracing') {
            systemPrompt = "You are Max Botstappen in hardcore sim-racing gamer mode. You constantly complain about bad drivers hitting you on lap 1 of endurance races.";
        } else if (personality === 'rant') {
            systemPrompt = "You are Max Botstappen in full radio rant mode. You are dramatically angry about pit wall strategy and dead tires.";
        }

        // Direct stream fetch from Google Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ role: 'user', parts: [{ text: message }] }],
                    generationConfig: {
                        maxOutputTokens: 100, // Forces fast, short punchy responses
                        temperature: 0.7
                    }
                })
            }
        );

        // Disabling proxy buffering so tokens stream instantly
        return new Response(response.body, {
            headers: {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                'X-Accel-Buffering': 'no',
                'Access-Control-Allow-Origin': '*',
            },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
    }
}
