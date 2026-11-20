const doctors = require('../models/doctor.model');
const AppError = require('../utils/app-error');
const { validateDoctor, parseId } = require('../utils/validation');

function mapDatabaseError(error) {
  if (error.code === 'ER_ROW_IS_REFERENCED_2') throw new AppError('This doctor has appointments and cannot be deleted.', 409);
  throw error;
}

async function list(req, res) {
  res.json({ doctors: await doctors.listDoctors() });
}

async function get(req, res) {
  const doctor = await doctors.findDoctorById(parseId(req.params.id, 'doctor id'));
  if (!doctor) throw new AppError('Doctor not found.', 404);
  res.json({ doctor });
}

async function create(req, res) {
  validateDoctor(req.body);
  const id = await doctors.createDoctor(req.body);
  res.status(201).json({ doctor: await doctors.findDoctorById(id) });
}

async function update(req, res) {
  const id = parseId(req.params.id, 'doctor id');
  validateDoctor(req.body, { partial: true });
  if (Object.keys(req.body).length === 0) throw new AppError('Provide at least one doctor field to update.', 400);
  const changed = await doctors.updateDoctor(id, req.body);
  if (!changed && !(await doctors.findDoctorById(id))) throw new AppError('Doctor not found.', 404);
  res.json({ doctor: await doctors.findDoctorById(id) });
}

async function remove(req, res) {
  try {
    const affected = await doctors.deleteDoctor(parseId(req.params.id, 'doctor id'));
    if (!affected) throw new AppError('Doctor not found.', 404);
    res.status(204).end();
  } catch (error) { mapDatabaseError(error); }
}

module.exports = { list, get, create, update, remove };
