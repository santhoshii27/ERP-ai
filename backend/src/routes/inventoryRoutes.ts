import { Router } from 'express';
import { listInventory, adjustStock } from '../controllers/inventoryController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, listInventory);
router.post('/adjust', authenticate, adjustStock);

export default router;