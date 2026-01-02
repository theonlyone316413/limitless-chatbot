// ===========================================================
// Limitless Design Studio — Chat Route
// Integración con OpenAI + Selector automático de System Prompt
// Compatible con Render y GitHub
// ===========================================================

import express from "express";
import OpenAI from "openai";

// ====== Importa los prompts (ruta correcta) ======
import fullPrompt from "../prompts/system_full.js";
import lightPrompt from "../prompts/system_light.js";

const router = express.Router();

// ====== Selección automática del prompt ======
const PROMPT_MODE = process.env.PROMPT_MODE || "light"; // usa 'light' por defecto
const SYSTEM_PROMPT = PROMPT_MODE === "full" ? fullPrompt : lightPrompt;

console.log(`🚀 Limitless AI iniciado con modo: ${PROMPT_MODE.toUpperCase()}`);

// ====== Inicializa OpenAI ======
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ====== Endpoint principal del chat ======
router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Falta el mensaje del usuario." });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // o el modelo que estés usando
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
