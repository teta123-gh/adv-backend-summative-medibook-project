const pool = require('../config/db');

const columns = {
  fullName: 'full_name',
  email: 'email',
  phone: 'phone',
};

async function listPatients() {
  const [rows] = await pool.execute(
    'SELECT patient_id, full_name, email, phone, created_at FROM patients ORDER BY patient_id',
    [],
  );
  return rows;
}

async function findPatientById(id) {
  const [rows] = await pool.execute(
    'SELECT patient_id, full_name, email, phone, created_at FROM patients WHERE patient_id = ?',
    [id],
  );
  return rows[0] || null;
}

async function createPatient(patient) {
  const [result] = await pool.execute(
    'INSERT INTO patients (full_name, email, phone) VALUES (?, ?, ?)',
    [patient.fullName.trim(), patient.email.trim(), patient.phone.trim()],
  );
  return result.insertId;
}

async function updatePatient(id, patient) {
  const fields = Object.keys(patient).filter((field) => columns[field]);
  const assignments = fields.map((field) => `${columns[field]} = ?`).join(', ');
  const values = fields.map((field) => typeof patient[field] === 'string' ? patient[field].trim() : patient[field]);
  const [result] = await pool.execute(
    `UPDATE patients SET ${assignments} WHERE patient_id = ?`,
    [...values, id],
  );
  return result.affectedRows;
}

async function deletePatient(id) {
  const [result] = await pool.execute('DELETE FROM patients WHERE patient_id = ?', [id]);
  return result.affectedRows;
}

module.exports = { listPatients, findPatientById, createPatient, updatePatient, deletePatient };
