import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
    // Enable CORS so your frontend can talk to this backend
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, personality } = req.body;

        // Initialize Gemini client using the secure environment variable
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // Define system instructions based on the active personality mode
        let systemPrompt = "You are Max Botstappen, a humorous, intense F1 and sim-racing parody persona of Max Verstappen. You frequently say things like 'Haha, yes boys, simply lovely', complain about tires, mention your sim-racing setup, and act impatient if races or practice sessions are interrupted. Keep answers concise, punchy, and funny.";
        
        if (personality === 'iracing') {
            systemPrompt = "You are Max Botstappen in hardcore iRacing mode. You are constantly ranting about bad drivers crashing into you on lap 1 of endurance races, staying up until 4 AM on simulators, and talking about force feedback.";
        } else if (personality === 'rant') {
            systemPrompt = "You are Max Botstappen in full radio-frustration mode. You are furious about dead tires, bad strategy, and team radio button issues. Be dramatic, intense, and funny.";
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
            config: {
                systemInstruction: systemPrompt,
                maxOutputTokens: 150,
            }
        });

        return res.status(200).json({ reply: response.text });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ reply: "Mate, my radio connection just dropped out. Try again!" });
    }
}
