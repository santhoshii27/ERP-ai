import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';

export async function listInventory(req: AuthRequest, res: Response) {
  try {
    const { filter, search, warehouseId } = req.query;

    const products = await prisma.product.findMany({
      where: search
        ? { name: { contains: String(search) } }
        : undefined,
      include: {
        category: true,
        supplier: true,
        stockItems: { include: { warehouse: true } },
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Build a flattened row per product (aggregated across warehouses, or filtered to one)
    let rows = products.map((p) => {
      const relevantStock = warehouseId
        ? p.stockItems.filter((s) => s.warehouseId === warehouseId)
        : p.stockItems;

      const totalQty = relevantStock.reduce((sum, s) => sum + s.quantity, 0);
      const stockValue = totalQty * p.purchasePrice;
      const isLowStock = totalQty < p.reorderLevel;
      const isOverstock = totalQty > p.maxStock;
      const hasExpiringSoon = relevantStock.some(
        (s) => s.expiryDate && new Date(s.expiryDate) <= in7Days && new Date(s.expiryDate) >= now
      );
      const hasExpired = relevantStock.some(
        (s) => s.expiryDate && new Date(s.expiryDate) < now
      );

      return {
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        category: p.category.name,
        supplier: p.supplier.name,
        hsnCode: p.hsnCode,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        gstPercent: p.gstPercent,
        reorderLevel: p.reorderLevel,
        minStock: p.minStock,
        maxStock: p.maxStock,
        totalQty,
        stockValue: Number(stockValue.toFixed(2)),
        isLowStock,
        isOverstock,
        hasExpiringSoon,
        hasExpired,
        warehouseBreakdown: relevantStock.map((s) => ({
          warehouseId: s.warehouseId,
          warehouseName: s.warehouse.name,
          quantity: s.quantity,
          batchNumber: s.batchNumber,
          rackNumber: s.rackNumber,
          expiryDate: s.expiryDate,
        })),
      };
    });

    // Apply filter
    if (filter === 'low_stock') {
      rows = rows.filter((r) => r.isLowStock);
    } else if (filter === 'overstock') {
      rows = rows.filter((r) => r.isOverstock);
    } else if (filter === 'expiring') {
      rows = rows.filter((r) => r.hasExpiringSoon);
    } else if (filter === 'expired') {
      rows = rows.filter((r) => r.hasExpired);
    } else if (filter === 'dead_stock') {
      // Dead stock heuristic for demo: no sales in last 90 days AND has stock on hand
      const recentSaleItems = await prisma.saleItem.findMany({
        where: { sale: { createdAt: { gte: ninetyDaysAgo } } },
        select: { productId: true },
      });
      const recentlySoldIds = new Set(recentSaleItems.map((s) => s.productId));
      rows = rows.filter((r) => r.totalQty > 0 && !recentlySoldIds.has(r.id));
    }

    return res.status(200).json({ products: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch inventory' });
  }
}

// Manual stock adjustment (increase or decrease, with a reason — for audit purposes)
export async function adjustStock(req: AuthRequest, res: Response) {
  try {
    const { productId, warehouseId, newQuantity, reason } = req.body;

    if (!productId || !warehouseId || newQuantity === undefined || newQuantity < 0) {
      return res.status(400).json({ error: 'productId, warehouseId, and a valid newQuantity are required' });
    }

    let stockItem = await prisma.stockItem.findFirst({ where: { productId, warehouseId } });

    if (stockItem) {
      stockItem = await prisma.stockItem.update({
        where: { id: stockItem.id },
        data: { quantity: Number(newQuantity) },
      });
    } else {
      stockItem = await prisma.stockItem.create({
        data: { productId, warehouseId, quantity: Number(newQuantity) },
      });
    }

    return res.status(200).json({
      stockItem,
      message: `Stock adjusted to ${newQuantity} units.${reason ? ` Reason: ${reason}` : ''}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to adjust stock' });
  }
}