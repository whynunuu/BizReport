# 📖 Panduan Lengkap Pengaturan Sistem & Daftar URL Foxe Studio

Dokumen ini berisi seluruh konfigurasi penting, link akses langsung, token integrasi, dan cara pemeliharaan sistem automasi **Foxe Studio (WhatsApp AI CRM & Studio Management)**. Simpan file ini sebagai referensi utama Anda.

---

## 🌐 1. Daftar URL Lengkap Sistem (Direct Links)

Semua halaman berikut dapat diakses langsung dari browser (HP, Tablet, maupun Laptop):

### A. Halaman Operasional & Dashboard
| Nama Fitur / Halaman | URL Akses Langsung | Keterangan Penggunaan |
| :--- | :--- | :--- |
| **Pusat File Mentah & Prioritas (Raw Files Hub)** | `https://foxe-studio-id.vercel.app/raw-files` | Antrean link Google Drive foto mentah, status edit, prioritas kilat, & kirim WA ke klien. |
| **WhatsApp AI CRM & Leads Triage** | `https://foxe-studio-id.vercel.app/crm` | Pantau pesan masuk WA, skor suhu leads (`HOT/WARM/COLD`), draf balasan CS. |
| **Dashboard Utama Owner** | `https://foxe-studio-id.vercel.app/dashboard` | Pantau grafik omzet, performa paket foto terlaris, dan analitik bisnis. |
| **Jadwal & Sesi Foto Studio** | `https://foxe-studio-id.vercel.app/orders` | Antrean kalender sesi foto studio, slot jam 20 menit, dan status booking. |
| **Terminal Kasir / Booking POS** | `https://foxe-studio-id.vercel.app/pos` | Kasir kasir studio untuk input order walk-in / DP / lunas dengan QRIS/Cash. |
| **Closing Shift Studio** | `https://foxe-studio-id.vercel.app/input` | Formulir closing kasir akhir shift, hitung uang fisik laci vs sistem. |
| **Rekap Laporan & Excel** | `https://foxe-studio-id.vercel.app/reports` | Unduh rekap pembukuan harian/bulanan ke format spreadsheet. |

### B. Endpoint API & Data Mentah (Backend Cloud)
| Nama Endpoint | URL Akses Langsung | Fungsi |
| :--- | :--- | :--- |
| **Inbound WhatsApp Webhook** | `https://foxe-studio-id.vercel.app/api/webhook/whatsapp` | **Wajib diisi di Fonnte**. Menerima pesan masuk WhatsApp 24/7. |
| **Download Data Mentah CSV (Excel)** | `https://foxe-studio-id.vercel.app/api/crm/raw?format=csv` | Unduh rekaman seluruh lead terprioritas ke file `.csv` untuk Excel. |
| **Download Data Mentah JSON** | `https://foxe-studio-id.vercel.app/api/crm/raw` | Raw data terstruktur JSON seluruh riwayat interaksi AI. |
| **API Antrean Foto Studio** | `https://foxe-studio-id.vercel.app/api/raw-files/jobs` | Backend CRUD antrean file mentah sesi foto. |

---

## 📱 2. Pengaturan Fonnte WhatsApp Gateway

Fonnte bertindak sebagai jembatan pengirim dan penerima pesan WhatsApp antara pelanggan dengan AI engine di Vercel.

* **URL Dashboard Fonnte:** [https://md.fonnte.com/](https://md.fonnte.com/)
* **Nomor HP Terhubung:** `6285189210021` (*"HP Admin Foxe"*)
* **Device Token Fonnte:** `PDJCeNj6vDmKjSy9ZfvU`

### Langkah Pengaturan Webhook Fonnte (Agar Pesan Masuk Diproses AI):
1. Buka dashboard Fonnte di [md.fonnte.com](https://md.fonnte.com/).
2. Masuk ke menu **Device** -> klik tombol **Edit / Icon Pensil** pada device Foxe Studio.
3. Temukan kolom input bertuliskan **`Webhook ?`** (kolom paling atas).
4. Masukkan URL berikut:
   ```text
   https://foxe-studio-id.vercel.app/api/webhook/whatsapp
   ```
5. Simpan pengaturan (**Save**).
6. **Cara Uji Coba:** Kirim pesan chat dari nomor WA pribadi Anda ke nomor HP Admin `6285189210021`. Dalam 1-2 detik pesan akan dianalisis Gemini AI dan otomatis muncul di [foxe-studio-id.vercel.app/crm](https://foxe-studio-id.vercel.app/crm).

---

## ☁️ 3. Pengaturan Vercel Cloud Deployment

Vercel adalah server cloud tanpa biaya bulanan (Serverless) tempat website dan AI engine berjalan 24 jam nonstop tanpa perlu PC rumah Anda menyala.

* **URL Dashboard Vercel:** [https://vercel.com/dashboard](https://vercel.com/dashboard)
* **Nama Project di Vercel:** `foxe-studio`
* **Domain Live:** `https://foxe-studio-id.vercel.app`
* **Koneksi Git:** Terhubung langsung ke branch `main` repositori GitHub `whynunuu/BizReport`.

### Environment Variables (Variabel Lingkungan di Vercel):
Pastikan di menu **Settings -> Environment Variables** pada Vercel sudah terisi 3 variabel ini (nilai lengkap tersimpan aman di file `.env` lokal Anda):

| Nama Variabel (Key) | Panduan Pengisian Nilai (Value) | Keterangan |
| :--- | :--- | :--- |
| `DATABASE_URL` | Sambungkan dengan connection string Neon DB (`postgresql://...`) | Database Neon PostgreSQL |
| `GEMINI_API_KEY` | Ambil API key dari Google AI Studio (`AQ.Ab8...`) | Google Gemini AI Engine |
| `FONNTE_TOKEN` | Masukkan Device Token dari Fonnte (`PDJCe...`) | Token Gateway WhatsApp |
| `GOOGLE_SHEETS_WEBHOOK_URL` | URL Apps Script Webhook Folder Drive Foxe (`https://script.google.com/macros/s/.../exec`) | Sinkronisasi Otomatis Google Drive Bulanan & Harian |

> **Catatan:** Setiap kali ada pembaruan kode yang di-push ke GitHub, Vercel akan otomatis melakukan build dan deploy dalam waktu ±1 menit tanpa downtime.

---

## 🗄️ 4. Pengaturan Database (Neon PostgreSQL)

Neon adalah database PostgreSQL berbasis cloud di region Singapura (sangat cepat untuk diakses dari Indonesia).

* **URL Console Neon:** [https://console.neon.tech/](https://console.neon.tech/)
* **Region:** `ap-southeast-1` (Singapore)
* **ORM:** Prisma ORM

### Perintah Berguna Terkait Database (Jalankan di Terminal Proyek):
* **Memperbarui Struktur Database:**
  ```powershell
  npx prisma db push
  ```
* **Membuka Tampilan Visual Tabel Database di Browser (Prisma Studio):**
  ```powershell
  npx prisma studio
  ```
  *(Akan membuka tampilan tabel seperti spreadsheet di browser pada `http://localhost:5555`)*.

---

## 🧠 5. Pengaturan Google Gemini AI Engine

Sistem menggunakan arsitektur **2-Tier AI Engine**:
1. **Tier 1 (Routine LLM):** Menggunakan model `gemini-3.5-flash-lite`. Respon instan (~1-2 detik), stabil, dan sangat hemat biaya.
2. **Tier 2 (Strong LLM):** Eskalasi mendalam jika pesan berisi komplain serius, permintaan paket bernilai besar, atau situasi beresiko tinggi.

* **URL Console AI Studio:** [https://aistudio.google.com/](https://aistudio.google.com/)
* **API Key:** *(Tersimpan aman di file `.env` lokal dan Settings Vercel Environment Variables)*
* **Prinsip Human-In-The-Loop:** AI bertugas sebagai analis dan asisten penyusun draf balasan. AI **tidak diizinkan mengirim pesan otomatis langsung ke pelanggan** tanpa persetujuan / review admin CS.

---

## 🐙 6. Pengaturan Git & GitHub Repository

Semua kode sumber aplikasi tersimpan dengan aman di GitHub.

* **URL Repositori GitHub:** [https://github.com/whynunuu/BizReport](https://github.com/whynunuu/BizReport)
* **Branch Utama:** `main`
* **Remote Name:** `origin`

### Perintah Standar Git untuk Update Proyek:
Jika ada perubahan di masa mendatang:
```powershell
git add -A
git commit -m "Deskripsi perubahan"
git push origin main
```
*(Setelah push, website Vercel akan otomatis terupdate)*.

---

## 🎯 7. Alur Kerja Harian Admin & Studio Crew

```
[ Pelanggan Chat WA ]
         │
         ▼
[ Fonnte Gateway ] ─── kirim webhook ───▶ [ Vercel Serverless ]
                                                    │
                                                    ▼
                                          [ Gemini AI Analysis ]
                                         (Skor 0-100 & Suhu Prospek)
                                                    │
                   ┌────────────────────────────────┴────────────────────────────────┐
                   ▼                                                                 ▼
      [ Jika Suhu HOT / Urgent ]                                        [ Simpan ke Neon DB & CRM ]
                   │                                                                 │
                   ▼                                                                 ▼
   [ Alert WA ke HP Admin Shift ]                                     [ Tampil di Dashboard /crm ]
                                                                      • Draf balasan CS siap pakai
                                                                      • Admin klik "Buka Chat WA"
                                                                      • Kirim manual (Human-in-the-loop)
```

1. **Pagi (09:00) - Buka Shift:**
   - Admin membuka `/crm` untuk mengecek pesan pending dan follow-up hari ini (H+1 untuk leads *HOT*).
2. **Sepanjang Hari - Sesi Foto:**
   - Kasir menggunakan `/pos` untuk mencatat order atau pelunasan.
   - Fotografer/Admin membuka `/raw-files` untuk memasukkan link Google Drive folder foto mentah pelanggan.
   - Jika edit selesai atau raw sudah terupload, admin klik tombol **"Kirim via WA"** di halaman `/raw-files` untuk mengirim link Drive langsung ke chat pelanggan.
3. **Malam (21:00) - Closing Shift:**
   - Kasir membuka `/input` untuk closing kasir dan rekonsiliasi kas laci.
   - Owner dapat memantau rekapan di `/dashboard` dan `/reports`.

---

## 🔍 8. Hasil Screening Audit & Status Sistem (Terverifikasi 100% PASS)

Hasil pengujian otomatis dan pengecekan kesehatan menyeluruh (*End-to-End Troubleshooter*):

| Komponen Sistem | Status Pengujian | Rincian Hasil Screening |
| :--- | :---: | :--- |
| **Koneksi Database Neon PostgreSQL** | **PASS ✅** | Koneksi pooler stabil (`ap-southeast-1`). 8 model Prisma aktif. |
| **Deteksi Sinyal Rule-Based (06_LEAD_SCORING)** | **PASS ✅** | Berhasil mendeteksi 7 sinyal (`ASK_PRICE`, `ASK_PACKAGE`, `ASK_DATE`, `ASK_AVAILABILITY`, `MENTION_GROUP_SIZE`, `ASK_DP`, `ASK_BANK_ACCOUNT`). Klasifikasi suhu: `HOT 🔥` (66-100), `WARM 🟡` (31-65), `COLD ❄️` (0-30). |
| **Google Gemini AI 2-Tier Engine** | **PASS ✅** | Model Tier 1 (`gemini-3.5-flash-lite`) menghasilkan JSON terstruktur valid. Eskalasi otomatis ke Tier 2 Deep Reasoning berjalan normal. |
| **Vision AI OCR Bukti Transfer** | **PASS ✅** | Otomatis membaca struk transfer bank/QRIS dari WhatsApp, mencatat nominal ke revenue, mengubah status leads jadi `BOOKING` (Konversi), dan mematikan follow-up. |
| **Google Drive & Sheets Auto-Sync** | **PASS ✅** | Webhook Google Apps Script merespon `200 OK`. Otomatis membuat file bulanan `Foxe_Raw_Chat_[Bulan]_[Tahun]` dan tab harian `[Tanggal] [Bulan]` di folder `1Zmnm6dxywy0xqhYsNPe-JGMmwlbjnz_w`. |
| **Next.js Production Build & Routes** | **PASS ✅** | Berhasil dikompilasi dengan **0 error** pada seluruh 19 route statis dan dinamis. |
| **Git & GitHub Remote** | **PASS ✅** | Branch `main` sinkron dengan remote `origin/main` di `whynunuu/BizReport`. |

