const express = require('express');
const router = express.Router();
const controller = require('../Controllers/Notification');
const Verify=require('../Middleware/Verify')

router.post('/', Verify,controller.create);
router.put('/:id', Verify,controller.update);
router.post('/:id/cancel', Verify,controller.cancel);
router.post('/:id/send', Verify,controller.sendNow);
router.get('/pending', Verify,controller.getPending);
router.get('/history', Verify,controller.getHistory);
router.get('/:id', Verify,controller.getOne);

module.exports = router;
