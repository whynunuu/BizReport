/**
 * ============================================================================
 * FOXE STUDIO — GOOGLE APPS SCRIPT WEBHOOK AUTO-SYNC
 * ============================================================================
 * Spreadsheet Target: "Data Lead 2026 - Foxe Studio"
 * URL: https://docs.google.com/spreadsheets/d/11a5G5Dk18s_VgJ9pkFMhC6XJ6KwTq67CNcrDJlmqLwI/edit
 * Sheet Tab Target: "Conversation"
 * 
 * PANDUAN PEMASANGAN (HANYA 1 MENIT):
 * 1. Buka spreadsheet "Data Lead 2026 - Foxe Studio" di browser Anda.
 * 2. Klik menu "Extensions" (atau "Ekstensi") -> "Apps Script".
 * 3. Hapus seluruh isi kode lama yang ada di editor, lalu TEMPEL seluruh kode ini.
 * 4. Klik tombol "Deploy" (atau "Terapkan") di kanan atas -> Pilih "New deployment" (Penerapan baru).
 * 5. Pilih jenis: "Web app" (Aplikasi web).
 * 6. Setting wajib:
 *    - Description : Foxe Lead Sync Webhook
 *    - Execute as  : Me (email@gmail.com)
 *    - Who has access: Anyone (Siapa saja)  <-- WAJIB PILIH "ANYONE"
 * 7. Klik "Deploy" -> Berikan izin (Authorize access) jika Google meminta.
 * 8. Salin URL Web app yang dihasilkan (akhiran /exec).
 * ============================================================================
 */

function setupHeaders(sheet) {
  var headers = [
    "Waktu (WIB)",
    "Nomor WhatsApp",
    "Nama Pelanggan",
    "Status Lead",
    "Kategori Niat",
    "Suhu & Skor",
    "Admin Bertugas",
    "Pesan Masuk",
    "Ringkasan AI",
    "Draf Balasan CS",
    "Tindakan Operasional",
    "Status Follow-Up"
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground("#0f172a") // Tema Elegan Dark Slate
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontFamily("Arial")
    .setFontSize(10)
    .setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
}

function doPost(e) {
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);

    // Ambil spreadsheet aktif atau buka spesifik via ID
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      ss = SpreadsheetApp.openById("11a5G5Dk18s_VgJ9pkFMhC6XJ6KwTq67CNcrDJlmqLwI");
    }

    var sheet = ss.getSheetByName("Conversation");
    if (!sheet) {
      sheet = ss.insertSheet("Conversation");
    }

    // Jika sheet masih kosong, pasang header otomatis
    if (sheet.getLastRow() === 0) {
      setupHeaders(sheet);
    }

    // KASUS 1: Batch Sync Massal dengan Reset / Overwrite
    if (data.action === "reset_and_sync" && Array.isArray(data.leads)) {
      sheet.clearContents();
      setupHeaders(sheet);

      var rows = data.leads.map(function(item) {
        return [
          item.timestamp || Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss"),
          item.phoneNumber || "-",
          item.name || "-",
          item.status || "NEW",
          item.intentCategory || "INFO_UMUM",
          (item.temperature || "COLD") + " (" + (item.leadScore || 0) + ")",
          item.handledByAdmin || "Admin CS",
          item.messageText || "-",
          item.summary || "-",
          item.recommendedReply || "-",
          item.suggestedAction || "-",
          item.needsFollowUp ? "PENDING" : "COMPLETED"
        ];
      });

      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, 12).setValues(rows);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        type: "reset_and_sync",
        count: rows.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // KASUS 2: Batch Array Biasa (Append)
    if (Array.isArray(data)) {
      var rows = data.map(function(item) {
        return [
          item.timestamp || Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss"),
          item.phoneNumber || "-",
          item.name || "-",
          item.status || "NEW",
          item.intentCategory || "INFO_UMUM",
          (item.temperature || "COLD") + " (" + (item.leadScore || 0) + ")",
          item.handledByAdmin || "Admin CS",
          item.messageText || "-",
          item.summary || "-",
          item.recommendedReply || "-",
          item.suggestedAction || "-",
          item.needsFollowUp ? "PENDING" : "COMPLETED"
        ];
      });

      if (rows.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 12).setValues(rows);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        type: "batch_append",
        count: rows.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // KASUS 3: Single Live Webhook (Saat Ada Chat WA Masuk Realtime)
    var singleRow = [
      data.timestamp || Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss"),
      data.phoneNumber || "-",
      data.name || "-",
      data.status || "NEW",
      data.intentCategory || "INFO_UMUM",
      (data.temperature || "COLD") + " (" + (data.leadScore || 0) + ")",
      data.handledByAdmin || "Admin CS",
      data.messageText || "-",
      data.summary || "-",
      data.recommendedReply || "-",
      data.suggestedAction || "-",
      data.needsFollowUp ? "PENDING" : "COMPLETED"
    ];

    sheet.appendRow(singleRow);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      type: "single_append"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    sheet: "Data Lead 2026 - Foxe Studio",
    tab: "Conversation",
    timeWIB: Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss")
  })).setMimeType(ContentService.MimeType.JSON);
}
