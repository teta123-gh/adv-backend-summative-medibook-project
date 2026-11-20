-- Sample data for MediBook. Run after schema.sql.
-- Doctor 1 has 10 appointments on one day (near the 12-appointment cap).
-- Doctor 3 intentionally has no appointments for zero-appointment reports.

USE medibook;

INSERT INTO patients (patient_id, full_name, email, phone) VALUES
  (1, 'Ama Mensah', 'ama.mensah@example.com', '+233244111222'),
  (2, 'Kojo Owusu', 'kojo.owusu@example.com', '+233555333444'),
  (3, 'Abena Boateng', 'abena.boateng@example.com', '+233201234567');

INSERT INTO doctors (doctor_id, full_name, specialty, consultation_fee, room) VALUES
  (1, 'Dr. Kofi Boateng', 'Dermatology', 150.00, 'R-12'),
  (2, 'Dr. Efua Adjei', 'Paediatrics', 100.00, 'R-03'),
  (3, 'Dr. Kwame Asare', 'Cardiology', 200.00, 'R-08');

INSERT INTO appointments
  (appointment_ref, patient_id, doctor_id, appointment_datetime, booked_at, amount_paid)
VALUES
  ('MB-20261201-001', 1, 1, '2026-12-01 09:00:00', '2026-11-19 09:00:00', 150.00),
  ('MB-20261201-002', 2, 1, '2026-12-01 09:30:00', '2026-11-19 09:05:00', 150.00),
  ('MB-20261201-003', 3, 1, '2026-12-01 10:00:00', '2026-11-19 09:10:00', 150.00),
  ('MB-20261201-004', 1, 1, '2026-12-01 10:30:00', '2026-11-19 09:15:00', 150.00),
  ('MB-20261201-005', 2, 1, '2026-12-01 11:00:00', '2026-11-19 09:20:00', 150.00),
  ('MB-20261201-006', 3, 1, '2026-12-01 11:30:00', '2026-11-19 09:25:00', 150.00),
  ('MB-20261201-007', 1, 1, '2026-12-01 12:00:00', '2026-11-19 09:30:00', 150.00),
  ('MB-20261201-008', 2, 1, '2026-12-01 12:30:00', '2026-11-19 09:35:00', 150.00),
  ('MB-20261201-009', 3, 1, '2026-12-01 13:00:00', '2026-11-19 09:40:00', 150.00),
  ('MB-20261201-010', 1, 1, '2026-12-01 13:30:00', '2026-11-19 09:45:00', 150.00),
  ('MB-20261202-001', 2, 2, '2026-12-02 10:00:00', '2026-11-19 10:00:00', 100.00);
