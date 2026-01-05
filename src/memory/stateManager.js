import redis from "../utils/redisClient.js";

const TTL = 60 * 60 * 24 * 7; // 7 días

export async function getState(from) {
  const raw = await redis.get(from);
  return raw ? JSON.parse(raw) : {};
}

export async function saveState(from, state) {
  const safeState = {
    ...state,
    last_seen: new Date().toISOString(),
  };

  await redis.set(from, JSON.stringify(safeState), "EX", TTL);
}
