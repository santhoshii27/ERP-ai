import { Router } from 'express';
import { checkout, listCustomers, getInvoice } from '../controllers/billingController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/checkout', authenticate, checkout);
router.get('/customers', authenticate, listCustomers);
router.get('/invoice/:id', authenticate, getInvoice);

export default router;