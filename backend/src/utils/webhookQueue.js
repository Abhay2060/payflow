const { Queue } = require("bullmq");

// BullMQ uses Redis as its storage backend.
// The Queue is the producer side — it adds jobs.
// The Worker (webhookWorker.js) is the consumer side — it processes jobs.
//
// We create the queue once here and export it.
// paymentService.js imports this and calls webhookQueue.add() after a payment completes.


// If REDIS_URL is set (like in Railway/Render), parse it
// Otherwise fall back to host/port for local dev
const getConnection = () => {
  const url = new URL(process.env.REDIS_URL);
  return {
    host: url.hostname,
    port: parseInt(url.port || "6379"),
    password: url.password ? decodeURIComponent(url.password) : undefined,
    tls: url.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      return Math.min(times * 500, 5000);
    },
  };
};

const webhookQueue = new Queue("webhooks", {
  connection: getConnection(),
  defaultJobOptions: {
    attempts: 3,                          // retry up to 3 times total
    backoff: {
      type: "exponential",
      delay: 10000,                       // 10s, 20s, 40s between retries
    },
    removeOnComplete: { count: 100 },     // keep last 100 completed jobs for debugging
    removeOnFail: { count: 200 },         // keep last 200 failed jobs
  },
});

module.exports = { webhookQueue, getConnection };
