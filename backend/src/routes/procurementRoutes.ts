import { Router } from 'express';
import { listSuppliers, listPurchaseOrders, markDelivered } from '../controllers/procurementController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/suppliers', authenticate, listSuppliers);
router.get('/purchase-orders', authenticate, listPurchaseOrders);
router.post('/purchase-orders/:id/deliver', authenticate, markDelivered);

export default router;