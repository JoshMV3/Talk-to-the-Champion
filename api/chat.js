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
        const lower = message.toLowerCase().trim();

        // Mode specific response collections
        if (personality === 'iracing') {
            if (lower.includes("plan") || lower.includes("doing") || lower.includes("today")) {
                return res.status(200).json({ reply: "Doing a 24-hour endurance race on iRacing. Hopefully no lap 1 netcode crashes!" });
            }
            if (lower.includes("race") || lower.includes("fast")) {
                return res.status(200).json({ reply: "Sim racing all day! Turning off safety rating requirements so I can just full send." });
            }
        }

        if (personality === 'rant') {
            if (lower.includes("plan") || lower.includes("doing") || lower.includes("today")) {
                return res.status(200).json({ reply: "Complaining to GP on the radio! These tires are dead and the strategy makes no sense!" });
            }
            if (lower.includes("race") || lower.includes("fast")) {
                return res.status(200).json({ reply: "Mate, I'm pushing as hard as I can but there is zero grip!" });
            }
        }

        // Standard personality / General match rules
        if (lower.includes("who made you") || lower.includes("created")) {
            return res.status(200).json({ reply: "I was built by the legend Josh to bring pit-wall telemetry to life! Simply lovely!" });
        }
        if (lower.includes("who are you") || lower.includes("name")) {
            return res.status(200).json({ reply: "I am Max Botstappen, 4-time World Champion and sim-racing enthusiast! Simply lovely!" });
        }
        if (lower.includes("plan") || lower.includes("doing") || lower.includes("today")) {
            return res.status(200).json({ reply: "Haha, yes boys! Doing some sim racing, analyzing telemetry with GP, and relaxing before the next stint!" });
        }
        if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
            return res.status(200).json({ reply: "Haha, yes boys! Welcome to the pit wall. What's on your mind?" });
        }
        if (lower.includes("fast") || lower.includes("speed") || lower.includes("quick")) {
            return res.status(200).json({ reply: "Because I don't lift! Hit the apex, clip the kerbs, and push flat out. Simply lovely!" });
        }
        if (lower.includes("tire") || lower.includes("tyre") || lower.includes("soft")) {
            return res.status(200).json({ reply: "Mate, these soft tires are completely cooked, but we manage the gap easily!" });
        }

        // Fallback natural Max responses for any unmatched question
        const defaultReplies = [
            "Haha, yes boys! Simply lovely. We manage the gap and keep pushing!",
            "Mate, everything is under control on the pit wall! Full send!",
            "Car is on rails today! Just focusing on my own stint.",
            "Haha, yes! Just focusing on the apexes and keeping it clean."
        ];

        const randomReply = defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
        return res.status(200).json({ reply: randomReply });

    } catch (error) {
        return res.status(200).json({ reply: "Haha, yes boys! Pit wall signal green!" });
    }
}
