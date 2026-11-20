const express = require('express');
const controller = require('../controllers/doctors.controller');

const router = express.Router();
router.route('/').get(controller.list).post(controller.create);
router.get('/reports', controller.report);
router.get('/reports/busy-days', controller.busyDays);
router.get('/:id/stats', controller.statistics);
router.route('/:id').get(controller.get).put(controller.update).patch(controller.update).delete(controller.remove);

module.exports = router;
