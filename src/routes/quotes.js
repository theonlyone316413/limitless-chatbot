import express from "express";
import OpenAI from "openai";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/", async (req, res) => {
  try {
    const { details } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: "You generate clear, friendly quotes for design and printing services." },
        { role: "user", content: details }
      ],
    });

    res.json({
      quote: completion.choices[0].message.content
    });
  } catch (err) {
    res.status(500).json({ quote: "Error generating quote" });
  }
});

export default router;
