'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { CartItem, SaleResult, Warehouse, ScannedProduct, Customer } from '@/lib/types';

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
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerCity, setNewCustomerCity] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');

  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login');
    }
  }, [loading, token, router]);

  useEffect(() => {
    if (!token || customerSearch.trim().length < 2) {
      setCustomerResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      apiRequest<{ customers: Customer[] }>(
        `/billing/customers?search=${encodeURIComponent(customerSearch)}`,
        { token }
      )
        .then((data) => setCustomerResults(data.customers))
        .catch(() => setCustomerResults([]));
    }, 300);

    return () => clearTimeout(timeout);
  }, [token, customerSearch]);

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
          customerId: selectedCustomer?.id,
        },
      });

      setLastInvoice(data.sale);
      setCart([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Billing / POS</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Scan products, generate GST invoice.</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Left: scan input + cart */}
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                  autoFocus
                />
                <button
                  onClick={handleManualAdd}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                USB/Bluetooth scanners work automatically anywhere on this page.
              </p>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm">
              <h2 className="font-semibold tracking-tight text-slate-900 dark:text-white">Cart</h2>
              {cart.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">No items yet. Scan a product to begin.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatInr(item.sellingPrice)} × {item.quantity} + GST {item.gstPercent}%
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                          className="w-16 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2 py-1 text-center text-sm"
                        />
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm">
              <h2 className="font-semibold tracking-tight text-slate-900 dark:text-white">Checkout</h2>

              <div className="relative mt-3">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Customer (optional)
                </label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{selectedCustomer.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{selectedCustomer.phone}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerSearch('');
                      }}
                      className="text-xs text-red-500 hover:text-red-700 dark:text-red-400"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Search by name or phone (or leave blank for walk-in)"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                  />
                )}

                {showCustomerDropdown && !selectedCustomer && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg max-h-56 overflow-y-auto">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowCustomerDropdown(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <p className="text-slate-900 dark:text-white">{c.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {c.phone} • {c.city}
                        </p>
                      </button>
                    ))}
                    {customerSearch.trim().length >= 2 && customerResults.length === 0 && (
                      <p className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">
                        No matching customer found.
                      </p>
                    )}
                    <button
                      onClick={() => {
                        setShowNewCustomerForm(true);
                        setShowCustomerDropdown(false);
                        setNewCustomerName(customerSearch);
                      }}
                      className="block w-full border-t border-slate-100 dark:border-slate-700 px-3 py-2 text-left text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      + Add New Customer
                    </button>
                  </div>
                )}

                {showNewCustomerForm && (
                  <div className="mt-2 space-y-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                    <input
                      type="text"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="Full name"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-1.5 text-sm outline-none"
                    />
                    <input
                      type="text"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      placeholder="Phone number"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-1.5 text-sm outline-none"
                    />
                    <input
                      type="text"
                      value={newCustomerCity}
                      onChange={(e) => setNewCustomerCity(e.target.value)}
                      placeholder="City"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-1.5 text-sm outline-none"
                    />
                    <input
                      type="email"
                      value={newCustomerEmail}
                      onChange={(e) => setNewCustomerEmail(e.target.value)}
                      placeholder="Email (optional)"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-1.5 text-sm outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateCustomer}
                        className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Save Customer
                      </button>
                      <button
                        onClick={() => setShowNewCustomerForm(false)}
                        className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Warehouse</label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="NET_BANKING">Net Banking</option>
                  <option value="CREDIT">Credit</option>
                </select>
              </div>

              <div className="mt-4 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                  <span className="text-slate-900 dark:text-white">{formatInr(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">GST</span>
                  <span className="text-slate-900 dark:text-white">{formatInr(gstTotal)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span className="text-slate-900 dark:text-white">Total</span>
                  <span className="text-blue-600 dark:text-blue-400">{formatInr(grandTotal)}</span>
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
          <div className="mt-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">GST Invoice</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Invoice No: {lastInvoice.invoiceNo}</p>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {new Date(lastInvoice.createdAt).toLocaleDateString('en-IN')}
              </p>
            </div>

            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="pb-2">Item</th>
                  <th className="pb-2">HSN</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-right">GST</th>
                </tr>
              </thead>
              <tbody>
                {lastInvoice.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-2 text-slate-900 dark:text-white">{item.product.name}</td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{item.product.hsnCode}</td>
                    <td className="py-2 text-right text-slate-900 dark:text-white">{item.quantity}</td>
                    <td className="py-2 text-right text-slate-900 dark:text-white">{formatInr(item.unitPrice)}</td>
                    <td className="py-2 text-right text-slate-900 dark:text-white">{formatInr(item.gstAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="w-48 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">GST Total</span>
                  <span className="text-slate-900 dark:text-white">{formatInr(lastInvoice.gstAmount)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span className="text-slate-900 dark:text-white">Grand Total</span>
                  <span className="text-blue-600 dark:text-blue-400">{formatInr(lastInvoice.totalAmount)}</span>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              Payment Mode: {lastInvoice.paymentMode} • Print/PDF export coming in a later step.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}