import { Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';

function parseDateRange(query: any) {
  const now = new Date();
  const from = query.from ? new Date(String(query.from)) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = query.to ? new Date(String(query.to)) : now;
  return { from, to };
}

// ---------- Sales Report ----------
export async function getSalesReport(req: AuthRequest, res: Response) {
  try {
    const { from, to } = parseDateRange(req.query);

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { items: { include: { product: true } }, customer: true },
      orderBy: { createdAt: 'desc' },
    });

    const rows = sales.map((s) => ({
      invoiceNo: s.invoiceNo,
      date: s.createdAt.toISOString().slice(0, 10),
      customer: s.customer?.name || 'Walk-in',
      itemCount: s.items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: Number((s.totalAmount - s.gstAmount).toFixed(2)),
      gst: s.gstAmount,
      total: s.totalAmount,
      paymentMode: s.paymentMode,
    }));

    const summary = {
      totalInvoices: rows.length,
      totalRevenue: Number(rows.reduce((sum, r) => sum + r.total, 0).toFixed(2)),
      totalGst: Number(rows.reduce((sum, r) => sum + r.gst, 0).toFixed(2)),
    };

    return res.status(200).json({ rows, summary, from, to });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate sales report' });
  }
}

// ---------- GST Report ----------
export async function getGstReport(req: AuthRequest, res: Response) {
  try {
    const { from, to } = parseDateRange(req.query);

    const saleItems = await prisma.saleItem.findMany({
      where: { sale: { createdAt: { gte: from, lte: to } } },
      include: { product: true, sale: true },
    });

    // Group by HSN code + GST%
    const grouped: Record<string, { hsnCode: string; gstPercent: number; taxableValue: number; gstAmount: number }> = {};
    for (const item of saleItems) {
      const key = `${item.product.hsnCode}-${item.product.gstPercent}`;
      if (!grouped[key]) {
        grouped[key] = {
          hsnCode: item.product.hsnCode,
          gstPercent: item.product.gstPercent,
          taxableValue: 0,
          gstAmount: 0,
        };
      }
      grouped[key].taxableValue += item.unitPrice * item.quantity;
      grouped[key].gstAmount += item.gstAmount;
    }

    const rows = Object.values(grouped).map((g) => ({
      hsnCode: g.hsnCode,
      gstPercent: g.gstPercent,
      taxableValue: Number(g.taxableValue.toFixed(2)),
      cgst: Number((g.gstAmount / 2).toFixed(2)),
      sgst: Number((g.gstAmount / 2).toFixed(2)),
      totalGst: Number(g.gstAmount.toFixed(2)),
    }));

    const summary = {
      totalTaxableValue: Number(rows.reduce((sum, r) => sum + r.taxableValue, 0).toFixed(2)),
      totalGst: Number(rows.reduce((sum, r) => sum + r.totalGst, 0).toFixed(2)),
    };

    return res.status(200).json({ rows, summary, from, to });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate GST report' });
  }
}

// ---------- Inventory Report ----------
export async function getInventoryReport(_req: AuthRequest, res: Response) {
  try {
    const products = await prisma.product.findMany({
      include: { category: true, supplier: true, stockItems: true },
      orderBy: { name: 'asc' },
    });

    const rows = products.map((p) => {
      const totalQty = p.stockItems.reduce((sum, s) => sum + s.quantity, 0);
      return {
        name: p.name,
        barcode: p.barcode,
        category: p.category.name,
        supplier: p.supplier.name,
        totalQty,
        purchasePrice: p.purchasePrice,
        stockValue: Number((totalQty * p.purchasePrice).toFixed(2)),
        reorderLevel: p.reorderLevel,
        status: totalQty < p.reorderLevel ? 'LOW STOCK' : totalQty > p.maxStock ? 'OVERSTOCK' : 'HEALTHY',
      };
    });

    const summary = {
      totalProducts: rows.length,
      totalStockValue: Number(rows.reduce((sum, r) => sum + r.stockValue, 0).toFixed(2)),
      lowStockCount: rows.filter((r) => r.status === 'LOW STOCK').length,
    };

    return res.status(200).json({ rows, summary });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate inventory report' });
  }
}

// ---------- Export (CSV / Excel / PDF) ----------
function rowsToCsv(rows: any[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => `"${String(row[h]).replace(/"/g, '""')}"`).join(','));
  }
  return lines.join('\n');
}

async function fetchReportRows(type: string, query: any) {
  const { from, to } = parseDateRange(query);

  if (type === 'sales') {
    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { items: true, customer: true },
      orderBy: { createdAt: 'desc' },
    });
    return sales.map((s) => ({
      invoiceNo: s.invoiceNo,
      date: s.createdAt.toISOString().slice(0, 10),
      customer: s.customer?.name || 'Walk-in',
      subtotal: Number((s.totalAmount - s.gstAmount).toFixed(2)),
      gst: s.gstAmount,
      total: s.totalAmount,
      paymentMode: s.paymentMode,
    }));
  }

  if (type === 'gst') {
    const saleItems = await prisma.saleItem.findMany({
      where: { sale: { createdAt: { gte: from, lte: to } } },
      include: { product: true },
    });
    const grouped: Record<string, any> = {};
    for (const item of saleItems) {
      const key = `${item.product.hsnCode}-${item.product.gstPercent}`;
      if (!grouped[key]) {
        grouped[key] = { hsnCode: item.product.hsnCode, gstPercent: item.product.gstPercent, taxableValue: 0, gstAmount: 0 };
      }
      grouped[key].taxableValue += item.unitPrice * item.quantity;
      grouped[key].gstAmount += item.gstAmount;
    }
    return Object.values(grouped).map((g: any) => ({
      hsnCode: g.hsnCode,
      gstPercent: g.gstPercent,
      taxableValue: Number(g.taxableValue.toFixed(2)),
      cgst: Number((g.gstAmount / 2).toFixed(2)),
      sgst: Number((g.gstAmount / 2).toFixed(2)),
      totalGst: Number(g.gstAmount.toFixed(2)),
    }));
  }

  // inventory
  const products = await prisma.product.findMany({
    include: { category: true, supplier: true, stockItems: true },
    orderBy: { name: 'asc' },
  });
  return products.map((p) => {
    const totalQty = p.stockItems.reduce((sum, s) => sum + s.quantity, 0);
    return {
      name: p.name,
      barcode: p.barcode,
      category: p.category.name,
      totalQty,
      stockValue: Number((totalQty * p.purchasePrice).toFixed(2)),
      status: totalQty < p.reorderLevel ? 'LOW STOCK' : 'HEALTHY',
    };
  });
}

export async function exportReport(req: AuthRequest, res: Response) {
  try {
    const { type, format } = req.query as { type: string; format: string };

    if (!['sales', 'gst', 'inventory'].includes(type)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    const rows = await fetchReportRows(type, req.query);

    if (format === 'csv') {
      const csv = rowsToCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report.csv"`);
      return res.send(csv);
    }

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(type);
      if (rows.length > 0) {
        sheet.columns = Object.keys(rows[0]).map((key) => ({ header: key, key, width: 20 }));
        sheet.addRows(rows);
        sheet.getRow(1).font = { bold: true };
      }
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report.xlsx"`);
      await workbook.xlsx.write(res);
      return res.end();
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report.pdf"`);

      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      doc.pipe(res);

      doc.fontSize(16).text(`${type.toUpperCase()} REPORT`, { align: 'center' });
      doc.moveDown();

      if (rows.length > 0) {
        const headers = Object.keys(rows[0]);
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text(headers.join(' | '));
        doc.moveDown(0.5);
        doc.font('Helvetica');

        for (const row of rows) {
          doc.text(headers.map((h) => String((row as any)[h])).join(' | '));
        }
      } else {
        doc.fontSize(10).text('No data available for this report.');
      }

      doc.end();
      return;
    }

    return res.status(400).json({ error: 'Invalid format. Use csv, excel, or pdf.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to export report' });
  }
}