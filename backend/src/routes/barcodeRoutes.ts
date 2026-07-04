import { Router } from 'express';
import { lookupProduct, listWarehouses, receiveStock } from '../controllers/barcodeController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/lookup/:barcode', authenticate, lookupProduct);
router.get('/warehouses', authenticate, listWarehouses);
router.post('/receive', authenticate, authorize('OWNER', 'MANAGER', 'WAREHOUSE_STAFF'), receiveStock);

export default router;