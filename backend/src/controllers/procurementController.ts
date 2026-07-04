import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';

export async function listSuppliers(req: AuthRequest, res: Response) {
  try {
    const { search } = req.query;

    const suppliers = await prisma.supplier.findMany({
      where: search
        ? { name: { contains: String(search) } }
        : undefined,
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({ suppliers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
}

export async function listPurchaseOrders(req: AuthRequest, res: Response) {
  try {
    const { status } = req.query;

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: status ? { status: String(status) } : undefined,
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ purchaseOrders });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
}

// Mark a purchase order as delivered — this is where receiving would normally
// tie back into the barcode scanner workflow (scan items in as they arrive).
export async function markDelivered(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    if (po.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Only approved purchase orders can be marked delivered' });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'DELIVERED' },
    });

    return res.status(200).json({ purchaseOrder: updated, message: 'Marked as delivered' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update purchase order' });
  }
}