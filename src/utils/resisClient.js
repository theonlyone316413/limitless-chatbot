// ===========================================================
// Limitless Design Studio — Conexión Redis
// ===========================================================
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL, {
  tls: { rejectUnauthorized: false }, // importante para conexión segura
});

redis.on("connect", () => console.log("✅ Conectado a Redis correctamente"));
redis.on("error", (err) => console.error("❌ Error de conexión Redis:", err));

export default redis;
