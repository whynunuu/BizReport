<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## User Preferences & Infrastructure Plan (Memory)
- **Workflow:** Hybrid development with seamless device switching (Home PC, mobile laptop, tablet) without re-configuring environments or losing work sessions.
- **VPS Central Hub:** Planning to use a central VPS (recommended: DigitalOcean Ubuntu Droplet in Singapore, or Hostinger KVM) as the single source of truth for repository, Docker, background services, and databases.
- **Multi-Agent Collaboration:** The VPS environment will be shared by **Antigravity**, **Claude (Claude Code CLI)**, and **Hermes**.
- **Remote Access & Version Control:** Connected via SSH, VS Code Remote - SSH, and Git.
- **OS & Guidance:** User is currently familiar with Windows and new to Linux/Ubuntu. Antigravity/Claude will guide and run terminal commands directly so the user doesn't have to memorize Linux commands.
- **Current Status:** In consideration / planning phase before provisioning.

## EduMark (Kalender Marketing Sekolah) - Project Memory & Context
- **Repositori & Live URL:**
  - GitHub Repo: `https://github.com/whynunuu/EduMark` (branch `main`)
  - Live Website: `https://whynunuu.github.io/EduMark/`
  - Akses Lokal: File `Buka_Kalender.bat` / `index.html` (langsung klik ganda tanpa terminal).
- **Arsitektur & Fitur Aktif:**
  - Dual-View interaktif: Kalender Bulanan (Grid) & Kartu Inspirasi (Bento Cards).
  - Multi-Filter: Jenjang (SD, SMP, SMA, Kampus), Persona (Orang Tua / Payer, Siswa / Consumer, Guru), dan Industri Produk.
  - Interactive Detail Drawer: Countdown & Lead-Time alert, analisis Payer vs Consumer, ide kampanye, copywriting hook siap pakai, dan integrasi Google Calendar.
- **Status Diskusi & Rencana Selanjutnya:**
  - Telah diimplementasikan **Dual-Mode System**: Mode General (K-12 EduMark) dan Mode Foto Studio (Foxe Studio Pipeline).
  - Mode Foto Studio menerapkan aturan operasional:
    - **Pricelist Resmi Foxe:** Photofox (Self Photo Box) Rp 200rb, Graduation Rp 350rb, Graduation Premium Rp 500rb, Large Group Rp 25rb/pax, Family A/B, Couple A/B/C, Pas Foto Rp 50rb, Single Rp 100rb.
    - **Timeline Rules:** Jendela produksi konten H-14 s.d H-10 (sebelum upload), jendela upload kampanye/iklan H-7 s.d H-5 sebelum peak event.
    - **Weekly Hard-Selling Packages:** Tiap minggu memiliki urutan ranking paket hard-selling sesuai seasonality (Oktober, November, Desember 2026).
    - **Checklist & Status Tracker:** 5 tugas per kampanye dengan status *Sudah Tergarap* vs *Belum Tergarap*, progress bar persentase, dan persistensi `localStorage`.

## Foxe Studio AI CRM & Automation - Project Memory & Obsidian Vault
- **Repositori & Live URL:**
  - GitHub Repo: `https://github.com/whynunuu/BizReport` (branch `main`)
  - Live Website: `https://foxe-studio-id.vercel.app`
  - Neon DB Console: `https://console.neon.tech/` (Region `ap-southeast-1`)
  - WhatsApp Gateway: Fonnte (`6285159210021`)
  - Google Drive Folder ID: `1Zmnm6dxywy0xqhYsNPe-JGMmwlbjnz_w`
  - Google Apps Script Webhook: `https://script.google.com/macros/s/AKfycbzholPN4efU3CWU1qmSwTA0S6T1Ld_fERyBGpYj3Yqmc4n8M16VaEKjBSGDkXAA7tCsyw/exec`
- **Obsidian Vault Integration:**
  - Vault Path: `C:\Users\ASUS\OneDrive\Documents\Obsidian Vault\04 Projects`
  - Repo Backup: `docs/obsidian/`
  - Homepage Reference: `Halaman Utama Vault.md`
  - Notes:
    - `[[Foxe Studio - AI CRM & Automation Memory]]`: Master memory, tech stack, cloud serverless & principles.
    - `[[Foxe Studio - Parser Specs & Data Pipeline]]`: 4 parsers (Webhook Adapter, Vision OCR, Rule Scoring & Intent, Google Drive Sheet Partitioning).
    - `[[Foxe Studio - Vision AI Receipt OCR]]`: Multimodal Gemini Vision OCR untuk verifikasi struk transfer, auto-konversi status `BOOKING`, omzet revenue, dan mematikan follow up.
    - `[[Foxe Studio - WhatsApp Webhook & Shift System]]`: Shift 1 (09:00 - 15:00, Admin 1), Shift 2 (15:00 - 21:00, Admin 2), switch mode fleksibel via dropdown navbar & hashtag footer `#Admin1`/`#Admin2`.
    - `[[Foxe Studio - Google Drive Monthly Sheet Sync]]`: Auto create file bulanan `Foxe_Raw_Chat_[Bulan]_[Tahun]` & tab harian `[Tanggal] [Bulan]` dengan 12 kolom header.
    - `[[Foxe Studio - KPI & Conversion System]]`: Countable monthly KPI closing rate, omzet per CS, dan Action Required CS Reminder Box di `/dashboard`.
    - `[[Antigravity - Installed Skills & Tools Memory]]`: Master active global skills (free-public-apis, git-automation, shadcn-daisy-ui, web-seo-auditor).
- **Operating Rules:**
  - **Human-in-the-Loop:** AI bertindak sebagai analis & pembuat draf; balasan ke customer tetap dikirim manual oleh staf CS (1-klik tombol WA).
  - **Admin Prototype Naming:** Menggunakan `Admin 1` dan `Admin 2` (bukan nama pribadi).
  - **Telegram Night Cron:** Otomatis mengirim laporan AI CRM & Leads terpisah setiap malam (21:05 WIB) via `@NunuFxBot` (Chat ID `1608969830`) melalui task Windows `FoxeStudioCRMNightReport` dan hook di `Sinkron_Laporan.bat`.

