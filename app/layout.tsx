import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/Auth";
import { AuthGuard } from "@/components/AuthGuard";
import { Nav } from "@/components/Nav";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ElectroMart — Inventory & Sales",
  description: "Small business inventory, sales, and profit tracking for a Nigerian electronics store.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <Nav />
              <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
                <AuthGuard>{children}</AuthGuard>
              </main>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
