-- MediBook database schema (MySQL 8.0.16+)
-- The application validates that appointment_datetime is in the future and
-- enforces the 12-active-appointments-per-doctor-per-day cap transactionally.

CREATE DATABASE IF NOT EXISTS medibook
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE medibook;

CREATE TABLE IF NOT EXISTS patients (
  patient_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (patient_id),
  CONSTRAINT uq_patients_email UNIQUE (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS doctors (
  doctor_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  consultation_fee DECIMAL(10, 2) NOT NULL,
  room VARCHAR(30) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (doctor_id),
  CONSTRAINT chk_doctors_consultation_fee CHECK (consultation_fee >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS appointments (
  appointment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  appointment_ref VARCHAR(20) NOT NULL,
  patient_id BIGINT UNSIGNED NOT NULL,
  doctor_id BIGINT UNSIGNED NOT NULL,
  appointment_datetime DATETIME NOT NULL,
  booked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  amount_paid DECIMAL(10, 2) NOT NULL,
  status ENUM('confirmed', 'cancelled') NOT NULL DEFAULT 'confirmed',
  cancelled_at DATETIME NULL,
  refund_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  active_doctor_id BIGINT UNSIGNED
    GENERATED ALWAYS AS (
      CASE WHEN status = 'confirmed' THEN doctor_id ELSE NULL END
    ) STORED,
  PRIMARY KEY (appointment_id),
  CONSTRAINT uq_appointments_ref UNIQUE (appointment_ref),
  CONSTRAINT uq_appointments_active_doctor_slot
    UNIQUE (active_doctor_id, appointment_datetime),
  CONSTRAINT fk_appointments_patient
    FOREIGN KEY (patient_id) REFERENCES patients (patient_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctors (doctor_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_appointments_slot CHECK (
    TIME(appointment_datetime) >= '09:00:00'
    AND TIME(appointment_datetime) < '17:00:00'
    AND MINUTE(appointment_datetime) IN (0, 30)
    AND SECOND(appointment_datetime) = 0
  ),
  CONSTRAINT chk_appointments_amounts CHECK (
    amount_paid >= 0 AND refund_amount >= 0 AND refund_amount <= amount_paid
  ),
  CONSTRAINT chk_appointments_cancellation_state CHECK (
    (status = 'confirmed' AND cancelled_at IS NULL AND refund_amount = 0)
    OR (status = 'cancelled' AND cancelled_at IS NOT NULL)
  ),
  INDEX ix_appointments_patient (patient_id),
  INDEX ix_appointments_doctor_day (doctor_id, appointment_datetime, status)
) ENGINE=InnoDB;
