const express = require('express');

const router = express.Router();
const patientsRoutes = require('./patients.routes');
const doctorsRoutes = require('./doctors.routes');
const appointmentsRoutes = require('./appointments.routes');
const feedbackRoutes = require('./feedback.routes');

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'medibook-api' });
});
router.use('/api/patients', patientsRoutes);
router.use('/api/doctors', doctorsRoutes);
router.use('/api/appointments', appointmentsRoutes);
router.use('/', feedbackRoutes);

module.exports = router;
