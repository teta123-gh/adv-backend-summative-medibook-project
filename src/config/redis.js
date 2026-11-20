const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (error) => {
  console.error('Redis client error:', error.message);
});

async function connectRedis() {
  if (!redisClient.isOpen) await redisClient.connect();
}

async function disconnectRedis() {
  if (redisClient.isOpen) await redisClient.quit();
}

module.exports = { redisClient, connectRedis, disconnectRedis };
