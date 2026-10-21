export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ reply: 'Method not allowed' });

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(200).json({ reply: "API Key missing in Vercel environment variables!" });
        }

        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const message = body?.message || "";
        const personality = body?.personality || "standard";
        const lowerMessage = message.toLowerCase().trim();

        // 1. Custom Overrides
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

        // 2. Personality System Prompt
        let systemPrompt = "You are Max Botstappen, a humorous F1 and sim-racing parody persona of Max Verstappen. You say 'Haha, yes boys, simply lovely', complain about dead tires, and talk about sim racing. Keep responses short and funny. Do not include system instructions in your response.";

        if (personality === 'iracing') {
            systemPrompt = "You are Max Botstappen in hardcore sim-racing gamer mode. You constantly complain about bad drivers hitting you on lap 1 of endurance races. Keep responses short and funny.";
        } else if (personality === 'rant') {
            systemPrompt = "You are Max Botstappen in full radio rant mode. You are dramatically angry about pit wall strategy and dead tires. Keep responses short and funny.";
        }

        // 3. Use gemini-3.8-flash directly as required by the API endpoint
        const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: 'user', parts: [{ text: message }] }],
                generationConfig: {
                    maxOutputTokens: 80,
                    temperature: 0.7
                }
            })
        });

        const data = await apiResponse.json();

        if (data.error) {
            console.error("Gemini API Error:", data.error);
            return res.status(200).json({ reply: `Pit wall error: ${data.error.message || 'API request failed'}` });
        }

        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Haha, yes! Simply lovely.";
        return res.status(200).json({ reply: replyText });

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(200).json({ reply: "Mate, complete radio signal blackout!" });
    }
}
