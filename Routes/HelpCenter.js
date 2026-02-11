const express = require('express');
const { submitTicket } = require('../Controllers/HelpCenter');

const route = express.Router();

// POST /support/ticket - Submit a support ticket with optional file attachments
route.route('/ticket')
  .post( submitTicket);

module.exports = route;
