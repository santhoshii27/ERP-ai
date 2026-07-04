import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import AiChatWidget from "@/components/AiChatWidget";

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
      <body className="antialiased">
        <AuthProvider>
          {children}
          <AiChatWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
