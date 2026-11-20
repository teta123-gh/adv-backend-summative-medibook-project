const express = require('express');
const controller = require('../controllers/patients.controller');

const router = express.Router();
router.route('/').get(controller.list).post(controller.create);
router.route('/:id').get(controller.get).put(controller.update).patch(controller.update).delete(controller.remove);

module.exports = router;
