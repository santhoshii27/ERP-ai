'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { ScannedProduct, Warehouse } from '@/lib/types';
import CameraScanner from '@/components/CameraScanner';

function formatInr(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function ScannerPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [cameraActive, setCameraActive] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [product, setProduct] = useState<ScannedProduct | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [notFoundBarcode, setNotFoundBarcode] = useState('');

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

  const handleScan = useCallback(
    async (barcode: string) => {
      if (!token) return;
      setError('');
      setMessage('');
      setNotFoundBarcode('');

      try {
        const data = await apiRequest<{ product: ScannedProduct }>(
          `/barcode/lookup/${barcode}`,
          { token }
        );
        setProduct(data.product);
      } catch {
        setProduct(null);
        setNotFoundBarcode(barcode);
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
          handleScan(bufferRef.current);
        }
        bufferRef.current = '';
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleScan]);

  async function handleManualLookup() {
    if (!manualBarcode.trim()) return;
    await handleScan(manualBarcode.trim());
  }

  async function handleReceiveStock() {
    if (!token || !product || !selectedWarehouse || quantity <= 0) return;
    setError('');

    try {
      const data = await apiRequest<{ message: string }>('/barcode/receive', {
        method: 'POST',
        token,
        body: { barcode: product.barcode, warehouseId: selectedWarehouse, quantity },
      });
      setMessage(data.message);
      setProduct(null);
      setManualBarcode('');
      setQuantity(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to receive stock');
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
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Barcode Scanner — Receiving</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Scan with camera, USB scanner, or enter manually.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Scan mode toggle */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setCameraActive(!cameraActive)}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              cameraActive
                ? 'bg-blue-600 text-white'
                : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {cameraActive ? 'Stop Camera' : 'Start Camera Scan'}
          </button>
        </div>

        {/* Camera scanner */}
        <div className="mt-4">
          <CameraScanner onScan={handleScan} active={cameraActive} />
        </div>

        {/* Manual entry + USB scanner note */}
        <div className="mt-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Manual Entry / USB Scanner Input
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleManualLookup();
              }}
              placeholder="Type or scan barcode, then press Enter"
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
            />
            <button
              onClick={handleManualLookup}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Lookup
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            USB/Bluetooth barcode scanners work automatically anywhere on this page — just scan.
          </p>
        </div>

        {message && (
          <p className="mt-4 rounded-lg bg-green-50 dark:bg-green-950/50 px-4 py-3 text-sm text-green-700 dark:text-green-400">{message}</p>
        )}
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {notFoundBarcode && (
          <p className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-950/50 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            No product found for barcode <strong>{notFoundBarcode}</strong>. Create New Product?
            (Coming soon — product creation from unknown barcodes)
          </p>
        )}

        {/* Product found -> receiving form */}
        {product && (
          <div className="mt-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm">
            <h2 className="font-semibold tracking-tight text-slate-900 dark:text-white">{product.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {product.category.name} • Supplier: {product.supplier.name}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Barcode:</span>{' '}
                <span className="font-medium text-slate-900 dark:text-white">{product.barcode}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">HSN Code:</span>{' '}
                <span className="font-medium text-slate-900 dark:text-white">{product.hsnCode}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Purchase Price:</span>{' '}
                <span className="font-medium text-slate-900 dark:text-white">{formatInr(product.purchasePrice)}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Selling Price:</span>{' '}
                <span className="font-medium text-slate-900 dark:text-white">{formatInr(product.sellingPrice)}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">GST:</span>{' '}
                <span className="font-medium text-slate-900 dark:text-white">{product.gstPercent}%</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Reorder Level:</span>{' '}
                <span className="font-medium text-slate-900 dark:text-white">{product.reorderLevel}</span>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Current Stock by Warehouse</h3>
              <ul className="mt-2 space-y-1">
                {product.stockItems.map((s) => (
                  <li key={s.id} className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{s.warehouse.name}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{s.quantity} units</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Quantity to Add</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Warehouse</label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleReceiveStock}
              className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700"
            >
              Add to Inventory
            </button>
          </div>
        )}
      </div>
    </main>
  );
}