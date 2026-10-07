"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LogOut, ChevronRight, Store, X, Check, User } from "lucide-react";

type ShiftStatus = "belum_dibuka" | "buka" | "tutup_sementara" | "tutup";
type Barber = { id: string; nama: string; status_aktif: boolean };

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function ProfilPage() {
  const [kasir, setKasir] = useState({ nama: "", role: "" });

  const [loading, setLoading] = useState(true);
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus>("belum_dibuka");

  // Modal checklist barber
  const [showModalBarber, setShowModalBarber] = useState(false);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Modal Tutup Sementara
  const [showModalTutupSementara, setShowModalTutupSementara] = useState(false);
  const [showModalNonaktifkan, setShowModalNonaktifkan] = useState(false);

  useEffect(() => {
    fetchKasirData();
    fetchShiftHariIni();
  }, []);

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

  async function fetchShiftHariIni() {
    const { data } = await supabase
      .from("shift")
      .select("id, status")
      .eq("tanggal", todayStr())
      .maybeSingle();

    if (data) {
      setShiftId(data.id);
      setShiftStatus(data.status as ShiftStatus);
    } else {
      setShiftId(null);
      setShiftStatus("belum_dibuka");
    }
    setLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  async function openModalBarber() {
    const { data } = await supabase
      .from("barbers")
      .select("id, nama, status_aktif")
      .order("nama");

    const list = data ?? [];
    setBarbers(list);

    const defaultChecked: Record<string, boolean> = {};
    list.forEach((b) => {
      defaultChecked[b.id] = shiftStatus === "buka" ? b.status_aktif : true;
    });
    setCheckedMap(defaultChecked);
    setShowModalBarber(true);
  }

  async function handleConfirmBukaToko() {
    setSaving(true);

    const checkedIds = Object.keys(checkedMap).filter((id) => checkedMap[id]);
    const uncheckedIds = Object.keys(checkedMap).filter(
      (id) => !checkedMap[id]
    );

    if (checkedIds.length > 0) {
      await supabase
        .from("barbers")
        .update({ status_aktif: true })
        .in("id", checkedIds);
    }
    if (uncheckedIds.length > 0) {
      await supabase
        .from("barbers")
        .update({ status_aktif: false })
        .in("id", uncheckedIds);
    }

    if (shiftId) {
      await supabase.from("shift").update({ status: "buka" }).eq("id", shiftId);
    } else {
      const { data } = await supabase
        .from("shift")
        .insert({ tanggal: todayStr(), status: "buka" })
        .select("id")
        .single();
      if (data) setShiftId(data.id);
    }

    setShiftStatus("buka");
    setSaving(false);
    setShowModalBarber(false);
  }

  async function handleTutupSementara() {
    if (!shiftId) return;
    setSaving(true);

    await supabase
      .from("barbers")
      .update({ status_aktif: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    await supabase
      .from("shift")
      .update({ status: "tutup_sementara" })
      .eq("id", shiftId);

    setShiftStatus("tutup_sementara");
    setSaving(false);
    setShowModalTutupSementara(false);
  }

  async function handleNonaktifkanToko() {
    if (!shiftId) return;
    setSaving(true);

    await supabase
      .from("shift")
      .update({ status: "tutup", ditutup_at: new Date().toISOString() })
      .eq("id", shiftId);

    setShiftStatus("tutup");
    setSaving(false);
    setShowModalNonaktifkan(false);
  }

  if (loading) {
    return (
      <div className="w-full py-24 text-center text-xs font-medium text-gray-400">
        Memuat profil...
      </div>
    );
  }

  return (
    <div className="w-full font-sans pb-32 text-black flex flex-col gap-4">
      {/* 1. CARD PROFIL */}
      <div className="bg-white rounded-[30px] p-3 border border-gray-100 flex flex-col gap-2">
        <h2 className="px-2 pb-1 text-sm font-semibold text-[#494949]">
          Profil
        </h2>

        <div className="rounded-[20px] bg-slate-100 p-3 flex flex-col gap-2 shadow">
          <div className="w-full bg-white rounded-[16px] p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 font-bold text-xs">
              {kasir.nama
                ? kasir.nama
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                : "-"}
            </div>
            <div>
              <span className="text-[13px] font-semibold text-gray-800 block">
                {kasir.nama || "Memuat..."}
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5 capitalize">
                {kasir.role || "-"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CARD PENGATURAN TOKO */}
      <div className="bg-white rounded-[30px] p-3 border border-gray-100 flex flex-col gap-2">
        <h2 className="px-2 pb-1 text-sm font-semibold text-[#494949]">
          Pengaturan Toko
        </h2>

        <div className="rounded-[20px] bg-slate-100 p-3 flex flex-col gap-2 shadow">
          {/* Buka Toko / Buka Toko Lagi */}
          {(shiftStatus === "belum_dibuka" ||
            shiftStatus === "tutup_sementara") && (
            <button
              onClick={openModalBarber}
              className="w-full bg-white rounded-[16px] p-3 flex items-center justify-between text-left active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Store size={18} />
                </div>
                <div>
                  <span className="text-[13px] font-semibold text-gray-800 block">
                    {shiftStatus === "tutup_sementara"
                      ? "Buka Toko Lagi"
                      : "Buka Toko"}
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    {shiftStatus === "tutup_sementara"
                      ? "Semua barber nonaktif sementara"
                      : "Mulai operasional hari ini"}
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400 shrink-0" />
            </button>
          )}

          {/* Kelola Barber Aktif */}
          {shiftStatus === "buka" && (
            <button
              onClick={openModalBarber}
              className="w-full bg-white rounded-[16px] p-3 flex items-center justify-between text-left active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-gray-700 flex items-center justify-center shrink-0">
                  <Store size={18} />
                </div>
                <div>
                  <span className="text-[13px] font-semibold text-gray-800 block">
                    Kelola Barber Aktif
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    Toko sedang buka • Atur barber
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400 shrink-0" />
            </button>
          )}

          {/* Tutup Toko (Jika Buka) */}
          {shiftStatus === "buka" && (
            <button
              onClick={() => setShowModalTutupSementara(true)}
              className="w-full bg-white rounded-[16px] p-3 flex items-center justify-between text-left active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Store size={18} />
                </div>
                <div>
                  <span className="text-[13px] font-semibold text-gray-800 block">
                    Tutup Toko
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    Akhiri operasional hari ini
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400 shrink-0" />
            </button>
          )}

          {/* Nonaktifkan Toko (Final) */}
          {shiftStatus === "tutup_sementara" && (
            <button
              onClick={() => setShowModalNonaktifkan(true)}
              className="w-full bg-white rounded-[16px] p-3 flex items-center justify-between text-left active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <LogOut size={18} />
                </div>
                <div>
                  <span className="text-[13px] font-semibold text-red-600 block">
                    Nonaktifkan Toko (Final)
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    Akhiri hari ini secara permanen
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400 shrink-0" />
            </button>
          )}

          {/* Jika Sudah Tutup Total */}
          {shiftStatus === "tutup" && (
            <div className="w-full bg-white rounded-[16px] p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-100 text-gray-500 flex items-center justify-center shrink-0">
                <Store size={18} />
              </div>
              <div>
                <span className="text-[13px] font-semibold text-gray-800 block">
                  Toko Sudah Ditutup
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  Cek halaman Laporan untuk rekap
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. CARD SIGN OUT */}
      <div className="bg-white rounded-[30px] p-3 border border-gray-100">
        <button
          onClick={handleSignOut}
          className="w-full bg-white rounded-[16px] p-1 flex items-center justify-between text-left active:bg-gray-50 transition-colors"
        >
          <span className="text-[13px] font-semibold text-gray-800 px-2">
            Sign Out
          </span>
          <div className="w-8 h-8 rounded-full bg-slate-100 text-gray-700 flex items-center justify-center shrink-0">
            <LogOut size={16} />
          </div>
        </button>
      </div>

      <p className="text-center text-[10px] text-gray-400 py-1">
        RafelPOS v1.2.1
      </p>

      {/* Modal Checklist Barber */}
      {showModalBarber && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0">
          <div className="w-full max-w-[420px] bg-white rounded-t-[32px] px-6 pt-6 pb-8 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg text-gray-900 font-bold">
                Barber Aktif Hari Ini
              </h3>
              <button
                onClick={() => setShowModalBarber(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 mb-6 text-gray-900">
              {barbers.map((b) => {
                const checked = checkedMap[b.id] ?? false;
                return (
                  <button
                    key={b.id}
                    onClick={() =>
                      setCheckedMap((prev) => ({
                        ...prev,
                        [b.id]: !prev[b.id],
                      }))
                    }
                    className="w-full flex items-center justify-between bg-gray-50 rounded-[18px] px-4 py-3.5"
                  >
                    <span className="text-sm font-semibold">{b.nama}</span>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${
                        checked
                          ? "bg-gray-900 text-white"
                          : "bg-gray-200 text-transparent"
                      }`}
                    >
                      <Check size={14} />
                    </div>
                  </button>
                );
              })}
              {barbers.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-8 font-medium">
                  Belum ada data barber
                </p>
              )}
            </div>

            <button
              onClick={handleConfirmBukaToko}
              disabled={saving}
              className="w-full py-4 rounded-[20px] bg-indigo-600 text-white font-bold text-sm disabled:opacity-50 active:scale-98 transition-transform shadow-md"
            >
              {saving ? "Menyimpan..." : "Konfirmasi"}
            </button>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Tutup Sementara */}
      {showModalTutupSementara && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0">
          <div className="w-full max-w-[420px] bg-white rounded-t-[32px] px-6 pt-6 pb-8 animate-in slide-in-from-bottom duration-200">
            <h3 className="text-lg text-gray-900 font-bold mb-2">
              Tutup Toko Sementara?
            </h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Semua barber akan otomatis dinonaktifkan, dan
              transaksi/pengeluaran baru akan{" "}
              <span className="font-bold text-gray-800">
                terkunci sementara
              </span>
              . Kamu masih bisa membuka toko lagi setelah ini kalau diperlukan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModalTutupSementara(false)}
                className="w-full py-3.5 rounded-[20px] bg-gray-100 text-gray-800 font-bold text-xs disabled:opacity-50 active:scale-98 transition-transform"
              >
                Batal
              </button>
              <button
                onClick={handleTutupSementara}
                disabled={saving}
                className="w-full py-3.5 rounded-[20px] bg-amber-500 text-white font-bold text-xs disabled:opacity-50 active:scale-98 transition-transform shadow-md"
              >
                {saving ? "Memproses..." : "Ya, Tutup Sementara"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Nonaktifkan Toko */}
      {showModalNonaktifkan && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0">
          <div className="w-full max-w-[420px] bg-white rounded-t-[32px] px-6 pt-6 pb-8 animate-in slide-in-from-bottom duration-200">
            <h3 className="text-lg font-bold mb-2 text-red-600">
              Nonaktifkan Toko Hari Ini?
            </h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Tindakan ini{" "}
              <span className="font-bold text-gray-800">
                tidak bisa dibatalkan
              </span>
              . Semua transaksi & pengeluaran hari ini akan terkunci permanen,
              dan laporan harian akan langsung muncul di halaman Laporan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModalNonaktifkan(false)}
                className="w-full py-3.5 rounded-[20px] bg-gray-100 text-gray-800 font-bold text-xs disabled:opacity-50 active:scale-98 transition-transform"
              >
                Batal
              </button>
              <button
                onClick={handleNonaktifkanToko}
                disabled={saving}
                className="w-full py-3.5 rounded-[20px] bg-red-600 text-white font-bold text-xs disabled:opacity-50 active:scale-98 transition-transform shadow-md"
              >
                {saving ? "Memproses..." : "Ya, Nonaktifkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
