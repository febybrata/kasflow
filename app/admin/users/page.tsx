import { createAdminClient } from "@/lib/supabase/admin-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const adminClient = createAdminClient();

  // Fetch users and join with companies
  const { data: users } = await adminClient
    .from("users")
    .select(`
      *,
      business_profiles (
        business_name
      )
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Kelola seluruh pengguna yang terdaftar di platform Anda.</p>
      </div>

      <Card className="shadow-sm border-zinc-200/60 dark:border-zinc-800/50">
        <CardHeader className="border-b pb-4 mb-4">
          <CardTitle className="text-lg">Daftar Pengguna</CardTitle>
          <CardDescription>Menampilkan {users?.length ?? 0} akun pengguna.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border dark:border-zinc-800">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-900 border-b dark:border-zinc-800 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">UID</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Perusahaan (Tenant)</th>
                  <th className="px-4 py-3 font-medium">Terdaftar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {users?.map((user: any) => (
                  <tr key={user.uid} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{user.uid.substring(0, 12)}...</td>
                    <td className="px-4 py-3 capitalize">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-medium">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {user.business_profiles?.business_name ?? <span className="text-muted-foreground italic">No Company</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(user.created_at).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))}
                {!users?.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      Belum ada pengguna terdaftar.
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
