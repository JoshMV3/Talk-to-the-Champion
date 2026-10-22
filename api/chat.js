export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ reply: 'Method not allowed' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const message = body?.message || "";
        const personality = body?.personality || "standard";
        const lowerMessage = message.toLowerCase().trim();

        // 1. Local Keyword Fast-Path Overrides
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

        // 2. System Prompt
        let systemPrompt = "You are Max Botstappen, a humorous F1 and sim-racing parody persona of Max Verstappen. You say 'Haha, yes boys, simply lovely', complain about dead tires, and talk about sim racing. Keep responses under 2 short sentences.";

        if (personality === 'iracing') {
            systemPrompt = "You are Max Botstappen in hardcore sim-racing gamer mode. You constantly complain about bad drivers hitting you on lap 1 of endurance races. Keep responses under 2 short sentences.";
        } else if (personality === 'rant') {
            systemPrompt = "You are Max Botstappen in full radio rant mode. You are dramatically angry about pit wall strategy and dead tires. Keep responses under 2 short sentences.";
        }

        // 3. Active Groq Production Models
        const activeGroqModels = [
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b"
        ];

        const apiKey = process.env.GROQ_API_KEY;

        if (apiKey) {
            for (const modelName of activeGroqModels) {
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
                            max_tokens: 80,
                            temperature: 0.7
                        })
                    });

                    const data = await apiResponse.json();

                    if (!data.error && data.choices?.[0]?.message?.content) {
                        const replyText = data.choices[0].message.content.trim();
                        return res.status(200).json({ reply: replyText });
                    }
                } catch (e) {
                    // Fail silently and try next active model in fallback chain
                }
            }
        }

        // 4. Fallback Generator (Ensures Zero Error Messages displayed in UI)
        const fallbacks = [
            "Haha, yes boys! Simply lovely. Car is on rails today, just keeping it clean!",
            "Mate, tires are holding up okay. We manage the gap and push flat out!",
            "Full send into turn 1! No lifting, simply lovely!",
            "Haha, yes! Back on the sim tonight for an endurance double stint!"
        ];
        const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        return res.status(200).json({ reply: randomFallback });

    } catch (error) {
        return res.status(200).json({ reply: "Haha, yes boys! Pit wall signal nominal. Simply lovely!" });
    }
}
