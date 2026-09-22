"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Wallet, QrCode } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type BarberStat = {
  nama: string;
  status_aktif: boolean;
  D: number;
  A: number;
  B: number;
  C: number;
  S: number;
  total: number;
};

type DashboardData = {
  tokoBuka: boolean;
  totalPendapatan: number;
  totalPengeluaran: number;
  totalKomisi: number;
  totalCash: number;
  totalQris: number;
  barberStats: BarberStat[];
};

const LIST_LAYANAN = [
  { label: "Dewasa", imageSrc: "/assets/layanan/lyn-dewasa.png", code: "D" },
  { label: "Anak", imageSrc: "/assets/layanan/lyn-anak.png", code: "A" },
  { label: "Bayi", imageSrc: "/assets/layanan/lyn-bayi.png", code: "B" },
  { label: "Semir", imageSrc: "/assets/layanan/lyn-semir.png", code: "S" },
];

export default function BerandaPage() {
  const router = useRouter();
  const [kasir, setKasir] = useState({ nama: "", role: "" });

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData>({
    tokoBuka: true,
    totalPendapatan: 0,
    totalPengeluaran: 0,
    totalKomisi: 0,
    totalCash: 0,
    totalQris: 0,
    barberStats: [],
  });

  async function fetchKasirData() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("kasir")
      .select("nama, role")
      .eq("id", session.user.id)
      .single();

    if (data) setKasir(data);
  }

  useEffect(() => {
    async function fetchDashboard() {
      const now = new Date();
      const offsetMs = now.getTimezoneOffset() * 60000;
      const todayLocal = new Date(now.getTime() - offsetMs);
      const today = todayLocal.toISOString().split("T")[0];

      const startOfDayUTC = new Date(`${today}T00:00:00+07:00`).toISOString();
      const endOfDayUTC = new Date(`${today}T23:59:59+07:00`).toISOString();

      const [shiftRes, transaksiRes, pengeluaranRes] = await Promise.all([
        supabase
          .from("shift")
          .select("status")
          .eq("tanggal", today)
          .maybeSingle(),
        supabase
          .from("transaksi")
          .select(
            "total, metode_bayar, barber_id, barbers(nama, status_aktif), transaksi_item(qty, nominal_komisi_snapshot, katalog_id, katalog(kode))"
          )
          .gte("created_at", startOfDayUTC)
          .lte("created_at", endOfDayUTC),
        supabase
          .from("pengeluaran")
          .select("nominal")
          .gte("created_at", startOfDayUTC)
          .lte("created_at", endOfDayUTC),
      ]);

      let pendapatan = 0,
        cash = 0,
        qris = 0,
        totalKomisi = 0;
      const statPerBarber: Record<string, BarberStat> = {};

      transaksiRes.data?.forEach((trx: any) => {
        pendapatan += trx.total;
        if (trx.metode_bayar === "cash") cash += trx.total;
        if (trx.metode_bayar === "qris") qris += trx.total;

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
          };
        }

        trx.transaksi_item?.forEach((item: any) => {
          const kode = item.katalog?.kode as
            | "D"
            | "A"
            | "B"
            | "C"
            | "S"
            | undefined;
          if (kode && statPerBarber[namaBarber][kode] !== undefined) {
            statPerBarber[namaBarber][kode] += item.qty;
            if (kode !== "C") {
              statPerBarber[namaBarber].total += item.qty;
            }
          }
          totalKomisi += (item.nominal_komisi_snapshot ?? 0) * (item.qty ?? 1);
        });
      });

      const totalKeluar =
        pengeluaranRes.data?.reduce((sum, p) => sum + p.nominal, 0) ?? 0;

      setDashboard({
        tokoBuka: shiftRes.data?.status !== "tutup",
        totalPendapatan: pendapatan,
        totalPengeluaran: totalKeluar,
        totalKomisi: totalKomisi,
        totalCash: cash,
        totalQris: qris,
        barberStats: Object.values(statPerBarber),
      });

      setLoading(false);
    }

    fetchDashboard();
    fetchKasirData();
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

  const saldo =
    dashboard.totalPendapatan -
    dashboard.totalKomisi -
    dashboard.totalPengeluaran;

    const totalD = dashboard.barberStats.reduce((a, b) => a + b.D, 0);
    const totalA = dashboard.barberStats.reduce((a, b) => a + b.A, 0);
    const totalB = dashboard.barberStats.reduce((a, b) => a + b.B, 0);
    const totalC = dashboard.barberStats.reduce((a, b) => a + b.C, 0);
    const totalS = dashboard.barberStats.reduce((a, b) => a + b.S, 0);
    const totalAkumulasi = dashboard.barberStats.reduce(
      (a, b) => a + b.total,
      0
    );

  return (
    <div className="w-full font-sans">
      {/* Top Profile Bar */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">
            Hello, {kasir.nama || "..."}
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5 flex items-center gap-1.5">
            <span>
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </span>
          </p>
        </div>

        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 font-bold text-sm">
          {kasir.nama
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
      </div>

      {/* Card Saldo Utama */}
      <div className="bg-white rounded-[30px] p-2 mb-3">
        <section
          className="rounded-[24px] text-white px-5 pt-4 pb-5"
          style={{
            background: "linear-gradient(180deg, #3138E8 0%, #5E68FF 100%)",
          }}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-[13px] font-medium tracking-wide text-white">
              Saldo Hari Ini
            </span>
            <span
              className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                dashboard.tokoBuka
                  ? "bg-[#BEF264] text-black"
                  : "bg-black text-white"
              }`}
            >
              {dashboard.tokoBuka ? "Toko Buka" : "Toko Tutup"}
            </span>
          </div>

          <div className="flex items-start gap-1">
            <span className="text-xs font-medium tracking-wider py-0.5 rounded-md text-white">
              Rp
            </span>
            <span className="text-[36px] font-black tracking-tight leading-none">
              {saldo.toLocaleString("id-ID")}
            </span>
          </div>
        </section>

        {/* Ringkasan Pendapatan & Pengeluaran */}
        <div className="py-3 px-4 flex items-center justify-around">
          {/* Pengeluaran */}
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-gray-500">
              Pengeluaran
            </span>
            <div className="flex items-start gap-0.5 mt-0.5">
              <span className="text-[9px] font-medium text-[#DC2626]">Rp</span>
              <span className="text-[13px] font-bold text-[#DC2626] leading-none">
                {dashboard.totalPengeluaran.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Pemisah Garis Vertikal */}
          <div className="w-[1px] h-[28px] bg-slate-200 shrink-0" />

          {/* Pendapatan */}
          <div className="flex flex-col text-right items-end">
            <span className="text-[11px] font-medium text-gray-500">
              Pendapatan
            </span>
            <div className="flex items-start gap-0.5 mt-0.5">
              <span className="text-[9px] font-bold text-[#16A34A]">Rp</span>
              <span className="text-[13px] font-bold text-[#16A34A] leading-none">
                {dashboard.totalPendapatan.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metode Pembayaran */}
      <section className="mb-3">
        <div className="rounded-[30px] p-3 bg-white border border-gray-100">
          <div className="bg-white rounded-[24px] py-4 px-5 flex items-center justify-between">
            <div className="flex-1 flex justify-start pr-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-gray-400 block">
                    Cash
                  </span>
                  <div className="flex items-start gap-0.5">
                    <span className="text-[9px] font-bold text-black">Rp</span>
                    <span className="text-[13px] font-bold text-black leading-none">
                      {dashboard.totalCash.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-[1px] h-[30px] bg-slate-200 shrink-0 mx-2" />

            <div className="flex-1 flex justify-end pl-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-gray-400 block">
                    QRIS
                  </span>
                  <div className="flex items-start gap-0.5">
                    <span className="text-[9px] font-bold text-black">Rp</span>
                    <span className="text-[13px] font-bold text-[#111111] leading-none">
                      {dashboard.totalQris.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access Layanan */}
      <section className="mb-3">
        <h2 className="text-base font-semibold text-gray-800 mb-1">
          Pintasan Layanan
        </h2>
        <div className="bg-white rounded-[30px] p-3.5">
          <div className="grid grid-cols-4 gap-2.5">
            {LIST_LAYANAN.map((item) => (
              <div
                key={item.code}
                onClick={() => router.push(`/transaksi?quick=${item.code}`)}
                className="flex flex-col items-center justify-center cursor-pointer group active:scale-95 transition-all"
              >
                <div className="w-20 h-20 bg-White group-hover:bg-gray-100 rounded-[18px] p-2.5 flex items-center justify-center relative">
                  <Image
                    src={item.imageSrc}
                    alt={item.label}
                    width={40}
                    height={40}
                    className="object-contain w-full h-full"
                  />
                </div>
                <span className="text-[11px] font-semibold text-gray-700 mt-1.5 text-center">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistik Barber */}
      <section className="mb-4">
        <h2 className="text-base font-semibold text-gray-800 mb-1">
          Statistik Barber
        </h2>
        <div className="bg-white rounded-[30px] p-3.5">
          <div className="bg-slate-100 rounded-[16px] px-2.5 py-2 grid grid-cols-12 text-center mb-2.5 text-[10px] font-bold text-gray-600">
            <span className="col-span-3 text-left pl-1">Nama</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-1">D</span>
            <span className="col-span-1">A</span>
            <span className="col-span-1">B</span>
            <span className="col-span-1">C</span>
            <span className="col-span-1">S</span>
            <span className="col-span-2">Total</span>
          </div>

          {dashboard.barberStats.map((b) => (
            <div
              key={b.nama}
              className="grid grid-cols-12 text-center py-2 px-2.5 text-[11px] items-center border-b border-gray-50 last:border-none"
            >
              <span className="col-span-3 text-left pl-1 font-bold text-gray-800 truncate">
                {b.nama}
              </span>
              <div className="col-span-2 flex justify-center">
                <span
                  className={`text-[9px] font-bold px-2 py-[2px] rounded-full ${
                    b.status_aktif
                      ? "bg-[#BEF264] text-black"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {b.status_aktif ? "Aktif" : "Off"}
                </span>
              </div>
              <span className="col-span-1 font-medium text-gray-600">
                {b.D}
              </span>
              <span className="col-span-1 font-medium text-gray-600">
                {b.A}
              </span>
              <span className="col-span-1 font-medium text-gray-600">
                {b.B}
              </span>
              <span className="col-span-1 font-medium text-gray-600">
                {b.C}
              </span>
              <span className="col-span-1 font-medium text-gray-600">
                {b.S}
              </span>
              <span className="col-span-2 font-bold text-[#3138E8]">
                {b.total}
              </span>
            </div>
          ))}

          {dashboard.barberStats.length > 0 && (
            <div className="grid grid-cols-12 text-center py-2.5 px-2.5 text-[11px] items-center border-t-2 border-gray-100 bg-gray-50/50 rounded-b-[12px] mt-1">
              <span className="col-span-5 text-left pl-1 font-bold text-gray-800">
                Total Akumulasi
              </span>
              <span className="col-span-1 font-bold text-gray-800">
                {totalD}
              </span>
              <span className="col-span-1 font-bold text-gray-800">
                {totalA}
              </span>
              <span className="col-span-1 font-bold text-gray-800">
                {totalB}
              </span>
              <span className="col-span-1 font-bold text-gray-800">
                {totalC}
              </span>
              <span className="col-span-1 font-bold text-gray-800">
                {totalS}
              </span>
              <span className="col-span-2 font-black text-[#3138E8]">
                {totalAkumulasi}
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
