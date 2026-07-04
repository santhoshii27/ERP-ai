import { Router } from 'express';
import { listAlerts, acceptAlert, declineAlert } from '../controllers/aiAlertController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, listAlerts);
router.post('/:id/accept', authenticate, acceptAlert);
router.post('/:id/decline', authenticate, declineAlert);

export default router;