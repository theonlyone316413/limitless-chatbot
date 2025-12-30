import express from "express";
import OpenAI from "openai";
import { SYSTEM_PROMPT } from "../prompts/system.js";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ reply: "Mensaje vacío" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message }
      ],
    });

    res.json({
      reply: completion.choices[0].message.content
    });
  } catch (err) {
    console.error("OPENAI ERROR:", err.response?.data || err.message);
    res.status(500).json({ reply: "Internal error 🤯" });
  }
});

export default router;
