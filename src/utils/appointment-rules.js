const AppError = require('./app-error');

const UTC_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function parseUtcDateTime(value) {
  if (typeof value !== 'string' || !UTC_DATETIME_PATTERN.test(value)) {
    throw new AppError('appointmentDatetime must use ISO UTC format YYYY-MM-DDTHH:mm:ssZ.', 400);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().replace('.000Z', 'Z') !== value) {
    throw new AppError('appointmentDatetime is not a valid calendar date and time.', 400);
  }
  return parsed;
}

function validateAppointmentDateTime(value, now = new Date()) {
  const date = parseUtcDateTime(value);
  if (date.getTime() <= now.getTime()) {
    throw new AppError('Appointments must be booked in the future.', 422);
  }
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();
  if (hour < 9 || hour >= 17 || ![0, 30].includes(minute) || second !== 0) {
    throw new AppError('Choose a 30-minute slot between 09:00 and 16:30 UTC.', 422);
  }
  return date;
}

function toSqlDateTime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function utcDayRange(date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: toSqlDateTime(start), end: toSqlDateTime(end) };
}

function utcDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function utcSlotKey(date) {
  return `${utcDateKey(date)}:${date.toISOString().slice(11, 16)}`;
}

module.exports = {
  parseUtcDateTime,
  validateAppointmentDateTime,
  toSqlDateTime,
  utcDayRange,
  utcDateKey,
  utcSlotKey,
};
