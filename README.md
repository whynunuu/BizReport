# BizReport - Sistem Laporan Harian Bisnis, POS Terminal & Rekonsiliasi Kasir

Platform sistem pelaporan operasional bisnis harian (FnB / Kafe / Retail Sales) yang fleksibel untuk **Laptop/PC** dan **HP Smartphone (PWA)**, dilengkapi Terminal Kasir POS, Paket Penjualan Bundling, Pengaturan Jam Interval 20 Menit, serta Rekonsiliasi Kas Laci (*Cash Drawer Balancing*).

---

## Fitur Utama

1. **Terminal Kasir POS (`/pos`)**:
   - Katalog menu visual dengan tab khusus **🎁 Paket Bundling** (Paket Sarapan, Paket Nongkrong Ber-4, dsb).
   - Panel struk pesanan (*Live Cart*) dengan kuantitas (+/-), catatan menu (less sugar, oatmilk, dll), dan nama pelanggan/meja.
   - Pilihan jam pemesanan dengan **Interval 20 Menit** (misal: `07:00 - 07:20`, `07:20 - 07:40`).
   - Modal pembayaran kasir cepat: Tunai (tombol pecahan pas/50k/100k & hitung kembalian otomatis), QRIS, Debit EDC, dan Online Food.
   - Cetak struk digital (*Printable Receipt*).
   - Tombol **"+ Tambah Menu / Paket Baru"** langsung dari tampilan kasir.

2. **Daftar Order / Bill Hari Ini (`/orders`)**:
   - Monitoring riwayat transaksi per bill jam demi jam.
   - Filter transaksi per metode bayar dan per slot waktu interval 20 menit.
   - Rincian lengkap item menu di tiap bill pelanggan.

3. **Form Closing Shift Kasir (`/input`)**:
   - Desain terpandu 4-langkah yang ramah jempol tangan di smartphone.
   - Jam buka dan tutup shift dengan interval 20 menit.
   - **Kalkulator Kas Real-Time**:
     $$\text{Target Kas Laci} = \text{Modal Awal} + \text{Penjualan Tunai} - \text{Total Pengeluaran Kas}$$
   - Deteksi selisih otomatis: Hijau (Cocok), Kuning (Over), Merah (Short / Kurang dengan kewajiban menuliskan alasan).
   - Rincian belanja pengeluaran kas kecil (*Petty Cash*: es batu, gas LPG, galon, dll).

4. **Navigasi Multi-Device Responsif**:
   - **Laptop/PC**: Sidebar menu lengkap dan layout layar lebar.
   - **HP Smartphone**: Bottom Navigation Bar melayang di bawah layar yang nyaman dioperasikan satu tangan.

---

## Tech Stack
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS + Lucide Icons
- **Database**: Prisma ORM + SQLite (Lokal) / PostgreSQL (Supabase/Neon untuk Cloud)

---

## Cara Menjalankan di Lokal

1. **Install dependensi**:
   ```bash
   npm install
   ```

2. **Setup database & seed data**:
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

3. **Jalankan development server**:
   ```bash
   npm run dev
   ```
   Buka browser di [http://localhost:3000](http://localhost:3000).

---

## Deployment ke Vercel

1. Buka dashboard [vercel.com](https://vercel.com) dengan akun GitHub Anda.
2. Klik **"Add New..."** > **"Project"**.
3. Pilih repositori **`whynunuu/BizReport`**.
4. Di bagian **Environment Variables**, tambahkan:
   - `DATABASE_URL` = `file:./dev.db` (atau URL PostgreSQL dari Supabase).
5. Klik **Deploy**!
