import { createAdminClient } from "@/lib/supabase/admin-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = 'force-dynamic';

export default async function AdminTenantsPage() {
  const adminClient = createAdminClient();

  // Fetch companies
  const { data: companies } = await adminClient
    .from("business_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tenants Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Kelola seluruh perusahaan yang terdaftar di platform Anda.</p>
      </div>

      <Card className="shadow-sm border-zinc-200/60 dark:border-zinc-800/50">
        <CardHeader className="border-b pb-4 mb-4">
          <CardTitle className="text-lg">Daftar Perusahaan</CardTitle>
          <CardDescription>Menampilkan {companies?.length ?? 0} perusahaan.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border dark:border-zinc-800">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-900 border-b dark:border-zinc-800 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Nama Bisnis</th>
                  <th className="px-4 py-3 font-medium">Pemilik</th>
                  <th className="px-4 py-3 font-medium">Tipe</th>
                  <th className="px-4 py-3 font-medium">Terdaftar</th>
                  <th className="px-4 py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {companies?.map((company: any) => (
                  <tr key={company.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{company.id.substring(0, 8)}...</td>
                    <td className="px-4 py-3 font-medium text-foreground">{company.business_name}</td>
                    <td className="px-4 py-3">{company.owner_name}</td>
                    <td className="px-4 py-3 capitalize">{company.business_type?.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(company.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge tone="green">Active</Badge>
                    </td>
                  </tr>
                ))}
                {!companies?.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Belum ada perusahaan terdaftar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
