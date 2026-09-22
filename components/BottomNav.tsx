"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, SquareText, BarChart3, UserRound } from "lucide-react";

const menuItems = [
  { key: "beranda", href: "/", label: "Beranda", Icon: House },
  {
    key: "transaksi",
    href: "/transaksi",
    label: "Transaksi",
    Icon: SquareText,
  },
  { key: "laporan", href: "/laporan", label: "Laporan", Icon: BarChart3 },
  { key: "profil", href: "/profil", label: "Profil", Icon: UserRound },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  function isActive(key: string) {
    if (key === "beranda") return pathname === "/";
    return pathname === `/${key}`;
  }

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[385px] bg-white rounded-[30px] shadow-lg py-3 px-6 flex items-center justify-between z-50">
      {menuItems.map(({ key, href, label, Icon }) => {
        const active = isActive(key);
        return (
          <Link
            key={key}
            href={href}
            aria-label={label}
            className={`flex items-center justify-center p-1 transition-colors ${
              active ? "text-[#3138E8]" : "text-slate-500 hover:text-black"
            }`}
          >
            <Icon
              size={23}
              strokeWidth={1.9}
              fill={key === "beranda" && active ? "currentColor" : "none"}
            />
          </Link>
        );
      })}
    </nav>
  );
}
