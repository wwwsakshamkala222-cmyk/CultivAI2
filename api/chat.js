import axios from "axios";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";

function extractText(data) {
  const candidates = data?.candidates ?? [];
  if (!candidates.length) return "No response from AI";
  const parts = candidates[0]?.content?.parts ?? [];
  if (!parts.length) return "No content in response";
  return parts.map((p) => p.text || "").join("").trim();
}

function formatAsBullets(text) {
  if (!text || text.trim() === "") return ["No response received"];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines.map((line) =>
    line
      .replace(/^[-•*➤▪▫◦‣⁃]\s*/, "")
      .replace(/^\d+\.\s*/, "")
      .replace(/^[a-zA-Z]\.\s*/, "")
      .replace(/^\*\s+/, "")
      .trim()
  );
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      status: "Serverless API running",
      time: new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    const systemInstruction = {
      role: "user",
      parts: [
        {
          text: `You are an expert agricultural advisor. Provide farming advice in exactly 5 short bullet points.

Format each response with these 5 categories:
1. Precautions when handling
2. Treatment for infected leaves
3. Safe pesticides to use
4. Organic treatment alternatives
5. Future prevention methods
6. Fertilizers + irrigation advice

Keep each point to one sentence only. Be specific and practical.`,
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
      }
    );

    const extracted = extractText(response.data);
    const bullets = formatAsBullets(extracted);

    return res.status(200).json({ bullets });
  } catch (error) {
    console.error("🚨 Gemini API error:", error?.response?.data || error.message);
    return res.status(500).json({
      error: "Gemini request failed",
      details: error?.response?.data || error.message,
    });
  }
}