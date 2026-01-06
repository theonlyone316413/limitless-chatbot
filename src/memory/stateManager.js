// src/memory/stateManager.js
// Manejo de estado con Redis (compatible con chat.js)

import redis from "../utils/redisClient.js";

// =============================
// 🔹 OBTENER ESTADO DEL USUARIO
// =============================
export async function getState(key) {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("❌ Error getState:", error);
    return null;
  }
}

// =============================
// 🔹 GUARDAR ESTADO DEL USUARIO
// =============================
export async function saveState(key, state) {
  try {
    await redis.set(key, JSON.stringify(state));
  } catch (error) {
    console.error("❌ Error saveState:", error);
  }
}

// =============================
// 🔹 LIMPIAR ESTADO (opcional)
// =============================
export async function clearState(key) {
  try {
    await redis.del(key);
  } catch (error) {
    console.error("❌ Error clearState:", error);
  }
}
