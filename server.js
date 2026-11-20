require('dotenv').config();

const app = require('./src/app');
const { connectRedis, disconnectRedis } = require('./src/config/redis');

const port = Number(process.env.PORT || 3000);

async function start() {
  await connectRedis();
  const server = app.listen(port, () => {
    console.log(`MediBook API listening on port ${port}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await disconnectRedis();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error('Unable to start MediBook API:', error.message);
  process.exitCode = 1;
});
