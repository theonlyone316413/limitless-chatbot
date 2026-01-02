// ===========================================================
// Limitless Design Studio — Selector automático de System Prompt
// Compatible con GitHub + Render + OpenAI
// ===========================================================

// Importa las versiones del prompt
import fullPrompt from './config/systemPrompt_full.js';
import lightPrompt from './config/systemPrompt_light.js';

// Selecciona automáticamente el prompt según el modo configurado
// Puedes cambiar este valor desde Render en "Environment Variables"
const PROMPT_MODE = process.env.PROMPT_MODE || 'light'; // 'light' por defecto

const SYSTEM_PROMPT =
  PROMPT_MODE === 'full' ? fullPrompt : lightPrompt;

console.log(`🚀 Limitless AI iniciado con modo: ${PROMPT_MODE.toUpperCase()}`);

// ===========================================================
// Ejemplo de integración con OpenAI
// ===========================================================

import OpenAI from "openai";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getAIResponse(userMessage) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini", // o el modelo que uses
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  // Retorna la respuesta limpia del asistente
  return completion.choices[0].message.content;
}
