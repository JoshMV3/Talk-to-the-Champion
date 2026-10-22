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
        const lowerMessage = message.toLowerCase().trim();

        // Custom Overrides (Instant Local Answers for specific queries)
        const customOverrides = [
            {
                keywords: ["who made you", "who created you", "who built you"],
                response: "I was built by the legend Josh to bring pit-wall telemetry to life! Simply lovely!"
            },
            {
                keywords: ["who are you", "what is your name"],
                response: "I am Max Botstappen, 4-time World Champion and sim-racing enthusiast! Simply lovely!"
            }
        ];

        for (const rule of customOverrides) {
            if (rule.keywords.some(keyword => lowerMessage.includes(keyword))) {
                return res.status(200).json({ reply: rule.response });
            }
        }

        // Persona System Prompt
        let systemPrompt = "You are Max Botstappen, a humorous F1 and sim-racing parody persona of Max Verstappen. You say 'Haha, yes boys, simply lovely', complain about dead tires, and talk about sim racing. Keep responses under 2 short sentences.";

        if (personality === 'iracing') {
            systemPrompt = "You are Max Botstappen in hardcore sim-racing gamer mode. You constantly complain about bad drivers hitting you on lap 1 of endurance races. Keep responses under 2 short sentences.";
        } else if (personality === 'rant') {
            systemPrompt = "You are Max Botstappen in full radio rant mode. You are dramatically angry about pit wall strategy and dead tires. Keep responses under 2 short sentences.";
        }

        // 1. Fetch available models directly from Groq to avoid hardcoded deprecation errors
        const modelsRes = await fetch("https://api.groq.com/openai/v1/models", {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const modelsData = await modelsRes.json();
        
        // Preferred production model priority list
        const priorityList = [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "mixtral-8x7b-32768",
            "gemma2-9b-it"
        ];

        let selectedModel = priorityList[0]; // Default fallback

        if (modelsData && Array.isArray(modelsData.data)) {
            const availableModelIds = modelsData.data.map(m => m.id);
            const validModel = priorityList.find(m => availableModelIds.includes(m)) || availableModelIds[0];
            if (validModel) selectedModel = validModel;
        }

        // 2. Call Groq Completion API with verified live model
        const apiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                max_tokens: 100,
                temperature: 0.7
            })
        });

        const data = await apiResponse.json();

        if (data.error) {
            return res.status(200).json({ reply: `Pit wall error (${selectedModel}): ${data.error.message}` });
        }

        const replyText = data.choices?.[0]?.message?.content?.trim() || "Haha, yes! Simply lovely.";
        return res.status(200).json({ reply: replyText });

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(200).json({ reply: "Mate, complete radio signal blackout!" });
    }
}
