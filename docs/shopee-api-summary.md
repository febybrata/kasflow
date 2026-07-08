# Ringkasan Integrasi API Shopee Open Platform (v2)

Dokumen ini berisi rangkuman analisis dari 7 API Shopee Open Platform yang Anda berikan untuk membantu perencanaan dokumentasi integrasi. 

Secara umum, API ini terbagi menjadi 2 kelompok utama:
1. **Asynchronous Income Report & Statement Flow** (Pembuatan laporan keuangan dalam bentuk file).
2. **Real-time Income Overview & Details** (Pengambilan data keuangan terperinci secara langsung via API).

---

## 1. Aliran Asynchronous Laporan Keuangan (Income Report & Statement)

Pembuatan laporan keuangan Shopee dilakukan secara **asinkronus (asynchronous)** karena pemrosesan data dalam jumlah besar membutuhkan waktu. Aliran integrasinya selalu melibatkan dua tahap: **Generate** (membuat antrean) dan **Get** (mengambil hasil ketika selesai).

### A. Income Statement (Laporan Laba Rugi / Saldo Toko)
*   **`v2.payment.generate_income_statement`**
    *   **Fungsi:** Menginisiasi pembuatan file *Income Statement* untuk rentang waktu tertentu.
    *   **Hasil:** Mengembalikan ID Pekerjaan (*job/request ID*) yang merepresentasikan proses pembuatan file di latar belakang.
*   **`v2.payment.get_income_statement`**
    *   **Fungsi:** Mengambil status pembuatan dari *Income Statement* yang diinisiasi sebelumnya menggunakan ID Pekerjaan tersebut.
    *   **Hasil:** Jika status sudah selesai (*Completed/Downloadable*), API akan mengembalikan tautan unduhan (*download URL*) untuk mengunduh berkas laporan (biasanya berupa format CSV/Excel).

### B. Income Report (Laporan Pendapatan Penjual)
*   **`v2.payment.generate_income_report`**
    *   **Fungsi:** Menginisiasi pembuatan laporan pendapatan (*Income Report*) berdasarkan rentang waktu tertentu. Laporan ini mencakup rekonsiliasi data keuangan untuk Local maupun Cross-Border (CB) shop.
    *   **Hasil:** Mengembalikan `income_report_id` atau ID transaksi laporan.
*   **`v2.payment.get_income_report`**
    *   **Fungsi:** Mengambil status dan tautan unduhan laporan pendapatan berdasarkan `income_report_id` yang didapat dari tahap *generate*.
    *   **Hasil:** Mengembalikan status pemrosesan (misalnya: *1 - Processing*, *2 - Downloadable*, *0 - Invalid*) beserta URL untuk mengunduh laporan ketika statusnya sudah siap.

---

## 2. Pelacakan Data Keuangan Real-time (Overview & Details)

Jika sistem Anda membutuhkan data saldo dan detail transaksi secara langsung tanpa harus mengunduh file secara asinkronus, Shopee menyediakan API real-time yang selaras dengan tampilan di **Shopee Seller Center -> My Income**.

*   **`v2.payment.get_income_overview`**
    *   **Fungsi:** Menyediakan ringkasan eksekutif saldo pendapatan toko.
    *   **Detail:** Data dikelompokkan berdasarkan status dana (misalnya: saldo yang tertunda (*Pending*), saldo yang siap dicairkan (*To Release*), dan saldo yang sudah dilepas ke rekening/dompet penjual (*Released*)). Sangat berguna untuk dasbor utama keuangan toko.
*   **`v2.payment.get_income_detail`**
    *   **Fungsi:** Menyediakan data transaksi keuangan terperinci di tingkat pesanan (*order-level*).
    *   **Detail:** Mengembalikan detail komponen dana per pesanan (harga produk, ongkos kirim, biaya admin, diskon, dll.). Struktur respons bersifat dinamis, menyesuaikan apakah tipe toko Anda adalah toko lokal (*Local Shop*) atau toko lintas negara (*Cross-Border Shop*).



---

## Rekomendasi Alur Integrasi (Best Practices)

1.  **Gunakan API Real-time untuk Dasbor:** Hindari memanggil API *generate* secara berulang-ulang untuk memperbarui halaman keuangan pengguna. Gunakan `get_income_overview` and `get_income_detail` untuk mendapatkan data instan.
2.  **Jadwalkan Laporan Unduhan secara Berkala:** Gunakan `generate_income_report` dan `get_income_report` untuk penutupan buku (misal: rekonsiliasi bulanan atau mingguan) dengan menjalankan *Cron Job* di latar belakang.

---

## 3. Mekanisme Teknis Integrasi (Node.js / Next.js)

Karena proyek Anda menggunakan **Next.js & TypeScript**, Anda tidak memerlukan SDK eksternal yang rumit. Anda bisa menggunakan module bawaan Node.js (`crypto`) dan `fetch` / `axios` untuk melakukan request.

### A. Kredensial & Tipe Aplikasi yang Dibutuhkan

Karena Anda menggunakan tipe aplikasi **Self-Owned App (Seller In-house System / Akun Internal)** di Shopee Open Platform:
*   **Otorisasi Lebih Sederhana:** Anda tidak perlu mempublikasikan aplikasi ke pasar umum. Otorisasi dilakukan sekali saja dari halaman detail aplikasi Anda di Shopee Developer Console dengan mengeklik tombol **Authorize** untuk menghubungkan toko Anda sendiri.
*   **Kredensial Lingkungan (.env):**
    *   `SHOPEE_PARTNER_ID` (Didapat dari detail App Console)
    *   `SHOPEE_PARTNER_KEY` / Secret Key (Didapat dari detail App Console)
    *   `SHOPEE_SHOP_ID` (ID Toko Shopee Anda sendiri)

### B. Daftar Endpoint API Shopee V2 yang Digunakan

Meskipun menggunakan Akun Internal (Self-Owned), **path endpoint API yang dipanggil tetap sama persis** dengan tipe Third-Party. 

*   **Base URL (Production/Live):** `https://partner.shopeemobile.com`
*   **Base URL (Sandbox/Test):** `https://partner.test-stable.shopeemobile.com`

Berikut adalah endpoint Shopee Open API v2 spesifik yang akan kita tembak:

1.  **Endpoint Otentikasi & Token:**
    *   Mendapatkan Token Pertama: `/api/v2/auth/token/get` (POST)
    *   Mendapatkan Token Baru (Refresh): `/api/v2/auth/access_token/get` (POST)
2.  **Endpoint Laporan Keuangan (Finance):**
    *   Ringkasan Saldo: `/api/v2/payment/get_income_overview` (GET)
    *   Detail Rilis Dana per Order: `/api/v2/payment/get_income_detail` (GET)
    *   Antrean Generate Report: `/api/v2/payment/generate_income_report` (POST)
    *   Status & Link Download Report: `/api/v2/payment/get_income_report` (GET)
3.  **Endpoint Informasi Pesanan (Orders):**
    *   Daftar Pesanan (Filter Waktu): `/api/v2/order/get_order_list` (GET)
    *   Detail Komponen Pesanan (SKU/Harga/Ongkir): `/api/v2/order/get_order_detail` (GET)

### C. Otentikasi (OAuth 2.0 Flow Internal App)
1.  **Otorisasi Awal:** Buka detail aplikasi Anda di Developer Console, klik **Authorize**, pilih toko Anda, lalu klik konfirmasi.
2.  **Redirect & Code:** Developer Console akan mengarahkan browser ke callback URL yang Anda pasang (misalnya `http://localhost:3000/api/integrations/shopee/callback` atau URL server production Anda) membawa parameter `code` dan `shop_id`.
3.  **Exchange Token:** Server Next.js Anda menangkap `code` tersebut dan menembak `/api/v2/auth/token/get` untuk menyimpan `access_token` dan `refresh_token` pertama kali ke tabel `marketplace_connections`.
4.  **Token Management (Auto-Refresh):** 
    *   `access_token` kedaluwarsa dalam **4 jam**.
    *   `refresh_token` kedaluwarsa dalam **30 hari**. Backend Anda harus menggunakan `refresh_token` untuk meminta token baru ke `/api/v2/auth/access_token/get` sebelum 4 jam berlalu. Setiap kali di-refresh, Shopee akan memberikan `refresh_token` baru yang wajib ditimpa/disimpan kembali di database.


### D. Contoh Utility Pembuatan Signature (HMAC-SHA256)
Setiap memanggil API Shopee, parameter query wajib menyertakan `partner_id`, `timestamp`, `sign`, dan `access_token` + `shop_id` (untuk API tingkat toko).

Berikut contoh fungsi helper TypeScript untuk membuat *signature* dan URL request Shopee:

```typescript
import crypto from 'crypto';

interface ShopeeRequestConfig {
  partnerId: number;
  partnerKey: string;
  apiPath: string; // Contoh: "/api/v2/payment/get_income_overview"
  accessToken?: string;
  shopId?: number;
}

export function generateShopeeUrl(config: ShopeeRequestConfig): string {
  const host = 'https://api.shopee.co.id'; // Sesuaikan region target
  const timestamp = Math.floor(Date.now() / 1000);
  
  // 1. Buat base string berdasarkan aturan Shopee
  // Format: partner_id + api_path + timestamp + access_token (jika ada) + shop_id (jika ada)
  let baseString = `${config.partnerId}${config.apiPath}${timestamp}`;
  if (config.accessToken) baseString += config.accessToken;
  if (config.shopId) baseString += config.shopId;

  // 2. Generate signature HMAC-SHA256 (hex-encoded) menggunakan partnerKey
  const sign = crypto
    .createHmac('sha256', config.partnerKey)
    .update(baseString)
    .digest('hex');

  // 3. Susun URL lengkap beserta query parameter wajib
  const url = new URL(`${host}${config.apiPath}`);
  url.searchParams.append('partner_id', config.partnerId.toString());
  url.searchParams.append('timestamp', timestamp.toString());
  url.searchParams.append('sign', sign);
  
  if (config.accessToken) {
    url.searchParams.append('access_token', config.accessToken);
  }
  if (config.shopId) {
    url.searchParams.append('shop_id', config.shopId.toString());
  }

  return url.toString();
}
```

---

## 4. Alternatif yang Lebih Mudah: Menggunakan Library/SDK

Jika Anda merasa menulis rumus *signature* (HMAC-SHA256), menghitung *timestamp*, dan mengelola query param secara manual itu terlalu rumit dan rawan error, Anda bisa menggunakan library SDK komunitas yang sudah jadi.

Salah satu SDK Node.js/TypeScript untuk Shopee API v2 yang paling aktif dirawat dan lengkap adalah **`@congminh1254/shopee-sdk`**.

### Kelebihan Menggunakan SDK:
1. **Otomatis Pembuatan Signature:** Anda tidak perlu memikirkan rumus `sign` dan `baseString` lagi. SDK akan mengkalkulasinya secara otomatis di latar belakang setiap kali Anda memanggil API.
2. **Type-Safe:** Didukung penuh oleh TypeScript sehingga semua request/response parameter memiliki auto-complete.
3. **Fungsi Siap Pakai:** Cukup panggil method bawaan seperti `client.payment.getIncomeOverview(...)`.

### Contoh Implementasi Singkat dengan SDK:

1. **Instalasi:**
   ```bash
   npm install @congminh1254/shopee-sdk
   ```

2. **Inisialisasi Client:**
   ```typescript
   import { ShopeeOpenApiV2Client } from '@congminh1254/shopee-sdk';

   const shopee = new ShopeeOpenApiV2Client({
     partnerId: Number(process.env.SHOPEE_PARTNER_ID),
     partnerKey: process.env.SHOPEE_PARTNER_KEY || '',
     redirectUrl: 'https://domain-anda.com/api/shopee/callback',
     // Otomatis memilih server / host endpoint yang tepat
     isSandbox: false, 
   });
   ```

3. **Mendapatkan Token (OAuth Exchange):**
   ```typescript
   // Setelah redirect callback, ambil token dari code
   const tokenResponse = await shopee.getAccessToken({
     code: 'AUTH_CODE_DARI_CALLBACK',
     shopId: 123456 // ID Toko penjual
   });
   
   console.log(tokenResponse.access_token);
   console.log(tokenResponse.refresh_token);
   ```

4. **Mengambil Ringkasan Pendapatan (Get Income Overview):**
   ```typescript
   const overview = await shopee.payment.getIncomeOverview({
     shop_id: 123456,
     access_token: 'ACCESS_TOKEN_PENJUAL',
     // Parameter tambahan lainnya jika ada
   });

   console.log(overview.released_amount);
   ```

Menggunakan SDK ini memotong lebih dari 70% baris kode yang harus Anda tulis manual dan mengurangi risiko kegagalan otentikasi signature (*"Wrong Sign"*).

---

## 5. Rencana Implementasi & Pemetaan Database (Shopee vs. TikTok Shop)

KasFlow menggunakan arsitektur **Statement-based sync** (jurnal dibuat per hari/statement, bukan per transaksi order) demi menjaga performa buku besar (*ledger*) agar tetap efisien dan bebas duplikasi.

Struktur database marketplace yang sudah ada (`marketplace_connections`, `marketplace_orders`, `marketplace_statements`) dapat **digunakan kembali sepenuhnya (100% reusable)** untuk Shopee karena struktur data keuangan Shopee hampir identik dengan TikTok Shop.

### A. Pemetaan Data Keuangan (Shopee vs. TikTok Shop)

Berikut adalah tabel pemetaan bagaimana data dari Shopee (`v2.payment.get_income_detail` dan `get_income_overview`) disimpan ke dalam skema database KasFlow saat ini:

| Field Database KasFlow | Sumber Data TikTok Shop | Sumber Data Shopee (v2.payment) | Deskripsi |
| :--- | :--- | :--- | :--- |
| **`platform`** | `'tiktok_shop'` | `'shopee'` | Nama platform marketplace |
| **`platform_order_id`** | `order_id` | `order_sn` | ID unik pesanan dari platform |
| **`settlement_amount`** | `settlement_amount` | `income_amount` | Dana bersih yang dilepas ke saldo penjual |
| **`revenue_amount`** | `revenue_amount` | `revenue_amount` / `buyer_total_amount` | Pendapatan kotor (harga produk) |
| **`fee_amount`** | `fee_amount` | `platform_fee` / (`commission_fee` + `service_fee` + `transaction_fee`) | Total potongan biaya/fee platform |
| **`adjustment_amount`** | `adjustment_amount` | `adjustment_amount` | Penyesuaian dana (klaim, penalti, refund) |
| **`shipping_cost_amount`**| `shipping_cost_amount`| Selisih ongkir (`shipping_fee_paid_by_buyer` vs `actual_shipping_fee`) | Biaya pengiriman logistik |

### B. Strategi Pembuatan Statement Harian (Virtual Daily Statement)
Berbeda dengan TikTok Shop yang memiliki objek "Statement Harian" formal dari API, Shopee merilis dana secara transaksional per pesanan.

*   **Solusi:** Kita akan membuat **Virtual Daily Statement** (Statement Harian Buatan).
*   **Cara Kerja:** Saat proses sinkronisasi berjalan, API `v2.payment.get_income_detail` akan ditarik. Data transaksi yang dirilis pada hari yang sama (berdasarkan tanggal `release_time`) akan dikelompokkan (*grouped*) menjadi satu baris rekap harian di tabel `marketplace_statements` dengan format:
    *   `platform_statement_id` = `shopee_stmt_{shop_id}_{YYYY-MM-DD}`
    *   `revenue_amount` = Total pendapatan kotor pada hari itu.
    *   `fee_amount` = Total potongan biaya pada hari itu.
    *   `settlement_amount` = Total bersih yang dilepas pada hari itu.
*   **Keuntungan:** Dengan cara ini, dasbor persetujuan keuangan di KasFlow (`/marketplace/payment`) dapat menampilkan laporan harian Shopee yang rapi, dan sistem pembuatan jurnal akuntansi Anda tetap sama persis dengan TikTok Shop (tidak perlu menulis ulang logika akuntansi).

### C. Rencana Alur & Struktur Endpoint Backend
Untuk mengintegrasikan Shopee, kita akan membuat modul baru di `app/api/integrations/shopee` dan `lib/marketplace/shopee`:

```
lib/marketplace/shopee/
  ├── client.ts             # Shopee API Client (Otentikasi & Call)
  ├── sync-engine.ts        # Orkestrator sinkronisasi Shopee
  ├── sync-orders.ts        # Sinkronisasi cache order (untuk analytics)
  ├── sync-statements.ts    # Sinkronisasi transaksi keuangan & pembuatan virtual statement
  └── create-transactions.ts # Pembuatan KasFlow transactions dari virtual statement

app/api/integrations/shopee/
  ├── auth/route.ts         # Membuat URL Otorisasi Shopee
  ├── callback/route.ts     # Callback otorisasi, penukaran Auth Code → Tokens
  ├── sync/route.ts         # Memicu proses sinkronisasi manual dari tombol UI
  └── approve/route.ts      # Menyetujui virtual statement dan membuat jurnal double-entry
```

### D. Rencana Integrasi UI (`app/integrations/page.tsx`)
1.  **Aktifkan Card Shopee:** Mengubah status card Shopee dari "Coming Soon" menjadi aktif.
2.  **Hubungkan Handler:** Sambungkan tombol "Connect Toko Baru" pada Shopee untuk memanggil API `/api/integrations/shopee/auth`.
3.  **Tampilkan Info Sinkronisasi:** Tampilkan daftar toko Shopee yang berhasil terhubung beserta tombol "Sync" yang memanggil `/api/integrations/shopee/sync`.
4.  **Halaman Pembayaran & Pesanan:** Tautkan navigasi ke `/marketplace/payment` dan `/marketplace/orders` untuk persetujuan data keuangan Shopee yang sudah di-sync.



