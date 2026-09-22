"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  User,
  Clock,
  LogOut,
  ChevronRight,
  Store,
  X,
  Check,
} from "lucide-react";

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
      .maybeSingle(); // 👈 diperbaiki

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
    // AuthGuard otomatis redirect ke /login karena onAuthStateChange mendeteksi session hilang
  }

  async function openModalBarber() {
    const { data } = await supabase
      .from("barbers")
      .select("id, nama, status_aktif")
      .order("nama");

    const list = data ?? [];
    setBarbers(list);

    // Default: semua tercentang aktif
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

    // Nonaktifkan semua barber
    await supabase
      .from("barbers")
      .update({ status_aktif: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // Update status shift
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
      <div className="w-full py-20 text-center text-sm text-gray-400">
        Memuat profil...
      </div>
    );
  }

  return (
    <div className="w-full font-sans pb-32">
      <header className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-black tracking-tight">
          Profile
        </h1>
      </header>

      {/* Hero Card */}
      <section className="bg-white rounded-[30px] p-3.5 flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 font-bold text-sm">
          {kasir.nama
            ? kasir.nama
                .split(" ")
                .map((n) => n[0])
                .join("")
            : "-"}
        </div>
        <div>
          <h2 className="text-sm font-bold text-black tracking-tight block">
            {kasir.nama || "Memuat..."}
          </h2>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            {kasir.role || "-"}
          </p>
        </div>
      </section>

      {/* Status Toko / Aksi Shift */}
      <h2 className="text-[14px] font-bold text-black mb-2.5">
        Pengaturan Toko
      </h2>
      <section className="mb-4">
        {/* Jika Belum Dibuka atau Tutup Sementara -> Tombol untuk Buka Toko */}
        {(shiftStatus === "belum_dibuka" ||
          shiftStatus === "tutup_sementara") && (
          <button
            onClick={openModalBarber}
            className="w-full bg-white rounded-[24px] p-3.5 flex items-center justify-between text-left mb-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#3138E8] flex items-center justify-center shrink-0">
                <Store size={16} />
              </div>
              <div>
                <span className="text-[13px] font-bold text-gray-800 block">
                  {shiftStatus === "tutup_sementara"
                    ? "Buka Toko Lagi"
                    : "Buka Toko"}
                </span>
                <span className="text-[11px] font-medium text-gray-400 block">
                  {shiftStatus === "tutup_sementara"
                    ? "Semua barber nonaktif sementara"
                    : "Mulai operasional hari ini"}
                </span>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-400 shrink-0" />
          </button>
        )}

        {/* Jika Sedang Buka -> Tombol Kelola Barber Aktif */}
        {shiftStatus === "buka" && (
          <button
            onClick={openModalBarber}
            className="w-full bg-white rounded-[30px] p-3.5 flex items-center justify-between text-left mb-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                <Store size={16} />
              </div>
              <div>
                <span className="text-[13px] font-bold text-gray-800 block">
                  Kelola Barber Aktif
                </span>
                <span className="text-[11px] font-medium text-gray-400 block">
                  Toko sedang buka • Atur barber
                </span>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-400 shrink-0" />
          </button>
        )}

        {/* Jika Tutup Sementara -> Tombol Nonaktifkan Toko (Final) */}
        {shiftStatus === "tutup_sementara" && (
          <button
            onClick={() => setShowModalNonaktifkan(true)}
            className="w-full bg-white rounded-[30px] p-3.5 flex items-center justify-between text-left mb-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                <LogOut size={16} />
              </div>
              <div>
                <span className="text-[13px] font-bold text-red-600 block">
                  Nonaktifkan Toko (Final)
                </span>
                <span className="text-[11px] font-medium text-gray-400 block">
                  Akhiri hari ini secara permanen
                </span>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-400 shrink-0" />
          </button>
        )}

        {/* Jika Sudah Tutup Total */}
        {shiftStatus === "tutup" && (
          <div className="w-full bg-white rounded-[30px] p-3.5 flex items-center justify-between text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                <Store size={16} />
              </div>
              <div>
                <span className="text-[13px] font-bold text-gray-800 block">
                  Toko Sudah Ditutup
                </span>
                <span className="text-[11px] font-medium text-gray-400 block">
                  Cek halaman Laporan untuk rekap
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Tutup Toko (Jika Status Buka) */}
      {shiftStatus === "buka" && (
        <section className="mb-4">
          <button
            onClick={() => setShowModalTutupSementara(true)}
            className="w-full bg-white rounded-[30px] p-3.5 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-100 text-orange-500 flex items-center justify-center shrink-0">
                <Store size={16} />
              </div>
              <div>
                <span className="text-[13px] font-bold text-gray-800 block">
                  Tutup Toko
                </span>
                <span className="text-[11px] font-medium text-gray-400 block">
                  Akhiri operasional hari ini
                </span>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-400 shrink-0" />
          </button>
        </section>
      )}

      {/* Sign Out Card */}
      <section className="mb-4 mt-10">
        <button
          onClick={handleSignOut}
          className="w-full bg-white rounded-[30px] p-3.5 flex items-center justify-between text-left"
        >
          <div>
            <span className="text-[13px] font-bold text-gray-800 block">
              Sign Out
            </span>
          </div>
          <div className="p-2 px-4 rounded-[30px] bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <LogOut size={16} />
          </div>
        </button>
      </section>

      <p className="text-center text-[11px] text-gray-400 pt-1">
        BarberPOS v1.0.0
      </p>

      {/* Modal Checklist Barber */}
      {showModalBarber && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-[420px] bg-white rounded-t-[32px] px-6 pt-5 pb-8 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base text-black font-bold">
                Barber Aktif Hari Ini
              </h3>
              <button
                onClick={() => setShowModalBarber(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2 mb-5 text-black">
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
                    className="w-full flex items-center justify-between bg-gray-50 rounded-[18px] px-4 py-3"
                  >
                    <span className="text-sm font-bold">{b.nama}</span>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${
                        checked
                          ? "bg-black text-white"
                          : "bg-gray-200 text-transparent"
                      }`}
                    >
                      <Check size={14} />
                    </div>
                  </button>
                );
              })}
              {barbers.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">
                  Belum ada data barber
                </p>
              )}
            </div>

            <button
              onClick={handleConfirmBukaToko}
              disabled={saving}
              className="w-full py-3.5 rounded-[20px] bg-[#3138E8] text-white font-bold text-xs disabled:opacity-50 active:scale-98 transition-transform shadow-md"
            >
              {saving ? "Menyimpan..." : "Konfirmasi"}
            </button>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Tutup Sementara */}
      {showModalTutupSementara && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-[420px] bg-white rounded-t-[32px] px-6 pt-5 pb-8 animate-in slide-in-from-bottom duration-200">
            <h3 className="text-black font-bold mb-2">Tutup Toko Sementara?</h3>
            <p className="text-[13px] text-gray-500 mb-5 leading-relaxed">
              Semua barber akan otomatis dinonaktifkan, dan
              transaksi/pengeluaran baru akan{" "}
              <span className="font-bold text-gray-700">
                terkunci sementara
              </span>
              . Kamu masih bisa membuka toko lagi setelah ini kalau diperlukan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModalTutupSementara(false)}
                className="w-full py-3.5 rounded-[20px] bg-gray-100 text-gray-700 font-bold text-xs disabled:opacity-50 active:scale-98 transition-transform shadow-md"
              >
                Batal
              </button>
              <button
                onClick={handleTutupSementara}
                disabled={saving}
                className="w-full py-3.5 rounded-[20px] bg-orange-500 text-white font-bold text-xs disabled:opacity-50 active:scale-98 transition-transform shadow-md"
              >
                {saving ? "Memproses..." : "Ya, Tutup Sementara"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Nonaktifkan Toko */}
      {showModalNonaktifkan && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-[420px] bg-white rounded-t-[32px] px-6 pt-5 pb-8 animate-in slide-in-from-bottom duration-200">
            <h3 className="text-base font-bold mb-2 text-red-600">
              Nonaktifkan Toko Hari Ini?
            </h3>
            <p className="text-[13px] text-gray-500 mb-5 leading-relaxed">
              Tindakan ini{" "}
              <span className="font-bold text-gray-700">
                tidak bisa dibatalkan
              </span>
              . Semua transaksi & pengeluaran hari ini akan terkunci permanen,
              dan laporan harian akan langsung muncul di halaman Laporan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModalNonaktifkan(false)}
                className="w-full py-3.5 rounded-[20px] bg-gray-100 text-gray-700 font-bold text-xs disabled:opacity-50 active:scale-98 transition-transform shadow-md"
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
