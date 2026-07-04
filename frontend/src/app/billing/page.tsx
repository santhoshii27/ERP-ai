'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { CartItem, SaleResult, Warehouse, ScannedProduct } from '@/lib/types';

function formatInr(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function BillingPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [error, setError] = useState('');
  const [lastInvoice, setLastInvoice] = useState<SaleResult | null>(null);

  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login');
    }
  }, [loading, token, router]);

  useEffect(() => {
    if (!token) return;
    apiRequest<{ warehouses: Warehouse[] }>('/barcode/warehouses', { token })
      .then((data) => {
        setWarehouses(data.warehouses);
        if (data.warehouses.length > 0) setSelectedWarehouse(data.warehouses[0].id);
      })
      .catch(() => setError('Failed to load warehouses'));
  }, [token]);

  const addToCart = useCallback(
    async (barcode: string) => {
      if (!token) return;
      setError('');

      try {
        const data = await apiRequest<{ product: ScannedProduct }>(
          `/barcode/lookup/${barcode}`,
          { token }
        );
        const p = data.product;

        setCart((prev) => {
          const existing = prev.find((item) => item.productId === p.id);
          if (existing) {
            return prev.map((item) =>
              item.productId === p.id ? { ...item, quantity: item.quantity + 1 } : item
            );
          }
          return [
            ...prev,
            {
              productId: p.id,
              name: p.name,
              barcode: p.barcode,
              sellingPrice: p.sellingPrice,
              gstPercent: p.gstPercent,
              quantity: 1,
            },
          ];
        });
      } catch {
        setError(`No product found for barcode ${barcode}`);
      }
    },
    [token]
  );

  // USB/Bluetooth scanner support — same pattern as the receiving scanner page
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const now = Date.now();
      if (now - lastKeyTimeRef.current > 100) {
        bufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= 6) {
          addToCart(bufferRef.current);
        }
        bufferRef.current = '';
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addToCart]);

  async function handleManualAdd() {
    if (!barcodeInput.trim()) return;
    await addToCart(barcodeInput.trim());
    setBarcodeInput('');
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity } : item))
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }

  const subtotal = cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
  const gstTotal = cart.reduce(
    (sum, item) => sum + item.sellingPrice * item.quantity * (item.gstPercent / 100),
    0
  );
  const grandTotal = subtotal + gstTotal;

  async function handleCheckout() {
    if (!token || cart.length === 0 || !selectedWarehouse) return;
    setError('');

    try {
      const data = await apiRequest<{ sale: SaleResult }>('/billing/checkout', {
        method: 'POST',
        token,
        body: {
          items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          paymentMode,
          warehouseId: selectedWarehouse,
        },
      });

      setLastInvoice(data.sale);
      setCart([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Billing / POS</h1>
            <p className="mt-1 text-sm text-slate-500">Scan products, generate GST invoice.</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Left: scan input + cart */}
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Scan or Enter Barcode
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleManualAdd();
                  }}
                  placeholder="Scan barcode or type, then press Enter"
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  autoFocus
                />
                <button
                  onClick={handleManualAdd}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                USB/Bluetooth scanners work automatically anywhere on this page.
              </p>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">Cart</h2>
              {cart.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">No items yet. Scan a product to begin.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between border-b border-slate-100 pb-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatInr(item.sellingPrice)} × {item.quantity} + GST {item.gstPercent}%
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                          className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center text-sm"
                        />
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-sm text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: checkout panel */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">Checkout</h2>

              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium text-slate-700">Warehouse</label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium text-slate-700">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="NET_BANKING">Net Banking</option>
                  <option value="CREDIT">Credit</option>
                </select>
              </div>

              <div className="mt-4 space-y-1 border-t border-slate-100 pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-900">{formatInr(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GST</span>
                  <span className="text-slate-900">{formatInr(gstTotal)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span className="text-slate-900">Total</span>
                  <span className="text-blue-600">{formatInr(grandTotal)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Generate Invoice
              </button>
            </div>
          </div>
        </div>

        {/* Last generated invoice */}
        {lastInvoice && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">GST Invoice</h2>
                <p className="text-sm text-slate-500">Invoice No: {lastInvoice.invoiceNo}</p>
              </div>
              <p className="text-sm text-slate-500">
                {new Date(lastInvoice.createdAt).toLocaleDateString('en-IN')}
              </p>
            </div>

            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-2">Item</th>
                  <th className="pb-2">HSN</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-right">GST</th>
                </tr>
              </thead>
              <tbody>
                {lastInvoice.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="py-2 text-slate-900">{item.product.name}</td>
                    <td className="py-2 text-slate-500">{item.product.hsnCode}</td>
                    <td className="py-2 text-right text-slate-900">{item.quantity}</td>
                    <td className="py-2 text-right text-slate-900">{formatInr(item.unitPrice)}</td>
                    <td className="py-2 text-right text-slate-900">{formatInr(item.gstAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
              <div className="w-48 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">GST Total</span>
                  <span className="text-slate-900">{formatInr(lastInvoice.gstAmount)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span className="text-slate-900">Grand Total</span>
                  <span className="text-blue-600">{formatInr(lastInvoice.totalAmount)}</span>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Payment Mode: {lastInvoice.paymentMode} • Print/PDF export coming in a later step.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}