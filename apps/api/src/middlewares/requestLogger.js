import redis from "../utils/redis.js";

export async function requestLogger(req, _res, next) {
  try {
    const dayKey = `requests:${new Date().toISOString().slice(0, 10)}`;
    await redis.incr(dayKey); 
  } catch (err) {
    console.error("RequestLogger error:", err.message);
  }
  next();
}
