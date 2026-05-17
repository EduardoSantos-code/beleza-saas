import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __redis__: Redis | undefined;
}

const REDIS_URL = process.env.REDIS_URL;

export function getRedis() {
  if (!REDIS_URL) return null;

  if (!global.__redis__) {
    global.__redis__ = new Redis(REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
    });

    global.__redis__.on("error", (error) => {
      console.error("[REDIS_ERROR]", error);
    });
  }

  return global.__redis__;
}
