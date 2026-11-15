"use client";

import {
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Database,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { isSupabaseConfigured } from "@/lib/supabase/client";

function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Autentikasi gagal.";
  if (message.includes("User already registered"))
    return "Email sudah terdaftar.";
  if (message.includes("Invalid login credentials"))
    return "Email atau password salah.";
  if (message.includes("Password should be at least"))
    return "Password minimal 6 karakter.";
  if (message.includes("Email not confirmed"))
    return "Email belum dikonfirmasi. Silakan cek inbox Anda.";
  return message;
}

export default function AuthPage() {
  const router = useRouter();
  const { appUser, loading, login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [googleLoginEnabled, setGoogleLoginEnabled] = useState<boolean>(() => {
    return process.env.NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN === "true";
  });

  useEffect(() => {
    // Dynamic runtime check so editing .env.local works immediately
    fetch("/api/auth/config")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.enableGoogleLogin === "boolean") {
          setGoogleLoginEnabled(data.enableGoogleLogin);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) setOauthError(err);
  }, []);

  useEffect(() => {
    if (!loading && appUser) router.replace("/");
  }, [appUser, loading, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (mode === "register") {
        await register(email, password, businessName);
      } else {
        await login(email, password);
      }
      router.replace("/");
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAF8] text-zinc-900 flex flex-col font-sans selection:bg-emerald-500/20 relative overflow-hidden">
      {/* Static Subtle Background Aura (100% Static & Lightweight, 0% CPU Lag) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[450px] w-[450px] rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-[400px] w-[400px] rounded-full bg-amber-100/50 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-12 py-10 lg:py-6 gap-12 lg:gap-16 items-center justify-between z-10">
        
        {/* Left Column (Brand & Value Proposition) */}
        <div className="flex-1 flex flex-col justify-center max-w-xl">
          <div className="flex items-center gap-3 mb-6 lg:mb-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-md">
              <FileText className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-zinc-950">KasFlow</span>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-xs font-semibold text-emerald-800 mb-4">
            <Zap className="h-3.5 w-3.5 text-emerald-600" />
            <span>Sistem Akuntansi UMKM Terintegrasi</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] leading-[1.15] font-extrabold tracking-tight text-zinc-950 mb-4">
            Pembukuan UMKM Otomatis & Akurat.
          </h1>
          
          <p className="text-base text-zinc-600 mb-8 max-w-md leading-relaxed font-normal">
            Pantau arus kas, buat jurnal double-entry otomatis, dan tarik laporan laba rugi instan secara real-time.
          </p>

          <div className="flex flex-wrap gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-zinc-200/90 shadow-sm text-sm font-medium text-zinc-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Auto Jurnal</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-zinc-200/90 shadow-sm text-sm font-medium text-zinc-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Laba Rugi Instan</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-zinc-200/90 shadow-sm text-sm font-medium text-zinc-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Keamanan Cloud</span>
            </div>
          </div>
        </div>

        {/* Right Column (Clean & Crisp Form Card) */}
        <div className="flex-none w-full max-w-md">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200 shadow-xl shadow-zinc-200/50 relative">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight mb-1 text-zinc-900">
                {mode === "login" ? "Selamat Datang" : "Mulai Pembukuan"}
              </h2>
              <p className="text-sm text-zinc-500">
                {mode === "login"
                  ? "Akses data ledger bisnis Anda."
                  : "Daftar & mulai pencatatan hari ini."}
              </p>
            </div>

            {!isSupabaseConfigured ? (
              <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-800">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  Konfigurasi Cloud Belum Lengkap
                </div>
                <p className="text-xs text-red-700 leading-relaxed">
                  Silakan periksa kredensial Supabase pada file <code className="bg-red-100 px-1 py-0.5 rounded text-[11px]">.env.local</code>.
                </p>
                <Link href="/" className="inline-block mt-1">
                  <Button variant="outline" size="sm" className="rounded-xl text-xs border-red-200 bg-white hover:bg-red-50">
                    Kembali Ke Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                {mode === "register" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="businessName" className="text-xs font-semibold text-zinc-700">Nama Bisnis</Label>
                    <Input
                      id="businessName"
                      value={businessName}
                      onChange={(event) => setBusinessName(event.target.value)}
                      placeholder="Contoh: Toko Kopi Seduh"
                      required
                      className="h-11 rounded-xl text-sm bg-zinc-50/50 border-zinc-200 focus-visible:bg-white focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all shadow-none font-normal"
                    />
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-zinc-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="owner@bisnis.id"
                    required
                    className="h-11 rounded-xl text-sm bg-zinc-50/50 border-zinc-200 focus-visible:bg-white focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all shadow-none font-normal"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-zinc-700">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    required
                    className="h-11 rounded-xl text-sm bg-zinc-50/50 border-zinc-200 focus-visible:bg-white focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all shadow-none font-normal"
                  />
                </div>

                {googleLoginEnabled && oauthError === "OAuth_failed" ? (
                  <p className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-medium text-red-700">
                    Login dengan Google gagal. Silakan coba lagi.
                  </p>
                ) : null}

                {error ? (
                  <p className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-medium text-red-700">
                    {error}
                  </p>
                ) : null}

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm h-11 rounded-xl shadow-sm transition-all mt-1"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === "login" ? (
                    "Masuk"
                  ) : (
                    "Daftar Akun"
                  )}
                </Button>

                {googleLoginEnabled ? (
                  <>
                    <div className="relative flex items-center justify-center my-4">
                      <div className="absolute inset-0 border-t border-zinc-200" />
                      <span className="relative bg-white px-3 text-xs text-zinc-400 font-medium">
                        atau
                      </span>
                    </div>

                    <Button
                      className="w-full bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 font-semibold text-sm h-11 rounded-xl shadow-none transition-all flex items-center justify-center gap-2.5"
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await loginWithGoogle();
                        } catch (err) {
                          setError(getAuthErrorMessage(err));
                        }
                      }}
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span>Lanjutkan dengan Google</span>
                    </Button>
                  </>
                ) : null}

                <div className="text-center pt-2">
                  <button
                    type="button"
                    className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
                    onClick={() => {
                      setMode((value) => (value === "login" ? "register" : "login"));
                      setError(null);
                    }}
                  >
                    {mode === "login"
                      ? "Belum punya akun? Daftar Baru"
                      : "Sudah punya akun? Masuk"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer / Integrated Platforms */}
      <footer className="w-full mt-auto border-t border-zinc-200/80 bg-white/60 py-4 z-10">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-12 flex flex-wrap items-center justify-center sm:justify-between gap-y-3 gap-x-6 text-xs text-zinc-500">
          <span className="font-medium">Terintegrasi dengan Marketplace & Cloud:</span>
          <div className="flex items-center gap-6 grayscale opacity-75">
            <span className="font-bold tracking-tight text-zinc-700">Shopee</span>
            <span className="font-bold tracking-tight text-zinc-700">TikTok Shop</span>
            <span className="font-bold tracking-tight text-zinc-700">Tokopedia</span>
            <div className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" />
              <span className="font-bold tracking-tight text-zinc-700">Cloud SQL</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
