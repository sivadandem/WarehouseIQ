const router = require('express').Router();
const { getSummary } = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');

router.get('/summary', authenticate, getSummary);

module.exports = router;
