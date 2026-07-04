import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Indian ERP + AI",
  description: "AI-powered ERP for Indian SMEs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
