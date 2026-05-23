const router = require('express').Router();
const c = require('../controllers/purchaseOrders.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.getAll);
router.get('/:id', c.getOne);
router.post('/', authorize('admin','manager'), c.create);
router.patch('/:id/status', authorize('admin','manager'), c.updateStatus);
router.delete('/:id', authorize('admin'), c.remove);

module.exports = router;
