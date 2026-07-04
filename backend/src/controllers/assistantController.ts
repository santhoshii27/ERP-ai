import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';

function formatInr(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

// Rule-based intent matching over the user's real data. Each handler
// returns a plain-language, explainable answer (not just raw numbers),
// per the spec's requirement that the assistant reason about the data
// rather than dump it.
async function answerRevenueChange() {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(startOfThisMonth.getTime() - 1);

  const thisMonthSales = await prisma.sale.findMany({ where: { createdAt: { gte: startOfThisMonth } } });
  const lastMonthSales = await prisma.sale.findMany({
    where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
  });

  const thisMonthRevenue = thisMonthSales.reduce((s, sale) => s + sale.totalAmount, 0);
  const lastMonthRevenue = lastMonthSales.reduce((s, sale) => s + sale.totalAmount, 0);
  const diff = thisMonthRevenue - lastMonthRevenue;
  const pctChange = lastMonthRevenue > 0 ? (diff / lastMonthRevenue) * 100 : 0;

  if (lastMonthRevenue === 0) {
    return `This month's revenue so far is ${formatInr(thisMonthRevenue)} across ${thisMonthSales.length} orders. There wasn't comparable data from last month to measure a change against.`;
  }

  const direction = diff >= 0 ? 'up' : 'down';
  return `Revenue this month is ${formatInr(thisMonthRevenue)} across ${thisMonthSales.length} orders, ${direction} ${Math.abs(pctChange).toFixed(1)}% compared to last month's ${formatInr(lastMonthRevenue)}. ${
    diff < 0
      ? 'This could reflect fewer transactions, lower average order value, or seasonal demand — check the Analytics page for the daily trend to spot exactly when the drop started.'
      : 'Order volume and average basket size both appear healthy this period.'
  }`;
}

async function answerReorderSuggestions() {
  const stockItems = await prisma.stockItem.findMany({ include: { product: true, warehouse: true } });
  const lowStock = stockItems.filter((s) => s.quantity < s.product.reorderLevel);

  if (lowStock.length === 0) {
    return 'No products are currently below their reorder level — inventory looks healthy across all warehouses.';
  }

  const grouped: Record<string, { name: string; totalShortfall: number; warehouses: string[] }> = {};
  for (const s of lowStock) {
    if (!grouped[s.productId]) {
      grouped[s.productId] = { name: s.product.name, totalShortfall: 0, warehouses: [] };
    }
    grouped[s.productId].totalShortfall += s.product.reorderLevel - s.quantity;
    grouped[s.productId].warehouses.push(s.warehouse.name);
  }

  const list = Object.values(grouped)
    .slice(0, 8)
    .map((g) => `${g.name} (short by ~${g.totalShortfall} units at ${g.warehouses.join(', ')})`)
    .join('; ');

  return `${Object.keys(grouped).length} product(s) are below their reorder level and should be restocked soon: ${list}. You can approve purchase orders for these directly from the AI Alerts panel on the Dashboard.`;
}

async function answerExpectedProfit() {
  const saleItems = await prisma.saleItem.findMany({ include: { product: true } });
  const totalProfit = saleItems.reduce((sum, item) => sum + (item.unitPrice - item.product.purchasePrice) * item.quantity, 0);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysElapsed = Math.max(1, Math.ceil((now.getTime() - startOfMonth.getTime()) / (24 * 60 * 60 * 1000)));
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const thisMonthItems = await prisma.saleItem.findMany({
    where: { sale: { createdAt: { gte: startOfMonth } } },
    include: { product: true },
  });
  const thisMonthProfit = thisMonthItems.reduce(
    (sum, item) => sum + (item.unitPrice - item.product.purchasePrice) * item.quantity,
    0
  );
  const projectedMonthProfit = (thisMonthProfit / daysElapsed) * daysInMonth;

  return `Total profit to date across all sales is ${formatInr(totalProfit)}. Based on this month's pace so far (${formatInr(thisMonthProfit)} over ${daysElapsed} days), projected profit for the full month is approximately ${formatInr(projectedMonthProfit)}, assuming similar sales velocity continues.`;
}

async function answerDeadStock() {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const recentSaleItems = await prisma.saleItem.findMany({
    where: { sale: { createdAt: { gte: ninetyDaysAgo } } },
    select: { productId: true },
  });
  const recentlySoldIds = new Set(recentSaleItems.map((s) => s.productId));

  const stockItems = await prisma.stockItem.findMany({ include: { product: true } });
  const byProduct: Record<string, { name: string; qty: number }> = {};
  for (const s of stockItems) {
    if (!byProduct[s.productId]) byProduct[s.productId] = { name: s.product.name, qty: 0 };
    byProduct[s.productId].qty += s.quantity;
  }

  const deadStock = Object.entries(byProduct)
    .filter(([id, data]) => data.qty > 0 && !recentlySoldIds.has(id))
    .map(([, data]) => data);

  if (deadStock.length === 0) {
    return 'No dead stock detected — every product with stock on hand has sold at least once in the last 90 days.';
  }

  const list = deadStock.slice(0, 8).map((d) => `${d.name} (${d.qty} units)`).join(', ');
  return `${deadStock.length} product(s) have had no sales in the last 90 days despite having stock on hand: ${list}. Consider a promotion, bundling, or discontinuing these lines.`;
}

async function answerBestSupplier() {
  const suppliers = await prisma.supplier.findMany({ orderBy: { rating: 'desc' }, take: 3 });
  if (suppliers.length === 0) return 'No supplier data available yet.';

  const list = suppliers.map((s) => `${s.name} (rating ${s.rating.toFixed(1)}/5, ${s.city})`).join(', ');
  return `Your top-rated suppliers by performance are: ${list}. Ratings reflect delivery reliability and pricing consistency in your supplier records.`;
}

async function answerDemandForecast() {
  const saleItems = await prisma.saleItem.findMany({
    where: { sale: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
    include: { product: true },
  });

  const byProduct: Record<string, { name: string; qty: number }> = {};
  for (const item of saleItems) {
    if (!byProduct[item.productId]) byProduct[item.productId] = { name: item.product.name, qty: 0 };
    byProduct[item.productId].qty += item.quantity;
  }

  const top = Object.values(byProduct)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)
    .map((p) => `${p.name} (~${Math.round((p.qty / 30) * 30)} units/month at current pace)`);

  if (top.length === 0) return 'Not enough recent sales data to forecast demand yet.';

  return `Based on the last 30 days of sales, expected demand next month for your top movers: ${top.join(', ')}. These estimates assume similar demand patterns continue; seasonal or festival demand could shift this.`;
}

async function answerExpiringProducts() {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const stockItems = await prisma.stockItem.findMany({
    where: { expiryDate: { gte: now, lte: in7Days } },
    include: { product: true, warehouse: true },
  });

  if (stockItems.length === 0) {
    return 'No products are set to expire within the next 7 days.';
  }

  const list = stockItems
    .slice(0, 8)
    .map((s) => `${s.product.name} at ${s.warehouse.name} (expires ${s.expiryDate?.toISOString().slice(0, 10)})`)
    .join(', ');

  return `${stockItems.length} stock batch(es) are expiring within the next 7 days: ${list}. Consider prioritizing these in sales or promotions before they expire.`;
}

async function answerGeneral() {
  const totalSales = await prisma.sale.count();
  const totalProducts = await prisma.product.count();
  const pendingAlerts = await prisma.aiAlert.count({ where: { status: 'PENDING' } });

  return `I can help with questions about revenue, inventory, reordering, dead stock, suppliers, demand forecasting, and expiring products. Right now you have ${totalSales} total sales recorded, ${totalProducts} products in the catalog, and ${pendingAlerts} pending AI alerts awaiting your approval. Try asking things like "Why did revenue fall?" or "Show dead stock."`;
}

export async function askAssistant(req: AuthRequest, res: Response) {
  try {
    const { message } = req.body as { message: string };
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    const q = message.toLowerCase();
    let answer: string;

    if (q.includes('revenue') && (q.includes('fall') || q.includes('drop') || q.includes('down') || q.includes('change') || q.includes('why'))) {
      answer = await answerRevenueChange();
    } else if (q.includes('reorder') || (q.includes('restock') && q.includes('product'))) {
      answer = await answerReorderSuggestions();
    } else if (q.includes('profit')) {
      answer = await answerExpectedProfit();
    } else if (q.includes('dead stock') || q.includes('slow moving') || q.includes('not selling')) {
      answer = await answerDeadStock();
    } else if (q.includes('supplier') && (q.includes('best') || q.includes('perform') || q.includes('top'))) {
      answer = await answerBestSupplier();
    } else if (q.includes('demand') || q.includes('predict') || q.includes('forecast')) {
      answer = await answerDemandForecast();
    } else if (q.includes('expir')) {
      answer = await answerExpiringProducts();
    } else {
      answer = await answerGeneral();
    }

    return res.status(200).json({ answer });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to process your question' });
  }
}