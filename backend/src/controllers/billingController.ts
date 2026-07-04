import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';

interface CartItemInput {
  productId: string;
  quantity: number;
}

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `INV-${year}-${random}`;
}

export async function checkout(req: AuthRequest, res: Response) {
  try {
    const { items, customerId, paymentMode, warehouseId } = req.body as {
      items: CartItemInput[];
      customerId?: string;
      paymentMode: string;
      warehouseId: string;
    };

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    if (!warehouseId) {
      return res.status(400).json({ error: 'warehouseId is required to deduct stock from' });
    }
    if (!paymentMode) {
      return res.status(400).json({ error: 'paymentMode is required' });
    }

    // Load all products up front
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

    if (products.length !== productIds.length) {
      return res.status(404).json({ error: 'One or more products not found' });
    }

    // Verify stock availability before committing anything
    for (const item of items) {
      const stockItem = await prisma.stockItem.findFirst({
        where: { productId: item.productId, warehouseId },
      });
      const available = stockItem?.quantity ?? 0;
      if (available < item.quantity) {
        const product = products.find((p) => p.id === item.productId);
        return res.status(400).json({
          error: `Insufficient stock for ${product?.name ?? item.productId}. Available: ${available}, requested: ${item.quantity}`,
        });
      }
    }

    // Compute totals with GST per line item
    let totalAmount = 0;
    let gstTotal = 0;
    const saleItemsData = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const lineSubtotal = product.sellingPrice * item.quantity;
      const gstAmount = Number((lineSubtotal * (product.gstPercent / 100)).toFixed(2));
      totalAmount += lineSubtotal + gstAmount;
      gstTotal += gstAmount;

      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.sellingPrice,
        gstAmount,
      };
    });

    // Create the sale + sale items
    const sale = await prisma.sale.create({
      data: {
        customerId: customerId || null,
        invoiceNo: generateInvoiceNumber(),
        totalAmount: Number(totalAmount.toFixed(2)),
        gstAmount: Number(gstTotal.toFixed(2)),
        paymentMode,
        items: { create: saleItemsData },
      },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });

    // Reduce stock for each item
    for (const item of items) {
      const stockItem = await prisma.stockItem.findFirst({
        where: { productId: item.productId, warehouseId },
      });
      if (stockItem) {
        await prisma.stockItem.update({
          where: { id: stockItem.id },
          data: { quantity: stockItem.quantity - item.quantity },
        });
      }
    }

    return res.status(201).json({ sale, message: 'Invoice generated and stock updated' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Checkout failed' });
  }
}

export async function listCustomers(req: AuthRequest, res: Response) {
  try {
    const { search } = req.query;

    const customers = await prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: String(search) } },
              { phone: { contains: String(search) } },
            ],
          }
        : undefined,
      take: 20,
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({ customers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch customers' });
  }
}

export async function getInvoice(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });

    if (!sale) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    return res.status(200).json({ sale });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch invoice' });
  }
}