// ===========================================================
// Limitless Design Studio — Conexión Redis (auto TLS/off)
// ===========================================================

import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL, {
  // Desactiva TLS si la conexión es redis:// (no rediss://)
  tls: process.env.REDIS_URL.startsWith("rediss://")
    ? { rejectUnauthorized: false }
    : undefined,
});

redis.on("connect", () => console.log("✅ Conectado a Redis correctamente"));
redis.on("error", (err) =>
  console.error("❌ Error de conexión Redis:", err)
);

export default redis;
