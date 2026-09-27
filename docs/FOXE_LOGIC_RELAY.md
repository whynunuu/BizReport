# WhatsApp CRM → Foxe Logic

Status aktivasi 27 September 2026: integrasi produksi aktif pada project Vercel existing `foxe-studio`. Tabel antrean dan dua indeks diterapkan melalui transaksi dengan pemeriksaan schema sebelum/sesudah, tiga secret Production terpasang, dan cron Worker lima menit diaktifkan setelah persetujuan pemilik. URL Fonnte tetap `https://foxe-studio-id.vercel.app/api/webhook/whatsapp`; Autoread/Silent Read existing tidak perlu diubah.

## Hasil aktivasi

Deployment CRM aktif: `dpl_4LWUSfQS3GEsh7wxD4em5wo2VKfm` (`foxe-studio-600x0ct7l-whynu.vercel.app`). Deployment rollback sebelumnya: `dpl_51SFSAvYtTsyQcDD6RY7VeE5yswn`. Worker aktif: versi `20f80d9e-0381-4d46-b1af-54e2bec15de1`. Konfigurasi override migrasi hanya dipakai pada deployment aktivasi; pengaturan build project dan npm build tetap normal.

GET webhook 200 active, GET relay tanpa secret 401, GET berautentikasi 200 enabled, POST antrean kosong 200. Batas fungsi webhook tetap 300 detik; retry 60 detik. Satu pesan nyata yang dikirim pemilik dari nomor lain diterima pada 27 September, 23:20 WIB: relay delivered 1/pending 0/review 0, Worker received 1, kalender WIB events 1/kontak first-seen 1, identity review 0. Hari pemasangan berlabel sebagian hari; tidak ada histori yang diimpor. Booking/DP tetap 0 karena belum dikonfirmasi. Ini memverifikasi alur penerimaan/penyimpanan satu pesan, bukan kelengkapan seluruh delivery provider atau laporan konversi bisnis.

40 tes relay terisolasi, pemeriksaan TypeScript dan build lokal/produksi berhasil. Source integrasi ada di [PR #1](https://github.com/whynunuu/BizReport/pull/1). Sebelum auto-deployment main berikutnya, gabungkan PR yang sudah direview agar source produksi tetap memuat relay.

## Alur

Fonnte → webhook CRM → antrean metadata Neon → Worker Foxe Logic → D1 → dashboard private Foxe Logic.

Antrean dibuat sebelum proses AI/OCR/Sheets/alert CRM. Sesudah respons, `after()` mencoba satu pengiriman. Retry independen memakai POST berautentikasi `/api/integrations/foxe/relay`, maksimal lima item per pemicu. Cloudflare Worker Foxe disiapkan memicu retry setiap lima menit setelah konfigurasi cron diaktifkan. Database exception saat enqueue menghasilkan 503 **sebelum** proses CRM berjalan. Kegagalan transport setelah enqueue tidak mengubah respons CRM dan tidak menjalankan ulang proses CRM. Retry/dedup CRM existing sendiri berada di luar perubahan ini.

Hanya payload Fonnte dengan device allowlist, inboxid dan timestamp asli diteruskan; tidak ada metadata buatan untuk simulator/WAHA. Antrean mempertahankan device/sender/inboxid/timestamp/member, tanpa isi chat, nama, URL media, base64, kesimpulan OCR atau nominal pembayaran. Isi chat hanya masuk digest sementara untuk mendeteksi konflik ID. Payload dihapus setelah ACK berhasil; ID/digest/status tetap tersedia. Nomor pengirim diperlukan pada antrean pending untuk pemetaan identitas Worker.

Webhook CRM existing tidak memiliki autentikasi provider. Device allowlist adalah validasi, bukan signature Fonnte. Integrasi ini mempertahankan batas kepercayaan tersebut; jangan menyebut request sebagai provider-authenticated. Hasil OCR booking/revenue tidak dikirim sebagai milestone Foxe: konfirmasi booking/DP Foxe tetap terpisah.

## Aktivasi produksi

1. Pastikan checkout ini memang project Vercel yang melayani domain di atas. Gunakan project existing, bukan project baru atau temporary deployment. Catat deployment sebelumnya untuk rollback.
2. Terapkan hanya SQL additive `prisma/foxe-relay.sql` pada DATABASE_URL Production project tersebut. Secret Vercel bertipe sensitive tidak dapat ditarik oleh `env run`; gunakan satu build Production bertahap (`--prod --skip-domain`) pada project existing, dengan override build sekali: `node scripts/foxe-relay-schema.mjs --apply --project-id prj_1qjlpX9kfJqidXYbhOoORJHXKoEk && npm run build`. Script memerlukan VERCEL_ENV production, memvalidasi tabel CRM dan kompatibilitas antrean, membuat satu tabel baru dan dua indeks, lalu memvalidasi hasil dalam transaksi yang sama. Ketidakcocokan membatalkan transaksi. Build normal tidak menjalankan migrasi. Jangan memakai `prisma db push`, reset, seed, atau migrate deploy tanpa baseline pada database existing.
3. Simpan di environment Production Vercel:
   - `FOXE_LOGIC_WEBHOOK_URL`: URL Worker `https://foxe-fonnte-backend.studiofoxe.workers.dev/webhooks/fonnte/<secret-ingestion>`; nilai ini secret, jangan commit atau beri awalan NEXT_PUBLIC.
   - `FOXE_LOGIC_DEVICE_ID`: ID device terverifikasi dari Fonnte, persis.
   - `FOXE_LOGIC_RELAY_SECRET`: random minimal 32 byte untuk retry/status. Berbeda dari token Fonnte dan secret ingestion.
4. Build dan deploy source perubahan ini ke project existing. Periksa deployment bertahap sebelum `vercel promote`: webhook GET tetap aktif, relay berautentikasi, dan batas waktu webhook tetap mengikuti pengaturan platform existing (deployment sebelumnya 300 detik). Semua tiga nilai wajib terisi untuk mengaktifkan relay; tanpa konfigurasi lengkap, tidak ada query tabel baru atau pengiriman. Override pemasangan tabel hanya untuk deployment aktivasi ini, bukan package build/postinstall atau pengaturan project permanen.
5. Verifikasi GET relay dengan Bearer retry secret: JSON `enabled:true` dan hitungan pending/delivered/review/due/leased. Tanpa secret harus 401. POST dengan Bearer yang sama harus mengembalikan hitungan claimed/delivered/retry/review.
6. Pada Worker Foxe, setelah route Vercel terverifikasi, pasang `FOXE_CRM_RELAY_URL=https://foxe-studio-id.vercel.app/api/integrations/foxe/relay` dan `FOXE_CRM_RELAY_SECRET` yang sama. Sebelum keduanya terisi, cron tidak menghubungi CRM. Endpoint ditetapkan secara tetap; tidak mengikuti redirect.
7. Pemilik/pihak yang disetujui mengirim satu pesan uji masuk. Jangan memakai payload palsu pada endpoint CRM produksi karena memicu AI, Sheets, alert admin dan kemungkinan OCR. Bandingkan pesan diterima pada Foxe, hari WIB dan hitungan kontak. Tidak ada impor histori otomatis.

Kredensial database tetap di lingkungan server Vercel; jangan menurunkan visibility secret, mengekspor DATABASE_URL, atau membuat endpoint pembaca secret. Script pemasangan hanya membaca katalog schema dan menjalankan tiga DDL tetap, tanpa membaca/mengubah baris customer. Pemasangan tabel dapat tetap berhasil jika build aplikasi sesudahnya gagal; dalam keadaan tersebut domain tetap memakai deployment lama dan tabel baru boleh dibiarkan. Input secret integrasi lewat stdin; jangan menaruh nilainya di argumen shell, issue atau log.

## Retry dan pemeriksaan

200 JSON `ok:true` dari Worker berarti tersimpan atau duplicate: tandai DELIVERED dan hapus payload. Network/timeout/429/5xx mempertahankan metadata dengan backoff 30 detik sampai satu jam. 4xx lain, redirect atau ACK 200 yang tidak valid menjadi REVIEW. Payload conflicting inbox ID tidak menimpa row lama. Lease atomik dan lease token mencegah dua dispatcher mengubah hasil satu sama lain; Worker juga melakukan dedup `(device,inboxid)` setelah timeout.

GET relay tidak berisi nomor, isi chat atau URL rahasia. REVIEW perlu pemeriksaan konfigurasi/payload oleh operator sebelum requeue; jangan menghapus ID/digest delivered, karena menghilangkan dedup. Sertifikat dan hostname HTTPS selalu diverifikasi melalui agent khusus meskipun service Sheets existing mengubah pengaturan TLS global.

## Verifikasi lokal

`npm run test:foxe-relay`, `npx tsc --noEmit`, `npm run build` (database/AI production tidak diperlukan untuk test relay).

Tes relay memakai store/transport fiktif dan tidak mengirim WhatsApp, Telegram, AI atau Sheets. Jangan menjalankan `scripts/test_end_to_end_flow.ts` untuk tugas ini: script tersebut menghubungi produksi dan memiliki penghapusan data.

Rollback: hapus `FOXE_CRM_RELAY_URL` dari Worker agar pemicu berhenti, kosongkan konfigurasi relay Vercel dan redeploy deployment sebelumnya. Tabel additive dapat tetap disimpan; jangan menjatuhkan tabel CRM atau kehilangan ID/digest pengiriman yang sudah berhasil.
