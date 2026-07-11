"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  Filter,
  Calendar,
  ShoppingCart,
  TrendingUp,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Store,
} from "lucide-react";

type Shop = {
  id: string;
  shop_name: string;
  display_name: string | null;
  status: string;
};

type Order = {
  id: string;
  connectionId: string;
  shopName: string;
  platformOrderId: string;
  platformStatus: string;
  orderCreateTime: string;
  currency: string;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  settlementStatus: string;
  settlementAmount: number;
  revenueAmount: number;
  feeAmount: number;
  shippingProvider?: string;
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

function PlatformLogo({ platform }: { platform?: string }) {
  if (platform === "shopee") {
    return (
      <svg className="w-4 h-4 rounded-sm flex-shrink-0 text-[#EE4D2D] fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.9414 17.9633c.229-1.879-.981-3.077-4.1758-4.0969-1.548-.528-2.277-1.22-2.26-2.1719.065-1.056 1.048-1.825 2.352-1.85a5.2898 5.2898 0 0 1 2.8838.89c.116.072.197.06.263-.039.09-.145.315-.494.39-.62.051-.081.061-.187-.068-.281-.185-.1369-.704-.4149-.983-.5319a6.4697 6.4697 0 0 0-2.5118-.514c-1.909.008-3.4129 1.215-3.5389 2.826-.082 1.1629.494 2.1078 1.73 2.8278.262.152 1.6799.716 2.2438.892 1.774.552 2.695 1.5419 2.478 2.6969-.197 1.047-1.299 1.7239-2.818 1.7439-1.2039-.046-2.2878-.537-3.1278-1.19l-.141-.11c-.104-.08-.218-.075-.287.03-.05.077-.376.547-.458.67-.077.108-.035.168.045.234.35.293.817.613 1.134.775a6.7097 6.7097 0 0 0 2.8289.727 4.9048 4.9048 0 0 0 2.0759-.354c1.095-.465 1.8029-1.394 1.9449-2.554zM11.9986 1.4009c-2.068 0-3.7539 1.95-3.8329 4.3899h7.6657c-.08-2.44-1.765-4.3899-3.8328-4.3899zm7.8516 22.5981-.08.001-15.7843-.002c-1.074-.04-1.863-.91-1.971-1.991l-.01-.195L1.298 6.2858a.459.459 0 0 1 .45-.494h4.9748C6.8448 2.568 9.1607 0 11.9996 0c2.8388 0 5.1537 2.5689 5.2757 5.7898h4.9678a.459.459 0 0 1 .458.483l-.773 15.5883-.007.131c-.094 1.094-.979 1.9769-2.0709 2.0059z"/>
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 rounded-full flex-shrink-0 text-black dark:text-white fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  );
}

type Stats = {
  total: number;
  completed: number;
  delivered: number;
  inTransit: number;
  awaitingCollection: number;
  awaitingShipment: number;
  cancelled: number;
  totalRevenue: number;
  settledCount: number;
};

export default function MarketplaceOrdersPage() {
  const { appUser } = useAuth();
  const companyId = appUser?.companyId || "";

  const [selectedShop, setSelectedShop] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [datePreset, setDatePreset] = useState("this_month");
  const [filterStartDate, setFilterStartDate] = useState(getThisMonthStartDate);
  const [filterEndDate, setFilterEndDate] = useState(getThisMonthEndDate);

  // Custom states for month-picker and popover daterange
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  // Fetch shops with React Query
  const { data: shopsData, isLoading: loadingShops } = useQuery({
    queryKey: ["shops", companyId],
    queryFn: async () => {
      const res = await fetch(`/api/integrations/tiktok/connections?companyId=${companyId}`);
      const data = await res.json();
      return data.connections || [];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  const shops = shopsData || [];

  // Fetch orders with React Query (parallel with shops)
  const {
    data: ordersData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loadingOrders,
  } = useInfiniteQuery({
    queryKey: ["orders", companyId, selectedShop, filterStartDate, filterEndDate, statusFilter, selectedPlatform],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams({
        companyId,
        limit: "10", // 10 per page
        offset: pageParam.toString(),
        startDate: filterStartDate,
        endDate: filterEndDate,
        platform: selectedPlatform,
      });
      if (selectedShop !== "all") {
        params.set("connectionId", selectedShop);
      }
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const res = await fetch(`/api/integrations/tiktok/orders?${params}`);
      return res.json();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.limit;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const orders = ordersData ? ordersData.pages.flatMap((page) => page.orders) : [];
  const totalOrders = ordersData?.pages[0]?.total || 0;
  const stats = ordersData?.pages[0]?.stats || {
    total: 0,
    completed: 0,
    delivered: 0,
    inTransit: 0,
    awaitingCollection: 0,
    awaitingShipment: 0,
    cancelled: 0,
    totalRevenue: 0,
    settledCount: 0,
  };

  const loading = loadingShops || loadingOrders;

  // Infinite Scroll Sentinel Ref & IntersectionObserver
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) handleLoadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleLoadMore]);

  const handlePlatformChange = (platform: string) => {
    setSelectedPlatform(platform);
    setSelectedShop("all");
  };

  const filteredShops = shops.filter((shop: any) => {
    if (selectedPlatform === "all") return true;
    return shop.platform === selectedPlatform;
  });

  const handleMonthChange = (monthStr: string) => {
    setSelectedMonth(monthStr);
    if (!monthStr) return;
    const [year, month] = monthStr.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0); // last day of month
    setFilterStartDate(toLocalDateStr(start));
    setFilterEndDate(toLocalDateStr(end));
  };

  const formatCurrency = (amount: number, currency: string = "IDR") => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency, minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase();
    if (s === "DELIVERED" || s === "COMPLETED") return <Badge tone="green"><CheckCircle2 className="h-3 w-3 mr-1" />{status}</Badge>;
    if (s === "AWAITING_SHIPMENT" || s === "PENDING") return <Badge tone="yellow"><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
    if (s === "IN_TRANSIT" || s === "SHIPPED") return <Badge tone="blue"><Truck className="h-3 w-3 mr-1" />{status}</Badge>;
    if (s === "CANCELLED" || s === "FAILED") return <Badge tone="red"><XCircle className="h-3 w-3 mr-1" />{status}</Badge>;
    return <Badge tone="muted">{status}</Badge>;
  };

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const showShopColumn = selectedShop === "all";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Platform Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Platform:</span>
        <button
          onClick={() => handlePlatformChange("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
            selectedPlatform === "all"
              ? "bg-emerald-600 text-white"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          }`}
        >
          Semua Platform
        </button>
        <button
          onClick={() => handlePlatformChange("tiktok_shop")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
            selectedPlatform === "tiktok_shop"
              ? "bg-emerald-600 text-white"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          }`}
        >
          TikTok Shop
        </button>
        <button
          onClick={() => handlePlatformChange("shopee")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
            selectedPlatform === "shopee"
              ? "bg-emerald-600 text-white"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          }`}
        >
          Shopee
        </button>
        <button className="px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed" disabled>
          Tokopedia
        </button>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Marketplace Orders</h1>
        <p className="text-xs text-muted-foreground">
          Analytics order dari semua toko marketplace yang terkoneksi
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select value={selectedShop} onChange={(e) => setSelectedShop(e.target.value)}
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
          <option value="all">Semua Toko ({filteredShops.length})</option>
          {filteredShops.map((shop: Shop) => (
            <option key={shop.id} value={shop.id}>{shop.display_name || shop.shop_name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
          <option value="all">Semua Status</option>
          {["AWAITING_SHIPMENT", "AWAITING_COLLECTION", "IN_TRANSIT", "DELIVERED", "COMPLETED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 text-xs">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={datePreset}
            onChange={(e) => {
              const preset = e.target.value;
              setDatePreset(preset);
              const today = new Date();
              let start: Date;
              let end = new Date();

              switch (preset) {
                case "today":
                  start = new Date(today);
                  break;
                case "7days":
                  start = new Date(today);
                  start.setDate(start.getDate() - 6);
                  break;
                case "30days":
                  start = new Date(today);
                  start.setDate(start.getDate() - 29);
                  break;
                case "this_month":
                  start = new Date(today.getFullYear(), today.getMonth(), 1);
                  end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                  break;
                case "last_month":
                  start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                  end = new Date(today.getFullYear(), today.getMonth(), 0);
                  break;
                case "month":
                  const [y, m] = selectedMonth.split("-").map(Number);
                  start = new Date(y, m - 1, 1);
                  end = new Date(y, m, 0);
                  break;
                case "custom":
                  setIsPopoverOpen(true);
                  return;
                default:
                  start = new Date(today);
                  start.setDate(start.getDate() - 29);
              }

              setFilterStartDate(toLocalDateStr(start));
              setFilterEndDate(toLocalDateStr(end));
            }}
            className="h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-card px-2 text-xs outline-none focus:border-primary"
          >
            <option value="today">Hari Ini</option>
            <option value="7days">7 Hari Terakhir</option>
            <option value="30days">30 Hari Terakhir</option>
            <option value="this_month">Bulan Ini</option>
            <option value="last_month">Bulan Lalu</option>
            <option value="month">Pilih Bulan</option>
            <option value="custom">Rentang Kustom</option>
          </select>

          {/* Opsi 2: Tampil 1 Field Bulan */}
          {datePreset === "month" && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-card px-2 text-xs outline-none focus:border-primary"
            />
          )}

          {/* Opsi 1: Tampil 1 Tombol Pemicu Popover */}
          {datePreset === "custom" && (
            <div className="relative">
              <button
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                className="h-8 flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-card px-3 text-xs outline-none hover:bg-muted/50 transition-colors"
              >
                📅 {formatDate(filterStartDate)} - {formatDate(filterEndDate)}
              </button>
              {isPopoverOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsPopoverOpen(false)} />
                  <div className="absolute z-50 left-0 mt-1 p-3 bg-card border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg flex flex-col gap-2 min-w-[220px]">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground block font-medium">Dari Tanggal</label>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="h-8 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-background px-2 text-xs outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground block font-medium">Sampai Tanggal</label>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="h-8 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-background px-2 text-xs outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" />Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{stats.settledCount} settled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-emerald-600">{stats.completed}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0}% dari total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" />In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-blue-600">{stats.delivered + stats.inTransit + stats.awaitingCollection + stats.awaitingShipment}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Sedang diproses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5" />Cancelled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-red-600">{stats.cancelled}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {stats.total > 0 ? ((stats.cancelled / stats.total) * 100).toFixed(1) : 0}% cancellation rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{formatCurrency(stats.totalRevenue)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {stats.completed > 0 ? `Avg: ${formatCurrency(stats.totalRevenue / stats.completed)}` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Order List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Order List</CardTitle>
          <CardDescription className="text-xs">
            Data order untuk analytics. Order tidak menghasilkan transaksi KasFlow — gunakan tab Payment untuk settlement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold mb-2 text-sm">Belum Ada Order</h3>
              <p className="text-xs text-muted-foreground">
                {totalOrders === 0
                  ? "Sync data terlebih dahulu dari halaman Payment untuk mengambil order."
                  : "Tidak ada order dengan filter yang dipilih."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-muted-foreground text-[10px]">
                      <th className="py-2 px-2 text-left font-medium w-8">#</th>
                      <th className="py-2 px-2 text-left font-medium">Order ID</th>
                      {showShopColumn && <th className="py-2 px-2 text-left font-medium">Shop</th>}
                      <th className="py-2 px-2 text-left font-medium">Status</th>
                      <th className="py-2 px-2 text-left font-medium">Tanggal</th>
                      <th className="py-2 px-2 text-right font-medium">Total</th>
                      <th className="py-2 px-2 text-right font-medium">Pencairan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, index) => {
                      const rowNumber = index + 1;
                      return (
                        <tr key={order.id} className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-2 font-semibold text-muted-foreground">{rowNumber}</td>
                          <td className="py-2 px-2 font-mono">{order.platformOrderId}</td>
                          {showShopColumn && (
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-1.5">
                                <PlatformLogo platform={shops.find((s: any) => s.id === order.connectionId)?.platform} />
                                <span className="truncate max-w-[120px] block" title={order.shopName}>{order.shopName}</span>
                              </div>
                            </td>
                          )}
                          <td className="py-2 px-2">{getStatusBadge(order.platformStatus)}</td>
                          <td className="py-2 px-2 text-muted-foreground">{formatDate(order.orderCreateTime)}</td>
                          <td className="py-2 px-2 text-right font-semibold">{formatCurrency(order.totalAmount, order.currency)}</td>
                          <td className={`py-2 px-2 text-right font-semibold ${order.settlementAmount < 0 ? "text-red-600" : ""}`}>
                            {formatCurrency(order.settlementAmount, order.currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Infinite Scroll Sentinel & Load More ── */}
              {hasNextPage && (
                <div ref={loadMoreRef} className="flex flex-col items-center gap-3 py-6">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                    <div className="h-px w-8 bg-zinc-200 dark:bg-zinc-800" />
                    Menampilkan {orders.length} dari {totalOrders} order
                    <div className="h-px w-8 bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="px-5 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-xs font-semibold text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700 transition duration-200 active:scale-95 border border-zinc-200/60 dark:border-zinc-700/50 disabled:opacity-50"
                  >
                    {isFetchingNextPage ? 'Memuat...' : 'Muat lebih lama ↓'}
                  </button>
                </div>
              )}

              {/* Show "all loaded" when everything is visible */}
              {!hasNextPage && orders.length > 0 && (
                <div className="flex items-center justify-center gap-2 py-5">
                  <div className="h-px w-10 bg-zinc-200 dark:bg-zinc-800" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Semua order ditampilkan ({orders.length} order)
                  </span>
                  <div className="h-px w-10 bg-zinc-200 dark:bg-zinc-800" />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
