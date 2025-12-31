import express from "express";
import OpenAI from "openai";
import SYSTEM_PROMPT from "../prompts/system.js";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ reply: "¿En qué puedo ayudarte?" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
      temperature: 0.6,
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "¿Me puedes dar un poco más de información?";

    res.json({ reply });
  } catch (error) {
    console.error("OPENAI ERROR:", error);

    res.status(500).json({
      reply:
        "Ocurrió un detalle técnico. ¿Te parece si continuamos por WhatsApp para ayudarte más rápido?",
    });
  }
});

export default router;
