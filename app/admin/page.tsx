import { createAdminClient } from "@/lib/supabase/admin-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Users, ShoppingBag } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const adminClient = createAdminClient();

  // Fetch counts
  const [{ count: tenantCount }, { count: userCount }, { count: marketplaceCount }] = await Promise.all([
    adminClient.from("business_profiles").select("*", { count: "exact", head: true }),
    adminClient.from("users").select("*", { count: "exact", head: true }),
    adminClient.from("marketplace_connections").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">SaaS Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Pantau metrik utama platform Anda.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm border-zinc-200/60 dark:border-zinc-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tenants (Companies)</CardTitle>
            <Building2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantCount ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Perusahaan terdaftar di sistem.</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-zinc-200/60 dark:border-zinc-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Akun pengguna aktif.</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-zinc-200/60 dark:border-zinc-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Marketplace Connections</CardTitle>
            <ShoppingBag className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marketplaceCount ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Integrasi aktif Shopee / TikTok.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         {/* Placeholder for future charts/billing */}
         <Card className="shadow-sm border-zinc-200/60 dark:border-zinc-800/50">
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Status infrastruktur cloud.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </div>
              <span className="text-sm font-medium">All systems operational</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
