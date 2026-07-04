import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';

export async function getSummary(_req: AuthRequest, res: Response) {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Today's sales
    const todaysSales = await prisma.sale.findMany({
      where: { createdAt: { gte: startOfToday } },
    });
    const todaysRevenue = todaysSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const todaysOrderCount = todaysSales.length;

    // All-time (demo) revenue for context
    const allSales = await prisma.sale.findMany();
    const totalRevenue = allSales.reduce((sum, s) => sum + s.totalAmount, 0);

    // Rough profit estimate: sum(sellingPrice - purchasePrice) * qty across sale items
    const saleItems = await prisma.saleItem.findMany({ include: { product: true } });
    const totalProfit = saleItems.reduce((sum, item) => {
      const margin = item.unitPrice - item.product.purchasePrice;
      return sum + margin * item.quantity;
    }, 0);

    // Inventory value = sum(quantity * purchasePrice) across all stock items
    const stockItems = await prisma.stockItem.findMany({ include: { product: true } });
    const inventoryValue = stockItems.reduce(
      (sum, item) => sum + item.quantity * item.product.purchasePrice,
      0
    );

    // Low stock items (below reorder level)
    const lowStockItems = stockItems.filter(
      (item) => item.quantity < item.product.reorderLevel
    );

    // Expiring within 7 days
    const expiringItems = stockItems.filter(
      (item) => item.expiryDate && item.expiryDate <= in7Days && item.expiryDate >= now
    );

    // Pending purchase orders
    const pendingPOs = await prisma.purchaseOrder.count({ where: { status: 'PENDING' } });

    // Top selling products (by total quantity sold)
    const productQtyMap: Record<string, { name: string; qty: number }> = {};
    for (const item of saleItems) {
      if (!productQtyMap[item.productId]) {
        productQtyMap[item.productId] = { name: item.product.name, qty: 0 };
      }
      productQtyMap[item.productId].qty += item.quantity;
    }
    const topProducts = Object.values(productQtyMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
    const leastProducts = Object.values(productQtyMap)
      .sort((a, b) => a.qty - b.qty)
      .slice(0, 5);

    // AI alerts (pending only)
    const aiAlerts = await prisma.aiAlert.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Revenue trend for last 14 days (for chart)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const recentSales = await prisma.sale.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
    });
    const revenueByDay: Record<string, number> = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(fourteenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      revenueByDay[key] = 0;
    }
    for (const s of recentSales) {
      const key = s.createdAt.toISOString().slice(0, 10);
      if (revenueByDay[key] !== undefined) {
        revenueByDay[key] += s.totalAmount;
      }
    }
    const revenueTrend = Object.entries(revenueByDay).map(([date, revenue]) => ({
      date,
      revenue: Number(revenue.toFixed(2)),
    }));

    return res.status(200).json({
      todaysRevenue: Number(todaysRevenue.toFixed(2)),
      todaysOrderCount,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      inventoryValue: Number(inventoryValue.toFixed(2)),
      lowStockCount: lowStockItems.length,
      expiringCount: expiringItems.length,
      pendingPOs,
      topProducts,
      leastProducts,
      aiAlerts,
      revenueTrend,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load dashboard summary' });
  }
}