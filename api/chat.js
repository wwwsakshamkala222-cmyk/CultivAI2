import axios from "axios";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";

function extractText(data) {
  try {
    const candidates = data?.candidates ?? [];
    if (!candidates.length) return "No response from AI";
    const parts = candidates[0]?.content?.parts ?? [];
    if (!parts.length) return "No content in response";
    return parts.map((p) => p.text || "").join("").trim();
  } catch (err) {
    console.error("Error extracting text:", err);
    return "Error extracting AI response";
  }
}

function formatAsBullets(text) {
  if (!text || text.trim() === "") return ["No response received"];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line
        .replace(/^[-•*➤▪▫◦‣⁃]\s*/, "")
        .replace(/^\d+\.\s*/, "")
        .replace(/^[a-zA-Z]\.\s*/, "")
        .replace(/^\*\s+/, "")
        .trim()
    );
}

export default async function handler(req, res) {
  // --- CORS headers ---
  // --- CORS headers ---
        res.setHeader("Access-Control-Allow-Origin", "https://cultiv-ai-deployment.vercel.app");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
        res.status(200).end();
        return;   // ✅  this line prevents Vercel from inserting a redirect
        }

  // --- Explicitly block trailing-slash redirect ---
  if (req.url.endsWith("/")) {
    return res.status(404).send("Not found"); // prevent vercel redirect loop
  }

  // --- Health check ---
  if (req.method === "GET") {
    return res.status(200).json({
      status: "Serverless API running",
      model: MODEL,
      time: new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!GEMINI_KEY) {
    return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  }

  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "`messages` must be an array" });
    }

    const systemInstruction = {
      role: "user",
      parts: [
        {
          text: `You are an expert agricultural advisor. Provide concise, practical advice in 5–6 bullet points.`,
        },
      ],
    };

    const contents = [
      systemInstruction,
      ...messages
        .filter((m) => m.text)
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.text }],
        })),
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const response = await axios.post(
      url,
      { contents },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_KEY,
        },
        timeout: 20000,
      }
    );

    const extracted = extractText(response.data);
    const bullets = formatAsBullets(extracted);
    return res.status(200).json({ bullets });
  } catch (err) {
    console.error("Gemini API error:", err?.response?.data || err.message);
    return res.status(500).json({
      error: "Gemini request failed",
      details: err?.response?.data || err.message,
    });
  }
}