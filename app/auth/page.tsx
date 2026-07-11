"use client";

import { Loader2, FileText, CheckCircle2, Activity, PieChart, Database, ShoppingBag, Coins, DollarSign, Banknote, AlertCircle } from "lucide-react";
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
    <main className="min-h-screen bg-[#FAFAF8] text-zinc-900 flex flex-col font-sans overflow-x-hidden selection:bg-emerald-500/30 relative">
      
      {/* 
        ==================================================
        UNIFIED BACKGROUND CANVAS (Glassmorphism Environment) 
        ==================================================
      */}
      <style jsx>{`
        @keyframes float-up {
          0%, 100% { transform: translateY(0) rotate(-12deg); }
          50% { transform: translateY(-25px) rotate(-8deg); }
        }
        @keyframes float-down {
          0%, 100% { transform: translateY(0) rotate(12deg); }
          50% { transform: translateY(25px) rotate(8deg); }
        }
        @keyframes float-tilt {
          0%, 100% { transform: translateY(0) rotate(45deg); }
          50% { transform: translateY(-15px) rotate(50deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 20px 80px -15px rgba(16,185,129,0.15); transform: rotate(-3deg) scale(1); }
          50% { box-shadow: 0 20px 100px -5px rgba(16,185,129,0.25); transform: rotate(-2deg) scale(1.03); }
        }
        @keyframes dash-flow {
          to { stroke-dashoffset: -32; }
        }
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(15px, -15px); }
        }
      `}</style>

      <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden flex items-center justify-center">
        {/* Soft background glow to tie it all together */}
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-emerald-300/10 rounded-full blur-[120px] mix-blend-multiply hidden md:block" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-amber-200/20 rounded-full blur-[140px] mix-blend-multiply hidden md:block" />
        
        {/* Full-screen dashed flow lines & Animated POV Trucks */}
        <svg className="absolute inset-0 w-full h-full hidden md:block" viewBox="0 0 2000 1000" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <path id="track1" d="M -200,400 C 100,100 500,50 700,250 C 900,450 800,800 1050,550 C 1300,300 1500,100 1700,300 C 1900,500 2100,800 2300,600" stroke="#10b981" strokeWidth="3" strokeDasharray="15 15" className="opacity-30" style={{ animation: 'dash-flow 2s linear infinite' }} />
          <path id="track2" d="M -200,700 C 200,950 600,850 800,650 C 1000,450 1200,200 1050,550 C 900,900 1500,950 1800,700 C 2100,450 2200,100 2400,200" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="12 12" className="opacity-30" style={{ animation: 'dash-flow 3s linear infinite reverse' }} />
          
          {/* Shopee Truck */}
          <g>
            <g style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.2))' }}>
              {/* Trailer */}
              <rect x="-40" y="-16" width="60" height="32" rx="2" fill="#f97316" stroke="#ea580c" strokeWidth="1" />
              <rect x="-38" y="-14" width="56" height="28" fill="none" stroke="#ea580c" strokeWidth="1" opacity="0.5" />
              {/* Connector */}
              <rect x="20" y="-4" width="6" height="8" fill="#475569" />
              {/* Cab */}
              <path d="M 24 -12 L 36 -12 C 38 -12 40 -10 40 -6 L 40 6 C 40 10 38 12 36 12 L 24 12 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
              <path d="M 26 -10 L 32 -10 C 33 -10 34 -8 34 -6 L 34 6 C 34 8 33 10 32 10 L 26 10 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
              <path d="M 34 -8 L 37 -6 L 37 6 L 34 8 Z" fill="#94a3b8" />
              {/* Mirrors */}
              <ellipse cx="28" cy="-14" rx="2" ry="4" transform="rotate(-30 28 -14)" fill="#475569" />
              <ellipse cx="28" cy="14" rx="2" ry="4" transform="rotate(30 28 14)" fill="#475569" />
              
              {/* Shopee Logo Circle */}
              <circle cx="-10" cy="0" r="10" fill="#ffffff" />
              <g transform="translate(-10, 0) scale(0.65)">
                <path fill="#f97316" d="M 8.5 3 C 8.5 1.3 7 0 5 0 C 3 0 1.5 1.3 1.5 3 L 0 3 L 1 10 C 1 11 2 12 3 12 L 7 12 C 8 12 9 11 9 10 L 10 3 Z M 5 1.5 C 6 1.5 7 2 7 3 L 3 3 C 3 2 4 1.5 5 1.5 Z" transform="translate(-5, -6)" />
              </g>
            </g>
            <animateMotion dur="30s" begin="0s" repeatCount="indefinite" rotate="auto">
              <mpath href="#track1" />
            </animateMotion>
          </g>

          {/* TikTok Truck */}
          <g>
            <g style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.2))' }}>
              {/* Trailer */}
              <rect x="-40" y="-16" width="60" height="32" rx="2" fill="#18181b" stroke="#000000" strokeWidth="1" />
              <rect x="-38" y="-14" width="56" height="28" fill="none" stroke="#3f3f46" strokeWidth="1" opacity="0.6" />
              {/* Connector */}
              <rect x="20" y="-4" width="6" height="8" fill="#475569" />
              {/* Cab */}
              <path d="M 24 -12 L 36 -12 C 38 -12 40 -10 40 -6 L 40 6 C 40 10 38 12 36 12 L 24 12 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
              <path d="M 26 -10 L 32 -10 C 33 -10 34 -8 34 -6 L 34 6 C 34 8 33 10 32 10 L 26 10 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
              <path d="M 34 -8 L 37 -6 L 37 6 L 34 8 Z" fill="#94a3b8" />
              {/* Mirrors */}
              <ellipse cx="28" cy="-14" rx="2" ry="4" transform="rotate(-30 28 -14)" fill="#475569" />
              <ellipse cx="28" cy="14" rx="2" ry="4" transform="rotate(30 28 14)" fill="#475569" />
              
              {/* TikTok Logo Circle */}
              <circle cx="-10" cy="0" r="10" fill="#ffffff" />
              <g transform="translate(-10, 0) scale(0.45)">
                <path fill="#000000" d="M 12.5 0 L 12.5 12 C 12.5 14.5 10.5 16.5 8 16.5 C 5.5 16.5 3.5 14.5 3.5 12 C 3.5 9.5 5.5 7.5 8 7.5 L 8 10.5 C 7 10.5 6.5 11 6.5 12 C 6.5 13 7 13.5 8 13.5 C 9 13.5 9.5 13 9.5 12 L 9.5 0 L 12.5 0 C 12.5 2.5 14.5 4.5 17 4.5 L 17 7.5 C 15 7.5 13.5 6.5 12.5 5 Z" transform="translate(-10, -8)" />
              </g>
            </g>
            <animateMotion dur="30s" begin="0s" repeatCount="indefinite" rotate="auto" calcMode="linear" keyPoints="0; 0.43; 0.43; 1" keyTimes="0; 0.43; 0.55; 1">
              <mpath href="#track2" />
            </animateMotion>
          </g>

          {/* Tokopedia Truck */}
          <g>
            <g style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.2))' }}>
              {/* Trailer */}
              <rect x="-40" y="-16" width="60" height="32" rx="2" fill="#10b981" stroke="#059669" strokeWidth="1" />
              <rect x="-38" y="-14" width="56" height="28" fill="none" stroke="#34d399" strokeWidth="1" opacity="0.6" />
              {/* Connector */}
              <rect x="20" y="-4" width="6" height="8" fill="#475569" />
              {/* Cab */}
              <path d="M 24 -12 L 36 -12 C 38 -12 40 -10 40 -6 L 40 6 C 40 10 38 12 36 12 L 24 12 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
              <path d="M 26 -10 L 32 -10 C 33 -10 34 -8 34 -6 L 34 6 C 34 8 33 10 32 10 L 26 10 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
              <path d="M 34 -8 L 37 -6 L 37 6 L 34 8 Z" fill="#94a3b8" />
              {/* Mirrors */}
              <ellipse cx="28" cy="-14" rx="2" ry="4" transform="rotate(-30 28 -14)" fill="#475569" />
              <ellipse cx="28" cy="14" rx="2" ry="4" transform="rotate(30 28 14)" fill="#475569" />
              
              {/* Tokopedia Logo Circle */}
              <circle cx="-10" cy="0" r="10" fill="#ffffff" />
              <g transform="translate(-10, 0) scale(0.55)">
                <path fill="#10b981" d="M 10 0 C 15 0 18 4 18 10 C 18 16 15 18 10 18 C 5 18 2 16 2 10 C 2 4 5 0 10 0 Z" transform="translate(-10, -9)" />
                <circle cx="-3" cy="-2" r="2.5" fill="#ffffff" />
                <circle cx="3" cy="-2" r="2.5" fill="#ffffff" />
                <circle cx="-3" cy="-2" r="1" fill="#000000" />
                <circle cx="3" cy="-2" r="1" fill="#000000" />
                <path d="M -1.5 2 L 1.5 2 L 0 4 Z" fill="#f59e0b" />
              </g>
            </g>
            <animateMotion dur="30s" begin="4.1s" repeatCount="indefinite" rotate="auto">
              <mpath href="#track1" />
            </animateMotion>
          </g>
        </svg>

        {/* Central Core (Behind the form/text intersection) */}
        <div 
          className="absolute left-[40%] top-[35%] w-[500px] h-[500px] hidden md:flex items-center justify-center pointer-events-none mix-blend-overlay rounded-full"
          style={{ animation: 'pulse-glow 8s ease-in-out infinite' }}
        >
          {/* Outer glowing aura */}
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-emerald-500/10 to-amber-500/10 rounded-full blur-[100px]" />
          
          {/* Floating glassmorphic ring instead of a bulky square */}
          <div className="relative w-48 h-48 rounded-full border border-white/30 shadow-[0_0_40px_rgba(16,185,129,0.2)] flex items-center justify-center backdrop-blur-md bg-white/10">
            <div className="absolute inset-0 bg-emerald-400/10 rounded-full blur-2xl animate-pulse" />
            <Activity className="relative w-20 h-20 text-emerald-600/80 stroke-[1.5]" />
          </div>
        </div>

        {/* Seamless Glowing Data Nodes */}
        <div 
          className="absolute top-[15%] left-[22%] hidden md:flex items-center justify-center"
          style={{ animation: 'float-up 8s ease-in-out infinite' }}
        >
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 bg-indigo-400/30 rounded-full blur-xl animate-pulse" style={{ animationDuration: '4s' }} />
            <PieChart className="relative w-9 h-9 text-indigo-600 drop-shadow-md stroke-[1.5]" />
          </div>
        </div>
        
        <div 
          className="absolute top-[12%] right-[8%] hidden md:flex items-center justify-center"
          style={{ animation: 'float-down 7s ease-in-out infinite' }}
        >
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 bg-amber-400/30 rounded-full blur-xl animate-pulse" style={{ animationDuration: '3s' }} />
            <Database className="relative w-9 h-9 text-amber-600 drop-shadow-md stroke-[1.5]" />
          </div>
        </div>

        <div 
          className="absolute bottom-[28%] right-[20%] hidden md:flex items-center justify-center"
          style={{ animation: 'float-up 9s ease-in-out infinite' }}
        >
          <div className="relative w-14 h-14 flex items-center justify-center">
            <div className="absolute inset-0 bg-emerald-400/30 rounded-full blur-xl animate-pulse" style={{ animationDuration: '5s' }} />
            <Activity className="relative w-8 h-8 text-emerald-600 drop-shadow-md stroke-[1.5]" />
          </div>
        </div>

        {/* Scattered eCommerce & Finance Icons */}
        <ShoppingBag className="absolute top-[20%] right-[40%] w-8 h-8 text-emerald-400 opacity-50 animate-pulse hidden md:block" />
        <DollarSign className="absolute top-[40%] left-[8%] w-6 h-6 text-indigo-400 opacity-50 animate-pulse delay-700 hidden md:block" />
      </div>

      {/* 
        ==================================================
        FOREGROUND CONTENT
        ==================================================
      */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1400px] mx-auto px-6 sm:px-12 lg:px-16 py-8 lg:py-4 gap-12 lg:gap-8 relative z-10 items-center justify-between">
        
        {/* Left Column (Text Overlay) */}
        <div className="flex-1 flex flex-col justify-center max-w-xl pt-4 lg:pt-0">
          <div className="flex items-center gap-2.5 mb-6 lg:mb-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-950 text-white font-bold shadow-xl">
              <FileText className="h-6 w-6" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-zinc-950 drop-shadow-sm">KasFlow</span>
          </div>

          <h1 className="text-4xl lg:text-5xl leading-[1.1] font-extrabold tracking-tight text-zinc-950 mb-5 drop-shadow-sm">
            Pembukuan UMKM Otomatis & Akurat.
          </h1>
          
          <p className="text-base text-zinc-700 mb-8 max-w-md leading-relaxed font-semibold drop-shadow-sm">
            Pantau arus kas, buat jurnal, dan tarik laporan laba rugi instan secara real-time.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-x-6 gap-y-3">
            <div className="flex items-center gap-2 bg-white/90 md:bg-white/50 md:backdrop-blur-md px-3 py-1.5 rounded-full border border-white/60 shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-bold text-zinc-800">Auto Jurnal</span>
            </div>
            <div className="flex items-center gap-2 bg-white/90 md:bg-white/50 md:backdrop-blur-md px-3 py-1.5 rounded-full border border-white/60 shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-bold text-zinc-800">Laba Rugi Instan</span>
            </div>
            <div className="flex items-center gap-2 bg-white/90 md:bg-white/50 md:backdrop-blur-md px-3 py-1.5 rounded-full border border-white/60 shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-bold text-zinc-800">Keamanan Cloud</span>
            </div>
          </div>
        </div>

        {/* Right Column (Glassmorphic Form) */}
        <div className="flex-none w-full max-w-md relative">
          {/* Glass Card */}
          <div className="bg-white md:bg-white/60 md:backdrop-blur-2xl p-6 sm:p-8 rounded-[2.5rem] border border-zinc-200/80 md:border-white/80 shadow-xl md:shadow-[0_20px_80px_-15px_rgba(0,0,0,0.1)] relative z-10 transition-all duration-300 hover:bg-white/70">
            <div className="mb-6">
              <h3 className="text-xl font-extrabold tracking-tight mb-1 text-zinc-900">
                {mode === "login" ? "Selamat Datang" : "Mulai Pembukuan"}
              </h3>
              <p className="text-sm font-medium text-zinc-600">
                {mode === "login"
                  ? "Akses data ledger bisnis Anda."
                  : "Daftar & mulai pencatatan hari ini."}
              </p>
            </div>

            {!isSupabaseConfigured ? (
              <div className="space-y-4 rounded-2xl border border-red-200/50 bg-red-50 md:bg-red-50/80 md:backdrop-blur-sm p-5 text-sm text-red-700 leading-relaxed flex flex-col items-start">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="h-4 w-4" />
                  Konfigurasi Cloud Server Belum Ditemukan.
                </div>
                <p className="text-xs font-medium text-red-600/80">
                  Silakan pastikan file `.env.local` sudah terisi dengan benar di server lokal Anda.
                </p>
                <Link href="/" className="inline-block mt-1">
                  <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs border-red-200 hover:bg-red-100 bg-white/50">
                    Kembali Ke Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                {mode === "register" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="businessName" className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Nama Bisnis</Label>
                    <Input
                      id="businessName"
                      value={businessName}
                      onChange={(event) => setBusinessName(event.target.value)}
                      placeholder="Contoh: Toko Kopi Seduh"
                      required
                      className="h-11 rounded-xl text-sm bg-white/60 border-zinc-200/60 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 transition-all shadow-sm font-medium"
                    />
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="owner@bisnis.id"
                    required
                    className="h-11 rounded-xl text-sm bg-white/60 border-zinc-200/60 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 transition-all shadow-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Password</Label>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={6}
                    placeholder="••••••••"
                    required
                    className="h-11 rounded-xl text-sm bg-white/60 border-zinc-200/60 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 transition-all shadow-sm font-medium"
                  />
                </div>

                {oauthError === "OAuth_failed" ? (
                  <p className="rounded-xl bg-red-50 md:bg-red-50/80 md:backdrop-blur-sm border border-red-100 px-4 py-3 text-xs font-bold text-red-600">
                    Login dengan Google gagal. Silakan coba lagi.
                  </p>
                ) : null}

                {error ? (
                  <p className="rounded-xl bg-red-50 md:bg-red-50/80 md:backdrop-blur-sm border border-red-100 px-4 py-3 text-xs font-bold text-red-600">
                    {error}
                  </p>
                ) : null}

                <Button
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[13px] tracking-widest h-12 rounded-xl shadow-[0_8px_20px_-4px_rgba(16,185,129,0.4)] hover:shadow-[0_12px_25px_-4px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 transition-all duration-300 mt-2"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === "login" ? "MASUK SEKARANG" : "DAFTAR SEKARANG"}
                </Button>

                <div className="relative flex items-center justify-center my-5">
                  <div className="absolute inset-0 border-t border-zinc-200/50" />
                  <span className="relative bg-transparent px-3 text-[10px] uppercase font-black text-zinc-400 tracking-widest">
                    Atau
                  </span>
                </div>

                <Button
                  className="w-full bg-white md:bg-white/80 hover:bg-white text-zinc-800 border border-zinc-200 md:border-white font-bold text-[13px] h-12 rounded-xl shadow-sm md:shadow-[0_4px_15px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 flex items-center justify-center gap-3 mb-3 md:backdrop-blur-md"
                  type="button"
                  onClick={async () => {
                    try {
                      await loginWithGoogle();
                    } catch (err) {
                      setError(getAuthErrorMessage(err));
                    }
                  }}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {mode === "login" ? "Masuk dengan Google" : "Daftar dengan Google"}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
                    onClick={() => {
                      setMode((value) => (value === "login" ? "register" : "login"));
                      setError(null);
                    }}
                  >
                    {mode === "login"
                      ? "Belum punya akun? Buat Baru"
                      : "Sudah punya akun? Masuk"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer Divider & Partners (Glassy) */}
      <div className="w-full mt-auto relative z-10 border-t border-zinc-200/30 bg-zinc-50 md:bg-white/10 md:backdrop-blur-md py-4">
        <div className="max-w-[1500px] mx-auto px-6 lg:px-16 flex flex-wrap items-center justify-center lg:justify-between gap-x-8 gap-y-4 text-zinc-500 grayscale opacity-70">
           <div className="flex items-center gap-2">
             <div className="w-7 h-7 rounded-full bg-zinc-400 flex items-center justify-center">
               <span className="text-white font-bold text-sm leading-none">S</span>
             </div>
             <span className="font-black text-lg tracking-tight">Shopee</span>
           </div>
           
           <div className="flex items-center gap-2">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
               <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"/>
             </svg>
             <span className="font-black text-lg tracking-tight">TikTok Shop</span>
           </div>

           <div className="flex items-center gap-2">
             <div className="w-7 h-7 rounded-md bg-zinc-400 flex items-center justify-center">
               <div className="w-3.5 h-3.5 rounded-full bg-white relative">
                 <div className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 bg-zinc-400 rounded-full" />
               </div>
             </div>
             <span className="font-black text-lg tracking-tight">Tokopedia</span>
           </div>

           <div className="flex items-center gap-2">
             <Database className="w-6 h-6" />
             <span className="font-black text-lg tracking-tight">Cloud SQL</span>
           </div>
        </div>
      </div>
    </main>
  );
}
