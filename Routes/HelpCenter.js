const express = require('express');
const { submitTicket } = require('../Controllers/HelpCenter');
const { upload } = require('../utils/Multer');

const route = express.Router();

// POST /support/ticket - Submit a support ticket with optional file attachments
route.route('/ticket')
  .post(upload.array('attachments', 3), submitTicket);

module.exports = route;
