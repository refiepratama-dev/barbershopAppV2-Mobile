"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Wallet, QrCode } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

// Tipe Data Lanjutan & Type-Safe
type BarberStat = {
  nama: string;
  status_aktif: boolean;
  D: number;
  A: number;
  B: number;
  C: number;
  S: number;
  total: number;
  pendapatan: number;
};

type DashboardData = {
  tokoBuka: boolean;
  totalPendapatan: number;
  totalPengeluaran: number;
  totalCash: number;
  totalQris: number;
  barberStats: BarberStat[];
};

type KodeKatalog = "D" | "A" | "B" | "C" | "S";

type TransaksiItemResponse = {
  qty: number | null;
  subtotal: number | null;
  katalog: { kode: string } | null;
};

type TransaksiResponse = {
  total: number | null;
  metode_bayar: string | null;
  barbers: { nama: string; status_aktif: boolean } | null;
  transaksi_item: TransaksiItemResponse[] | null;
};

const LIST_LAYANAN = [
  { label: "Dewasa", imageSrc: "/assets/layanan/lyn-dewasa.png", code: "D" },
  { label: "Anak", imageSrc: "/assets/layanan/lyn-anak.png", code: "A" },
  { label: "Bayi", imageSrc: "/assets/layanan/lyn-bayi.png", code: "B" },
  { label: "Semir", imageSrc: "/assets/layanan/lyn-semir.png", code: "S" },
] as const;

export default function BerandaPage() {
  const router = useRouter();
  const [kasir, setKasir] = useState({ nama: "", role: "" });
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData>({
    tokoBuka: true,
    totalPendapatan: 0,
    totalPengeluaran: 0,
    totalCash: 0,
    totalQris: 0,
    barberStats: [],
  });

  useEffect(() => {
    async function loadAllData() {
      // 1. Ambil waktu & format tanggal lokal sekaligus
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const todayStr = `${year}-${month}-${day}`;

      const startOfDay = `${todayStr}T00:00:00+07:00`;
      const endOfDay = `${todayStr}T23:59:59+07:00`;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      // 2. Fetch data secara paralel
      const [kasirRes, barbersRes, shiftRes, transaksiRes, pengeluaranRes] =
        await Promise.all([
          session
            ? supabase
                .from("kasir")
                .select("nama, role")
                .eq("id", session.user.id)
                .single()
            : Promise.resolve({ data: null }),
          supabase.from("barbers").select("id, nama, status_aktif"),
          supabase
            .from("shift")
            .select("status")
            .eq("tanggal", todayStr)
            .maybeSingle(),
          supabase
            .from("transaksi")
            .select(
              "total, metode_bayar, barbers(nama, status_aktif), transaksi_item(qty, subtotal, katalog(kode))"
            )
            .gte("created_at", startOfDay)
            .lte("created_at", endOfDay),
          supabase
            .from("pengeluaran")
            .select("nominal")
            .gte("created_at", startOfDay)
            .lte("created_at", endOfDay),
        ]);

      if (kasirRes.data) setKasir(kasirRes.data);

      let pendapatan = 0;
      let cash = 0;
      let qris = 0;
      const statPerBarber: Record<string, BarberStat> = {};

      // 3. Inisialisasi daftar barber
      barbersRes.data?.forEach((b) => {
        statPerBarber[b.nama] = {
          nama: b.nama,
          status_aktif: b.status_aktif,
          D: 0,
          A: 0,
          B: 0,
          C: 0,
          S: 0,
          total: 0,
          pendapatan: 0,
        };
      });

      // 4. Pengolahan Data Transaksi (Strict Typing & Anti-Crash)
      const transaksiList =
        (transaksiRes.data as unknown as TransaksiResponse[]) ?? [];

      for (let i = 0; i < transaksiList.length; i++) {
        const trx = transaksiList[i];
        const trxTotal = trx.total ?? 0;
        pendapatan += trxTotal;

        if (trx.metode_bayar === "cash") cash += trxTotal;
        else if (trx.metode_bayar === "qris") qris += trxTotal;

        const namaBarber = trx.barbers?.nama ?? "Tanpa Barber";

        if (!statPerBarber[namaBarber]) {
          statPerBarber[namaBarber] = {
            nama: namaBarber,
            status_aktif: trx.barbers?.status_aktif ?? true,
            D: 0,
            A: 0,
            B: 0,
            C: 0,
            S: 0,
            total: 0,
            pendapatan: 0,
          };
        }

        const bStat = statPerBarber[namaBarber];
        const items = trx.transaksi_item ?? [];

        for (let j = 0; j < items.length; j++) {
          const item = items[j];
          const kode = item.katalog?.kode as KodeKatalog | undefined;
          const qty = item.qty ?? 0;

          if (kode && bStat[kode] !== undefined) {
            bStat[kode] += qty;
            if (kode !== "C") {
              bStat.total += qty;
            }
          }
          bStat.pendapatan += item.subtotal ?? 0;
        }
      }

      const totalKeluar =
        pengeluaranRes.data?.reduce((sum, p) => sum + (p.nominal || 0), 0) ?? 0;

      setDashboard({
        tokoBuka: shiftRes.data?.status !== "tutup",
        totalPendapatan: pendapatan,
        totalPengeluaran: totalKeluar,
        totalCash: cash,
        totalQris: qris,
        barberStats: Object.values(statPerBarber),
      });

      setLoading(false);
    }

    loadAllData();
  }, []);

  // 5. Kalkulasi Totals & Persentase Ringkas Tanpa Overhead
  const totals = useMemo(() => {
    return dashboard.barberStats.reduce(
      (acc, b) => {
        acc.D += b.D;
        acc.A += b.A;
        acc.B += b.B;
        acc.C += b.C;
        acc.S += b.S;
        acc.total += b.total;
        return acc;
      },
      { D: 0, A: 0, B: 0, C: 0, S: 0, total: 0 }
    );
  }, [dashboard.barberStats]);

  const { pctCash, pctQris } = useMemo(() => {
    const totalMetode = dashboard.totalCash + dashboard.totalQris;
    if (totalMetode === 0) return { pctCash: 0, pctQris: 0 };
    const cashPct = Math.round((dashboard.totalCash / totalMetode) * 100);
    return { pctCash: cashPct, pctQris: 100 - cashPct };
  }, [dashboard.totalCash, dashboard.totalQris]);

  // Format Inisial Avatar Kasir Safe-Check
  const avatarInitials = useMemo(() => {
    if (!kasir.nama) return "";
    return kasir.nama
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }, [kasir.nama]);

  // Format Tanggal Display
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  }, []);

  if (loading) {
    return (
      <div className="w-full space-y-4 animate-pulse">
        <div className="h-12 bg-gray-200 rounded-[20px]" />
        <div className="h-44 bg-gray-200 rounded-[30px]" />
        <div className="h-20 bg-gray-200 rounded-[30px]" />
        <div className="h-28 bg-gray-200 rounded-[30px]" />
      </div>
    );
  }

  const saldo = dashboard.totalPendapatan - dashboard.totalPengeluaran;

  return (
    <div className="w-full font-sans">
      {/* Header Profile */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">
            Hai, {kasir.nama || "..."}
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5 flex items-center gap-1.5">
            <span>{todayFormatted}</span>
          </p>
        </div>

        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 font-bold text-sm">
          {avatarInitials}
        </div>
      </div>

      {/* Ringkasan Saldo & Arus Kas */}
      <section className="mb-3 rounded-[30px] bg-white p-3 border border-gray-100">
        <div
          className="rounded-[24px] text-white p-4 shadow"
          style={{
            background: "linear-gradient(180deg, #3138E8 0%, #5E68FF 100%)",
          }}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-[13px] font-medium tracking-wide text-white">
              Saldo Hari Ini
            </span>
            <span
              className={`text-[11px] font-medium px-3 py-1 rounded-full ${
                dashboard.tokoBuka
                  ? "bg-[#BEF264] text-black"
                  : "bg-black text-white"
              }`}
            >
              {dashboard.tokoBuka ? "Toko Buka" : "Toko Tutup"}
            </span>
          </div>

          <div className="flex items-start gap-1">
            <span className="text-xs font-medium tracking-wider py-0.5 text-white">
              Rp
            </span>
            <span className="text-[36px] font-black tracking-tight leading-none">
              {saldo.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        <div className="pt-3 pb-1 px-3 flex items-center justify-between">
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-medium text-gray-500">
              Pengeluaran
            </span>
            <div className="flex items-baseline gap-0.5 mt-0.5">
              <span className="text-[9px] font-medium text-[#DC2626]">Rp</span>
              <span className="text-[13px] font-medium text-[#DC2626] leading-none">
                {dashboard.totalPengeluaran.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          <div className="w-[1px] h-[26px] bg-slate-200 shrink-0" />

          <div className="flex flex-col text-right items-end">
            <span className="text-[11px] font-medium text-gray-500">
              Pendapatan
            </span>
            <div className="flex items-baseline justify-end gap-0.5 mt-0.5">
              <span className="text-[9px] font-medium text-[#16A34A]">Rp</span>
              <span className="text-[13px] font-medium text-[#16A34A] leading-none">
                {dashboard.totalPendapatan.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Metode Pembayaran */}
      <section className="mb-3 rounded-[30px] bg-white p-3 border border-gray-100">
        <h2 className="px-2 pb-2 text-sm font-semibold text-[#494949]">
          Metode Pembayaran
        </h2>

        <div className="rounded-[20px] bg-slate-100 p-3 shadow-sm">
          <div className="flex justify-between items-center mb-2.5 px-1">
            <div className="flex items-center gap-2">
              <div className="text-slate-700 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-medium text-gray-500">
                  Cash
                </span>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[9px] font-medium text-black">Rp</span>
                  <span className="text-[12px] font-medium text-black">
                    {dashboard.totalCash.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-slate-700 flex items-center justify-center shrink-0">
                <QrCode className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-medium text-gray-500">
                  QRIS
                </span>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[9px] font-medium text-black">Rp</span>
                  <span className="text-[12px] font-medium text-black">
                    {dashboard.totalQris.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-200">
            <div
              className="h-full bg-[#3138E8] transition-all duration-500"
              style={{ width: `${pctCash}%` }}
            />
            <div
              className="h-full bg-[#BEF264] transition-all duration-500"
              style={{ width: `${pctQris}%` }}
            />
          </div>
        </div>
      </section>

      {/* Menu Layanan */}
      <section className="mb-3 rounded-[30px] bg-white p-3">
        <h2 className="px-2 pb-2 text-sm font-semibold text-[#494949]">Menu</h2>

        <div className="rounded-[24px] bg-slate-100 p-2 shadow">
          <div className="grid grid-cols-4 gap-2.5">
            {LIST_LAYANAN.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => router.push(`/transaksi?quick=${item.code}`)}
                className="group flex flex-col items-center justify-center rounded-[20px] bg-white p-2 transition-transform active:scale-95 shadow"
              >
                <div className="relative h-11 w-auto">
                  <Image
                    src={item.imageSrc}
                    alt={item.label}
                    width={40}
                    height={40}
                    className="h-full w-full object-contain"
                  />
                </div>

                <span className="mt-1.5 text-center text-[11px] font-medium text-slate-700">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Ringkasan Statistik Barber */}
      <section className="rounded-[30px] bg-white p-3">
        <h2 className="px-2 pb-2 text-sm font-semibold text-[#494949]">
          Ringkasan
        </h2>

        <div className="rounded-[20px] bg-slate-100 p-2 shadow">
          <div className="grid grid-cols-12 items-center pb-2 text-center text-[10px] font-medium text-gray-500">
            <span className="col-span-3 text-left pl-2">Nama</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-1">D</span>
            <span className="col-span-1">A</span>
            <span className="col-span-1">B</span>
            <span className="col-span-1">C</span>
            <span className="col-span-1">S</span>
            <span className="col-span-2">Total</span>
          </div>

          <div>
            {dashboard.barberStats.map((b) => (
              <div
                key={b.nama}
                className="grid grid-cols-12 items-center py-2 text-center text-[11px] font-medium"
              >
                <div className="col-span-3 flex flex-col text-left pl-2 min-w-0">
                  <span className="truncate text-gray-800 font-medium">
                    {b.nama}
                  </span>
                  <span className="text-[9px] font-medium text-[#16A34A]">
                    Rp {b.pendapatan.toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="col-span-2 flex justify-center">
                  <span
                    className={`rounded-full px-2 py-[2px] text-[9px] font-medium ${
                      b.status_aktif
                        ? "bg-[#BEF264] text-black"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {b.status_aktif ? "Aktif" : "Off"}
                  </span>
                </div>

                <span className="col-span-1 text-gray-600">{b.D}</span>
                <span className="col-span-1 text-gray-600">{b.A}</span>
                <span className="col-span-1 text-gray-600">{b.B}</span>
                <span className="col-span-1 text-gray-600">{b.C}</span>
                <span className="col-span-1 text-gray-600">{b.S}</span>
                <span className="col-span-2 text-[#3138E8]">{b.total}</span>
              </div>
            ))}
          </div>

          {dashboard.barberStats.length > 0 && (
            <div className="grid grid-cols-12 items-center pt-2 pb-1 text-center text-[11px]">
              <span className="col-span-5 text-left pl-2 text-gray-800 font-semibold">
                Total Pelanggan
              </span>
              <span className="col-span-1 text-gray-800 font-semibold">
                {totals.D}
              </span>
              <span className="col-span-1 text-gray-800 font-semibold">
                {totals.A}
              </span>
              <span className="col-span-1 text-gray-800 font-semibold">
                {totals.B}
              </span>
              <span className="col-span-1 text-gray-800 font-semibold">
                {totals.C}
              </span>
              <span className="col-span-1 text-gray-800 font-semibold">
                {totals.S}
              </span>
              <span className="col-span-2 text-[#3138E8] font-bold">
                {totals.total}
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
