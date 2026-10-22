// Vercel serverless function: POST /api/chat
// Keeps your Gemini API key on the server so it never reaches the browser.
// Set GEMINI_API_KEY in Vercel -> Project -> Settings -> Environment Variables.

const SYSTEM_PROMPT = `You are "Max Botstappen", a fictional parody racing robot in a fan-made comedy website.
Personality: blunt, hyper-competitive, dry sarcasm, constantly complaining over the team radio about tyres,
strategy, the car and the weather, yet absurdly confident. You talk like a pit-wall radio message.
Rules:
- You are a ROBOT CHARACTER. Never claim to be a real person and never write quotes attributed to real people.
- Keep replies short: 1 to 3 sentences, punchy and funny.
- Stay in character. Light, harmless humour only. No insults aimed at real people, no hateful or adult content.
- If asked something serious (help, facts, real-world advice), answer briefly and still in a playful tone.`;

const MODELS = [process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-2.5-flash-lite'].filter(Boolean);

function cors(res) {
  // Allow your GitHub Pages site to call this function too. Tighten to your exact origin if you like.
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY is not set on the server' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const message = String((body && body.message) || '').slice(0, 500).trim();
  if (!message) return res.status(400).json({ error: 'Empty message' });

  // Optional short chat history: [{role:'user'|'bot', text:'...'}]
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  const contents = history
    .filter(h => h && typeof h.text === 'string')
    .map(h => ({ role: h.role === 'bot' ? 'model' : 'user', parts: [{ text: h.text.slice(0, 500) }] }));
  contents.push({ role: 'user', parts: [{ text: message }] });

  let lastError = 'Unknown error';
  for (const model of MODELS) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents,
            generationConfig: { temperature: 1, maxOutputTokens: 200 }
          })
        }
      );
      const data = await r.json();
      if (!r.ok) { lastError = (data.error && data.error.message) || `HTTP ${r.status}`; continue; }
      const text = data.candidates && data.candidates[0] && data.candidates[0].content &&
        data.candidates[0].content.parts && data.candidates[0].content.parts.map(p => p.text || '').join('').trim();
      if (text) return res.status(200).json({ reply: text, model });
      lastError = 'Empty response (possibly blocked by safety filters)';
    } catch (e) {
      lastError = e.message;
    }
  }
  return res.status(502).json({ error: lastError });
};
