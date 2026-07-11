"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth-provider";
import { useKasFlowStore } from "@/store/use-kasflow-store";
import { toast } from "@/lib/toast";
import {
  ShoppingBag,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Calendar,
  Package,
  Plus,
  Store,
  ChevronDown,
  Edit2,
  Check,
  X,
} from "lucide-react";

type MarketplaceConnection = {
  id: string;
  platform: string;
  shop_name: string;
  display_name: string | null;
  shop_cipher: string;
  status: string;
  last_sync_at: string | null;
  token_expires_at: string | null;
};

/** Format a local date as YYYY-MM-DD (no UTC conversion) */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getThisMonthStartDate() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return toLocalDateStr(start);
}

function getThisMonthEndDate() {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return toLocalDateStr(end);
}

const formatLastSync = (lastSyncAt: string | null) => {
  if (!lastSyncAt) return "Belum pernah sync";
  const date = new Date(lastSyncAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return `${diffDays} hari lalu`;
};

const getTokenStatus = (tokenExpiresAt: string | null) => {
  if (!tokenExpiresAt) return { status: "unknown", label: "Unknown" };
  const expiresAt = new Date(tokenExpiresAt);
  const now = new Date();
  const diffDays = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { status: "expired", label: "Expired" };
  if (diffDays < 3) return { status: "warning", label: `Berakhir dalam ${diffDays} hari` };
  return { status: "valid", label: `Valid ${diffDays} hari lagi` };
};

const getShopLabel = (conn: MarketplaceConnection) => conn.display_name || conn.shop_name;

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
};

function ConnectionCard({
  conn,
  platform,
  syncing,
  onSync,
  onUpdate,
}: {
  conn: MarketplaceConnection;
  platform: string;
  syncing: string | null;
  onSync: (connId: string, platform: string, startDate: string, endDate: string) => void;
  onUpdate: () => void;
}) {
  const router = useRouter();
  const { companyId } = useKasFlowStore();
  const { appUser } = useAuth();
  const isSuperAdmin = appUser?.email === "ramadhaniahadita@gmail.com";
  
  const [syncDatePreset, setSyncDatePreset] = useState("this_month");
  const [syncStartDate, setSyncStartDate] = useState(getThisMonthStartDate);
  const [syncEndDate, setSyncEndDate] = useState(getThisMonthEndDate);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  
  // State for alias edit
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(conn.display_name || conn.shop_name);
  const [isSavingAlias, setIsSavingAlias] = useState(false);

  const handleSaveAlias = async () => {
    if (!companyId) return;
    setIsSavingAlias(true);
    try {
      const response = await fetch(`/api/integrations/connections/${conn.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, display_name: editName }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Nama alias berhasil diperbarui");
        setIsEditing(false);
        onUpdate();
      } else {
        toast.error(`Gagal update alias: ${data.error}`);
      }
    } catch (err) {
      toast.error("Gagal update alias. Coba lagi.");
    } finally {
      setIsSavingAlias(false);
    }
  };

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  const handleMonthChange = (monthStr: string) => {
    setSelectedMonth(monthStr);
    if (!monthStr) return;
    const [year, month] = monthStr.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    setSyncStartDate(toLocalDateStr(start));
    setSyncEndDate(toLocalDateStr(end));
  };

  const handleSyncClick = () => {
    onSync(conn.id, platform, syncStartDate, syncEndDate);
  };

  const tokenStatus = getTokenStatus(conn.token_expires_at);
  const themeColorClass = platform === "tiktok" ? "emerald" : "orange";

  // Kita tidak bisa menggunakan interpolasi kelas Tailwind dinamis secara langsung (seperti `bg-${color}-500`) 
  // karena Tailwind tidak meng-compile class yang di-generate saat runtime.
  // Oleh karena itu, kita memetakan warna secara spesifik.
  const themeStyles = platform === "tiktok" 
    ? {
        borderHover: "hover:border-emerald-500/30",
        blob: "bg-emerald-500",
        iconBg: "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/10",
        iconText: "text-emerald-600 dark:text-emerald-400",
        button: "bg-emerald-600 hover:bg-emerald-500 text-white",
      }
    : {
        borderHover: "hover:border-orange-500/30",
        blob: "bg-orange-500",
        iconBg: "bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/10",
        iconText: "text-orange-600 dark:text-orange-400",
        button: "bg-orange-600 hover:bg-orange-500 text-white",
      };

  return (
    <div className={`group relative flex flex-col justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${themeStyles.borderHover}`}>
      {/* Decorative gradient blob */}
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-20 ${themeStyles.blob} pointer-events-none`} />

      {/* Header */}
      <div className="relative z-10 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`p-2 rounded-xl shrink-0 ${themeStyles.iconBg}`}>
              <Store className={`h-4 w-4 ${themeStyles.iconText}`} />
            </div>
            <div className="min-w-0 flex-1 pr-2">
              {isEditing ? (
                <div className="flex items-center gap-1 mt-1">
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)} 
                    className="h-6 w-full text-sm font-semibold border-b border-primary outline-none bg-transparent"
                    autoFocus
                    placeholder="Nama Alias..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveAlias()}
                    disabled={isSavingAlias}
                  />
                  <button onClick={handleSaveAlias} disabled={isSavingAlias} className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50 shrink-0">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => { setIsEditing(false); setEditName(conn.display_name || conn.shop_name); }} disabled={isSavingAlias} className="text-zinc-400 hover:text-red-500 disabled:opacity-50 shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group/edit">
                  <h3 className="font-semibold text-sm truncate">{getShopLabel(conn)}</h3>
                  <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover/edit:opacity-100 transition-opacity text-muted-foreground hover:text-primary">
                    <Edit2 className="h-3 w-3" />
                  </button>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{conn.shop_cipher}</p>
            </div>
          </div>
          <Badge tone={conn.status === "active" ? "default" : "muted"} className="h-5 px-1.5 text-[9px] uppercase tracking-wider shrink-0 mt-0.5">{conn.status}</Badge>
        </div>

        {/* Status Token */}
        <div className="flex items-center gap-1.5 text-[11px]">
          {tokenStatus.status === "expired" ? (
             <span className="flex items-center text-red-500 font-medium"><AlertCircle className="h-3 w-3 mr-1" /> Expired</span>
          ) : tokenStatus.status === "warning" ? (
             <span className="flex items-center text-yellow-600 dark:text-yellow-500 font-medium"><AlertCircle className="h-3 w-3 mr-1" /> {tokenStatus.label}</span>
          ) : (
             <span className="flex items-center text-emerald-600 dark:text-emerald-500"><CheckCircle2 className="h-3 w-3 mr-1" /> {tokenStatus.label}</span>
          )}
        </div>
      </div>

      <div className="relative z-10 mt-5 space-y-3">
        {/* Sync Controls (Compact) */}
        <div className="flex items-center gap-2 p-1.5 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
          <div className="flex-1 flex items-center gap-1.5 relative px-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={syncDatePreset}
              onChange={(e) => {
                const value = e.target.value;
                setSyncDatePreset(value);
                if (value === "custom") {
                  setIsPopoverOpen(true);
                  return;
                }
                const today = new Date();
                let startDate: Date;
                let endDate = today;
                switch (value) {
                  case "today": startDate = today; break;
                  case "7days": startDate = new Date(today); startDate.setDate(today.getDate() - 7); break;
                  case "30days": startDate = new Date(today); startDate.setDate(today.getDate() - 30); break;
                  case "this_month": startDate = new Date(today.getFullYear(), today.getMonth(), 1); endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); break;
                  case "last_month": startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1); endDate = new Date(today.getFullYear(), today.getMonth(), 0); break;
                  case "month": const [y, m] = selectedMonth.split("-").map(Number); startDate = new Date(y, m - 1, 1); endDate = new Date(y, m, 0); break;
                  default: startDate = new Date(today); startDate.setDate(today.getDate() - 30);
                }
                setSyncStartDate(toLocalDateStr(startDate));
                setSyncEndDate(toLocalDateStr(endDate));
              }}
              className="w-full bg-transparent text-[11px] outline-none cursor-pointer appearance-none text-zinc-700 dark:text-zinc-300 font-medium z-10"
            >
              <option value="today">Hari Ini</option>
              <option value="this_month">Bulan Ini</option>
              <option value="last_month">Bulan Lalu</option>
              
              {isSuperAdmin && (
                <>
                  <option value="7days">7 Hari</option>
                  <option value="30days">30 Hari</option>
                  <option value="month">Pilih Bulan</option>
                  <option value="custom">Kustom</option>
                </>
              )}
            </select>
            <ChevronDown className="absolute right-2 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>
          <Button 
            size="sm" 
            onClick={handleSyncClick}
            disabled={syncing === conn.id || conn.status !== "active"}
            className={`h-7 px-3 text-[10px] rounded-lg transition-all shadow-sm ${themeStyles.button}`}
          >
            <RefreshCw className={`h-3 w-3 ${syncing === conn.id ? "animate-spin mr-1.5" : "mr-1.5"}`} />
            {syncing === conn.id ? "Syncing" : "Sync"}
          </Button>
        </div>

        {/* Custom Date Inputs inline */}
        {syncDatePreset === "custom" && (
          <div className="flex gap-2 p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800/50">
            <input type="date" value={syncStartDate} onChange={(e) => setSyncStartDate(e.target.value)} className="w-1/2 bg-transparent text-[10px] outline-none text-muted-foreground" />
            <input type="date" value={syncEndDate} onChange={(e) => setSyncEndDate(e.target.value)} className="w-1/2 bg-transparent text-[10px] outline-none text-muted-foreground border-l border-zinc-200 dark:border-zinc-700 pl-2" />
          </div>
        )}
        
        {syncDatePreset === "month" && (
          <div className="p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800/50">
            <input type="month" value={selectedMonth} onChange={(e) => handleMonthChange(e.target.value)} className="w-full bg-transparent text-[10px] outline-none text-muted-foreground" />
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1 font-medium">
            <Clock className="h-2.5 w-2.5" />
            {formatLastSync(conn.last_sync_at)}
          </span>
          <div className="flex gap-1">
             <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => router.push("/marketplace/payment")}>
                <CreditCard className="h-3 w-3 text-zinc-500" />
             </Button>
             <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => router.push("/marketplace/orders")}>
                <Package className="h-3 w-3 text-zinc-500" />
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { appUser } = useAuth();
  const { companyId } = useKasFlowStore();
  const [connections, setConnections] = useState<MarketplaceConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchConnections = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/integrations/tiktok/connections?companyId=${companyId}`);
      if (!response.ok) {
        setConnections([]);
        setLoading(false);
        return;
      }
      const data = await response.json();
      setConnections(data.connections || []);
      setLoading(false);
    } catch (error) {
      setConnections([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      setLoading(true);
      fetchConnections();
    } else {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    if (connected === "true" && companyId) {
      setShowSuccess(true);
      fetchConnections();
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [searchParams, companyId]);

  const handleConnect = async (platform: "tiktok" | "shopee") => {
    if (!appUser?.uid) return;
    try {
      const response = await fetch(`/api/integrations/${platform}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await response.json();
      if (response.ok && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast.error(`Gagal menghubungkan ${platform === "tiktok" ? "TikTok" : "Shopee"}: ${data.error || "Terjadi kesalahan"}`);
      }
    } catch (error) {
      console.error(`Failed to initiate ${platform} OAuth:`, error);
      toast.error(`Gagal menghubungkan ${platform === "tiktok" ? "TikTok" : "Shopee"}. Silakan coba lagi.`);
    }
  };

  const handleSync = async (connectionId: string, platform: string, startDate: string, endDate: string) => {
    setSyncing(connectionId);
    try {
      const response = await fetch(`/api/integrations/${platform}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, companyId, mode: "incremental", startDate, endDate }),
      });
      const data = await response.json();
      if (data.success) {
        const stmts = data.summary.statements;
        const orders = data.summary.orders;
        const stmtMsg = `${stmts.fetched} fetched → ${stmts.created} baru, ${stmts.updated} diupdate`;
        const orderMsg = `${orders.fetched} fetched → ${orders.created} baru, ${orders.updated} diupdate`;
        toast.success(`Sync selesai! Payment: ${stmtMsg} | Orders: ${orderMsg}`);
        fetchConnections();
      } else {
        toast.error(`Sync gagal: ${data.error}`);
      }
    } catch (error) {
      toast.error("Sync gagal. Silakan coba lagi.");
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6">
          <Skeleton className="h-[300px] w-full rounded-3xl" />
          <Skeleton className="h-[300px] w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  const tiktokConnections = connections.filter((c) => c.platform === "tiktok_shop");
  const shopeeConnections = connections.filter((c) => c.platform === "shopee");

  return (
    <div className="space-y-10 pb-10">
      {/* Success Message */}
      {showSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="p-2 bg-emerald-500/20 rounded-full">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-emerald-700 dark:text-emerald-400">Koneksi Berhasil!</p>
            <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">Toko Anda sekarang siap untuk disinkronisasi.</p>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Integrasi Marketplace</h1>
        <p className="text-sm text-muted-foreground">
          Kelola hubungan antara sistem KasFlow dengan toko online Anda di berbagai platform marketplace.
        </p>
      </div>

      <div className="space-y-10">
        {/* TikTok Shop Section */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {/* Marketplace Overview / Connect Card */}
            <div className="md:col-span-2 lg:col-span-1 xl:col-span-1 relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/10 via-zinc-50/50 to-transparent dark:from-emerald-500/10 dark:via-zinc-900/50 border border-emerald-500/20 p-6 flex flex-col justify-between shadow-sm">
              <div className="absolute right-0 top-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-600 shadow-inner">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-foreground">TikTok Shop</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{tiktokConnections.length} toko terhubung</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Tarik otomatis pesanan dan rincian pelepasan dana dari TikTok Seller Center ke pembukuan KasFlow.
                </p>
              </div>
              <Button onClick={() => handleConnect("tiktok")} className="relative z-10 w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02]">
                <Plus className="h-4 w-4 mr-2" /> Hubungkan Toko Baru
              </Button>
            </div>

            {/* Connection Cards */}
            {tiktokConnections.map((conn) => (
              <ConnectionCard 
                key={conn.id} 
                conn={conn} 
                platform="tiktok" 
                syncing={syncing} 
                onSync={handleSync} 
                onUpdate={fetchConnections}
              />
            ))}

            {/* Empty State */}
            {tiktokConnections.length === 0 && (
              <div className="md:col-span-2 lg:col-span-2 xl:col-span-3 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center p-8 text-center bg-zinc-50/50 dark:bg-zinc-950/20">
                <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-full mb-4">
                  <ShoppingBag className="h-8 w-8 text-zinc-400" />
                </div>
                <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Belum Ada Toko Terhubung</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Klik tombol <strong>Hubungkan Toko Baru</strong> untuk mulai mengintegrasikan TikTok Shop Anda.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Shopee Section */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {/* Marketplace Overview / Connect Card */}
            <div className="md:col-span-2 lg:col-span-1 xl:col-span-1 relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500/10 via-zinc-50/50 to-transparent dark:from-orange-500/10 dark:via-zinc-900/50 border border-orange-500/20 p-6 flex flex-col justify-between shadow-sm">
              <div className="absolute right-0 top-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-600 shadow-inner">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-foreground">Shopee</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{shopeeConnections.length} toko terhubung</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Tarik otomatis data penjualan dan rincian penghasilan (escrow) dari Shopee ke sistem pembukuan Anda.
                </p>
              </div>
              <Button onClick={() => handleConnect("shopee")} className="relative z-10 w-full h-11 bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02]">
                <Plus className="h-4 w-4 mr-2" /> Hubungkan Toko Baru
              </Button>
            </div>

            {/* Connection Cards */}
            {shopeeConnections.map((conn) => (
              <ConnectionCard 
                key={conn.id} 
                conn={conn} 
                platform="shopee" 
                syncing={syncing} 
                onSync={handleSync} 
                onUpdate={fetchConnections}
              />
            ))}

            {/* Empty State */}
            {shopeeConnections.length === 0 && (
              <div className="md:col-span-2 lg:col-span-2 xl:col-span-3 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center p-8 text-center bg-zinc-50/50 dark:bg-zinc-950/20">
                <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-full mb-4">
                  <ShoppingBag className="h-8 w-8 text-zinc-400" />
                </div>
                <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Belum Ada Toko Terhubung</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Klik tombol <strong>Hubungkan Toko Baru</strong> untuk mulai mengintegrasikan akun Shopee Anda.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Future Platforms */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="relative overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 flex items-center justify-center bg-zinc-50/30 dark:bg-zinc-950/30 opacity-60">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-muted-foreground">Tokopedia (Segera)</h3>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 flex items-center justify-center bg-zinc-50/30 dark:bg-zinc-950/30 opacity-60">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-muted-foreground">Lazada (Segera)</h3>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
