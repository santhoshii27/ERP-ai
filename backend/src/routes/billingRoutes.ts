import { Router } from 'express';
import { checkout, listCustomers, getInvoice, createCustomer } from '../controllers/billingController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/checkout', authenticate, authorize('OWNER', 'MANAGER', 'CASHIER', 'SALESPERSON'), checkout);
router.get('/customers', authenticate, listCustomers);
router.post('/customers', authenticate, createCustomer);
router.get('/invoice/:id', authenticate, getInvoice);

export default router;