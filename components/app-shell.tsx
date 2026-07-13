"use client";

import {
  FileText,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useCompanySync } from "@/lib/supabase/use-company-sync";
import { useKasFlowStore } from "@/store/use-kasflow-store";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { TopNavBar } from "@/components/top-nav-bar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { appUser, loading } = useAuth();
  useCompanySync();
  const [dark, setDark] = useState(false);

  const storeCompanyId = useKasFlowStore((state) => state.companyId);
  const hasCachedData = storeCompanyId && storeCompanyId !== "demo_company";

  const [showSpinner, setShowSpinner] = useState(false);
  useEffect(() => {
    if (!loading || hasCachedData) {
      setShowSpinner(false);
      return;
    }
    const timer = setTimeout(() => setShowSpinner(true), 500);
    return () => clearTimeout(timer);
  }, [loading, hasCachedData]);

  // OAuth transition: when the callback page redirects to "/" after a
  // successful Google OAuth, it sets a sessionStorage flag.  While that
  // flag is active we show "Memverifikasi akun..." instead of the
  // "Login required" modal — preventing the ugly flash during the
  // brief window where loading=false and appUser is still null.
  const [oauthTransition, setOauthTransition] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("oauth_in_progress")) {
      setOauthTransition(true);
    }
  }, []);
  useEffect(() => {
    if (!oauthTransition) return;
    // Clear the flag as soon as we have a user, or after 5 seconds.
    if (appUser) {
      sessionStorage.removeItem("oauth_in_progress");
      setOauthTransition(false);
      return;
    }
    const timer = setTimeout(() => {
      sessionStorage.removeItem("oauth_in_progress");
      setOauthTransition(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [oauthTransition, appUser]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  if (pathname.startsWith("/auth")) {
    return <>{children}</>;
  }

  // During OAuth transition, show a verification spinner instead of
  // the "Login required" modal.  This covers the gap between
  // initAuth() finishing with no session and onAuthStateChange firing
  // SIGNED_IN.
  if (oauthTransition && !appUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAFAF8] text-zinc-900">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/60 px-5 py-4 shadow-xl backdrop-blur-xl">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          <span className="text-sm font-bold tracking-wide text-zinc-700">Memverifikasi akun...</span>
        </div>
      </main>
    );
  }

  if (loading) {
    if (!showSpinner) return null;
    
    if (hasCachedData) {
      return (
        <div className="min-h-screen bg-background">
          <TopNavBar dark={dark} onToggleDark={() => setDark(!dark)} />
          <main className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8 pb-24 lg:pb-8 flex justify-center items-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500/40" />
          </main>
          <BottomTabBar />
        </div>
      );
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAFAF8] text-zinc-900">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/60 px-5 py-4 shadow-xl backdrop-blur-xl">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          <span className="text-sm font-bold tracking-wide text-zinc-700">Memuat sesi...</span>
        </div>
      </main>
    );
  }

  if (!isSupabaseConfigured || !appUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAFAF8] p-4 text-zinc-900">
        <div className="w-full max-w-md rounded-[2.5rem] border border-zinc-200/80 bg-white/80 p-8 text-center shadow-[0_20px_80px_-15px_rgba(0,0,0,0.1)] backdrop-blur-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <FileText className="h-6 w-6" />
          </div>
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-zinc-950">KasFlow</h1>
          <p className="mt-3 text-sm text-zinc-600 font-medium leading-relaxed">
            Silakan masuk ke akun Anda untuk memulai pembukuan otomatis dan memantau arus kas bisnis dengan aman di cloud.
          </p>
          <Link href="/auth" className="mt-6 inline-flex w-full">
            <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[13px] tracking-widest h-12 rounded-xl shadow-[0_8px_20px_-4px_rgba(16,185,129,0.4)] hover:shadow-[0_12px_25px_-4px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 transition-all duration-300">
              MASUK / DAFTAR
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavBar dark={dark} onToggleDark={() => setDark(!dark)} />

      <main
        key={pathname}
        className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8 pb-24 lg:pb-8 animate-spring-in lg:animate-in lg:fade-in lg:duration-300"
      >
        {children}
      </main>

      <BottomTabBar />
    </div>
  );
}
