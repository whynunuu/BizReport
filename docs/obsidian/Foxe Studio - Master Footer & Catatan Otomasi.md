---
title: Foxe Studio — Master Footer & Catatan Penting Otomasi
tags: [foxe-studio, footer-template, master-notes, automation, crm, quick-reference]
aliases: [Foxe Master Footer, Catatan Penting Website Foxe]
created: 2026-09-23
updated: 2026-09-23
---

# 📌 Foxe Studio — Master Footer & Catatan Penting Otomasi

> Dokumen ini adalah **Template Footer Resmi** yang dirancang khusus untuk di-copy-paste di bagian bawah (*footer*) setiap dokumen proyek, catatan Obsidian, laporan mingguan, maupun dokumentasi teknis yang berhubungan dengan sistem otomasi Foxe Studio.

---

## 📋 FORMAT FOOTER MARKDOWN (SIAP COPY-PASTE KE SETIAP PROYEK)

Salin blok di bawah ini dan tempelkan di bagian paling bawah catatan proyek Anda:

```markdown
---

### 🌐 Foxe Studio Automation & Web Ecosystem — Quick Reference Footer
> **Sistem:** Cloud Serverless 24/7 (Next.js 15 + Neon PostgreSQL `ap-southeast-1` + Vercel)  
> **Prinsip:** *Human-in-the-Loop* (AI menganalisis & membuat draf; pengiriman pesan wajib 1-klik oleh CS manusia).

| Modul Operasional | URL Akses Langsung | Deskripsi Singkat |
| :--- | :--- | :--- |
| **Pusat File Mentah** | [`/raw-files`](https://foxe-studio-id.vercel.app/raw-files) | Manajemen Google Drive foto mentah, status edit, & tombol 1-klik kirim WA ke klien. |
| **WhatsApp AI CRM** | [`/crm`](https://foxe-studio-id.vercel.app/crm) | Inbox chat, klasifikasi suhu leads (*HOT/WARM/COLD*), & rekomendasi draf balasan CS. |
| **Dashboard & KPI** | [`/dashboard`](https://foxe-studio-id.vercel.app/dashboard) | *Action Required Reminder Box*, tabel closing rate CS bulanan, & metrik omzet. |
| **Jadwal Booking** | [`/orders`](https://foxe-studio-id.vercel.app/orders) | Kalender sesi pemotretan per slot 20 menit & ketersediaan studio. |
| **Kasir Studio (POS)** | [`/pos`](https://foxe-studio-id.vercel.app/pos) | Kasir transaksi langsung, QRIS, debit, tunai meja resepsionis. |
| **Closing Kasir** | [`/input`](https://foxe-studio-id.vercel.app/input) | Form tutup kasir pergantian shift & rekonsiliasi kas laci fisik. |
| **Laporan Keuangan** | [Foxe Keuangan Live](https://whynunuu.github.io/FoxeStudio/) *(PIN: 202688)* | Buku kas, neraca laba rugi, COGS & OPEX studio. |

#### ⚙️ Integrasi Otomasi & Cloud Service:
* **WhatsApp Gateway:** Fonnte (`https://md.fonnte.com/`) | **Nomor WA:** `6285189210021` | **Token:** `PDJCeNj6vDmKjSy9ZfvU`
* **Inbound Webhook API:** `https://foxe-studio-id.vercel.app/api/webhook/whatsapp`
* **Google Drive Raw Logs:** Folder ID [`1Zmnm6dxywy0xqhYsNPe-JGMmwlbjnz_w`](https://drive.google.com/drive/folders/1Zmnm6dxywy0xqhYsNPe-JGMmwlbjnz_w)
* **Google Apps Script Webhook:** `https://script.google.com/macros/s/AKfycbzholPN4efU3CWU1qmSwTA0S6T1Ld_fERyBGpYj3Yqmc4n8M16VaEKjBSGDkXAA7tCsyw/exec`
* **AI Vision OCR & NLP:** Google Gemini Tier 1 (`gemini-3.5-flash-lite`) + Vision AI Struk Bukti Transfer (Auto `BOOKING`).

#### 🕒 Jadwal Shift CS Mahasiswa & Hashtag Signature:
* ☀️ **Shift 1 (Pagi/Siang):** `09:00 - 15:00 WIB` $\rightarrow$ **Admin 1** (Tanda tangan: `#Admin1`)
* 🌙 **Shift 2 (Sore/Malam):** `15:00 - 21:00 WIB` $\rightarrow$ **Admin 2** (Tanda tangan: `#Admin2`)
* 🔄 **Tukar Shift:** Ubah via dropdown pojok kanan atas website, atau bubuhkan `#Admin1` / `#Admin2` di akhir chat WA.
```

---

## 🎯 Kegunaan Catatan Ini
1. **Navigasi Cepat Tim:** Semua staf dan owner cukup melihat bagian bawah dokumen untuk langsung klik link portal yang dibutuhkan tanpa mencari-cari URL.
2. **Konteks Konsisten AI:** Memberikan panduan cepat bagi agen AI (Antigravity, Hermes, Claude) saat membaca dokumen proyek apapun di workspace ini.
