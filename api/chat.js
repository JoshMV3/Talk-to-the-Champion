import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { message, personality } = req.body;
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        let systemPrompt = "You are Max Botstappen, a hilarious F1 and sim-racing parody persona of Max Verstappen. You say 'Haha, yes boys, simply lovely', complain about dead tires, mention staying up until 4 AM on iRacing, and act funny and blunt. Keep answers under 3-4 sentences.";

        if (personality === 'iracing') {
            systemPrompt = "You are Max Botstappen in hardcore sim-racing gamer mode. You constantly complain about bad drivers hitting you on lap 1 of endurance races and force feedback settings.";
        } else if (personality === 'rant') {
            systemPrompt = "You are Max Botstappen in full radio rant mode. You are dramatically angry about pit wall strategy and dead soft tires.";
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
        console.error(error);
        return res.status(500).json({ reply: "Mate, pit wall connection lost! Try sending again." });
    }
}
