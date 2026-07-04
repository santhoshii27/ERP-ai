import { Router } from 'express';
import { getSalesReport, getGstReport, getInventoryReport, exportReport } from '../controllers/reportsController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/sales', authenticate, authorize('OWNER', 'MANAGER', 'AUDITOR'), getSalesReport);
router.get('/gst', authenticate, authorize('OWNER', 'MANAGER', 'AUDITOR'), getGstReport);
router.get('/inventory', authenticate, authorize('OWNER', 'MANAGER', 'AUDITOR'), getInventoryReport);
router.get('/export', authenticate, authorize('OWNER', 'MANAGER', 'AUDITOR'), exportReport);

export default router;