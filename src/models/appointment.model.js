const pool = require('../config/db');

async function createBooking({ appointmentRef, patientId, doctorId, appointmentDateTime, beforeCommit }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [doctors] = await connection.execute(
      'SELECT doctor_id, consultation_fee FROM doctors WHERE doctor_id = ? FOR UPDATE',
      [doctorId],
    );
    if (!doctors.length) {
      const error = new Error('Doctor not found.');
      error.statusCode = 404;
      throw error;
    }

    const [patients] = await connection.execute(
      'SELECT patient_id FROM patients WHERE patient_id = ?',
      [patientId],
    );
    if (!patients.length) {
      const error = new Error('Patient not found.');
      error.statusCode = 404;
      throw error;
    }

    const dayStart = appointmentDateTime.slice(0, 10) + ' 00:00:00';
    const nextDay = new Date(`${appointmentDateTime.slice(0, 10)}T00:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const dayEnd = nextDay.toISOString().slice(0, 19).replace('T', ' ');
    const [counts] = await connection.execute(
      `SELECT COUNT(*) AS appointment_count
       FROM appointments
       WHERE doctor_id = ? AND status = 'confirmed'
         AND appointment_datetime >= ? AND appointment_datetime < ?`,
      [doctorId, dayStart, dayEnd],
    );
    if (Number(counts[0].appointment_count) >= 12) {
      await connection.rollback();
      return { kind: 'day_full' };
    }

    const [result] = await connection.execute(
      `INSERT INTO appointments
         (appointment_ref, patient_id, doctor_id, appointment_datetime, amount_paid)
       VALUES (?, ?, ?, ?, ?)`,
      [appointmentRef, patientId, doctorId, appointmentDateTime, doctors[0].consultation_fee],
    );
    if (beforeCommit) await beforeCommit(result.insertId);
    await connection.commit();
    return { kind: 'booked', appointmentId: result.insertId, amountPaid: doctors[0].consultation_fee };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return { kind: 'slot_full' };
    throw error;
  } finally {
    connection.release();
  }
}

async function cancelBooking({ appointmentId, cancelledAt, refundAmount, beforeCommit }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT appointment_id, doctor_id, appointment_datetime, amount_paid, status
       FROM appointments WHERE appointment_id = ? FOR UPDATE`,
      [appointmentId],
    );
    if (!rows.length) {
      const error = new Error('Appointment not found.');
      error.statusCode = 404;
      throw error;
    }
    const appointment = rows[0];
    if (appointment.status !== 'confirmed') {
      const error = new Error('Appointment has already been cancelled.');
      error.statusCode = 409;
      throw error;
    }
    const appointmentDateTime = appointment.appointment_datetime instanceof Date
      ? appointment.appointment_datetime.toISOString().slice(0, 19).replace('T', ' ')
      : String(appointment.appointment_datetime);
    await connection.execute(
      `UPDATE appointments
       SET status = 'cancelled', cancelled_at = ?, refund_amount = ?
       WHERE appointment_id = ?`,
      [cancelledAt, refundAmount, appointmentId],
    );
    if (beforeCommit) {
      await beforeCommit({
        appointmentId,
        doctorId: appointment.doctor_id,
        appointmentDateTime,
      });
    }
    await connection.commit();
    return {
      appointmentId,
      doctorId: appointment.doctor_id,
      appointmentDateTime,
      amountPaid: Number(appointment.amount_paid),
      refundAmount,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function findAppointmentById(id) {
  const [rows] = await pool.execute(
    `SELECT appointment_id, appointment_ref, patient_id, doctor_id,
            DATE_FORMAT(appointment_datetime, '%Y-%m-%d %H:%i:%s') AS appointment_datetime,
            booked_at, amount_paid, status,
            cancelled_at, refund_amount
     FROM appointments WHERE appointment_id = ?`,
    [id],
  );
  return rows[0] || null;
}

async function findNotificationDetails(id) {
  const [rows] = await pool.execute(
    `SELECT a.appointment_id, a.appointment_ref,
            DATE_FORMAT(a.appointment_datetime, '%Y-%m-%d %H:%i:%s') AS appointment_datetime,
            a.status, p.full_name AS patient_name, p.email AS patient_email,
            d.full_name AS doctor_name, d.specialty
     FROM appointments a
     INNER JOIN patients p ON p.patient_id = a.patient_id
     INNER JOIN doctors d ON d.doctor_id = a.doctor_id
     WHERE a.appointment_id = ?`,
    [id],
  );
  return rows[0] || null;
}

async function findConfirmedPatientBooking({ patientId, doctorId, appointmentDateTime }) {
  const dayStart = appointmentDateTime.slice(0, 10) + ' 00:00:00';
  const nextDay = new Date(`${appointmentDateTime.slice(0, 10)}T00:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const dayEnd = nextDay.toISOString().slice(0, 19).replace('T', ' ');
  const [rows] = await pool.execute(
    `SELECT appointment_id FROM appointments
     WHERE patient_id = ? AND doctor_id = ? AND status = 'confirmed'
       AND appointment_datetime >= ? AND appointment_datetime < ?
     LIMIT 1`,
    [patientId, doctorId, dayStart, dayEnd],
  );
  return rows[0] || null;
}

module.exports = {
  createBooking,
  cancelBooking,
  findAppointmentById,
  findNotificationDetails,
  findConfirmedPatientBooking,
};
