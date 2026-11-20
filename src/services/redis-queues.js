const { redisClient } = require('../config/redis');

const NOTIFICATION_QUEUE = 'jobs:notifications';
const PROMOTION_QUEUE = 'jobs:waitlist-promotions';

async function enqueueNotification(job) {
  try {
    await redisClient.lPush(NOTIFICATION_QUEUE, JSON.stringify(job));
  } catch (cause) {
    const error = new Error('Redis is unavailable; the appointment transaction was not completed.');
    error.statusCode = 503;
    error.cause = cause;
    throw error;
  }
}

async function enqueueWaitlist({ patientId, doctorId, appointmentDateTime, reason }) {
  const slot = appointmentDateTime.slice(0, 16).replace(' ', ':');
  const scope = reason === 'slot_full' ? 'slot' : 'day';
  const key = scope === 'slot'
    ? `waitlist:doctor:${doctorId}:slot:${slot}`
    : `waitlist:doctor:${doctorId}:day:${appointmentDateTime.slice(0, 10)}`;
  const entry = { patientId, doctorId, appointmentDateTime, queueKey: key, attempts: 0, enqueuedAt: new Date().toISOString() };
  let position;
  try {
    position = await redisClient.lPush(key, JSON.stringify(entry));
  } catch (cause) {
    const error = new Error('Redis is unavailable; the patient could not be added to the waitlist.');
    error.statusCode = 503;
    error.cause = cause;
    throw error;
  }
  return { key, position };
}

async function enqueuePromotion({ appointmentId, doctorId, appointmentDateTime }) {
  try {
    await redisClient.lPush(PROMOTION_QUEUE, JSON.stringify({ appointmentId, doctorId, appointmentDateTime, attempts: 0 }));
  } catch (cause) {
    const error = new Error('Redis is unavailable; cancellation and refund were not completed.');
    error.statusCode = 503;
    error.cause = cause;
    throw error;
  }
}

module.exports = {
  NOTIFICATION_QUEUE,
  PROMOTION_QUEUE,
  enqueueNotification,
  enqueueWaitlist,
  enqueuePromotion,
};
