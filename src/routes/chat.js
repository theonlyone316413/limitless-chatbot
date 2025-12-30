import express from "express";
import OpenAI from "openai";
import SYSTEM_PROMPT from "../prompts/system.js";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY.trim(), // 🔥 trim CLAVE
});

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "No message provided" });
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const reply =
      response.output_text ||
      response.output?.[0]?.content?.[0]?.text ||
      "Sin respuesta";

    res.json({ reply });
  } catch (error) {
    console.error("OPENAI ERROR:", error);
    res.status(500).json({ error: "Internal AI error" });
  }
});

export default router;
