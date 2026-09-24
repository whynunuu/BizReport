import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

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

  const escapeCsv = (str: any) => {
    if (!str) return '""';
    const s = String(str).replace(/"/g, '""').replace(/\r?\n/g, " ");
    return `"${s}"`;
  };

  const rows = leads.map((l) => {
    const d = new Date(l.createdAt);
    const timeStr = d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    return [
      escapeCsv(timeStr),
      escapeCsv(l.phoneNumber),
      escapeCsv(l.name),
      escapeCsv(l.status),
      escapeCsv(l.intentCategory),
      escapeCsv(`${l.temperature || "COLD"} (${l.leadScore || 0})`),
      escapeCsv(l.handledByAdmin || "Admin CS"),
      escapeCsv(l.messageText),
      escapeCsv(l.summary),
      escapeCsv(l.recommendedReply),
      escapeCsv(l.suggestedAction),
      escapeCsv(l.needsFollowUp ? "PENDING" : "COMPLETED"),
    ].join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
  const targetPath = path.join(process.cwd(), "Data_Lead_2026_Foxe_Studio.csv");
  fs.writeFileSync(targetPath, csvContent, "utf8");

  console.log(`Berhasil mengekspor ${leads.length} data lead ke: ${targetPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
