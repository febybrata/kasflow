# KasFlow — Keep-Alive Supabase

> Sumber utama: `app/api/keepalive/route.ts`, `vercel.json`.
> Tujuan: Menjaga Supabase Free project tetap aktif agar tidak dipause otomatis setelah 7 hari tanpa aktivitas.

---

## 1. Latar Belakang

Project Supabase Free tier akan **dipause otomatis** jika tidak menerima aktivitas apa pun selama **7 hari**. Setelah dipause, project harus di-unpause secara manual melalui dashboard, dan prosesnya dapat memakan waktu cukup lama.

Untuk mencegah hal ini, KasFlow menjalankan **ping berkala** ke database Supabase melalui endpoint khusus yang dipanggil oleh scheduler otomatis.

---

## 2. Cara Kerja

```
┌─────────────────────────────────┐
│  SCHEDULER (siapa yang telpon)  │  ← Konfigurable, lihat §6
│  Vercel Cron (default)          │
└──────────────┬──────────────────┘
               │  GET /api/keepalive
               ▼
┌─────────────────────────────────┐
│  ENDPOINT (yang kerja)          │  ← TIDAK PERNAH DIUBAH
│  app/api/keepalive/route.ts     │
│  ↓ SELECT id LIMIT 1            │
│  business_profiles table        │
└─────────────────────────────────┘
```

**Alur singkat:**

1. Scheduler memanggil `GET https://<app>.vercel.app/api/keepalive` secara berkala.
2. Endpoint membuat client Supabase server-side menggunakan `SUPABASE_SERVICE_ROLE_KEY`.
3. Endpoint menjalankan query paling minimal: `SELECT id FROM business_profiles LIMIT 1`.
4. Activity ini tercatat di Supabase dan me-reset timer pause.

---

## 3. File yang Terlibat

| File | Fungsi |
|------|--------|
| `app/api/keepalive/route.ts` | Route handler `GET /api/keepalive`. Hanya query + balas JSON. |
| `vercel.json` | Konfigurasi Vercel Cron yang menjadwalkan pemanggilan endpoint. |

**Tidak ada file lain yang diubah.** Supabase client, business logic, schema, dan konfigurasi lain tetap utuh.

---

## 4. Detail Endpoint

**Lokasi:** `app/api/keepalive/route.ts`

**Method:** `GET`

**Konfigurasi Next.js:**

```ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
```

→ Memastikan response tidak pernah di-cache sehingga setiap hit benar-benar menyentuh database.

**Query yang dijalankan:**

```sql
SELECT id FROM business_profiles LIMIT 1
```

**Mengapa tabel `business_profiles`?**

- Pasti selalu ada di setiap deployment (dibuat saat bootstrap user baru — lihat `lib/supabase/bootstrap.ts`).
- Paling ringan: Primary key berupa `TEXT` sederhana.
- Tidak ada filter `company_id` sehingga tidak bergantung pada data user tertentu.

**Response sukses (HTTP 200):**

```json
{ "status": "ok", "timestamp": "2026-07-04T08:00:00.000Z" }
```

**Response error (HTTP 500):**

```json
{ "status": "error", "timestamp": "2026-07-04T08:00:00.000Z" }
```

Error juga dicatat ke console dengan prefix `[keepalive]` untuk memudahkan debugging di Vercel Logs.

---

## 5. Konfigurasi Cron

**File:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/keepalive",
      "schedule": "0 0 * * 1-5"
    }
  ]
}
```

**Penjelasan schedule `0 0 * * 1-5`:**

| Bagian | Arti |
|--------|------|
| `0` (menit) | Menit ke-0 |
| `0` (jam) | Jam ke-0 (00:00) |
| `*` (hari) | Setiap hari |
| `*` (bulan) | Setiap bulan |
| `1-5` (hari dalam minggu) | Senin–Jumat |

→ Eksekusi setiap **hari kerja pukul 00:00 UTC** (5 kali seminggu).

**Mengapa weekday saja?**

- Threshold pause Supabase = 7 hari. Dengan 5 hit/minggu, jarak terjauh antar hit (Jumat 00:00 → Senin 00:00) sekitar 2,5 hari — masih sangat aman.
- Lebih hemat quota Vercel Cron (Free: 2 cron jobs/hari).
- Menyisakan 1 slot quota cron jika nanti dibutuhkan job lain.

---

## 6. Mengganti Scheduler

Karena endpoint `GET /api/keepalive` adalah HTTP biasa, ia **tidak terikat pada satu scheduler**. Bagian ini menjelaskan cara pindah scheduler jika diperlukan.

### Prinsip Perubahan

| Komponen | Berubah saat pindah scheduler? |
|----------|-------------------------------|
| `app/api/keepalive/route.ts` | ❌ **Tidak pernah** |
| `vercel.json` | ✅ Ya (isi/dikosongkan sesuai scheduler baru) |
| File konfig scheduler baru | ✅ Ya (ditambah) |

---

### Opsi A: Tetap Vercel Cron (default saat ini)

Tidak perlu melakukan apa-apa. Sudah berjalan.

---

### Opsi B: Pindah ke GitHub Actions

**1. Kosongkan `vercel.json`:**

```json
{}
```

**2. Buat `.github/workflows/keepalive.yml`:**

```yaml
name: Supabase Keep-Alive

on:
  schedule:
    - cron: '0 0 * * 1-5'   # Senin-Jumat 00:00 UTC
  workflow_dispatch:          # Trigger manual dari tab Actions

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping keep-alive endpoint
        run: curl -f https://<your-app>.vercel.app/api/keepalive
```

> Ganti `<your-app>` dengan domain Vercel Anda (atau hardcode via GitHub Secret untuk keamanan ekstra).

---

### Opsi C: Pindah ke cron-job.org (layanan gratis)

**1. Kosongkan `vercel.json`:**

```json
{}
```

**2. Setup via web di [cron-job.org](https://cron-job.org):**

| Field | Isi |
|-------|-----|
| URL | `https://<your-app>.vercel.app/api/keepalive` |
| Schedule | `0 0 * * 1-5` |
| Request method | GET |

Tidak ada file baru di repo — semua konfigurasi ada di dashboard cron-job.org.

---

### Opsi D: Multi-layer (paling aman, "belt and suspenders")

Untuk redundansi agar keep-alive tetap berjalan meski salah satu scheduler mati.

**1. `vercel.json` tetap seperti adanya.**

**2. Tambah `.github/workflows/keepalive.yml`:**

```yaml
name: Supabase Keep-Alive (Backup)
on:
  schedule:
    - cron: '0 12 * * 3'   # Rabu 12:00 UTC (slot kosong)
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -f https://<your-app>.vercel.app/api/keepalive
```

Hasilnya: Vercel Cron hit di Senin–Jumat 00:00, GitHub Actions menambah hit di Rabu 12:00. Total **6 hit/minggu**.

---

## 7. Cara Verifikasi Setelah Deploy

### 7.1 Test manual endpoint

```bash
curl https://<your-app>.vercel.app/api/keepalive
```

**Expected output:**

```json
{"status":"ok","timestamp":"2026-07-04T08:00:00.000Z"}
```

### 7.2 Pantau Vercel Cron

Buka **Vercel Dashboard → Project → Cron Jobs**. Entry `/api/keepalive` akan muncul dengan schedule `0 0 * * 1-5`.

### 7.3 Pantau log eksekusi

Buka **Vercel Dashboard → Logs → Function Logs**, filter `/api/keepalive`. Akan terlihat log `[keepalive]` setiap kali cron berjalan.

### 7.4 Verifikasi di Supabase

1. Buka **Supabase Dashboard → Project → Database → Query Performance** atau **Logs**.
2. Setelah cron berjalan, akan terlihat query `SELECT id FROM business_profiles LIMIT 1`.
3. Aktivitas query ini me-reset timer pause otomatis.

---

## 8. Limitasi & Catatan

| Aspek | Catatan |
|-------|---------|
| **Vercel Cron Free tier** | Maks 2 cron jobs/hari. Saat ini pakai 1. |
| **Supabase Free tier pause** | Threshold 7 hari. Schedule 5x/minggu memberi buffer ~4,5 hari. |
| **Project yang sudah paused** | Keep-alive **tidak bisa** meng-unpause otomatis — harus manual via dashboard dulu. |
| **Internal cron Supabase (pg_cron)** | Tidak dipakai karena tidak efektif: jika project sudah paused, cron di dalam project juga ikut berhenti. Keep-alive **harus** berasal dari luar. |

---

## 9. Ringkasan Perubahan

| File | Aksi | Tujuan |
|------|------|--------|
| `app/api/keepalive/route.ts` | **Buat baru** | Endpoint ping ringan. |
| `vercel.json` | **Buat baru** | Konfigurasi Vercel Cron weekday 00:00 UTC. |
| `docs/keep-alive.md` | **Buat baru** | Dokumentasi ini. |
