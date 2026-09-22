"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Pencil, Plus, Trash2, X, Minus } from "lucide-react";

type TransaksiRow = {
  id: string;
  total: number;
  metode_bayar: string;
  barbers: { nama: string } | null;
  transaksi_item: { nama_katalog_snapshot: string; qty: number }[];
};

type PengeluaranRow = {
  id: string;
  nominal: number;
  kategori: string;
  keterangan: string;
};

type Barber = { id: string; nama: string };

type Layanan = {
  id: string;
  kode: string;
  nama: string;
  kategori: string; // 'layanan' | 'produk'
  harga: number;
  nominal_komisi: number;
};

export default function TransaksiPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [tab, setTab] = useState<"transaksi" | "pengeluaran">("transaksi");
  const [loading, setLoading] = useState(true);
  const [transaksiList, setTransaksiList] = useState<TransaksiRow[]>([]);
  const [pengeluaranList, setPengeluaranList] = useState<PengeluaranRow[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // --- State khusus modal Tambah Transaksi ---
  const [showModalTransaksi, setShowModalTransaksi] = useState(false);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [layananList, setLayananList] = useState<Layanan[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [metodeBayar, setMetodeBayar] = useState<"cash" | "qris">("cash");
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  // --- State khusus modal Tambah Pengeluaran ---
  const [showModalPengeluaran, setShowModalPengeluaran] = useState(false);
  const [keterangan, setKeterangan] = useState("");
  const [nominal, setNominal] = useState("");
  const [kategori, setKategori] = useState<"rutin" | "insidental">("rutin");

  useEffect(() => {
    fetchData();
    const quickKode = searchParams.get("quick");
    if (quickKode) {
      handleQuickAccess(quickKode);
    }
  }, []);

  async function handleQuickAccess(kode: string) {
    const [{ data: b }, { data: l }] = await Promise.all([
      supabase
        .from("barbers")
        .select("id, nama")
        .eq("status_aktif", true)
        .order("nama"),
      supabase
        .from("katalog")
        .select("id, kode, nama, kategori, harga, nominal_komisi")
        .eq("is_active", true)
        .order("nama"),
    ]);
    setBarbers(b ?? []);
    setLayananList(l ?? []);
    setSelectedBarberId("");
    setMetodeBayar("cash");
    const target = (l ?? []).find((item) => item.kode === kode);
    setQtyMap(target ? { [target.id]: 1 } : {});
    setShowModalTransaksi(true);
    router.replace("/transaksi"); // bersihkan URL biar nggak ke-trigger ulang kalau refresh
  }

  async function getCurrentKasirId() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user.id ?? null;
  }

  async function fetchData() {
    setLoading(true);

    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60000;
    const todayLocal = new Date(now.getTime() - offsetMs);
    const today = todayLocal.toISOString().split("T")[0];
    const start = new Date(`${today}T00:00:00+07:00`).toISOString();
    const end = new Date(`${today}T23:59:59+07:00`).toISOString();

    const [{ data: trx }, { data: keluar }] = await Promise.all([
      supabase
        .from("transaksi")
        .select(
          "id, total, metode_bayar, barbers(nama), transaksi_item(nama_katalog_snapshot, qty)"
        )
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false }),
      supabase
        .from("pengeluaran")
        .select("id, nominal, kategori, keterangan")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false }),
    ]);
    setTransaksiList((trx as any) ?? []);
    setPengeluaranList(keluar ?? []);
    setLoading(false);
  }

  function switchTab(newTab: "transaksi" | "pengeluaran") {
    setTab(newTab);
    exitEditMode();
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function exitEditMode() {
    setIsEditMode(false);
    setSelectedIds([]);
  }

  async function handleFabClick() {
    if (!isEditMode) {
      if (tab === "transaksi") {
        openModalTransaksi();
      } else {
        openModalPengeluaran();
      }
      return;
    }

    if (selectedIds.length === 0) {
      exitEditMode();
      return;
    }

    const table = tab === "transaksi" ? "transaksi" : "pengeluaran";
    const { error, count } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .in("id", selectedIds);

    console.log("DELETE result:", { error, count, selectedIds, table });

    if (error) {
      alert("Gagal menghapus: " + error.message);
      return;
    }

    await fetchData();
    exitEditMode();
  }

  // --- Fungsi modal Tambah Transaksi ---
  async function openModalTransaksi() {
    const [{ data: b }, { data: l }] = await Promise.all([
      supabase
        .from("barbers")
        .select("id, nama")
        .eq("status_aktif", true)
        .order("nama"),
      supabase
        .from("katalog")
        .select("id, kode, nama, kategori, harga, nominal_komisi")
        .eq("is_active", true)
        .order("nama"),
    ]);
    setBarbers(b ?? []);
    setLayananList(l ?? []);
    setSelectedBarberId("");
    setMetodeBayar("cash");
    setQtyMap({});
    setShowModalTransaksi(true);
  }

  function changeQty(layananId: string, delta: number) {
    setQtyMap((prev) => {
      const current = prev[layananId] ?? 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[layananId];
      } else {
        updated[layananId] = next;
      }
      return updated;
    });
  }

  const selectedLayananIds = Object.keys(qtyMap);
  const totalTransaksi = selectedLayananIds.reduce((sum, id) => {
    const layanan = layananList.find((l) => l.id === id);
    return sum + (layanan ? layanan.harga * qtyMap[id] : 0);
  }, 0);

  async function handleConfirmTransaksi() {
    if (!selectedBarberId) {
      alert("Pilih barber dulu");
      return;
    }
    if (selectedLayananIds.length === 0) {
      alert("Pilih minimal 1 layanan");
      return;
    }

    setSaving(true);
    const kasirId = await getCurrentKasirId();

    const { data: trxHeader, error: errHeader } = await supabase
      .from("transaksi")
      .insert({
        barber_id: selectedBarberId,
        kasir_id: kasirId,
        metode_bayar: metodeBayar,
        total: totalTransaksi,
      })
      .select("id")
      .single();

    if (errHeader || !trxHeader) {
      alert("Gagal menyimpan transaksi: " + errHeader?.message);
      setSaving(false);
      return;
    }

    const items = selectedLayananIds
      .map((id) => {
        const layanan = layananList.find((l) => l.id === id);
        if (!layanan) return null;
        const qty = qtyMap[id];
        return {
          transaksi_id: trxHeader.id,
          katalog_id: id,
          nama_katalog_snapshot: layanan.nama,
          harga_snapshot: layanan.harga,
          nominal_komisi_snapshot: layanan.nominal_komisi,
          qty,
          subtotal: layanan.harga * qty,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const { error: errItem } = await supabase
      .from("transaksi_item")
      .insert(items);

    if (errItem) {
      alert("Gagal menyimpan detail transaksi: " + errItem.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowModalTransaksi(false);
    await fetchData();
  }

  // --- Fungsi modal Tambah Pengeluaran ---
  function openModalPengeluaran() {
    setKeterangan("");
    setNominal("");
    setKategori("rutin");
    setShowModalPengeluaran(true);
  }

  function formatRupiah(value: string) {
    const numberString = value.replace(/[^,\d]/g, "").toString();
    const split = numberString.split(",");
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
      const separator = sisa ? "." : "";
      rupiah += separator + ribuan.join(".");
    }

    return split[1] !== undefined ? rupiah + "," + split[1] : rupiah;
  }

  async function handleConfirmPengeluaran() {
    const nominalNumber = Number(nominal.replace(/\./g, ""));

    if (!keterangan.trim()) {
      alert("Isi keterangan dulu");
      return;
    }
    if (!nominalNumber || nominalNumber <= 0) {
      alert("Nominal harus lebih dari 0");
      return;
    }

    setSaving(true);
    const kasirId = await getCurrentKasirId();

    const { error } = await supabase.from("pengeluaran").insert({
      keterangan: keterangan.trim(),
      nominal: nominalNumber,
      kategori,
      kasir_id: kasirId,
    });

    setSaving(false);

    if (error) {
      alert("Gagal menyimpan pengeluaran: " + error.message);
      return;
    }

    setShowModalPengeluaran(false);
    await fetchData();
  }

  const currentList = tab === "transaksi" ? transaksiList : pengeluaranList;

  return (
    <div className="w-full font-sans pb-28">
      {/* Segmented Switcher */}
      <div className="bg-white rounded-[30px] p-1.5 flex items-center h-14 mb-5">
        <button
          onClick={() => switchTab("transaksi")}
          className={`w-1/2 h-full rounded-[24px] font-bold text-sm transition-all ${
            tab === "transaksi" ? "bg-black text-white" : "text-gray-400"
          }`}
        >
          Transaksi
        </button>
        <button
          onClick={() => switchTab("pengeluaran")}
          className={`w-1/2 h-full rounded-[24px] font-bold text-sm transition-all ${
            tab === "pengeluaran" ? "bg-[#DC2626] text-white" : "text-gray-400"
          }`}
        >
          Pengeluaran
        </button>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-[30px] p-5 min-h-[440px] relative">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-bold text-[#111111]">
            {tab === "transaksi" ? "Riwayat Transaksi" : "Riwayat Pengeluaran"}
          </h2>
        </div>

        {loading && (
          <p className="text-center text-gray-400 text-xs py-12 font-medium">
            Memuat data...
          </p>
        )}

        {/* List Transaksi */}
        {!loading && tab === "transaksi" && (
          <div className="flex flex-col divide-y divide-gray-100">
            {transaksiList.length === 0 && (
              <p className="text-center text-gray-400 text-xs py-12 font-medium">
                Belum ada transaksi recorded
              </p>
            )}
            {transaksiList.map((trx) => (
              <div
                key={trx.id}
                className="py-3.5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3">
                  {isEditMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(trx.id)}
                      onChange={() => toggleSelect(trx.id)}
                      className="w-4 h-4 rounded accent-white"
                    />
                  )}
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-gray-800 line-clamp-1">
                      {trx.transaksi_item
                        .map((i) => i.nama_katalog_snapshot)
                        .join(", ")}
                    </span>
                    <div className="flex items-start gap-0.5 mt-0.5">
                      <span className="text-[9px] font-bold text-[#16A34A]">
                        Rp
                      </span>
                      <span className="text-[13px] font-bold text-[#16A34A] leading-none">
                        {trx.total.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[12px] font-bold text-gray-700 block">
                    {trx.barbers?.nama ?? "-"}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    {trx.metode_bayar}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List Pengeluaran */}
        {!loading && tab === "pengeluaran" && (
          <div className="flex flex-col divide-y divide-gray-100">
            {pengeluaranList.length === 0 && (
              <p className="text-center text-gray-400 text-xs py-12 font-medium">
                Belum ada pengeluaran recorded
              </p>
            )}
            {pengeluaranList.map((p) => (
              <div
                key={p.id}
                className="py-3.5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3">
                  {isEditMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="w-4 h-4 rounded accent-white"
                    />
                  )}
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-gray-800 line-clamp-1">
                      {p.keterangan || "-"}
                    </span>
                    <div className="flex items-start gap-0.5 mt-0.5">
                      <span className="text-[9px] font-bold text-[#DC2626]">
                        Rp
                      </span>
                      <span className="text-[13px] font-bold text-[#DC2626] leading-none">
                        {p.nominal.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 max-w-[120px]">
                  <span className="text-[11px] font-medium text-gray-500 block capitalize truncate">
                    {p.kategori}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Buttons Area */}
      <div className="fixed bottom-20 left-0 right-0 z-40 pointer-events-none flex items-center justify-center">
        <div className="w-full max-w-[425px] relative px-8 flex items-center justify-center h-16">
          <button
            onClick={handleFabClick}
            className={`pointer-events-auto w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90 ${
              isEditMode
                ? "bg-[#DC2626] text-white"
                : tab === "pengeluaran"
                ? "bg-white text-black"
                : "bg-white text-black"
            }`}
          >
            {isEditMode ? <Trash2 size={22} /> : <Plus size={26} />}
          </button>

          {currentList.length > 0 && (
            <button
              onClick={() =>
                isEditMode ? exitEditMode() : setIsEditMode(true)
              }
              className={`pointer-events-auto absolute right-8 w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-all active:scale-90 ${
                isEditMode
                  ? "bg-red-100 text-red-600 border border-red-200"
                  : "bg-white text-gray-600 border border-gray-100"
              }`}
            >
              <Pencil size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Sheet: Tambah Transaksi */}
      {showModalTransaksi && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-[425px] bg-white rounded-t-[32px] px-6 pt-5 pb-8 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-[#111111]">
                Tambah Transaksi
              </h3>
              <button
                onClick={() => setShowModalTransaksi(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-[13px] font-bold text-gray-900 mb-1.5">
                Pilih Barber
              </label>
              <select
                value={selectedBarberId}
                onChange={(e) => setSelectedBarberId(e.target.value)}
                className="w-full h-11 rounded-[16px] bg-gray-100 px-4 text-xs font-semibold text-gray-800 outline-none"
              >
                <option value="">-- Pilih Barber --</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-[13px] font-bold text-gray-900 mb-1.5">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMetodeBayar("cash")}
                  className={`h-10 rounded-[14px] font-bold text-xs transition-all ${
                    metodeBayar === "cash"
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setMetodeBayar("qris")}
                  className={`h-10 rounded-[14px] font-bold text-xs transition-all ${
                    metodeBayar === "qris"
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  QRIS
                </button>
              </div>
            </div>

            {/* Section Pilih Layanan & Produk */}
            <div className="mb-5">
              {/* Section Layanan */}
              <label className="block text-[13px] font-bold text-gray-900 mb-1.5">
                Layanan
              </label>
              <div className="flex flex-col gap-2 mb-4">
                {layananList
                  .filter((l) => l.kategori === "layanan")
                  .map((layanan) => {
                    const qty = qtyMap[layanan.id] ?? 0;
                    return (
                      <div
                        key={layanan.id}
                        className="flex items-center justify-between bg-gray-50 rounded-[20px] px-4 py-2.5"
                      >
                        <div>
                          <span className="text-sm font-medium text-gray-900 block">
                            {layanan.nama}
                          </span>
                          <span className="text-xs text-gray-500">
                            Rp {layanan.harga.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => changeQty(layanan.id, -1)}
                            className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-700"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-4 text-center text-sm font-bold text-gray-900">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => changeQty(layanan.id, 1)}
                            className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Section Produk */}
              <label className="block text-[13px] font-bold text-gray-900 mb-1.5">
                Produk
              </label>
              <div className="flex flex-col gap-2 mb-4">
                {layananList
                  .filter((l) => l.kategori === "produk")
                  .map((produk) => {
                    const qty = qtyMap[produk.id] ?? 0;
                    return (
                      <div
                        key={produk.id}
                        className="flex items-center justify-between bg-gray-50 rounded-[20px] px-4 py-2.5"
                      >
                        <div>
                          <span className="text-sm font-medium text-gray-900 block">
                            {produk.nama}
                          </span>
                          <span className="text-xs text-gray-500">
                            Rp {produk.harga.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => changeQty(produk.id, -1)}
                            className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-700"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-4 text-center text-sm font-bold text-gray-900">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => changeQty(produk.id, 1)}
                            className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                {layananList.filter((l) => l.kategori === "produk").length ===
                  0 && (
                  <p className="text-xs text-gray-400 text-center py-3">
                    Belum ada produk
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-100 mb-5 px-1">
              <span className="block text-[13px] font-bold text-gray-900 mb-1.5">
                Total Transaksi
              </span>
              <div className="flex items-start gap-0.5">
                <span className="text-[10px] font-bold text-[#16A34A]">Rp</span>
                <span className="text-lg font-bold text-[#16A34A] leading-none">
                  {totalTransaksi.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmTransaksi}
              disabled={saving}
              className="w-full py-3.5 rounded-[20px] bg-[#3138E8] text-white font-bold text-xs disabled:opacity-50 active:scale-98 transition-transform shadow-md"
            >
              {saving ? "Menyimpan..." : "Simpan Transaksi"}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Sheet: Tambah Pengeluaran */}
      {showModalPengeluaran && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-[425px] bg-white rounded-t-[32px] px-6 pt-5 pb-8 animate-in slide-in-from-bottom duration-400">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-[#111111]">
                Tambah Pengeluaran
              </h3>
              <button
                onClick={() => setShowModalPengeluaran(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                Keterangan
              </label>
              <input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Misal: Ganti Cermin"
                className="w-full h-11 rounded-[16px] bg-gray-100 px-4 text-xs font-semibold text-gray-800 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  Nominal
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-xs font-bold text-gray-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={nominal}
                    onChange={(e) => setNominal(formatRupiah(e.target.value))}
                    placeholder="0"
                    className="w-full h-11 rounded-[16px] bg-gray-100 pl-11 pr-4 text-xs font-semibold text-gray-800 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  Kategori
                </label>
                <select
                  value={kategori}
                  onChange={(e) =>
                    setKategori(e.target.value as "rutin" | "insidental")
                  }
                  className="w-full h-11 rounded-[16px] bg-gray-100 px-4 text-xs font-semibold text-gray-800 outline-none"
                >
                  <option value="rutin">Rutin</option>
                  <option value="insidental">Insidental</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmPengeluaran}
              disabled={saving}
              className="w-full py-3.5 rounded-[20px] bg-[#DC2626] text-white font-bold text-xs disabled:opacity-50 active:scale-98 transition-transform shadow-md"
            >
              {saving ? "Menyimpan..." : "Simpan Pengeluaran"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
