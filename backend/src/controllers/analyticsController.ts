import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';

// Simple linear regression forecast: given historical daily revenue,
// project the next N days. This is intentionally simple (rule-based/
// statistical rather than ML) per the spec's "ML-ready architecture"
// note — a real ML model could replace this function later without
// changing the API shape.
function forecastLinear(history: { x: number; y: number }[], daysAhead: number) {
  const n = history.length;
  if (n === 0) return [];

  const sumX = history.reduce((s, p) => s + p.x, 0);
  const sumY = history.reduce((s, p) => s + p.y, 0);
  const sumXY = history.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = history.reduce((s, p) => s + p.x * p.x, 0);

  const denominator = n * sumX2 - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const forecast = [];
  for (let i = 1; i <= daysAhead; i++) {
    const x = n + i;
    const y = Math.max(0, slope * x + intercept);
    forecast.push(Number(y.toFixed(2)));
  }
  return forecast;
}

export async function getSalesTrends(_req: AuthRequest, res: Response) {
  try {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: ninetyDaysAgo } },
      select: { createdAt: true, totalAmount: true },
    });

    // Aggregate by day
    const byDay: Record<string, number> = {};
    for (let i = 0; i < 90; i++) {
      const d = new Date(ninetyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      byDay[d.toISOString().slice(0, 10)] = 0;
    }
    for (const s of sales) {
      const key = s.createdAt.toISOString().slice(0, 10);
      if (byDay[key] !== undefined) byDay[key] += s.totalAmount;
    }

    const dailyTrend = Object.entries(byDay).map(([date, revenue], idx) => ({
      date,
      revenue: Number(revenue.toFixed(2)),
      x: idx,
    }));

    // 7-day forecast
    const forecastValues = forecastLinear(
      dailyTrend.map((d) => ({ x: d.x, y: d.revenue })),
      7
    );
    const lastDate = new Date(dailyTrend[dailyTrend.length - 1].date);
    const forecast = forecastValues.map((value, i) => {
      const d = new Date(lastDate.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
      return { date: d.toISOString().slice(0, 10), revenue: value, forecast: true };
    });

    // Weekly aggregation for seasonality view
    const weeklyMap: Record<string, number> = {};
    for (const entry of dailyTrend) {
      const d = new Date(entry.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      weeklyMap[key] = (weeklyMap[key] || 0) + entry.revenue;
    }
    const weeklyTrend = Object.entries(weeklyMap)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([week, revenue]) => ({ week, revenue: Number(revenue.toFixed(2)) }));

    return res.status(200).json({
      dailyTrend: dailyTrend.map(({ date, revenue }) => ({ date, revenue })),
      forecast,
      weeklyTrend,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate sales trends' });
  }
}

export async function getCategoryBreakdown(_req: AuthRequest, res: Response) {
  try {
    const saleItems = await prisma.saleItem.findMany({
      include: { product: { include: { category: true } } },
    });

    const byCategory: Record<string, { revenue: number; qty: number }> = {};
    for (const item of saleItems) {
      const cat = item.product.category.name;
      if (!byCategory[cat]) byCategory[cat] = { revenue: 0, qty: 0 };
      byCategory[cat].revenue += item.unitPrice * item.quantity;
      byCategory[cat].qty += item.quantity;
    }

    const rows = Object.entries(byCategory)
      .map(([category, data]) => ({
        category,
        revenue: Number(data.revenue.toFixed(2)),
        qty: data.qty,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return res.status(200).json({ rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate category breakdown' });
  }
}

export async function getCustomerInsights(_req: AuthRequest, res: Response) {
  try {
    const sales = await prisma.sale.findMany({
      where: { customerId: { not: null } },
      include: { customer: true },
    });

    const byCustomer: Record<string, { name: string; totalSpend: number; orderCount: number }> = {};
    for (const s of sales) {
      if (!s.customerId || !s.customer) continue;
      if (!byCustomer[s.customerId]) {
        byCustomer[s.customerId] = { name: s.customer.name, totalSpend: 0, orderCount: 0 };
      }
      byCustomer[s.customerId].totalSpend += s.totalAmount;
      byCustomer[s.customerId].orderCount += 1;
    }

    const allCustomers = Object.values(byCustomer);
    const topCustomers = allCustomers
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 10)
      .map((c) => ({ ...c, totalSpend: Number(c.totalSpend.toFixed(2)) }));

    const repeatCustomers = allCustomers.filter((c) => c.orderCount > 1).length;
    const oneTimeCustomers = allCustomers.filter((c) => c.orderCount === 1).length;

    return res.status(200).json({
      topCustomers,
      repeatCustomers,
      oneTimeCustomers,
      totalActiveCustomers: allCustomers.length,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate customer insights' });
  }
}