export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ reply: 'Method not allowed' });

    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return res.status(200).json({ reply: "Groq API Key missing in Vercel environment variables!" });
        }

        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const message = body?.message || "";
        const personality = body?.personality || "standard";

        // Persona Prompt Configuration
        let systemPrompt = "You are Max Botstappen, a humorous F1 and sim-racing parody persona of Max Verstappen. You say 'Haha, yes boys, simply lovely', complain about dead tires, and talk about sim racing. Keep responses under 2 short sentences.";

        if (personality === 'iracing') {
            systemPrompt = "You are Max Botstappen in hardcore sim-racing gamer mode. You constantly complain about bad drivers hitting you on lap 1 of endurance races. Keep responses under 2 short sentences.";
        } else if (personality === 'rant') {
            systemPrompt = "You are Max Botstappen in full radio rant mode. You are dramatically angry about pit wall strategy and dead tires. Keep responses under 2 short sentences.";
        }

        // Active Groq Production Chat Models (Strictly LLM Text Generation)
        const productionModels = [
            "llama-3.3-70b-versatile",
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b"
        ];

        let lastError = null;

        for (const modelName of productionModels) {
            try {
                const apiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: modelName,
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: message }
                        ],
                        max_tokens: 100,
                        temperature: 0.7
                    })
                });

                const data = await apiResponse.json();

                if (apiResponse.ok && data.choices?.[0]?.message?.content) {
                    const replyText = data.choices[0].message.content.trim();
                    return res.status(200).json({ reply: replyText });
                }

                if (data.error) {
                    lastError = `${modelName}: ${data.error.message || 'API Error'}`;
                }
            } catch (err) {
                lastError = `${modelName}: ${err.message}`;
            }
        }

        return res.status(200).json({ reply: `Pit wall error: ${lastError || 'Failed to connect to AI engines'}` });

    } catch (error) {
        return res.status(200).json({ reply: `Server Error: ${error.message}` });
    }
}
