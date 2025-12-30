const express = require('express');
const router = express.Router();
const controller = require('../Controllers/Notification');

router.post('/', controller.create);
router.put('/:id', controller.update);
router.post('/:id/cancel', controller.cancel);
router.post('/:id/send', controller.sendNow);
router.get('/pending', controller.getPending);
router.get('/history', controller.getHistory);
router.get('/:id', controller.getOne);

module.exports = router;
