const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL, {
  lazyConnect: true,
  retryStrategy(times) {
    return Math.min(times * 100, 3000);
  },
});

redis.on("connect", () => console.log("Redis connected"));
redis.on("error", (err) => console.error(`Redis error: ${err.message}`));

const connectRedis = async () => {
  await redis.connect();
};

module.exports = { redis, connectRedis };
