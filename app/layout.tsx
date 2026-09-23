import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { Viewport } from "next";
import AuthGuard from "@/components/auth-guard";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#EFEFEF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Rafel POS",
  description: "Aplikasi POS Barbershop Mobile Rafel Pangkas Rambut",

  // Konfigurasi Logo menggunakan file public/scissors.svg
  icons: {
    icon: "/scissors.svg",
    shortcut: "/scissors.svg",
    apple: "/scissors.svg",
  },

  // Tampilan nama & ikon saat di-install di iPhone (PWA)
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rafel POS",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#EFEFEF]">
        <AuthGuard>
          <main className="w-full max-w-[425px] mx-auto px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-32 flex-1">
            {children}
          </main>
          <BottomNav />
        </AuthGuard>
      </body>
    </html>
  );
}
