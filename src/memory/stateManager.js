import redis from "../utils/redisClient.js";

const TTL = 60 * 60 * 24 * 7; // 7 días de memoria por cliente

/**
 * Obtiene el estado del cliente desde Redis
 */
export async function getState(from) {
  if (!from) return {};

  const raw = await redis.get(from);
  return raw ? JSON.parse(raw) : {};
}

/**
 * Guarda el estado del cliente en Redis
 */
export async function saveState(from, state) {
  if (!from) return;

  const safeState = {
    ...state,
    last_seen: new Date().toISOString(),
  };

  await redis.set(from, JSON.stringify(safeState), "EX", TTL);
}

/**
 * Avanza el paso actual del flujo (medidas, material, etc.)
 */
export function advanceStep(state, nextStep) {
  return {
    ...state,
    step: nextStep,
  };
}

/**
 * Detecta idioma base (simple, rápido y suficiente)
 */
export function detectLanguage(text = "") {
  const lower = text.toLowerCase();

  // Si contiene palabras o estructuras comunes en inglés
  if (
    lower.includes("hello") ||
    lower.includes("hi") ||
    lower.includes("price") ||
    lower.includes("quote") ||
    lower.includes("need") ||
    lower.includes("banner") ||
    lower.includes("sign")
  ) {
    return "en";
  }

  // Default español
  return "es";
}
