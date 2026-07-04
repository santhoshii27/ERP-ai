import { Router } from 'express';
import { getSalesTrends, getCategoryBreakdown, getCustomerInsights } from '../controllers/analyticsController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/sales-trends', authenticate, authorize('OWNER', 'MANAGER', 'AUDITOR'), getSalesTrends);
router.get('/category-breakdown', authenticate, authorize('OWNER', 'MANAGER', 'AUDITOR'), getCategoryBreakdown);
router.get('/customer-insights', authenticate, authorize('OWNER', 'MANAGER', 'AUDITOR'), getCustomerInsights);

export default router;