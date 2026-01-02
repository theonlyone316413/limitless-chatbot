// ===========================================================
// Limitless Design Studio — Chat Route con memoria parcial
// Optimizado para menor uso de tokens
// ===========================================================

import express from "express";
import OpenAI from "openai";
import fullPrompt from "../prompts/system_full.js";
import lightPrompt from "../prompts/system_light.js";

const router = express.Router();

// ====== Selección automática de prompt ======
const PROMPT_MODE = process.env.PROMPT_MODE || "light";
const SYSTEM_PROMPT = PROMPT_MODE === "full" ? fullPrompt : lightPrompt;
console.log(`🚀 Limitless AI iniciado con modo: ${PROMPT_MODE.toUpperCase()}`);

// ====== Inicializa OpenAI ======
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ====== Memoria temporal (en RAM) ======
const conversationHistory = new Map(); // almacena historial por sesión o IP
const MAX_MEMORY = 5; // número de mensajes recientes a conservar

// ====== Función para mantener las últimas N interacciones ======
function getRecentMessages(sessionId) {
  const history = conversationHistory.get(sessionId) || [];
  return history.slice(-MAX_MEMORY);
}

// ====== Guardar nuevos mensajes ======
function updateHistory(sessionId, role, content) {
  const history = conversationHistory.get(sessionId) || [];
  history.push({ role, content });
  conversationHistory.set(sessionId, history.slice(-MAX_MEMORY * 2)); // conserva contexto limitado
}

// ====== Ruta principal del chat ======
router.post("/", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Falta el mensaje del usuario." });

    const id = sessionId || req.ip; // identifica sesión (puedes usar tu propio ID)

    // Obtiene últimas interacciones
    const recent = getRecentMessages(id);

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...recent,
      { role: "user", content: message },
    ];

    // Llamada a OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    const reply = completion.choices[0].message.content;

    // Guarda mensaje del usuario y respuesta del bot
    updateHistory(id, "user", message);
    updateHistory(id, "assistant", reply);

    res.json({ reply });
  } catch (error) {
    console.error("❌ Error en chat:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
