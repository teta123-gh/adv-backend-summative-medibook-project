const { randomBytes } = require('node:crypto');
const appointments = require('../models/appointment.model');
const AppError = require('../utils/app-error');
const { parseId } = require('../utils/validation');
const { validateAppointmentDateTime, toSqlDateTime, utcSlotKey } = require('../utils/appointment-rules');
const { enqueueNotification, enqueueWaitlist, enqueuePromotion } = require('../services/redis-queues');
const { appendAuditEvent } = require('../services/audit-logger');
const { calculateRefund } = require('../utils/refunds');

async function book(req, res) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new AppError('Request body must be a JSON object.', 400);
  }
  if (Object.keys(req.body).some((field) => !['patientId', 'doctorId', 'appointmentDatetime'].includes(field))) {
    throw new AppError('Only patientId, doctorId, and appointmentDatetime may be provided.', 400);
  }
  const patientId = parseId(req.body.patientId, 'patientId');
  const doctorId = parseId(req.body.doctorId, 'doctorId');
  const date = validateAppointmentDateTime(req.body.appointmentDatetime);
  const appointmentDateTime = toSqlDateTime(date);
  const appointmentRef = `MB${randomBytes(8).toString('hex').toUpperCase()}`;

  const outcome = await appointments.createBooking({
    appointmentRef,
    patientId,
    doctorId,
    appointmentDateTime,
    beforeCommit: (appointmentId) => enqueueNotification({ type: 'confirmation', appointmentId }),
  });

  if (outcome.kind !== 'booked') {
    const waitlist = await enqueueWaitlist({
      patientId,
      doctorId,
      appointmentDateTime,
      reason: outcome.kind,
    });
    return res.status(202).json({
      status: 'waitlisted',
      reason: outcome.kind === 'day_full' ? 'doctor_day_capacity_reached' : 'requested_slot_unavailable',
      position: waitlist.position,
      message: 'The slot is unavailable; the patient was added to the waitlist.',
    });
  }

  const appointment = await appointments.findAppointmentById(outcome.appointmentId);
  void appendAuditEvent({
    type: 'booking',
    appointmentId: outcome.appointmentId,
    appointmentRef,
    patientId,
    doctorId,
    appointmentDateTime,
    occurredAt: new Date().toISOString(),
  });
  return res.status(201).json({ appointment });
}

async function cancel(req, res) {
  const appointmentId = parseId(req.params.id, 'appointment id');
  const now = new Date();
  const cancelledAt = now.toISOString().slice(0, 19).replace('T', ' ');
  const appointment = await appointments.findAppointmentById(appointmentId);
  if (!appointment) throw new AppError('Appointment not found.', 404);
  if (appointment.status !== 'confirmed') throw new AppError('Appointment has already been cancelled.', 409);
  const appointmentDate = new Date(`${String(appointment.appointment_datetime).replace(' ', 'T')}Z`);
  const noticeHours = (appointmentDate.getTime() - now.getTime()) / (60 * 60 * 1000);
  const refundAmount = calculateRefund(Number(appointment.amount_paid), Math.max(0, noticeHours));
  const outcome = await appointments.cancelBooking({
    appointmentId,
    cancelledAt,
    refundAmount,
    beforeCommit: ({ appointmentId: id, doctorId, appointmentDateTime }) => enqueuePromotion({
      appointmentId: id,
      doctorId,
      appointmentDateTime,
    }),
  });
  void appendAuditEvent({
    type: 'cancellation',
    appointmentId,
    doctorId: outcome.doctorId,
    appointmentDateTime: outcome.appointmentDateTime,
    amountPaid: outcome.amountPaid,
    refundAmount: outcome.refundAmount,
    occurredAt: now.toISOString(),
  });
  res.json({
    appointmentId,
    status: 'cancelled',
    refundAmount: outcome.refundAmount,
    message: `Cancellation processed with a refund of ${outcome.refundAmount.toFixed(2)}.`,
  });
}

async function get(req, res) {
  const appointment = await appointments.findAppointmentById(parseId(req.params.id, 'appointment id'));
  if (!appointment) throw new AppError('Appointment not found.', 404);
  res.json({ appointment });
}

module.exports = { book, cancel, get };
