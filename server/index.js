import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import axios from "axios";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";

if (!GEMINI_KEY) {
  console.error("❌ Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

function extractText(data) {
  try {
    const candidates = data?.candidates ?? [];
    if (!candidates.length) return "No response from AI";
    const parts = candidates[0]?.content?.parts ?? [];
    if (!parts.length) return "No content in response";
    return parts.map((p) => p.text || "").join("").trim();
  } catch (error) {
    console.error("Error extracting text:", error);
    return "Error parsing response";
  }
}

function formatAsBullets(text) {
  if (!text || text.trim() === "") {
    return ["No response received"];
  }
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

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be array" });
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
          .filter((m) => m.text) // ✅ only include messages that have .text
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

    res.json({ bullets });
  } catch (err) {
    const errorDetails = err?.response?.data || err.message;
    console.error("🚨 Gemini API error:", errorDetails);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Gemini request failed",
        details: errorDetails,
      });
    }
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});