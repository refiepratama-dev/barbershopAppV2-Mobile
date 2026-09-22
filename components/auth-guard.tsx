"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session && pathname !== "/login") {
          router.push("/login");
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [pathname]);

  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session && pathname !== "/login") {
      router.push("/login");
      return;
    }

    if (session && pathname !== "/login") {
      const { data: kasirData } = await supabase
        .from("kasir")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (kasirData?.role !== "kasir") {
        setErrorMsg("Akun ini tidak memiliki akses ke aplikasi mobile ini.");
        await supabase.auth.signOut();
        return;
      }
    }

    if (session && pathname === "/login") {
      router.push("/");
      return;
    }

    setChecking(false);
  }

  if (errorMsg) {
    return (
      <div
        className="w-full min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: "#EFEFEF" }}
      >
        <p className="text-sm text-red-500 font-medium">{errorMsg}</p>
      </div>
    );
  }

  if (checking) {
    return (
      <div
        className="w-full min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#EFEFEF" }}
      >
        <p className="text-sm text-gray-400">Memuat...</p>
      </div>
    );
  }

  return <>{children}</>;
}
