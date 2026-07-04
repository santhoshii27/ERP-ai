import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import aiAlertRoutes from './routes/aiAlertRoutes';
import barcodeRoutes from './routes/barcodeRoutes';
import billingRoutes from './routes/billingRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import procurementRoutes from './routes/procurementRoutes';
import reportsRoutes from './routes/reportsRoutes';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Indian ERP backend is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai-alerts', aiAlertRoutes);
app.use('/api/barcode', barcodeRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/reports', reportsRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});