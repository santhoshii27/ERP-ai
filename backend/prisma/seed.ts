import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// ---------- Helper data ----------

const indianCities = [
  'Hyderabad', 'Mumbai', 'Bengaluru', 'Chennai', 'Delhi',
  'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow',
];

const indianFirstNames = [
  'Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Rohan', 'Kavya',
  'Arjun', 'Divya', 'Suresh', 'Pooja', 'Manoj', 'Neha', 'Karthik', 'Deepa',
];

const indianLastNames = [
  'Sharma', 'Reddy', 'Patel', 'Gupta', 'Rao', 'Nair', 'Iyer', 'Singh',
  'Kumar', 'Verma', 'Joshi', 'Mehta', 'Naidu', 'Chowdary', 'Menon',
];

function indianName() {
  return `${faker.helpers.arrayElement(indianFirstNames)} ${faker.helpers.arrayElement(indianLastNames)}`;
}

function indianPhone() {
  return `+91 ${faker.number.int({ min: 70000, max: 99999 })}${faker.number.int({ min: 10000, max: 99999 })}`;
}

function invoiceNumber(index: number) {
  const year = 2025;
  return `INV-${year}-${String(index).padStart(5, '0')}`;
}

// Real Indian product catalog (subset — we'll expand with generated variants)
const productCatalog = [
  { name: 'Amul Gold Milk 1L', category: 'Dairy', hsn: '040120', gst: 5, purchase: 52, selling: 66, mrp: 68 },
  { name: 'Amul Butter 500g', category: 'Dairy', hsn: '040510', gst: 12, purchase: 210, selling: 255, mrp: 265 },
  { name: 'Parle-G Biscuits 200g', category: 'Snacks', hsn: '190531', gst: 18, purchase: 18, selling: 25, mrp: 26 },
  { name: 'Maggi Noodles 70g', category: 'Instant Food', hsn: '190230', gst: 18, purchase: 11, selling: 14, mrp: 14 },
  { name: 'Surf Excel 1kg', category: 'Household', hsn: '340220', gst: 18, purchase: 145, selling: 178, mrp: 185 },
  { name: 'Aashirvaad Atta 5kg', category: 'Staples', hsn: '110100', gst: 5, purchase: 210, selling: 255, mrp: 265 },
  { name: 'Fortune Sunflower Oil 1L', category: 'Staples', hsn: '150421', gst: 5, purchase: 128, selling: 155, mrp: 160 },
  { name: 'Tata Salt 1kg', category: 'Staples', hsn: '250100', gst: 5, purchase: 18, selling: 24, mrp: 25 },
  { name: 'Britannia Good Day 200g', category: 'Snacks', hsn: '190531', gst: 18, purchase: 28, selling: 35, mrp: 36 },
  { name: 'India Gate Basmati Rice 5kg', category: 'Staples', hsn: '100630', gst: 5, purchase: 420, selling: 495, mrp: 510 },
  { name: 'Colgate Strong Teeth 200g', category: 'Personal Care', hsn: '330610', gst: 18, purchase: 68, selling: 85, mrp: 89 },
  { name: 'Dettol Handwash 200ml', category: 'Personal Care', hsn: '340130', gst: 18, purchase: 55, selling: 70, mrp: 74 },
  { name: 'Britannia Bread 400g', category: 'Bakery', hsn: '190540', gst: 5, purchase: 32, selling: 40, mrp: 42 },
  { name: 'Nescafe Classic Coffee 50g', category: 'Beverages', hsn: '210111', gst: 18, purchase: 145, selling: 178, mrp: 185 },
  { name: 'Red Label Tea 500g', category: 'Beverages', hsn: '090240', gst: 5, purchase: 195, selling: 235, mrp: 245 },
  { name: 'Haldiram Bhujia 200g', category: 'Snacks', hsn: '210690', gst: 12, purchase: 42, selling: 52, mrp: 55 },
  { name: 'Patanjali Ghee 500ml', category: 'Dairy', hsn: '040590', gst: 12, purchase: 260, selling: 310, mrp: 320 },
  { name: 'Vim Dishwash Bar 300g', category: 'Household', hsn: '340130', gst: 18, purchase: 22, selling: 28, mrp: 30 },
  { name: 'Kissan Mixed Fruit Jam 500g', category: 'Breakfast', hsn: '200799', gst: 12, purchase: 105, selling: 128, mrp: 132 },
  { name: 'MDH Garam Masala 100g', category: 'Spices', hsn: '091099', gst: 5, purchase: 62, selling: 78, mrp: 80 },
];

const supplierCompanyNames = [
  'ABC Foods', 'Sri Balaji Distributors', 'Vishal Traders', 'National FMCG Supplies',
  'Krishna Enterprises', 'Sri Lakshmi Agencies', 'Om Sai Distributors', 'Ganesh Wholesale',
  'Annapurna Traders', 'Shree Ram Suppliers', 'Sundar Distributors', 'Metro Foods Pvt Ltd',
  'Deccan Distributors', 'Sai Krupa Enterprises', 'Bharat Wholesale Traders',
];

async function main() {
  console.log('Seeding database...');

  // Clear existing data (safe order respecting FK constraints)
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.stockItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.user.deleteMany();
  await prisma.aiAlert.deleteMany();

  // ---------- Users ----------
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash('password123', 10);

  await prisma.user.createMany({
    data: [
      { name: 'Santhosh Reddy', email: 'owner@erp.com', password: passwordHash, role: 'OWNER', phone: indianPhone() },
      { name: 'Manager User', email: 'manager@erp.com', password: passwordHash, role: 'MANAGER', phone: indianPhone() },
      { name: 'Warehouse Staff', email: 'warehouse@erp.com', password: passwordHash, role: 'WAREHOUSE_STAFF', phone: indianPhone() },
      { name: 'Cashier User', email: 'cashier@erp.com', password: passwordHash, role: 'CASHIER', phone: indianPhone() },
    ],
  });
  console.log('Users seeded.');

  // ---------- Warehouses ----------
  const warehouseNames = ['Hyderabad Main', 'Mumbai Central', 'Bengaluru Hub', 'Chennai Depot', 'Delhi NCR Store'];
  const warehouses = [];
  for (let i = 0; i < warehouseNames.length; i++) {
    const w = await prisma.warehouse.create({
      data: {
        name: warehouseNames[i],
        city: indianCities[i],
        address: `${faker.number.int({ min: 1, max: 200 })}, Industrial Area, ${indianCities[i]}`,
      },
    });
    warehouses.push(w);
  }
  console.log('Warehouses seeded.');

  // ---------- Suppliers ----------
  const suppliers = [];
  for (let i = 0; i < 50; i++) {
    const city = faker.helpers.arrayElement(indianCities);
    const s = await prisma.supplier.create({
      data: {
        name: i < supplierCompanyNames.length ? supplierCompanyNames[i] : `${faker.helpers.arrayElement(indianLastNames)} Traders`,
        contactName: indianName(),
        phone: indianPhone(),
        email: faker.internet.email().toLowerCase(),
        address: `${faker.number.int({ min: 1, max: 300 })}, Market Road, ${city}`,
        city,
        gstNumber: `${faker.number.int({ min: 10, max: 37 })}ABCDE${faker.number.int({ min: 1000, max: 9999 })}F1Z${faker.number.int({ min: 1, max: 9 })}`,
        rating: Number((3 + Math.random() * 2).toFixed(1)),
      },
    });
    suppliers.push(s);
  }
  console.log('Suppliers seeded.');

  // ---------- Categories ----------
  const categoryNames = [...new Set(productCatalog.map(p => p.category))];
  const categories: Record<string, string> = {};
  for (const name of categoryNames) {
    const c = await prisma.category.create({ data: { name } });
    categories[name] = c.id;
  }
  console.log('Categories seeded.');

  // ---------- Products ----------
  const products = [];
  for (let i = 0; i < productCatalog.length; i++) {
    const p = productCatalog[i];
    const supplier = faker.helpers.arrayElement(suppliers);
    const barcode = `890${faker.number.int({ min: 1000000000, max: 9999999999 })}`.slice(0, 13);
    const product = await prisma.product.create({
      data: {
        name: p.name,
        barcode,
        hsnCode: p.hsn,
        categoryId: categories[p.category],
        supplierId: supplier.id,
        purchasePrice: p.purchase,
        sellingPrice: p.selling,
        mrp: p.mrp,
        gstPercent: p.gst,
        reorderLevel: faker.number.int({ min: 30, max: 60 }),
        minStock: faker.number.int({ min: 10, max: 25 }),
        maxStock: faker.number.int({ min: 300, max: 600 }),
      },
    });
    products.push(product);
  }
  console.log('Products seeded.');

  // ---------- Stock items (per product per warehouse) ----------
  for (const product of products) {
    for (const warehouse of warehouses) {
      // Occasionally simulate low stock for AI alert demo purposes
      const isLow = Math.random() < 0.15;
      const quantity = isLow
        ? faker.number.int({ min: 0, max: product.reorderLevel - 5 })
        : faker.number.int({ min: product.reorderLevel, max: product.maxStock });

      await prisma.stockItem.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity,
          batchNumber: `BATCH-${faker.number.int({ min: 1000, max: 9999 })}`,
          rackNumber: `R-${faker.number.int({ min: 1, max: 20 })}`,
          expiryDate: faker.date.future({ years: 1 }),
        },
      });
    }
  }
  console.log('Stock items seeded.');

  // ---------- Customers ----------
  const customers = [];
  for (let i = 0; i < 200; i++) {
    const city = faker.helpers.arrayElement(indianCities);
    const c = await prisma.customer.create({
      data: {
        name: indianName(),
        phone: indianPhone(),
        email: faker.internet.email().toLowerCase(),
        address: `${faker.number.int({ min: 1, max: 400 })}, ${faker.helpers.arrayElement(['MG Road', 'Gandhi Nagar', 'Nehru Street', 'Ring Road', 'Station Road'])}, ${city}`,
        city,
      },
    });
    customers.push(c);
  }
  console.log('Customers seeded.');

  // ---------- Employees ----------
  const employeeRoles = ['Manager', 'Warehouse Staff', 'Cashier', 'Salesperson', 'Procurement Manager', 'HR', 'Auditor'];
  for (let i = 0; i < 50; i++) {
    await prisma.employee.create({
      data: {
        name: indianName(),
        role: faker.helpers.arrayElement(employeeRoles),
        phone: indianPhone(),
        city: faker.helpers.arrayElement(indianCities),
        joinedAt: faker.date.past({ years: 3 }),
      },
    });
  }
  console.log('Employees seeded.');

  // ---------- Purchase Orders (some pending for AI approval demo) ----------
  for (let i = 0; i < 30; i++) {
    const supplier = faker.helpers.arrayElement(suppliers);
    const numItems = faker.number.int({ min: 1, max: 4 });
    const chosenProducts = faker.helpers.arrayElements(products, numItems);

    let total = 0;
    const itemsData = chosenProducts.map(p => {
      const qty = faker.number.int({ min: 20, max: 150 });
      total += qty * p.purchasePrice;
      return { productId: p.id, quantity: qty, unitPrice: p.purchasePrice };
    });

    const status = faker.helpers.arrayElement(['PENDING', 'APPROVED', 'APPROVED', 'DELIVERED', 'DECLINED']);

    await prisma.purchaseOrder.create({
      data: {
        supplierId: supplier.id,
        status,
        totalAmount: Number(total.toFixed(2)),
        approvedAt: status === 'APPROVED' || status === 'DELIVERED' ? faker.date.past({ years: 0.2 }) : null,
        items: { create: itemsData },
      },
    });
  }
  console.log('Purchase orders seeded.');

  // ---------- Sales (1 year of history) ----------
  let invoiceCounter = 1;
  for (let i = 0; i < 500; i++) {
    const customer = Math.random() < 0.7 ? faker.helpers.arrayElement(customers) : null;
    const numItems = faker.number.int({ min: 1, max: 5 });
    const chosenProducts = faker.helpers.arrayElements(products, numItems);

    let total = 0;
    let gstTotal = 0;
    const itemsData = chosenProducts.map(p => {
      const qty = faker.number.int({ min: 1, max: 10 });
      const lineTotal = qty * p.sellingPrice;
      const gstAmount = Number((lineTotal * (p.gstPercent / 100)).toFixed(2));
      total += lineTotal + gstAmount;
      gstTotal += gstAmount;
      return {
        productId: p.id,
        quantity: qty,
        unitPrice: p.sellingPrice,
        gstAmount,
      };
    });

    await prisma.sale.create({
      data: {
        customerId: customer?.id,
        invoiceNo: invoiceNumber(invoiceCounter++),
        totalAmount: Number(total.toFixed(2)),
        gstAmount: Number(gstTotal.toFixed(2)),
        paymentMode: faker.helpers.arrayElement(['CASH', 'UPI', 'CARD', 'NET_BANKING', 'CREDIT']),
        createdAt: faker.date.past({ years: 1 }),
        items: { create: itemsData },
      },
    });
  }
  console.log('Sales seeded (1 year of history).');

  // ---------- AI Alerts (based on low stock we seeded) ----------
  const lowStockItems = await prisma.stockItem.findMany({
    where: { quantity: { lt: 30 } },
    include: { product: true, warehouse: true },
    take: 10,
  });

  for (const item of lowStockItems) {
    const recommendedQty = item.product.reorderLevel * 2;
    const estimatedCost = Number((recommendedQty * item.product.purchasePrice).toFixed(2));

    await prisma.aiAlert.create({
      data: {
        type: 'LOW_STOCK',
        severity: item.quantity === 0 ? 'HIGH' : 'MEDIUM',
        title: `Low Stock: ${item.product.name} at ${item.warehouse.name}`,
        explanation: `Stock for ${item.product.name} has fallen to ${item.quantity} units, below the safety level of ${item.product.reorderLevel} at ${item.warehouse.name}.`,
        suggestedAction: `Purchase ${recommendedQty} units. Estimated cost: ₹${estimatedCost}.`,
        status: 'PENDING',
        productId: item.product.id,
        supplierId: item.product.supplierId,
        recommendedQty,
        estimatedCost,
      },
    });
  }
  console.log('AI alerts seeded.');

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });