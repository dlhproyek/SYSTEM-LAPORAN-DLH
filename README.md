# Sistem Laporan Cloud DLH

Aplikasi manajemen laporan kegiatan harian Dinas Lingkungan Hidup.

## Konfigurasi Repositori (GitHub)

Repositori resmi: `https://github.com/dlhproyek/SYSTEM-LAPORAN-DLH.git`

Jika Anda sudah memiliki salinan kode di lokal dan ingin mengarahkan ke repositori baru ini, jalankan perintah berikut di terminal:

```bash
git remote set-url origin https://github.com/dlhproyek/SYSTEM-LAPORAN-DLH.git
```

## Cara Update ke Repositori (Git)

Jalankan perintah ini secara berurutan di terminal Anda:

1. `git add .`
2. `git commit -m "Pesan perubahan Anda"`
3. `git push origin main`

## Konfigurasi Deployment (Vercel)

Pastikan Environment Variables berikut sudah terpasang di Dashboard Vercel:

- **VITE_SUPABASE_URL**: `https://ffgksqjznamthsdbkstu.supabase.co`
- **VITE_SUPABASE_ANON_KEY**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZ2tzcWp6bmFtdGhzZGJrc3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxOTc0NjEsImV4cCI6MjA5MTc3MzQ2MX0.4Go520hgy0N_GB9pppoGloj6JQtOpTtdjxfLqiLIFpg`

---
*Dibuat dengan Dyad*