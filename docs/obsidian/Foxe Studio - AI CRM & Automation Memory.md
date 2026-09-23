---
title: Foxe Studio — AI CRM & Automation Memory
tags: [foxe-studio, crm, system-architecture, memory, vercel, gemini-ai]
aliases: [Foxe AI CRM Memory, Foxe Studio System Context, Foxe Automation Memory]
created: 2026-09-23
updated: 2026-09-23
---

# Foxe Studio — AI CRM & Automation System Memory

Status: #active #foxe-studio #crm #ai-engine #cloud-serverless
Tanggal Terakhir Diperbarui: 23 September 2026
Tautan Live Dashboard: [Foxe Studio Platform Live](https://foxe-studio-id.vercel.app)
Tautan Live Keuangan: [Foxe Studio Keuangan Live](https://whynunuu.github.io/FoxeStudio/) *(PIN: 202688)*
Terkait: [[Foxe Studio - Parser Specs & Data Pipeline]], [[Foxe Studio - WhatsApp Webhook & Shift System]], [[Foxe Studio - Vision AI Receipt OCR]], [[Foxe Studio - Google Drive Monthly Sheet Sync]], [[Foxe Studio - KPI & Conversion System]], [[Foxe Studio - Arsitektur Keuangan & Log Sistem]], [[Workflow Foxe Studio]]

---

## 1. Ringkasan Eksekutif & Filosofi Sistem

Sistem **Foxe Studio AI CRM & Automation** adalah platform manajemen studio foto dan konversi prospek pelanggan terintegrasi yang beroperasi 24/7 di atas cloud serverless. Sistem ini menjembatani interaksi pelanggan dari WhatsApp Gateway ke dalam basis data analitis, Google Drive raw logs, dan dashboard evaluasi KPI performa Customer Service.

```mermaid
flowchart TD
    WA[WhatsApp Customer] -->|Chat / Foto Struk| Fonnte[Fonnte Gateway 6285189210021]
    Fonnte -->|Webhook POST| API[Vercel Serverless API /api/webhook/whatsapp]
    
    API --> Parse[Inbound Payload Parser]
    Parse --> Shift[Shift Engine Admin 1 / Admin 2]
    
    Parse -->|Ada Foto Struk| Vision[Gemini Multimodal Vision OCR]
    Parse -->|Teks Chat| Intent[2-Tier Lead Scoring & Intent Engine]
    
    Vision -->|Struk Sah| Conv[Konversi Status: BOOKING & Revenue Auto-Add]
    Conv --> StopFU[Matikan Antrean Follow-Up]
    
    API --> DB[(Neon PostgreSQL ap-southeast-1)]
    API --> GAS[Google Apps Script Webhook]
    GAS --> GDrive[Google Drive Folder: 1Zmnm6dxywy0xqhYsNPe-JGMmwlbjnz_w]
    GDrive --> SheetBulanan[Sheet Bulanan: Foxe_Raw_Chat_Bulan_Tahun]
    SheetBulanan --> TabHarian[Tab Harian: Tanggal Bulan]
    
    DB --> Dash[Dashboard Owner /dashboard]
    Dash --> KPI[Countable KPI Monthly CS Performance]
    Dash --> Remind[CS Action Required Reminder Box]
    Remind -->|1-Klik Balas| WAWeb[Kirim WA Human CS]
```

### Prinsip Utama Sistem (Core Tenets):
1. **Human-in-the-Loop (Mutlak):** AI bertindak sebagai analis niat pelanggan, pemeriksa struk visual, dan pembuat draf balasan super-akurat. **AI TIDAK PERNAH mengirim pesan otomatis ke customer secara mandiri tanpa peninjauan/klik kirim oleh admin manusia**. Ini melindungi reputasi brand dari halusinasi dan salah harga.
2. **Cloud Serverless 24/7 (Bebas Ketergantungan PC Lokal):** Seluruh webhook, AI pipeline, dan database berjalan mandiri di Vercel Serverless dan Neon PostgreSQL Singapore (`ap-southeast-1`). Sistem tetap berjalan realtime meskipun PC atau laptop admin mati.
3. **Dual Shift Fleksibel untuk Mahasiswa:** Mendukung pembagian jam operasional:
   - **Shift 1 (Pagi/Siang):** `09:00 - 15:00 WIB` $\rightarrow$ **Admin 1**
   - **Shift 2 (Sore/Malam):** `15:00 - 21:00 WIB` $\rightarrow$ **Admin 2**
   - Setiap draf dilengkapi tanda tangan footer hashtag resmi (`#Admin1` / `#Admin2`) serta dropdown manual override di navbar atas untuk tukar shift fleksibel.
4. **Closing Rate & Revenue Attribution:** Konversi leads dihitung secara otomatis dan *countable* saat bukti transfer terverifikasi oleh Vision AI, langsung dialokasikan ke shift CS yang bertugas untuk evaluasi bonus bulanan.

---

## 2. Inventaris URL Master & Tautan Akses

### A. Portal Web Aplikasi (Buka via Browser HP / Laptop)
| Modul | URL Langsung | Kegunaan Utama |
| :--- | :--- | :--- |
| **Pusat File Mentah (Raw Files)** | `https://foxe-studio-id.vercel.app/raw-files` | Manajemen link Google Drive foto mentah klien, antrean editor, & tombol 1-klik kirim link via WA. |
| **WhatsApp AI CRM & Leads** | `https://foxe-studio-id.vercel.app/crm` | Inbox pesan masuk, analisa suhu prospek (*HOT/WARM/COLD*), rekomendasi draf balasan CS. |
| **Dashboard Owner & KPI** | `https://foxe-studio-id.vercel.app/dashboard` | Reminder Box CS, tabel performa closing bulanan CS, grafik omzet harian & status kas. |
| **Jadwal & Order Sesi Foto** | `https://foxe-studio-id.vercel.app/orders` | Kalender reservasi foto per slot 20 menit dan status booking studio. |
| **Point of Sales (POS Kasir)** | `https://foxe-studio-id.vercel.app/pos` | Terminal kasir kas/QRIS untuk walk-in, DP, atau pelunasan di meja resepsionis. |
| **Closing Shift Kasir** | `https://foxe-studio-id.vercel.app/input` | Formulir tutup shift harian kasir & rekonsiliasi kas laci fisik vs sistem. |
| **Rekap Laporan Excel** | `https://foxe-studio-id.vercel.app/reports` | Download rekap pembukuan harian dan shift ke format spreadsheet (.xlsx / .csv). |

### B. Endpoint API & Integrasi Eksternal
| Endpoint | Method | Fungsi & Payload |
| :--- | :---: | :--- |
| `/api/webhook/whatsapp` | `POST` | Menerima payload dari Fonnte / WAHA gateway 24/7. |
| `/api/admin-shift` | `GET / POST` | Mengambil status shift aktif WIB atau override manual shift CS. |
| `/api/reports/stats` | `GET` | Agregasi KPI kasir studio, reminder box, dan countable KPI Admin 1 vs Admin 2. |
| `/api/crm/raw?format=csv` | `GET` | Export cepat seluruh data leads CRM ke file CSV siap olah di Excel. |
| `/api/raw-files/jobs` | `GET / POST` | Sinkronisasi data job antrean foto mentah dan Google Drive URL. |

---

## 3. Komponen Arsitektur & Teknologi

1. **Frontend & Backend Framework:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS, Lucide Icons.
2. **Database Engine:** Neon PostgreSQL Serverless (Region Singapore `ap-southeast-1`), ORM: Prisma Client.
3. **AI Vision & NLP Engine:** Google Gemini SDK (`@google/genai`):
   - Tier 1: `gemini-3.5-flash-lite` (Analisis pesan teks, klasifikasi intent, ekstraksi entitas).
   - Multimodal Vision: Gemini Vision OCR untuk membaca bukti transfer bank / QRIS.
4. **WhatsApp Gateway:** Fonnte WhatsApp API Gateway terhubung ke nomor bisnis resmi `6285189210021`.
5. **Spreadsheet Auto-Backup:** Google Apps Script Webhook menyinkronkan data chat dan konversi ke Google Drive Folder ID `1Zmnm6dxywy0xqhYsNPe-JGMmwlbjnz_w`.

---

## 4. Konfigurasi Lingkungan (Environment Variables)

Diatur pada dashboard Vercel (`Project Settings -> Environment Variables`):

```bash
DATABASE_URL="postgresql://neondb_owner:***@ep-curly-art-b3ltno6q-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
GEMINI_API_KEY="[Lihat di Vercel Dashboard / AI Studio]"
FONNTE_TOKEN="[Lihat di Dashboard Fonnte Device]"
GOOGLE_SHEETS_WEBHOOK_URL="https://script.google.com/macros/s/AKfycbzholPN4efU3CWU1qmSwTA0S6T1Ld_fERyBGpYj3Yqmc4n8M16VaEKjBSGDkXAA7tCsyw/exec"
ADMIN_PHONE_NUMBER="6285189210021"
```

---

## 5. Hubungan Antar Dokumen Obsidian

- [[Foxe Studio - Parser Specs & Data Pipeline]] $\rightarrow$ Spesifikasi teknis 4 parser data.
- [[Foxe Studio - WhatsApp Webhook & Shift System]] $\rightarrow$ Mekanisme rotasi shift mahasiswa & tanda tangan hashtag.
- [[Foxe Studio - Vision AI Receipt OCR]] $\rightarrow$ Ekstraksi OCR foto bukti transfer & auto-konversi status leads.
- [[Foxe Studio - Google Drive Monthly Sheet Sync]] $\rightarrow$ Pembuatan file bulanan dan tab harian otomatis di Google Drive.
- [[Foxe Studio - KPI & Conversion System]] $\rightarrow$ Perhitungan metrik closing rate & performa bulanan CS.
- [[Foxe Studio - Arsitektur Keuangan & Log Sistem]] $\rightarrow$ Alur pembukuan kasir, COGS, dan OPEX di neraca Foxe Studio.
