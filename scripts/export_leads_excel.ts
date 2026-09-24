import { PrismaClient } from "@prisma/client";
import * as path from "path";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });

  const headers = [
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
    "Status Follow-Up",
  ];

  const dataRows = leads.map((l) => {
    const d = new Date(l.createdAt);
    const timeStr = d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    return [
      timeStr,
      l.phoneNumber || "-",
      l.name || "-",
      l.status || "NEW",
      l.intentCategory || "-",
      `${l.temperature || "COLD"} (${l.leadScore || 0})`,
      l.handledByAdmin || "Admin CS",
      l.messageText || "-",
      l.summary || "-",
      l.recommendedReply || "-",
      l.suggestedAction || "-",
      l.needsFollowUp ? "PENDING" : "COMPLETED",
    ];
  });

  const wsData = [headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws["!cols"] = [
    { wch: 20 }, // Waktu
    { wch: 16 }, // Nomor WhatsApp
    { wch: 22 }, // Nama Pelanggan
    { wch: 14 }, // Status Lead
    { wch: 16 }, // Kategori Niat
    { wch: 14 }, // Suhu & Skor
    { wch: 14 }, // Admin Bertugas
    { wch: 35 }, // Pesan Masuk
    { wch: 35 }, // Ringkasan AI
    { wch: 35 }, // Draf Balasan CS
    { wch: 30 }, // Tindakan Operasional
    { wch: 16 }, // Status Follow-Up
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Conversation");

  const targetPath = path.join(process.cwd(), "Data_Lead_2026_Foxe_Studio.xlsx");
  XLSX.writeFile(wb, targetPath);

  console.log(`Berhasil membuat file Excel (${leads.length} leads): ${targetPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
