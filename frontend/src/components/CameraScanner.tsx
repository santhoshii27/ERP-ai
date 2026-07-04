'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  active: boolean;
}

export default function CameraScanner({ onScan, active }: CameraScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'camera-scanner-region';
  const [error, setError] = useState('');
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  useEffect(() => {
    if (!active) return;

    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        (decodedText) => {
          // Duplicate scan protection: ignore same code within 2 seconds
          const now = Date.now();
          if (
            decodedText === lastScanRef.current.code &&
            now - lastScanRef.current.time < 2000
          ) {
            return;
          }
          lastScanRef.current = { code: decodedText, time: now };

          // Beep on successful scan
          try {
            const audio = new Audio(
              'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAAAAAAAA'
            );
            audio.play().catch(() => {});
          } catch {
            // ignore audio errors
          }

          // Vibrate on successful scan (mobile only)
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }

          onScan(decodedText);
        },
        () => {
          // per-frame scan failures are normal (no barcode in view yet) — ignore
        }
      )
      .catch((err) => {
        setError('Could not access camera: ' + err);
      });

    return () => {
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {});
    };
  }, [active, onScan]);

  if (!active) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div id={containerId} className="mx-auto max-w-md overflow-hidden rounded-xl" />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}