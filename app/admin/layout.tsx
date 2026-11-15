import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ShieldAlert, LayoutDashboard, Building2, Users } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // strict check
  const superAdminEmail = process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL || process.env.SUPERADMIN_EMAIL;
  if (!user || !superAdminEmail || user.email !== superAdminEmail) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-500 font-bold tracking-tight">
            <ShieldAlert className="h-5 w-5" />
            <span>Super Admin</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/50">
            <LayoutDashboard className="h-4 w-4" /> Overview
          </Link>
          <Link href="/admin/tenants" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/50">
            <Building2 className="h-4 w-4" /> Tenants (Companies)
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/50">
            <Users className="h-4 w-4" /> Users
          </Link>
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-2">
            &larr; Kembali ke Aplikasi Utama
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
