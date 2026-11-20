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

async function getDoctorStatistics(id) {
  const [rows] = await pool.execute(
    `SELECT d.doctor_id,
            COALESCE(SUM(a.amount_paid - a.refund_amount), 0.00) AS revenue_collected,
            COALESCE(SUM(CASE
              WHEN a.status = 'confirmed' AND a.appointment_datetime >= UTC_TIMESTAMP()
              THEN 1 ELSE 0 END), 0) AS upcoming_appointment_count,
            ROUND(COALESCE(SUM(CASE
              WHEN a.status = 'confirmed'
                AND a.appointment_datetime >= UTC_DATE()
                AND a.appointment_datetime < DATE_ADD(UTC_DATE(), INTERVAL 7 DAY)
              THEN 1 ELSE 0 END), 0) / 84 * 100, 2) AS utilization_percent
     FROM doctors d
     LEFT JOIN appointments a ON a.doctor_id = d.doctor_id
     WHERE d.doctor_id = ?
     GROUP BY d.doctor_id`,
    [id],
  );
  if (!rows.length) return null;
  const [days] = await pool.execute(
    `WITH RECURSIVE next_days (appointment_day, day_number) AS (
       SELECT UTC_DATE(), 0
       UNION ALL
       SELECT DATE_ADD(appointment_day, INTERVAL 1 DAY), day_number + 1
       FROM next_days WHERE day_number < 6
     )
     SELECT DATE_FORMAT(next_days.appointment_day, '%Y-%m-%d') AS appointment_date,
            COUNT(a.appointment_id) AS appointment_count,
            ROUND(COUNT(a.appointment_id) / 12 * 100, 2) AS utilization_percent
     FROM next_days
     LEFT JOIN appointments a
       ON a.doctor_id = ?
       AND a.status = 'confirmed'
       AND a.appointment_datetime >= next_days.appointment_day
       AND a.appointment_datetime < DATE_ADD(next_days.appointment_day, INTERVAL 1 DAY)
     GROUP BY next_days.appointment_day, next_days.day_number
     ORDER BY next_days.appointment_day`,
    [id],
  );
  return { ...rows[0], appointments_per_day: days };
}

async function getDoctorsReport() {
  const [rows] = await pool.execute(
    `SELECT d.doctor_id, d.full_name, d.specialty,
            COUNT(a.appointment_id) AS total_appointments,
            COALESCE(SUM(a.amount_paid - a.refund_amount), 0.00) AS revenue_collected
     FROM doctors d
     LEFT JOIN appointments a ON a.doctor_id = d.doctor_id
     GROUP BY d.doctor_id, d.full_name, d.specialty
     ORDER BY d.doctor_id`,
    [],
  );
  return rows;
}

async function getBusyDaysReport() {
  const [rows] = await pool.execute(
    `SELECT d.doctor_id, d.full_name, DATE(a.appointment_datetime) AS appointment_date,
            COUNT(a.appointment_id) AS appointment_count,
            ROUND(COUNT(a.appointment_id) / 12 * 100, 2) AS utilization_percent
     FROM doctors d
     INNER JOIN appointments a ON a.doctor_id = d.doctor_id
     WHERE a.status = 'confirmed'
     GROUP BY d.doctor_id, d.full_name, DATE(a.appointment_datetime)
     HAVING COUNT(a.appointment_id) > 12 * 0.8
     ORDER BY appointment_date, d.doctor_id`,
    [],
  );
  return rows;
}

module.exports = {
  listDoctors,
  findDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorStatistics,
  getDoctorsReport,
  getBusyDaysReport,
};
