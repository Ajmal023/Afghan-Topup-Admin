import { createClient } from "redis";

const redis = createClient();

redis.on("error", (err) => console.error("Redis error:", err));
redis.on("ready", () => console.log("Redis ready"));

export async function initRedis() {
  if (!redis.isOpen) {
    await redis.connect();
    await redis.ping();
  }
}

export default redis;
