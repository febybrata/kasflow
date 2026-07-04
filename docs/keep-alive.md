# KasFlow — Keep-Alive Supabase

> Sumber utama: `.github/workflows/keep-alive.yml`, `vercel.json`.
> Tujuan: Menjaga Supabase Free project tetap aktif agar tidak dipause otomatis setelah 7 hari tanpa aktivitas.

---

## 1. Latar Belakang

Project Supabase Free tier akan **dipause otomatis** jika tidak menerima aktivitas apa pun selama **7 hari**. Setelah dipause, project harus di-unpause secara manual melalui dashboard, dan prosesnya dapat memakan waktu cukup lama.

Untuk mencegah hal ini, KasFlow menjalankan **ping berkala** ke REST API Supabase melalui GitHub Actions.

---

## 2. Mengapa GitHub Actions (bukan Vercel Cron)?

Versi awal implementasi menggunakan **Vercel Cron + endpoint Next.js** (`/api/keepalive`). Saat diuji, ternyata endpoint tidak bisa diakses publik karena project terlindungi **Vercel Deployment Protection** (Vercel SSO wall) — fitur keamanan yang memblokir semua request tak terautentikasi ke deployment Vercel.

Karena Vercel Cron sendiri mengirim HTTP request biasa (yang juga kena SSO wall), pendekatan ini tidak akan bekerja. Solusinya: **pin Supabase REST API langsung dari GitHub Actions**, yang berjalan di infrastruktur GitHub — bukan Vercel — sehingga tidak kena Deployment Protection.

**Keuntungan arsitektur saat ini:**

- ✅ Tidak kena Vercel Deployment Protection
- ✅ Tidak butuh endpoint Next.js tambahan (less code)
- ✅ Tidak pakai Vercel Cron quota
- ✅ GitHub Actions Free: 2000 menit/bulan (lebih dari cukup untuk 1 cron job)
- ✅ Logs tersimpan permanen di tab **Actions** GitHub
- ✅ Bisa di-trigger manual via `workflow_dispatch` untuk testing cepat

---

## 3. Cara Kerja

```
┌─────────────────────────────────┐
│  GitHub Actions                 │
│  .github/workflows/             │
│  keep-alive.yml                 │
│  (cron: 0 0 * * 1-5)           │
└──────────────┬──────────────────┘
               │  curl + apikey header
               ▼
┌─────────────────────────────────┐
│  Supabase REST API              │
│  GET /rest/v1/business_profiles │
│       ?select=id&limit=1        │
└──────────────┬──────────────────┘
               │  Activity tercatat
               ▼
┌─────────────────────────────────┐
│  Project Supabase Free          │
│  Timer pause di-reset           │
│  → tetap aktif ✅               │
└─────────────────────────────────┘
```

**Alur singkat:**

1. Setiap Senin–Jumat pukul 00:00 UTC, GitHub Actions menjalankan workflow.
2. Workflow mengirim `GET` ke `https://<project>.supabase.co/rest/v1/business_profiles?select=id&limit=1` dengan header `apikey` dan `Authorization: Bearer`.
3. Supabase mencatat aktivitas query ini dan me-reset timer pause otomatis.
4. Workflow exit dengan status `success` atau `failure` (terlihat jelas di tab Actions).

---

## 4. File yang Terlibat

| File | Fungsi |
|------|--------|
| `.github/workflows/keep-alive.yml` | Workflow GitHub Actions. Menjalankan `curl` ke Supabase REST API. |
| `vercel.json` | Dikosongkan (`{}`) — Vercel Cron dinonaktifkan. |

**Catatan historis:** Versi sebelumnya menggunakan `app/api/keepalive/route.ts` (endpoint Next.js). File ini sudah dihapus karena tidak diperlukan lagi — workflow GitHub Actions memanggil Supabase REST API langsung tanpa perantara.

---

## 5. Detail Workflow

**Lokasi:** `.github/workflows/keep-alive.yml`

**Trigger:**

```yaml
on:
  schedule:
    - cron: '0 0 * * 1-5'   # Otomatis: Senin–Jumat 00:00 UTC
  workflow_dispatch:          # Manual: klik "Run workflow" di tab Actions
```

**Perintah yang dijalankan:**

```bash
curl -sS -G \
  --data-urlencode "select=id" \
  --data-urlencode "limit=1" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  "${SUPABASE_URL}/rest/v1/business_profiles"
```

**Query Supabase yang dihasilkan:**

```
GET /rest/v1/business_profiles?select=id&limit=1
```

**Mengapa tabel `business_profiles`?**

- Pasti selalu ada di setiap deployment (dibuat saat bootstrap user baru).
- Paling ringan: Primary key `TEXT` sederhana.
- Tidak butuh autentikasi user tertentu — Anon Key sudah cukup.

**Response sukses (HTTP 200):**

```json
[{ "id": "company_xxx" }]   # atau [] jika database kosong (tetap 200)
```

---

## 6. Konfigurasi Schedule

Penjelasan cron expression `0 0 * * 1-5`:

| Bagian | Nilai | Arti |
|--------|-------|------|
| Menit | `0` | Menit ke-0 |
| Jam | `0` | Jam ke-0 (00:00 UTC) |
| Hari | `*` | Setiap hari dalam bulan |
| Bulan | `*` | Setiap bulan |
| Hari minggu | `1-5` | Senin (1) sampai Jumat (5) |

→ Eksekusi setiap **hari kerja pukul 00:00 UTC** (5 kali seminggu).

**Mengapa weekday saja?**

- Threshold pause Supabase = 7 hari. Dengan 5 hit/minggu, jarak terjauh antar hit (Jumat 00:00 → Senin 00:00) sekitar 2,5 hari — masih sangat aman.
- Hemat resource GitHub Actions.
- Tidak ada ketergantungan pada Vercel Cron quota.

---

## 7. Setup GitHub Secrets (Satu Kali)

Workflow ini butuh **2 secrets** yang harus Anda tambahkan secara manual di GitHub web.

### Langkah-langkah:

1. Buka `github.com/ahaditastudio/umkm-supabase` → tab **Settings**
2. Menu kiri: **Secrets and variables** → **Actions**
3. Klik **New repository secret**

### Tambahkan 2 secrets berikut:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | Salin dari `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` (misal `https://xxxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Salin dari `.env.local`: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (string panjang dimulai `eyJ...`) |

> ⚠️ **Catatan keamanan:** Anon Key **secara desain memang public** (sudah dipakai di browser client app). Menyimpannya di GitHub Secrets hanya formalitas agar tidak hardcode di file workflow — namun tidak menambah risiko keamanan.

---

## 8. Cara Verifikasi

### 8.1 Trigger manual workflow (test cepat)

1. Buka tab **Actions** di GitHub repo
2. Pilih workflow **"Supabase Keep-Alive"** di sidebar kiri
3. Klik tombol **Run workflow** (kanan atas) → **Run workflow** (dropdown hijau)
4. Tunggu beberapa detik, klik run yang baru muncul untuk melihat log

**Expected output di log:**

```
Pinging https://xxxxx.supabase.co ...
HTTP Status: 200
Response body: [{"id":"company_xxx"}]
✅ Keep-alive SUCCESS — Supabase project aktif
```

### 8.2 Pantau eksekusi terjadwal

- Tab **Actions** → klik **Supabase Keep-Alive** di sidebar
- Anda akan melihat daftar run otomatis (Senin–Jumat 00:00 UTC)
- Badge hijau ✅ = sukses, merah ❌ = gagal

### 8.3 Verifikasi di Supabase Dashboard

1. Buka **Supabase Dashboard → Project → Logs → API Logs** (atau **Database → Query Performance**)
2. Setelah workflow berjalan, akan terlihat query `GET /rest/v1/business_profiles?select=id&limit=1`
3. Aktivitas ini me-reset timer pause otomatis

---

## 9. Limitasi & Catatan

| Aspek | Catatan |
|-------|---------|
| **GitHub Actions Free** | 2000 menit/bulan. 1 cron job × ~5 detik eksekusi × ~22 hari kerja = ~2 menit/bulan. Aman. |
| **Project yang sudah paused** | Keep-alive **tidak bisa** meng-unpause otomatis — harus manual via dashboard dulu, baru cron mulai bekerja lagi. |
| **Internal cron Supabase (pg_cron)** | Tidak dipakai karena tidak efektif: jika project sudah paused, cron di dalam project juga ikut berhenti. Keep-alive **harus** berasal dari luar. |
| **Workflow failure** | Jika GH Actions gagal (misal secrets salah), Supabase tidak dapat ping hari itu. Tapi dengan 5x/minggu, masih ada banyak kesempatan recovery. |

---

## 10. Migrasi ke Scheduler Lain

Jika di masa depan ingin pindah scheduler (misal karena GitHub Actions policy berubah), modifikasi hanya workflow file — tidak ada kode aplikasi yang perlu diubah.

### Opsi A: Tetap GitHub Actions (default saat ini)

Tidak perlu melakukan apa-apa. Sudah berjalan.

### Opsi B: Pindah ke cron-job.org (layanan gratis, tanpa GitHub)

1. **Hapus** `.github/workflows/keep-alive.yml`
2. Setup via web di [cron-job.org](https://cron-job.org):
   - URL: `https://<your-project>.supabase.co/rest/v1/business_profiles?select=id&limit=1`
   - Header 1: `apikey: <SUPABASE_ANON_KEY>`
   - Header 2: `Authorization: Bearer <SUPABASE_ANON_KEY>`
   - Schedule: `0 0 * * 1-5`

### Opsi C: Pindah ke UptimeRobot (monitoring + ping gratis)

1. **Hapus** `.github/workflows/keep-alive.yml`
2. Setup monitor di [UptimeRobot](https://uptimerobot.com):
   - Monitor Type: HTTP(s)
   - URL: sama seperti di atas
   - Monitoring Interval: minimal 5 menit (free plan)

### Opsi D: Multi-layer (paling aman)

Pertahankan GH Actions **dan** tambah backup scheduler lain. Contoh:

1. `.github/workflows/keep-alive.yml` tetap (Senin–Jumat 00:00 UTC)
2. Tambah cron-job.org dengan schedule berbeda (misal Rabu 12:00 UTC)

---

## 11. Ringkasan Perubahan (Riwayat)

| File | Aksi | Tujuan |
|------|------|--------|
| `.github/workflows/keep-alive.yml` | **Buat baru** | Workflow GH Actions yang ping Supabase REST API. |
| `vercel.json` | **Dikosongkan** (`{}`) | Matikan Vercel Cron (pindah ke GH Actions). |
| `docs/keep-alive.md` | **Update** | Dokumentasi arsitektur baru. |
| ~~`app/api/keepalive/route.ts`~~ | ~~Dihapus~~ | Tidak diperlukan lagi (GH Actions panggil Supabase langsung). |

---

## 12. Troubleshooting

### Workflow gagal: "supabase_url not set"

→ **Solusi:** Tambahkan secret `SUPABASE_URL` di Settings → Secrets (lihat §7).

### Workflow gagal: HTTP 401

→ **Solusi:** Secret `SUPABASE_ANON_KEY` salah atau tidak ada. Cek ulang di Supabase Dashboard → Settings → API.

### Workflow gagal: HTTP 404

→ **Solusi:** Project ID di `SUPABASE_URL` salah. Pastikan URL lengkap seperti `https://abcdefghijk.supabase.co` (bukan custom domain).

### Workflow sukses tapi Supabase tetap paused

→ **Solusi:** Kemungkinan project sudah paused **sebelum** workflow pertama berjalan. Unpause manual dulu via dashboard, lalu pastikan workflow berikutnya sukses (lihat §8.1).

### Workflow tidak berjalan otomatis

→ **Solusi:**

- Cek tab **Actions** → pastikan workflow file valid (tidak ada error YAML).
- Cron GitHub Actions bisa delay 5–30 menit dari jadwal.
- Pastikan repo tidak di-archive / disabled Actions.
