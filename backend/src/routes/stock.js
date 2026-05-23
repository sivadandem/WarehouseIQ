const router = require('express').Router();
const { stockIn, stockOut, getHistory } = require('../controllers/stock.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.post('/in', authorize('admin','manager','staff'), stockIn);
router.post('/out', authorize('admin','manager','staff'), stockOut);
router.get('/history', getHistory);

module.exports = router;
