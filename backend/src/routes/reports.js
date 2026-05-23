const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/reports.controller');

router.use(authenticate);
router.get('/inventory', c.inventoryReport);
router.get('/low-stock', c.lowStockReport);
router.get('/movements', c.movementReport);
router.get('/suppliers', c.supplierReport);

module.exports = router;
