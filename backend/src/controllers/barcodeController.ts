import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';

// Look up a product by its barcode, including stock across all warehouses
export async function lookupProduct(req: AuthRequest, res: Response) {
  try {
    const { barcode } = req.params;

    const product = await prisma.product.findUnique({
      where: { barcode },
      include: {
        category: true,
        supplier: true,
        stockItems: { include: { warehouse: true } },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found', barcode });
    }

    return res.status(200).json({ product });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Lookup failed' });
  }
}

// List all warehouses (for the warehouse-select dropdown during scanning)
export async function listWarehouses(_req: AuthRequest, res: Response) {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { name: 'asc' },
    });
    return res.status(200).json({ warehouses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch warehouses' });
  }
}

// Receive stock: scan barcode -> add quantity to a warehouse's stock item
export async function receiveStock(req: AuthRequest, res: Response) {
  try {
    const { barcode, warehouseId, quantity } = req.body;

    if (!barcode || !warehouseId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'barcode, warehouseId, and a positive quantity are required' });
    }

    const product = await prisma.product.findUnique({ where: { barcode } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found for this barcode' });
    }

    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    // Find existing stock item for this product+warehouse, or create one
    let stockItem = await prisma.stockItem.findFirst({
      where: { productId: product.id, warehouseId },
    });

    if (stockItem) {
      stockItem = await prisma.stockItem.update({
        where: { id: stockItem.id },
        data: { quantity: stockItem.quantity + Number(quantity) },
      });
    } else {
      stockItem = await prisma.stockItem.create({
        data: {
          productId: product.id,
          warehouseId,
          quantity: Number(quantity),
        },
      });
    }

    return res.status(200).json({
      message: `Stock updated: +${quantity} units of ${product.name} at ${warehouse.name}`,
      stockItem,
      product,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to receive stock' });
  }
}