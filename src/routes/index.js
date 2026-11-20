const express = require('express');

const router = express.Router();
const patientsRoutes = require('./patients.routes');
const doctorsRoutes = require('./doctors.routes');

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'medibook-api' });
});
router.use('/api/patients', patientsRoutes);
router.use('/api/doctors', doctorsRoutes);

module.exports = router;
