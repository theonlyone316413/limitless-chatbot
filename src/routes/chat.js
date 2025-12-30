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

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message }
      ],
    });

    res.json({
      reply: completion.choices[0].message.content
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Internal error 🤯" });
  }
});

export default router;
