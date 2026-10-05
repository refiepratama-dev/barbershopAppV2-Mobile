"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!email || !password) {
      setError("Email dan password wajib diisi");
      return;
    }

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("Login gagal: email atau password salah");
      return;
    }

    router.push("/");
  }

  return (
    <div
      className="fixed inset-0 z-[9999] w-full h-screen overflow-hidden flex items-center justify-center px-6 font-sans select-none"
      style={{ backgroundColor: "#EFEFEF" }}
    >
      <section className="w-full max-w-[380px] mb-3 rounded-[30px] bg-white p-3 border border-gray-100 shadow">
        {/* Header Card Tanpa Shape Gradient */}
        <div className="text-center pt-3 pb-2">
          <h1 className="text-2xl font-bold text-[#111111] leading-tight">
            Sign In
          </h1>
          <p className="text-xs font-medium text-gray-400 mt-0.5">
            Rafel Pangkas Rambut
          </p>
        </div>

        {/* Form Login */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4 p-2">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukan email anda"
              autoFocus
              autoComplete="email"
              className="w-full h-11 rounded-[16px] bg-gray-100 px-4 text-sm text-black outline-none focus:ring-2 focus:ring-[#3138E8]/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">
              Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukan password anda"
                autoComplete="current-password"
                className="w-full h-11 rounded-[16px] bg-gray-100 text-black pl-4 pr-11 text-sm outline-none focus:ring-2 focus:ring-[#3138E8]/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-full bg-[#3138E8] text-white font-bold text-sm disabled:opacity-50 active:scale-98 transition-all shadow"
          >
            {loading ? "Logging In..." : "Masuk"}
          </button>
        </form>
      </section>
    </div>
  );
}
