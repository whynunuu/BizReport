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
  - Data saat ini masih bersifat master/general (mencakup seluruh ekosistem K-12).
  - User meminta untuk menyimpan memori bahwa peruntukan bisnis spesifiknya belum ditentukan saat ini.
  - Ketika user sudah menentukan sektor bisnisnya (misal: F&B katering/kafe, Bimbel/EdTech, Fashion/Seragam, Percetakan/Stationery, dll), agen akan langsung mengadaptasi pipeline operasional (fase persiapan stok, pembukaan PO, masa tayang iklan) dan copywriting hook agar 100% tepat sasaran untuk bisnis tersebut.

