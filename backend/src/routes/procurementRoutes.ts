import { Router } from 'express';
import { listSuppliers, listPurchaseOrders, markDelivered } from '../controllers/procurementController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/suppliers', authenticate, authorize('OWNER', 'MANAGER', 'PROCUREMENT_MANAGER'), listSuppliers);
router.get('/purchase-orders', authenticate, authorize('OWNER', 'MANAGER', 'PROCUREMENT_MANAGER'), listPurchaseOrders);
router.post('/purchase-orders/:id/deliver', authenticate, authorize('OWNER', 'MANAGER', 'PROCUREMENT_MANAGER'), markDelivered);

export default router;