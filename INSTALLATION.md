# Panduan Instalasi Lengkap KasFlow

Panduan ini akan memandu Anda melakukan setup aplikasi KasFlow dari awal hingga siap dijalankan, meliputi konfigurasi Supabase, integrasi Marketplace (TikTok & Shopee), dan *environment variables*.

---

## 1. Setup Supabase & Environment Variables

Langkah pertama adalah membuat proyek Supabase sebagai backend dan database utama aplikasi.

### Membuat Project Supabase
1. Kunjungi [Supabase Dashboard](https://supabase.com/dashboard) dan login menggunakan akun Anda.
2. Klik tombol **New Project**.
3. Pilih *Organization*, isi **Name** (contoh: `KasFlow App`), buat **Database Password** yang kuat, dan pilih **Region** (misal: Singapore).
4. Klik **Create new project** dan tunggu beberapa menit hingga database siap.

### Mengambil Environment Variables (ENV)
Setelah project siap, Anda perlu mengambil kredensial untuk dihubungkan dengan aplikasi Next.js:
1. Di sidebar kiri, masuk ke menu **Settings** > **API** (di bawah label *Configuration*).
2. Temukan bagian **Project URL**. Salin URL tersebut.
3. Temukan bagian **Project API Keys**:
   - Salin **`anon` / `public`** key.
   - Salin **`service_role`** key *(Catatan: key ini bersifat rahasia dan hanya boleh dipakai di sisi server)*.
4. Buat file `.env.local` di *root* folder aplikasi KasFlow Anda (salin dari `.env.example` jika ada) dan isi dengan kredensial tersebut:

```env
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."
```

---

## 2. Setup Supabase Auth (Sign Up & Email Confirmation)

Aplikasi ini menggunakan Supabase Auth. Sesuai kebutuhan, kita perlu mengaktifkan pendaftaran via Email/Password dan mematikan wajib konfirmasi email.

1. Di menu sidebar Supabase, buka **Authentication** > **Providers**.
2. Pastikan **Email** berstatus *Enabled*.
3. Klik pengaturan **Email**, lalu matikan (toggle off) opsi **Confirm email**.
   > [!IMPORTANT]
   > Mematikan *Confirm email* berarti user dapat langsung login setelah mendaftar tanpa perlu mengklik link verifikasi yang dikirim ke email.
4. (Opsional) Nonaktifkan *Secure email change* dan *Confirm email change* jika tidak diperlukan.
5. Klik **Save**.

---

## 3. Database Schema, RLS, dan Policies

Selanjutnya, kita akan membuat struktur tabel (schema) serta mengatur Row Level Security (RLS) agar setiap *tenant* (perusahaan) hanya bisa melihat datanya sendiri.

1. Di Supabase Dashboard, buka menu **SQL Editor**.
2. Klik **New Query**.
3. Di *repository* aplikasi KasFlow ini, telah disediakan file SQL **tunggal** dan terlengkap yang sudah berisi seluruh instruksi pembuatan tabel, trigger, fungsi, integrasi marketplace, dan RLS Policies.
4. Buka dan copy seluruh isi file **`supabase-schema.sql`** (berada di *root* project).
5. Paste (tempelkan) isi file tersebut ke dalam **SQL Editor** Supabase.
6. Klik tombol **Run**. Supabase akan otomatis membuat tabel-tabel utama (`users`, `business_profiles`, `transactions`, `journal_entries`, `marketplace_orders`, dll) lengkap dengan semua *RLS Policies*.

> [!NOTE]
> File schema tersebut sudah menyertakan instruksi `ALTER TABLE [nama_tabel] ENABLE ROW LEVEL SECURITY;` beserta _policies_ (seperti `CREATE POLICY ... ON transactions FOR ALL USING (company_id = auth.company_id())`).

---

## 4. Pendaftaran TikTok Shop Partner & Setup ENV

Untuk mengaktifkan sinkronisasi dengan TikTok Shop, Anda harus menjadi TikTok App Developer.

1. Kunjungi [TikTok Shop Partner Center](https://partner.tiktokshop.com/).
2. Login atau daftar sebagai *Partner / Developer*.
3. Setelah masuk Dashboard Partner, klik menu **Apps** atau **App Management** > **Create App**.
4. Isi informasi aplikasi:
   - App Name: `KasFlow Integration`
   - App Type: Pilih **Custom App** atau **Public App** (tergantung kebutuhan Anda, disarankan Public App jika ingin diakses banyak tenant).
   - App Category: `ERP` / `Accounting`.
   - **Redirect URL / Callback URL**: Masukkan URL callback aplikasi Anda, contoh: `https://[domain-anda.com]/api/integrations/tiktok/callback` (atau `localhost` untuk dev).
5. Simpan dan tunggu proses *review* (jika menggunakan Public App).
6. Setelah disetujui, Anda akan mendapatkan **App Key** dan **App Secret**.
7. Tambahkan ke file `.env.local` Anda:

```env
TIKTOK_APP_KEY="your-tiktok-app-key"
TIKTOK_APP_SECRET="your-tiktok-app-secret"
```

---

## 5. Pendaftaran Shopee Open Platform & Setup ENV

Sama seperti TikTok, Anda perlu mendaftar ke Shopee Open Platform.

1. Kunjungi [Shopee Open Platform](https://open.shopee.com/).
2. Buat akun developer atau login.
3. Di **Console**, klik **Create App**.
4. Pilih tipe aplikasi **Developer App** (atau *Custom/Public* tergantung klasifikasi Shopee terbaru) dan isi form pendaftaran aplikasi.
5. Pada bagian konfigurasi aplikasi, isi **Redirect URL / Auth Callback URL**:
   - Contoh: `https://[domain-anda.com]/api/integrations/shopee/callback`
6. Tunggu aplikasi Anda disetujui oleh tim Shopee. (Beberapa tipe aplikasi bisa digunakan dalam mode *sandbox* / *test* sebelum disetujui).
7. Setelah aplikasi dibuat/disetujui, buka rincian aplikasi untuk mendapatkan **Partner ID** (Client ID) dan **Partner Key** (Client Secret).
8. Tambahkan kredensial tersebut ke file `.env.local`:

```env
SHOPEE_PARTNER_ID="your-shopee-partner-id"
SHOPEE_PARTNER_KEY="your-shopee-partner-key"
```

---

## 6. Menjalankan Aplikasi

Setelah seluruh *environment variables* terkumpul, aplikasi siap dijalankan.

Pastikan isi `.env.local` Anda lengkap seperti ini:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhb..."
SUPABASE_SERVICE_ROLE_KEY="eyJhb..."

# TikTok Shop
TIKTOK_APP_KEY="your-tiktok-app-key"
TIKTOK_APP_SECRET="your-tiktok-app-secret"

# Shopee Open Platform
SHOPEE_PARTNER_ID="your-shopee-partner-id"
SHOPEE_PARTNER_KEY="your-shopee-partner-key"
```

Jalankan perintah instalasi dan mulai *development server*:

```bash
# 1. Install dependencies
npm install

# 2. Jalankan server lokal
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda. Aplikasi siap digunakan!
