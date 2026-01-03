// ===========================================================
// Limitless Design Studio — Chat Route con Redis + control de promociones
// ===========================================================

import express from "express";
import OpenAI from "openai";
import redis from "../utils/redisClient.js";
import fullPrompt from "../prompts/system_full.js";
import lightPrompt from "../prompts/system_light.js";

const router = express.Router();

const PROMPT_MODE = process.env.PROMPT_MODE || "light";
const SYSTEM_PROMPT = PROMPT_MODE === "full" ? fullPrompt : lightPrompt;
const MAX_MEMORY = 5;

console.log(`🚀 Limitless AI iniciado con modo: ${PROMPT_MODE.toUpperCase()}`);

// ===========================================================
// Funciones de memoria persistente (Redis)
// ===========================================================

// Obtener historial reciente
async function getRecentMessages(sessionId) {
  const data = await redis.get(`chat:${sessionId}`);
  return data ? JSON.parse(data) : [];
}

// Guardar mensaje
async function updateHistory(sessionId, role, content) {
  const history = await getRecentMessages(sessionId);
  history.push({ role, content });
  await redis.set(`chat:${sessionId}`, JSON.stringify(history.slice(-MAX_MEMORY * 2)));
}

// Detectar si ya ofreció promoción
async function promoAlreadyMentioned(sessionId) {
  const promoFlag = await redis.get(`promo:${sessionId}`);
  return promoFlag === "true";
}

// Marcar que ya se ofreció la promoción
async function markPromoMentioned(sessionId) {
  await redis.set(`promo:${sessionId}`, "true");
}

// ===========================================================
// Endpoint principal del chat
// ===========================================================
router.post("/", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Falta el mensaje del usuario." });

    const id = sessionId || req.ip;

    const recent = await getRecentMessages(id);
    const promoMentioned = await promoAlreadyMentioned(id);

    // Si ya ofreció la promo, agrega una instrucción dinámica
    let dynamicPrompt = SYSTEM_PROMPT;
    if (promoMentioned) {
      dynamicPrompt += `
Importante: Ya ofreciste la promoción de descuento. 
No vuelvas a mencionarla en tus respuestas futuras durante esta conversación.`;
    }

    const messages = [
      { role: "system", content: dynamicPrompt },
      ...recent,
      { role: "user", content: message },
    ];

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    const reply = completion.choices[0].message.content;

    // Si el mensaje contiene la promo, marca el flag en Redis
    if (reply.toLowerCase().includes("20% de descuento") || reply.toLowerCase().includes("promoción")) {
      await markPromoMentioned(id);
    }

    // Guarda conversación
    await updateHistory(id, "user", message);
    await updateHistory(id, "assistant", reply);

    res.json({ reply });
  } catch (error) {
    console.error("❌ Error en chat:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
