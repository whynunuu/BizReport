/**
 * ==============================================================================
 * FOXE STUDIO — LOG ORDER AUTO-READER (READ-ONLY)
 * ==============================================================================
 * 
 * Script ini HANYA MEMBACA data dari spreadsheet Log Order kasir.
 * TIDAK PERNAH menulis, mengedit, atau mengubah isi spreadsheet sumber.
 * 
 * Data yang dibaca dikirim ke API CRM untuk dicatat di database Neon PostgreSQL.
 * 
 * CARA PAKAI (1x setup saja):
 * 1. Buka file "9. Log Order September 2026" di Google Sheets
 * 2. Menu: Ekstensi > Apps Script
 * 3. Hapus kode bawaan, paste SELURUH isi file ini
 * 4. Klik 💾 Simpan
 * 5. Jalankan fungsi "setupOtomatis" 1x (akan minta izin akses — pilih Allow)
 * 6. Selesai! Mulai sekarang data Log Order akan tersedot otomatis setiap malam.
 * 
 * ==============================================================================
 */

// ======================== KONFIGURASI ========================
var CRM_API_URL = "https://foxe-studio-id.vercel.app/api/crm/ingest-log-order";
var INGEST_SECRET = "foxe-log-order-auto-2026";
// =============================================================

/**
 * 🔄 FUNGSI UTAMA: Baca seluruh tab di spreadsheet, kirim data DP ke CRM API.
 * Fungsi ini dipanggil otomatis setiap malam oleh Time Trigger.
 */
function bacaDanKirimLogOrder() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var allRecords = [];
  
  // Deteksi bulan & tahun dari nama file (contoh: "9. Log Order September 2026")
  var fileName = ss.getName();
  var monthYear = deteksiBulanTahun_(fileName);
  
  Logger.log("📄 Membaca file: " + fileName);
  Logger.log("📅 Bulan: " + monthYear.month + ", Tahun: " + monthYear.year);
  
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var tabName = sheet.getName().trim();
    
    // Coba ekstrak nomor hari dari nama tab
    var dayNum = ekstrakHari_(tabName);
    if (dayNum === null) {
      Logger.log("⏩ Skip tab '" + tabName + "' (bukan tab harian)");
      continue;
    }
    
    Logger.log("📋 Membaca tab '" + tabName + "' (Hari ke-" + dayNum + ")...");
    
    // Baca seluruh data di tab ini
    var dataRange = sheet.getDataRange();
    if (dataRange.getNumRows() < 3) continue; // Minimal header + 1 data
    
    var data = dataRange.getValues();
    
    // Cari baris header (yang mengandung "Nama")
    var headerInfo = cariHeader_(data);
    if (!headerInfo) {
      Logger.log("  ⚠️ Header 'Nama' tidak ditemukan di tab '" + tabName + "'");
      continue;
    }
    
    var colMap = headerInfo.columns;
    var startRow = headerInfo.dataStartRow;
    
    // Buat date string: "2026-09-DD"
    var dateStr = monthYear.year + "-" + pad2_(monthYear.month) + "-" + pad2_(dayNum);
    
    // Ekstrak baris data
    for (var r = startRow; r < data.length; r++) {
      var row = data[r];
      
      // Ambil nama client
      var nama = String(row[colMap.nama] || "").trim();
      if (!nama || nama === "-" || nama === "0" || nama.length < 2) continue;
      
      // Skip baris total/summary (biasanya berisi "Total", "Rp", atau cell dengan formula sum)
      var namaLower = nama.toLowerCase();
      if (namaLower.includes("total") || namaLower.includes("jumlah") || 
          namaLower.includes("pendapatan") || namaLower.includes("kpi") ||
          namaLower.includes("shift") || namaLower.includes("admin")) continue;
      
      // Ambil nilai uang
      var cash = parseNominal_(row[colMap.cash]);
      var transfer = parseNominal_(row[colMap.transfer]);
      var nominal = cash + transfer;
      
      // Skip jika tidak ada pembayaran sama sekali
      if (nominal <= 0) continue;
      
      // Ambil data lain
      var paket = String(row[colMap.paket] || "").trim();
      var tglFoto = "";
      if (colMap.tglFoto !== undefined && row[colMap.tglFoto]) {
        var rawTgl = row[colMap.tglFoto];
        if (rawTgl instanceof Date) {
          tglFoto = Utilities.formatDate(rawTgl, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
        } else {
          tglFoto = String(rawTgl).trim();
        }
      }
      var admin = colMap.admin !== undefined ? String(row[colMap.admin] || "").trim() : "";
      
      allRecords.push({
        day: dayNum,
        date: dateStr,
        client: nama,
        paket: paket,
        tgl_foto: tglFoto,
        cash: cash,
        transfer: transfer,
        nominal: nominal,
        admin: admin
      });
    }
    
    Logger.log("  ✅ " + allRecords.length + " record DP ditemukan sejauh ini");
  }
  
  // Kirim ke CRM API
  if (allRecords.length === 0) {
    Logger.log("ℹ️ Tidak ada data DP yang perlu dikirim.");
    return;
  }
  
  Logger.log("📤 Mengirim " + allRecords.length + " record ke CRM API...");
  
  var payload = {
    secret: INGEST_SECRET,
    records: allRecords,
    month: monthYear.month,
    year: monthYear.year
  };
  
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(CRM_API_URL, options);
    var code = response.getResponseCode();
    var body = response.getContentText();
    
    if (code === 200) {
      var result = JSON.parse(body);
      Logger.log("✅ Berhasil! " + (result.message || "Sync selesai"));
      Logger.log("   Matched WA: " + (result.matchedCount || 0));
      Logger.log("   Baru dibuat: " + (result.createdCount || 0));
      Logger.log("   Di-skip: " + (result.skippedCount || 0));
    } else {
      Logger.log("❌ API Error (" + code + "): " + body);
    }
  } catch (e) {
    Logger.log("❌ Gagal kirim ke API: " + e.toString());
  }
}

/**
 * 🔧 SETUP OTOMATIS — Jalankan 1x saja untuk mengaktifkan jadwal malam.
 * Akan membuat trigger otomatis yang jalan setiap hari pukul 20:30 WIB.
 */
function setupOtomatis() {
  // Hapus trigger lama jika ada
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "bacaDanKirimLogOrder") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Buat trigger baru: setiap hari jam 20:00 - 21:00 WIB
  ScriptApp.newTrigger("bacaDanKirimLogOrder")
    .timeBased()
    .everyDays(1)
    .atHour(20)   // 20:00 - 21:00 WIB (Google random di range 1 jam)
    .inTimezone("Asia/Jakarta")
    .create();
  
  Logger.log("✅ Trigger otomatis berhasil dibuat!");
  Logger.log("📅 Jadwal: Setiap malam ~20:00-21:00 WIB");
  Logger.log("📌 Data Log Order akan otomatis tersedot ke CRM tanpa mengubah spreadsheet ini.");
  
  // Test langsung sekali
  Logger.log("");
  Logger.log("🧪 Menjalankan test sync sekarang...");
  bacaDanKirimLogOrder();
}

/**
 * 🧪 TEST MANUAL — Bisa dijalankan kapan saja untuk test sync tanpa menunggu malam.
 */
function testSyncSekarang() {
  bacaDanKirimLogOrder();
}


// ======================== HELPER FUNCTIONS (INTERNAL) ========================

/**
 * Deteksi bulan dan tahun dari nama file spreadsheet.
 * Contoh: "9. Log Order September 2026" → { month: 9, year: 2026 }
 */
function deteksiBulanTahun_(fileName) {
  var monthNames = {
    "januari": 1, "februari": 2, "maret": 3, "april": 4,
    "mei": 5, "juni": 6, "juli": 7, "agustus": 8,
    "september": 9, "oktober": 10, "november": 11, "desember": 12,
    "january": 1, "february": 2, "march": 3, "may": 5,
    "june": 6, "july": 7, "august": 8, "october": 10,
    "december": 12
  };
  
  var fLower = fileName.toLowerCase();
  var month = 0;
  var year = new Date().getFullYear();
  
  // Cari nama bulan
  for (var key in monthNames) {
    if (fLower.includes(key)) {
      month = monthNames[key];
      break;
    }
  }
  
  // Cari tahun (4 digit angka)
  var yearMatch = fileName.match(/20\d{2}/);
  if (yearMatch) {
    year = parseInt(yearMatch[0]);
  }
  
  // Fallback: jika bulan tidak terdeteksi, ambil angka pertama dari nama file
  if (month === 0) {
    var numMatch = fileName.match(/^(\d+)/);
    if (numMatch) {
      var n = parseInt(numMatch[1]);
      if (n >= 1 && n <= 12) month = n;
    }
  }
  
  // Ultimate fallback: bulan sekarang
  if (month === 0) month = new Date().getMonth() + 1;
  
  return { month: month, year: year };
}

/**
 * Ekstrak nomor hari dari nama tab.
 * "1" → 1, "24" → 24, "24 Sep" → 24, "Hari 15" → 15
 * "Summary" → null, "KPI" → null
 */
function ekstrakHari_(tabName) {
  // Coba match angka di awal tab name
  var match = tabName.match(/^(\d+)/);
  if (match) {
    var num = parseInt(match[1]);
    if (num >= 1 && num <= 31) return num;
  }
  
  // Coba "Hari X" / "Day X" / "H-X" / "Tgl X"
  var altMatch = tabName.match(/(?:hari|day|h-|tgl)\s*(\d+)/i);
  if (altMatch) {
    var altNum = parseInt(altMatch[1]);
    if (altNum >= 1 && altNum <= 31) return altNum;
  }
  
  return null;
}

/**
 * Cari baris header di data (yang mengandung "Nama").
 * Return: { columns: { nama, paket, tglFoto, cash, transfer, admin }, dataStartRow }
 */
function cariHeader_(data) {
  for (var r = 0; r < Math.min(data.length, 10); r++) {
    for (var c = 0; c < data[r].length; c++) {
      var val = String(data[r][c]).trim().toLowerCase();
      if (val === "nama") {
        // Ditemukan! Sekarang map kolom-kolom lain di baris yang sama
        var colMap = { nama: c };
        
        for (var cc = 0; cc < data[r].length; cc++) {
          var h = String(data[r][cc]).trim().toLowerCase();
          if (h === "paket") colMap.paket = cc;
          if (h.includes("tanggal") || h === "tgl foto" || h.includes("tgl")) colMap.tglFoto = cc;
          if (h === "cash") colMap.cash = cc;
          if (h === "transfer") colMap.transfer = cc;
          if (h === "admin") colMap.admin = cc;
          if (h === "pembayaran") colMap.pembayaran = cc;
        }
        
        // Jika Cash/Transfer tidak ditemukan di baris ini,
        // coba cari di baris berikutnya (sub-header row)
        if (colMap.cash === undefined && r + 1 < data.length) {
          for (var cc2 = 0; cc2 < data[r + 1].length; cc2++) {
            var h2 = String(data[r + 1][cc2]).trim().toLowerCase();
            if (h2 === "cash") colMap.cash = cc2;
            if (h2 === "transfer") colMap.transfer = cc2;
          }
        }
        
        // Fallback default kolom (berdasarkan layout umum Log Order Foxe Studio)
        if (colMap.cash === undefined) colMap.cash = c + 4;     // Nama + 4
        if (colMap.transfer === undefined) colMap.transfer = c + 5; // Nama + 5
        if (colMap.paket === undefined) colMap.paket = c + 1;
        if (colMap.admin === undefined) colMap.admin = c + 9;
        
        return {
          columns: colMap,
          dataStartRow: r + 1  // Data mulai 1 baris setelah header
        };
      }
    }
  }
  return null;
}

/**
 * Parse nilai nominal dari cell spreadsheet.
 * Menangani format: 100000, "Rp 100.000", "Rp100,000", "100.000", dll.
 */
function parseNominal_(cellValue) {
  if (!cellValue) return 0;
  if (typeof cellValue === "number") return cellValue;
  
  var str = String(cellValue).trim();
  if (!str) return 0;
  
  // Hapus "Rp", spasi, titik pemisah ribuan, dan "IDR"
  str = str.replace(/[Rr][Pp]\.?/g, "")
           .replace(/IDR/gi, "")
           .replace(/\s/g, "")
           .replace(/\./g, "")    // titik pemisah ribuan
           .replace(/,/g, "");    // koma pemisah ribuan
  
  var num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Pad angka menjadi 2 digit: 1 → "01", 12 → "12"
 */
function pad2_(n) {
  return (n < 10 ? "0" : "") + n;
}
