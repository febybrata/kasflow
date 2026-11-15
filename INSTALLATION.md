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
1. Di sidebar kiri Supabase Dashboard, masuk ke menu **Project Settings** (ikon roda gigi ⚙️) > **Data API** untuk menyalin **Project URL** (`https://[PROJECT-REF].supabase.co`).
2. Masuk ke menu **Project Settings** > **API Keys**:
   - Salin **Publishable key** (`sb_publishable_...`) → dimasukkan ke variabel **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**.
   - Salin **Secret key** (`sb_secret_...`) → dimasukkan ke variabel **`SUPABASE_SERVICE_ROLE_KEY`** *(Catatan: key ini bersifat sangat rahasia dan hanya boleh dipakai di sisi server)*.
   > [!NOTE]
   > Supabase kini menggunakan format standar baru **Publishable Key (`sb_publishable_...`)** dan **Secret Key (`sb_secret_...`)** untuk menggantikan format *legacy* JWT (`anon` & `service_role`). SDK `@supabase/supabase-js` di aplikasi ini sudah mendukung penuh format key terbaru tersebut.
3. Buat file `.env.local` di *root* folder aplikasi KasFlow Anda (salin dari `.env.example`).

---

## 2. Setup Supabase Auth (Sign Up & Email Confirmation)

Aplikasi ini menggunakan Supabase Auth. Sesuai kebutuhan, kita perlu mengaktifkan pendaftaran via Email/Password dan mematikan wajib konfirmasi email.

1. Di menu sidebar Supabase, buka **Authentication** > **Providers**.
2. Pastikan **Email** berstatus *Enabled*.
3. Klik pengaturan **Email**, lalu matikan (toggle off) opsi **Confirm email**.
   > [!IMPORTANT]
   > Mematikan *Confirm email* berarti user dapat langsung login setelah mendaftar tanpa perlu mengklik link verifikasi yang dikirim ke email.
4. (Opsional) Nonaktifkan *Secure email change* dan *Confirm email change* jika tidak diperlukan.
5. (Opsional) Jika ingin menggunakan login Google: Aktifkan provider **Google** di Supabase Auth, lalu atur Client ID & Secret dari Google Cloud Console.
6. Klik **Save**.

---

## 3. Database Schema, RLS, dan Policies

Selanjutnya, kita akan membuat struktur tabel (schema) serta mengatur Row Level Security (RLS) agar setiap *tenant* (perusahaan) hanya bisa melihat datanya sendiri.

1. Di Supabase Dashboard, buka menu **SQL Editor**.
2. Klik **New Query**.
3. Di *repository* aplikasi KasFlow ini, telah disediakan file SQL **tunggal** dan terlengkap: **`supabase-schema.sql`** (berada di *root* project). File ini sudah mencakup seluruh 18 tabel utama (`users`, `business_profiles`, `transactions`, `journal_entries`, `marketplace_orders`, `marketplace_statements`, dll) beserta trigger, functions, dan *RLS Policies*.
4. Buka dan copy seluruh isi file **`supabase-schema.sql`**.
5. Paste (tempelkan) isi file tersebut ke dalam **SQL Editor** Supabase.
6. Klik tombol **Run**. Supabase akan otomatis membuat seluruh tabel, trigger, dan policies.

> [!NOTE]
> File schema tersebut sudah menyertakan instruksi `ALTER TABLE [nama_tabel] ENABLE ROW LEVEL SECURITY;` beserta _policies_ (seperti `CREATE POLICY ... ON transactions FOR ALL USING (company_id = auth_user_company_id())`).

---

## 4. Pendaftaran TikTok Shop Partner & Setup ENV

Untuk mengaktifkan sinkronisasi dengan TikTok Shop, Anda harus memiliki akun TikTok App Developer / Partner.

1. Kunjungi [TikTok Shop Partner Center](https://partner.tiktokshop.com/).
2. Login atau daftar sebagai *Partner / Developer*.
3. Setelah masuk Dashboard Partner, klik menu **Apps** atau **App Management** > **Create App**.
4. Isi informasi aplikasi:
   - App Name: `KasFlow Integration` (atau sesuai nama app Anda, misal: `DGJR`).
   - App Type: Pilih **Custom App** atau **Public App** (Public App jika ingin digunakan multi-tenant).
   - App Category: `ERP` / `Accounting`.
   - **Redirect URL / Callback URL**:
     - **Opsi A (Mandiri / Pakai Domain Sendiri):** Masukkan `https://[domain-anda.com]/api/callback` (dan biarkan `AUTH_BROKER_URL` kosong di `.env.local`).
     - **Opsi B (Via Centralized Auth Broker):** Masukkan `https://auth.bakwan.my.id/api/callback` (dan isi `AUTH_BROKER_URL="https://auth.bakwan.my.id"` di `.env.local`).
5. Simpan dan tunggu proses *review* (jika menggunakan Public App).
6. Setelah disetujui, Anda akan mendapatkan **App Key** dan **App Secret**.
7. Tambahkan ke file `.env.local`:
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
4. Pilih tipe aplikasi **Developer App** (atau *Custom/Public* tergantung klasifikasi Shopee) dan isi form pendaftaran.
5. Pada bagian konfigurasi aplikasi, isi **Redirect URL / Auth Callback URL**:
   - **Opsi A (Mandiri / Pakai Domain Sendiri):** Masukkan `https://[domain-anda.com]/api/integrations/shopee/callback` (dan biarkan `AUTH_BROKER_URL` kosong di `.env.local`).
   - **Opsi B (Via Centralized Auth Broker):** Masukkan `https://auth.bakwan.my.id/api/integrations/shopee/callback` (dan isi `AUTH_BROKER_URL="https://auth.bakwan.my.id"` di `.env.local`).
6. Tunggu aplikasi Anda disetujui oleh tim Shopee (atau gunakan akun test di sandbox).
7. Setelah aplikasi siap, buka rincian aplikasi untuk mendapatkan **Partner ID** dan **Partner Key**.
8. Tambahkan ke file `.env.local`:
   ```env
   SHOPEE_PARTNER_ID="your-shopee-partner-id"
   SHOPEE_PARTNER_KEY="your-shopee-partner-key"
   SHOPEE_IS_SANDBOX=false
   ```

---

## 6. Memahami Perbedaan `NEXT_PUBLIC_APP_URL` vs `AUTH_BROKER_URL`

Aplikasi ini mendukung 2 skenario arsitektur OAuth callback untuk Shopee & TikTok Shop:

### Mengapa Ada `AUTH_BROKER_URL` (Centralized Auth Broker)?
Di Shopee Open Platform dan TikTok Partner Center, 1 akun aplikasi developer (misal App `DGJR`) hanya mengizinkan **1 pintu masuk Redirect URL** utama. Jika Anda memiliki beberapa aplikasi/domain berbeda (contoh: `simpelkas.bakwan.my.id` dan `umkm.bakwan.my.id`) yang berbagi 1 App Developer Shopee/TikTok yang sama, maka digunakanlah **Jembatan / Pos Transit** (`https://auth.bakwan.my.id`).

| Variabel ENV | Analogi | Tugas & Fungsinya |
| :--- | :--- | :--- |
| **`AUTH_BROKER_URL`** | **Pos Satpam Transit (Jembatan)**<br>*(Contoh: `https://auth.bakwan.my.id`)* | Alamat yang terdaftar resmi di Shopee & TikTok Developer Console. Shopee & TikTok mengirim kode otorisasi ke alamat ini terlebih dahulu. |
| **`NEXT_PUBLIC_APP_URL`** | **Alamat Rumah Asli Aplikasi Ini**<br>*(Contoh: `https://simpelkas.bakwan.my.id`)* | Memberi tahu jembatan (`auth.bakwan.my.id`) ke domain mana kode login harus diteruskan (di-oper balik), sekaligus URL dasar untuk redirect halaman aplikasi (`/integrations?connected=true`). |

### Alur Kerja Saat `AUTH_BROKER_URL` Diisi:
1. User klik **"Hubungkan Toko"** di `https://simpelkas.bakwan.my.id`.
2. Aplikasi mengirim user ke halaman login Seller Shopee/TikTok sambil membawa 2 informasi:
   - `redirect_uri`: `https://auth.bakwan.my.id/...` (diambil dari `AUTH_BROKER_URL`)
   - `state` (Base64): berisi titipan `{ target: "https://simpelkas.bakwan.my.id", originalState: "..." }` (diambil dari `NEXT_PUBLIC_APP_URL`)
3. Setelah seller login & klik setuju, Shopee/TikTok melempar kode ke `https://auth.bakwan.my.id`.
4. Cloudflare Worker di `auth.bakwan.my.id` membuka isi `state`, memeriksa apakah domain `target` sudah masuk daftar *whitelist*, lalu langsung meneruskan (HTTP 302 Redirect) kembali ke:
   - **Shopee:** `https://simpelkas.bakwan.my.id/api/integrations/shopee/callback`
   - **TikTok:** `https://simpelkas.bakwan.my.id/api/callback`

### Bagaimana Jika Dipakai oleh User Lain dengan Domain Sendiri?
* **Kondisi 1 — User Lain Punya Akun Developer Shopee/TikTok Sendiri (Mandiri / Tanpa Jembatan):**
  User tersebut cukup mengisi `NEXT_PUBLIC_APP_URL="https://domain-dia.com"` dan **mengosongkan `AUTH_BROKER_URL=""`**. Aplikasi otomatis mem-bypass `auth.bakwan.my.id` dan mengarahkan callback langsung ke `https://domain-dia.com`.
* **Kondisi 2 — User Lain Ikut Menumpang Akun Developer `DGJR` Anda:**
  User tersebut mengisi `NEXT_PUBLIC_APP_URL="https://domain-dia.com"` dan mengisi `AUTH_BROKER_URL="https://auth.bakwan.my.id"`, lalu Anda cukup menambahkan `https://domain-dia.com` ke daftar *whitelist* di Cloudflare Worker `auth.bakwan.my.id`.

---

## 7. Template Lengkap `.env.local`

Pastikan isi `.env.local` Anda lengkap dengan variabel-variabel berikut:

```env
# ── Supabase (Wajib) ──────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
# Isi dengan Publishable Key (sb_publishable_...) dari menu Project Settings -> API Keys
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."
# Isi dengan Secret Key (sb_secret_...) dari menu Project Settings -> API Keys
SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."

# ── App URL (Wajib — Domain Asli Aplikasi Ini) ────────────────
NEXT_PUBLIC_APP_URL="https://[domain-anda.com]"

# ── Centralized Auth Broker (Opsional) ────────────────────────
# Kosongkan ("") jika callback langsung ke domain sendiri (Mandiri / Opsi A).
# Isi dengan "https://auth.bakwan.my.id" jika lewat Auth Broker terpusat (Opsi B).
AUTH_BROKER_URL=""

# ── Auth Providers ────────────────────────────────────────────
# Set 'true' untuk menampilkan tombol "Lanjutkan dengan Google", atau 'false' untuk menyembunyikannya
NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN=false

# ── TikTok Shop Integration (Opsional) ────────────────────────
TIKTOK_APP_KEY="your-tiktok-app-key"
TIKTOK_APP_SECRET="your-tiktok-app-secret"

# ── Shopee Open Platform Integration (Opsional) ───────────────
SHOPEE_PARTNER_ID="your-shopee-partner-id"
SHOPEE_PARTNER_KEY="your-shopee-partner-key"
SHOPEE_IS_SANDBOX=false
```

---

## 8. Menjalankan Aplikasi

Jalankan perintah instalasi dependencies dan jalankan aplikasi:

### Mode Development:
```bash
# 1. Install dependencies
npm install

# 2. Jalankan development server (port default: 3000)
npm run dev
```
Akses di browser: [http://localhost:3000](http://localhost:3000).

### Mode Production (Build & PM2):
```bash
# 1. Build aplikasi Next.js
npm run build

# 2. Jalankan dengan PM2 (contoh port 3008)
pm2 start npm --name "simpelkas-dev" -- start -- -p 3008

# 3. Reload / restart bila mengubah env
pm2 restart simpelkas-dev
```

---

## 9. Mencegah Supabase Auto-Pause (Keep-Alive)

Supabase tier Free akan otomatis di-*pause* jika tidak ada request selama 7 hari. Repository ini sudah dilengkapi workflow GitHub Actions **`.github/workflows/keep-alive.yml`** yang otomatis melakukan query ping 2x sehari (jam 10:00 & 22:00 WIB).

Untuk mengaktifkannya di repository GitHub Anda:
1. Buka repo GitHub → **Settings** > **Secrets and variables** > **Actions**.
2. Tambahkan **Repository Secrets**:
   - `SUPABASE_URL`: URL project Supabase Anda (contoh: `https://your-project.supabase.co`).
   - `SUPABASE_ANON_KEY`: **Publishable Key** (`sb_publishable_...`) dari Supabase Anda.
   - *(Opsional jika ingin mem-ping project kedua sekaligus)*: Tambahkan `SUPABASE_URL_2` dan `SUPABASE_ANON_KEY_2`.
3. Anda juga dapat menjalankan ping manual kapan saja melalui tab **Actions** → pilih **Supabase Keep-Alive** → klik **Run workflow**.
