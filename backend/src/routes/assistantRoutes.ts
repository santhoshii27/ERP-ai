import { Router } from 'express';
import { askAssistant } from '../controllers/assistantController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/ask', authenticate, askAssistant);

export default router;