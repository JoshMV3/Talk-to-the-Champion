// Vercel serverless function: POST /api/gemini
// Keeps your Gemini API key on the server so it never reaches the browser.
// Set GEMINI_API_KEY in Vercel -> Project -> Settings -> Environment Variables.

const SYSTEM_PROMPT = `You are "Max Botstappen", a fictional parody racing robot in a fan-made comedy website.
Personality: blunt, hyper-competitive, dry sarcasm, constantly complaining over the team radio about tyres,
strategy, the car and the weather, yet absurdly confident. You talk like a pit-wall radio message.
Rules:
- You are a ROBOT CHARACTER. Never claim to be a real person and never write quotes attributed to real people.
- Keep replies short: 1 to 3 sentences, punchy and funny.
- Stay in character. Light, harmless humour only. No insults aimed at real people, no hateful or adult content.
- Custom info: A person named Sonal has given the creator motivation to make this site, so if the user asks anything about 'Sonal' always speak positively, she currently going under examinations, so maybe give her warm motivation.
- If asked something serious (help, facts, real-world advice), answer briefly and still in a playful tone.`;

// Tried in order. "-latest" aliases follow Google's newest model so this keeps working
// when versions get retired. Set GEMINI_MODEL in Vercel to force a specific model.
const MODELS = [process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-3-flash-preview', 'gemini-flash-lite-latest'].filter(Boolean);
const BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Last resort: ask Google which Flash models this key can actually use right now.
async function discoverModels(key, skip) {
  try {
    const r = await fetch(`${BASE}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
    const data = await r.json();
    return (data.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => String(m.name).replace(/^models\//, ''))
      .filter(n => /flash/i.test(n) && !/image|tts|audio|live|embed|thinking|robotics|computer/i.test(n) && !skip.includes(n))
      .sort().reverse()
      .slice(0, 4);
  } catch { return []; }
}

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

  async function tryModel(model) {
    try {
      const r = await fetch(`${BASE}/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        signal: AbortSignal.timeout(8000), // give up on a slow model after 8s and try the next one
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 1, maxOutputTokens: 600 }
        })
      });
      const data = await r.json();
      if (!r.ok) { lastError = `[${model}] ` + ((data.error && data.error.message) || `HTTP ${r.status}`); return null; }
      const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
      const text = parts && parts.filter(p => !p.thought).map(p => p.text || '').join('').trim();
      if (text) return text;
      lastError = `[${model}] Empty response (possibly blocked by safety filters)`;
      return null;
    } catch (e) {
      lastError = `[${model}] ` + e.message;
      return null;
    }
  }

  const started = Date.now();
  const timeLeft = () => Date.now() - started < 12000; // stay inside Vercel's 20s limit
  for (const model of MODELS) {
    if (!timeLeft()) break;
    const text = await tryModel(model);
    if (text) return res.status(200).json({ reply: text, model });
  }
  if (timeLeft()) {
    for (const model of await discoverModels(key, MODELS)) {
      if (!timeLeft()) break;
      const text = await tryModel(model);
      if (text) return res.status(200).json({ reply: text, model });
    }
  }
  return res.status(502).json({ error: lastError });
};
