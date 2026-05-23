const router = require('express').Router();
const { getLogs } = require('../controllers/logs.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('admin','manager'), getLogs);

module.exports = router;
