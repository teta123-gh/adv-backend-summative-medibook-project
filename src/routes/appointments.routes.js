const express = require('express');
const controller = require('../controllers/appointments.controller');

const router = express.Router();
router.post('/', controller.book);
router.post('/:id/cancel', controller.cancel);
router.get('/:id', controller.get);

module.exports = router;
