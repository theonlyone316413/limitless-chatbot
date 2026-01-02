// ===========================================================
// Limitless Design Studio — Selector automático de System Prompt
// Compatible con GitHub + Render + OpenAI
// ===========================================================

import express from "express";
import OpenAI from "openai";

// Importa las versiones del prompt
import fullPrompt from "../prompts/system_full.js";
import lightPrompt from "../prompts/system_light.js";

const router = express.Router();

// Selecciona automáticamente el prompt según el modo configurado
// Puedes cambiar este valor desde Render en "Environment Variables"
const PROMPT_MODE = process.env.PROMPT_MODE || "light"; // 'light' por defecto
const SYSTEM_PROMPT = PROMPT_MODE === "full" ? fullPrompt : lightPrompt;

console.log(`🚀 Limitless AI iniciado con modo: ${PROMPT_MODE.toUpperCase()}`);

// ===========================================================
// Integración con OpenAI
// ===========================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Endpoint principal del chat
router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("❌ Error en chat:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
