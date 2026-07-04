import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import { ThemeProvider } from "@/lib/themeContext";
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
      <body className="antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <AiChatWidget />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
