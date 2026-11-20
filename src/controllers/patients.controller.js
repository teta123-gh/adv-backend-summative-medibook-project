const patients = require('../models/patient.model');
const AppError = require('../utils/app-error');
const { validatePatient, parseId } = require('../utils/validation');

function mapDatabaseError(error) {
  if (error.code === 'ER_DUP_ENTRY') throw new AppError('A patient with this email already exists.', 409);
  if (error.code === 'ER_ROW_IS_REFERENCED_2') throw new AppError('This patient has appointments and cannot be deleted.', 409);
  throw error;
}

async function list(req, res) {
  res.json({ patients: await patients.listPatients() });
}

async function get(req, res) {
  const patient = await patients.findPatientById(parseId(req.params.id, 'patient id'));
  if (!patient) throw new AppError('Patient not found.', 404);
  res.json({ patient });
}

async function create(req, res) {
  validatePatient(req.body);
  try {
    const id = await patients.createPatient(req.body);
    res.status(201).json({ patient: await patients.findPatientById(id) });
  } catch (error) { mapDatabaseError(error); }
}

async function update(req, res) {
  const id = parseId(req.params.id, 'patient id');
  validatePatient(req.body, { partial: true });
  if (Object.keys(req.body).length === 0) throw new AppError('Provide at least one patient field to update.', 400);
  try {
    const changed = await patients.updatePatient(id, req.body);
    if (!changed && !(await patients.findPatientById(id))) throw new AppError('Patient not found.', 404);
    res.json({ patient: await patients.findPatientById(id) });
  } catch (error) { mapDatabaseError(error); }
}

async function remove(req, res) {
  try {
    const affected = await patients.deletePatient(parseId(req.params.id, 'patient id'));
    if (!affected) throw new AppError('Patient not found.', 404);
    res.status(204).end();
  } catch (error) { mapDatabaseError(error); }
}

module.exports = { list, get, create, update, remove };
