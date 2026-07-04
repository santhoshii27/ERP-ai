import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';

export async function listAlerts(_req: AuthRequest, res: Response) {
  try {
    const alerts = await prisma.aiAlert.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ alerts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch alerts' });
  }
}

export async function acceptAlert(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const alert = await prisma.aiAlert.findUnique({ where: { id } });
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    if (alert.status !== 'PENDING') {
      return res.status(400).json({ error: 'Alert has already been actioned' });
    }

    let createdPO = null;

    // Accepting a LOW_STOCK alert with linkage creates a real purchase order.
    // This is the core "AI never acts automatically" workflow: nothing existed
    // until this explicit owner approval happened.
    if (alert.type === 'LOW_STOCK' && alert.productId && alert.supplierId && alert.recommendedQty) {
      createdPO = await prisma.purchaseOrder.create({
        data: {
          supplierId: alert.supplierId,
          status: 'APPROVED',
          totalAmount: alert.estimatedCost ?? 0,
          approvedAt: new Date(),
          items: {
            create: [
              {
                productId: alert.productId,
                quantity: alert.recommendedQty,
                unitPrice: (alert.estimatedCost ?? 0) / alert.recommendedQty,
              },
            ],
          },
        },
        include: { items: true, supplier: true },
      });
    }

    const updated = await prisma.aiAlert.update({
      where: { id },
      data: { status: 'ACCEPTED' },
    });

    return res.status(200).json({
      alert: updated,
      purchaseOrder: createdPO,
      message: createdPO
        ? `Alert accepted. Purchase order created for ${createdPO.items.length} item(s) from ${createdPO.supplier.name}.`
        : 'Alert accepted',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to accept alert' });
  }
}

export async function declineAlert(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const alert = await prisma.aiAlert.findUnique({ where: { id } });
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    if (alert.status !== 'PENDING') {
      return res.status(400).json({ error: 'Alert has already been actioned' });
    }

    const updated = await prisma.aiAlert.update({
      where: { id },
      data: { status: 'DECLINED' },
    });

    return res.status(200).json({ alert: updated, message: 'Alert declined' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to decline alert' });
  }
}