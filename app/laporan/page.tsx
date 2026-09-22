"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronRight, ChevronLeft, FileText } from "lucide-react";

type ShiftTutup = {
  id: string;
  tanggal: string;
  ditutup_at: string | null;
  omzet: number;
};

type KomisiBarber = {
  nama: string;
  omzet: number;
  komisi: number;
};

type DetailLaporan = {
  omzetLayanan: number;
  omzetProduk: number;
  totalCash: number;
  totalQris: number;
  totalKomisi: number;
  kasKeluar: number;
  labaBersih: number;
  komisiPerBarber: KomisiBarber[];
};

function getRangeUTC(tanggal: string) {
  const start = new Date(`${tanggal}T00:00:00+07:00`).toISOString();
  const end = new Date(`${tanggal}T23:59:59+07:00`).toISOString();
  return { start, end };
}

export default function LaporanPage() {
  const [loading, setLoading] = useState(true);
  const [shiftList, setShiftList] = useState<ShiftTutup[]>([]);

  // State untuk halaman Detail
  const [selectedShift, setSelectedShift] = useState<ShiftTutup | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<DetailLaporan | null>(null);

  useEffect(() => {
    fetchLaporanHarian();
  }, []);

  async function fetchLaporanHarian() {
    setLoading(true);
    const { data: shifts } = await supabase
      .from("shift")
      .select("id, tanggal, ditutup_at")
      .eq("status", "tutup")
      .order("tanggal", { ascending: false });

    if (!shifts || shifts.length === 0) {
      setShiftList([]);
      setLoading(false);
      return;
    }

    const results = await Promise.all(
      shifts.map(async (shift) => {
        const { start, end } = getRangeUTC(shift.tanggal);
        const { data: transaksi } = await supabase
          .from("transaksi")
          .select("total")
          .gte("created_at", start)
          .lte("created_at", end);
        const omzet = transaksi?.reduce((sum, t) => sum + t.total, 0) ?? 0;
        return {
          id: shift.id,
          tanggal: shift.tanggal,
          ditutup_at: shift.ditutup_at,
          omzet,
        };
      })
    );

    setShiftList(results);
    setLoading(false);
  }

  async function openDetail(shift: ShiftTutup) {
    setSelectedShift(shift);
    setDetailLoading(true);

    const { start, end } = getRangeUTC(shift.tanggal);

    const [{ data: transaksi }, { data: pengeluaran }] = await Promise.all([
      supabase
        .from("transaksi")
        .select(
          "total, metode_bayar, barbers(nama), transaksi_item(subtotal, nominal_komisi_snapshot, qty, katalog(kategori))"
        )
        .gte("created_at", start)
        .lte("created_at", end),
      supabase
        .from("pengeluaran")
        .select("nominal")
        .gte("created_at", start)
        .lte("created_at", end),
    ]);

    let omzetLayanan = 0;
    let omzetProduk = 0;
    let totalCash = 0;
    let totalQris = 0;
    let totalKomisi = 0;
    const komisiMap: Record<string, KomisiBarber> = {};

    transaksi?.forEach((trx: any) => {
      if (trx.metode_bayar === "cash") totalCash += trx.total;
      if (trx.metode_bayar === "qris") totalQris += trx.total;

      const namaBarber = trx.barbers?.nama ?? "Tanpa Barber";
      if (!komisiMap[namaBarber]) {
        komisiMap[namaBarber] = { nama: namaBarber, omzet: 0, komisi: 0 };
      }

      trx.transaksi_item?.forEach((item: any) => {
        const komisiItem =
          (item.nominal_komisi_snapshot ?? 0) * (item.qty ?? 1);

        if (item.katalog?.kategori === "produk") {
          omzetProduk += item.subtotal;
        } else {
          omzetLayanan += item.subtotal;
        }

        komisiMap[namaBarber].omzet += item.subtotal;
        komisiMap[namaBarber].komisi += komisiItem;
        totalKomisi += komisiItem;
      });
    });

    const kasKeluar = pengeluaran?.reduce((sum, p) => sum + p.nominal, 0) ?? 0;
    const totalOmzet = omzetLayanan + omzetProduk;

    setDetail({
      omzetLayanan,
      omzetProduk,
      totalCash,
      totalQris,
      totalKomisi,
      kasKeluar,
      labaBersih: totalOmzet - totalKomisi - kasKeluar,
      komisiPerBarber: Object.values(komisiMap),
    });
    setDetailLoading(false);
  }

  function closeDetail() {
    setSelectedShift(null);
    setDetail(null);
  }

  function formatTanggal(tanggal: string) {
    return new Date(`${tanggal}T00:00:00`).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function formatWaktu(iso: string | null) {
    if (!iso) return "-";
    return (
      new Date(iso).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    );
  }

  // ===== VIEW: DETAIL (GAYA STRUK) =====
  if (selectedShift) {
    return (
      <div className="w-full font-sans pb-32 text-black">
        <button
          onClick={closeDetail}
          className="flex items-center gap-1 bg-black px-3 py-1.5 rounded-[30px] mb-4 active:opacity-80 transition-opacity"
        >
          <ChevronLeft size={16} className="text-white/60" />
          <span className="text-[11px] text-white font-semibold tracking-wider">
            Kembali
          </span>
        </button>

        {detailLoading && (
          <div className="bg-white rounded-[24px] p-6 shadow-sm">
            <p className="text-center text-gray-400 text-xs py-12 font-medium">
              Memuat data...
            </p>
          </div>
        )}

        {!detailLoading && detail && (
          <div className="bg-white rounded-[24px] p-6 shadow-sm relative border border-gray-100">
            {/* Header Struk */}
            <div className="flex flex-col items-center text-center pb-6 border-b border-dashed border-gray-200">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3 text-black">
                <FileText size={24} />
              </div>
              <h2 className="text-sm font-bold text-black uppercase tracking-wider">
                Laporan Harian
              </h2>
              <span className="text-xs text-gray-400 font-medium mt-0.5">
                {formatTanggal(selectedShift.tanggal)}
              </span>
            </div>

            {/* Bagian 1: Informasi Waktu & Status */}
            <div className="py-4 border-b border-dashed border-gray-200 space-y-2.5 text-[13px]">
              <div className="flex justify-between">
                <span className="text-gray-400 font-medium">Status Shift</span>
                <span className="font-medium text-white bg-black px-2 py-0.5 rounded-[30px] text-[11px]">
                  Ditutup
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-medium">Waktu Tutup</span>
                <span className="font-semibold text-black">
                  {formatWaktu(selectedShift.ditutup_at)}
                </span>
              </div>
            </div>

            {/* Bagian 2: Ringkasan Kas */}
            <div className="py-4 border-b border-dashed border-gray-200 space-y-2.5 text-[13px]">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Ringkasan Kas
              </p>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Omzet Layanan</span>
                <span className="font-bold text-emerald-600">
                  Rp {detail.omzetLayanan.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Omzet Produk</span>
                <span className="font-bold text-emerald-600">
                  Rp {detail.omzetProduk.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between pl-3 text-xs">
                <span className="text-gray-400">• Tunai (Cash)</span>
                <span className="font-medium text-black">
                  Rp {detail.totalCash.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between pl-3 text-xs">
                <span className="text-gray-400">• QRIS</span>
                <span className="font-medium text-black">
                  Rp {detail.totalQris.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Total Komisi</span>
                <span className="font-bold text-red-500">
                  − Rp {detail.totalKomisi.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Kas Keluar</span>
                <span className="font-bold text-red-500">
                  − Rp {detail.kasKeluar.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between pt-1 font-bold text-black text-sm">
                <span>Laba Bersih</span>
                <span className="text-emerald-600 text-base">
                  Rp {detail.labaBersih.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Bagian 3: Rincian Komisi Per Barber */}
            <div className="pt-4 space-y-2.5 text-[13px]">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Komisi Barber
              </p>
              {detail.komisiPerBarber.length === 0 ? (
                <p className="text-center text-gray-400 text-xs py-4 font-medium">
                  Tidak ada transaksi
                </p>
              ) : (
                detail.komisiPerBarber.map((b) => (
                  <div
                    key={b.nama}
                    className="flex justify-between items-center py-1"
                  >
                    <div>
                      <span className="font-semibold text-black block text-[13px]">
                        {b.nama}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Omzet: Rp {b.omzet.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <span className="font-bold text-black text-[13px]">
                      Rp {b.komisi.toLocaleString("id-ID")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== VIEW: LIST =====
  return (
    <div className="w-full font-sans pb-32 text-black">
      <div className="bg-white rounded-[30px] p-5 shadow-sm">
        <h2 className="text-sm font-bold text-[#111111]">Riwayat Laporan</h2>

        {loading && (
          <p className="text-center text-gray-400 text-xs py-12 font-medium">
            Memuat data...
          </p>
        )}

        {!loading && shiftList.length === 0 && (
          <p className="text-center text-gray-400 text-xs py-12 font-medium">
            Belum ada laporan.
          </p>
        )}

        {!loading && shiftList.length > 0 && (
          <div className="flex flex-col">
            {shiftList.map((shift) => (
              <button
                key={shift.id}
                onClick={() => openDetail(shift)}
                className="w-full flex items-center justify-between py-3.5 border-b border-gray-100 last:border-none text-left active:bg-gray-50/50 transition-colors"
              >
                <div>
                  <span className="text-[13px] font-medium text-black block mb-0.5">
                    {formatTanggal(shift.tanggal)}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-semibold">
                    Rp {shift.omzet.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-black px-3 py-1.5 rounded-[30px]">
                  <span className="text-[11px] text-white font-semibold tracking-wider">
                    Ditutup
                  </span>
                  <ChevronRight size={16} className="text-white/60" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
