const express = require('express');
const router = express.Router();
const { handleRequest } = require('../controllers/gatewayController');

// API Gateway endpoint
// Supports both /api/v1/number and /api/v1/host/api/pan formats
router.all('/*', (req, res, next) => {
  // Extract endpoint from params
  req.params.endpoint = req.params[0];
  next();
}, handleRequest);

module.exports = router;
