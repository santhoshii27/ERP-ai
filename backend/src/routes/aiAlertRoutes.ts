import { Router } from 'express';
import { listAlerts, acceptAlert, declineAlert } from '../controllers/aiAlertController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, listAlerts);
router.post('/:id/accept', authenticate, authorize('OWNER', 'MANAGER'), acceptAlert);
router.post('/:id/decline', authenticate, authorize('OWNER', 'MANAGER'), declineAlert);

export default router;