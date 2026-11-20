require('dotenv').config();

const { randomBytes } = require('node:crypto');
const { redisClient, connectRedis, disconnectRedis } = require('../config/redis');
const appointments = require('../models/appointment.model');
const { createBooking } = appointments;
const { appendAuditEvent } = require('../services/audit-logger');
const { NOTIFICATION_QUEUE, PROMOTION_QUEUE, enqueueNotification } = require('../services/redis-queues');

const WAITLIST_PROCESSING = 'waitlist:processing';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function slotQueueKey(doctorId, appointmentDateTime) {
  const slot = appointmentDateTime.slice(0, 16).replace(' ', ':');
  return `waitlist:doctor:${doctorId}:slot:${slot}`;
}

function dayQueueKey(doctorId, appointmentDateTime) {
  return `waitlist:doctor:${doctorId}:day:${appointmentDateTime.slice(0, 10)}`;
}

async function requeueNotification(job, reason) {
  const attempts = Number(job.attempts || 0) + 1;
  if (attempts > 10) {
    await appendAuditEvent({ type: 'notification_job_failed', appointmentId: job.appointmentId, reason, occurredAt: new Date().toISOString() });
    return;
  }
  await sleep(Math.min(100 * attempts, 1000));
  await redisClient.rPush(NOTIFICATION_QUEUE, JSON.stringify({ ...job, attempts }));
}

async function processNotification(raw) {
  const job = JSON.parse(raw);
  const details = await appointments.findNotificationDetails(job.appointmentId);
  if (!details) {
    await requeueNotification(job, 'appointment row is not visible yet');
    return;
  }
  await appendAuditEvent({
    type: 'confirmation_notification',
    channel: 'email',
    recipient: details.patient_email,
    message: `Appointment ${details.appointment_ref} confirmed with ${details.doctor_name} (${details.specialty}) at ${details.appointment_datetime} UTC.`,
    appointmentId: details.appointment_id,
    occurredAt: new Date().toISOString(),
  });
}

async function recoverProcessingWaitlist() {
  const stuckEntries = await redisClient.lRange(WAITLIST_PROCESSING, 0, -1);
  for (const raw of stuckEntries) {
    try {
      const entry = JSON.parse(raw);
      if (entry.queueKey) {
        await redisClient.rPush(entry.queueKey, raw);
        await redisClient.lPush(PROMOTION_QUEUE, JSON.stringify({
          appointmentId: null,
          doctorId: entry.doctorId,
          appointmentDateTime: entry.appointmentDateTime,
          attempts: 0,
        }));
      }
    } finally {
      await redisClient.lRem(WAITLIST_PROCESSING, 1, raw);
    }
  }
}

async function reserveNextWaitlistEntry(doctorId, appointmentDateTime) {
  const keys = [
    slotQueueKey(doctorId, appointmentDateTime),
    dayQueueKey(doctorId, appointmentDateTime),
  ];
  for (const queueKey of keys) {
    const raw = await redisClient.rPopLPush(queueKey, WAITLIST_PROCESSING);
    if (raw) return { raw, queueKey };
  }
  return null;
}

async function retryWaitlistEntry(entry, raw, queueKey, reason) {
  const next = { ...entry, queueKey, attempts: Number(entry.attempts || 0) + 1, lastFailure: reason };
  await redisClient.lRem(WAITLIST_PROCESSING, 1, raw);
  // RPush restores the oldest failed entry at the FIFO end; it is never dropped.
  await redisClient.rPush(queueKey, JSON.stringify(next));
  await appendAuditEvent({
    type: 'waitlist_promotion_retry',
    patientId: entry.patientId,
    doctorId: entry.doctorId,
    attempts: next.attempts,
    reason,
    occurredAt: new Date().toISOString(),
  });
}

async function processPromotion(raw) {
  const job = JSON.parse(raw);
  const cancelled = job.appointmentId ? await appointments.findAppointmentById(job.appointmentId) : null;
  if (job.appointmentId && (!cancelled || cancelled.status !== 'cancelled')) {
    const attempts = Number(job.attempts || 0) + 1;
    if (attempts <= 10) {
      await sleep(Math.min(100 * attempts, 1000));
      await redisClient.rPush(PROMOTION_QUEUE, JSON.stringify({ ...job, attempts }));
    } else {
      await appendAuditEvent({ type: 'promotion_job_ignored', appointmentId: job.appointmentId, occurredAt: new Date().toISOString() });
    }
    return;
  }

  const reserved = await reserveNextWaitlistEntry(job.doctorId, job.appointmentDateTime);
  if (!reserved) return;
  const entry = JSON.parse(reserved.raw);
  const freedSlotDateTime = job.appointmentDateTime;
  const existingBooking = await appointments.findConfirmedPatientBooking({
    patientId: entry.patientId,
    doctorId: entry.doctorId,
    appointmentDateTime: freedSlotDateTime,
  });
  if (existingBooking) {
    await redisClient.lRem(WAITLIST_PROCESSING, 1, reserved.raw);
    await appendAuditEvent({
      type: 'waitlist_entry_already_promoted',
      appointmentId: existingBooking.appointment_id,
      patientId: entry.patientId,
      doctorId: entry.doctorId,
      occurredAt: new Date().toISOString(),
    });
    return;
  }
  const appointmentRef = `MB${randomBytes(8).toString('hex').toUpperCase()}`;
  try {
    const result = await createBooking({
      appointmentRef,
      patientId: entry.patientId,
      doctorId: entry.doctorId,
      appointmentDateTime: freedSlotDateTime,
      beforeCommit: (appointmentId) => enqueueNotification({ type: 'confirmation', appointmentId }),
    });
    if (result.kind !== 'booked') {
      await retryWaitlistEntry(entry, reserved.raw, reserved.queueKey, result.kind);
      return;
    }
    await redisClient.lRem(WAITLIST_PROCESSING, 1, reserved.raw);
    await appendAuditEvent({
      type: 'waitlist_promotion_booking',
      appointmentId: result.appointmentId,
      patientId: entry.patientId,
      doctorId: entry.doctorId,
      appointmentDateTime: freedSlotDateTime,
      occurredAt: new Date().toISOString(),
    });
  } catch (error) {
    await retryWaitlistEntry(entry, reserved.raw, reserved.queueKey, error.message);
  }
}

async function main() {
  await connectRedis();
  await recoverProcessingWaitlist();
  console.log('MediBook worker is running.');
  let stopping = false;
  const stop = async () => { stopping = true; };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  while (!stopping) {
    try {
      const notification = await redisClient.rPop(NOTIFICATION_QUEUE);
      if (notification) {
        await processNotification(notification);
        continue;
      }
      const promotion = await redisClient.rPop(PROMOTION_QUEUE);
      if (promotion) {
        await processPromotion(promotion);
        continue;
      }
      await sleep(500);
    } catch (error) {
      console.error('Worker job failed:', error.message);
      await sleep(1000);
    }
  }
  await disconnectRedis();
}

main().catch(async (error) => {
  console.error('Unable to start MediBook worker:', error.message);
  await disconnectRedis();
  process.exitCode = 1;
});
