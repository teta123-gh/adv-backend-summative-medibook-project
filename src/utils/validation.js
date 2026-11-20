const AppError = require('./app-error');

function requireObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Request body must be a JSON object.', 400);
  }
}

function validatePatient(body, { partial = false } = {}) {
  requireObject(body);
  const fields = ['fullName', 'email', 'phone'];
  if (!partial && fields.some((field) => body[field] === undefined)) {
    throw new AppError('fullName, email, and phone are required.', 400);
  }
  if (Object.keys(body).some((field) => !fields.includes(field))) {
    throw new AppError('Only fullName, email, and phone may be provided.', 400);
  }
  for (const field of fields) {
    if (body[field] !== undefined && (typeof body[field] !== 'string' || !body[field].trim())) {
      throw new AppError(`${field} must be a non-empty string.`, 400);
    }
  }
  if (body.fullName && body.fullName.trim().length > 120) {
    throw new AppError('fullName must be 120 characters or fewer.', 400);
  }
  if (body.email && (!/^\S+@\S+\.\S+$/.test(body.email.trim()) || body.email.length > 255)) {
    throw new AppError('email must be a valid address of at most 255 characters.', 400);
  }
  if (body.phone && body.phone.trim().length > 30) {
    throw new AppError('phone must be 30 characters or fewer.', 400);
  }
}

function validateDoctor(body, { partial = false } = {}) {
  requireObject(body);
  const fields = ['fullName', 'specialty', 'consultationFee', 'room'];
  if (!partial && fields.some((field) => body[field] === undefined)) {
    throw new AppError('fullName, specialty, consultationFee, and room are required.', 400);
  }
  if (Object.keys(body).some((field) => !fields.includes(field))) {
    throw new AppError('Only fullName, specialty, consultationFee, and room may be provided.', 400);
  }
  for (const field of ['fullName', 'specialty', 'room']) {
    if (body[field] !== undefined && (typeof body[field] !== 'string' || !body[field].trim())) {
      throw new AppError(`${field} must be a non-empty string.`, 400);
    }
  }
  const limits = { fullName: 120, specialty: 100, room: 30 };
  for (const [field, limit] of Object.entries(limits)) {
    if (body[field] && body[field].trim().length > limit) {
      throw new AppError(`${field} must be ${limit} characters or fewer.`, 400);
    }
  }
  if (body.consultationFee !== undefined
    && (!Number.isFinite(Number(body.consultationFee)) || Number(body.consultationFee) < 0)) {
    throw new AppError('consultationFee must be a non-negative number.', 400);
  }
}

function parseId(value, name = 'id') {
  if (!/^[1-9]\d*$/.test(value)) throw new AppError(`${name} must be a positive integer.`, 400);
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new AppError(`${name} is outside the supported range.`, 400);
  return number;
}

module.exports = { validatePatient, validateDoctor, parseId };
