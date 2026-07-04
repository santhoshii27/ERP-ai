import { Router } from 'express';
import { lookupProduct, listWarehouses, receiveStock } from '../controllers/barcodeController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/lookup/:barcode', authenticate, lookupProduct);
router.get('/warehouses', authenticate, listWarehouses);
router.post('/receive', authenticate, receiveStock);

export default router;