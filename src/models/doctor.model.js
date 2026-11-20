const pool = require('../config/db');

const columns = {
  fullName: 'full_name',
  specialty: 'specialty',
  consultationFee: 'consultation_fee',
  room: 'room',
};

async function listDoctors() {
  const [rows] = await pool.execute(
    'SELECT doctor_id, full_name, specialty, consultation_fee, room, created_at FROM doctors ORDER BY doctor_id',
    [],
  );
  return rows;
}

async function findDoctorById(id) {
  const [rows] = await pool.execute(
    'SELECT doctor_id, full_name, specialty, consultation_fee, room, created_at FROM doctors WHERE doctor_id = ?',
    [id],
  );
  return rows[0] || null;
}

async function createDoctor(doctor) {
  const [result] = await pool.execute(
    'INSERT INTO doctors (full_name, specialty, consultation_fee, room) VALUES (?, ?, ?, ?)',
    [doctor.fullName.trim(), doctor.specialty.trim(), Number(doctor.consultationFee), doctor.room.trim()],
  );
  return result.insertId;
}

async function updateDoctor(id, doctor) {
  const fields = Object.keys(doctor).filter((field) => columns[field]);
  const assignments = fields.map((field) => `${columns[field]} = ?`).join(', ');
  const values = fields.map((field) => {
    const value = doctor[field];
    return field === 'consultationFee' ? Number(value) : value.trim();
  });
  const [result] = await pool.execute(
    `UPDATE doctors SET ${assignments} WHERE doctor_id = ?`,
    [...values, id],
  );
  return result.affectedRows;
}

async function deleteDoctor(id) {
  const [result] = await pool.execute('DELETE FROM doctors WHERE doctor_id = ?', [id]);
  return result.affectedRows;
}

module.exports = { listDoctors, findDoctorById, createDoctor, updateDoctor, deleteDoctor };
