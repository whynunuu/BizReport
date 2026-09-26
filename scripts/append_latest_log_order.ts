import fs from "fs";
import path from "path";
import { syncLogOrderDPs } from "../src/lib/services/log-order-sync";

const logPath = path.join(process.cwd(), "src", "data", "log_order_dp.json");
const currentData = JSON.parse(fs.readFileSync(logPath, "utf8"));

const newRecords = [
  // Day 25
  { day: 25, date: "2026-09-25", client: "Mayor Hartadi", paket: "Large Group", tgl_foto: "25 sept", cash: 0, transfer: 100000, nominal: 100000, admin: "ADIF" },
  { day: 25, date: "2026-09-25", client: "Kaliori", paket: "Large Group", tgl_foto: "25 sept", cash: 0, transfer: 150000, nominal: 150000, admin: "AMEL" },
  { day: 25, date: "2026-09-25", client: "Hasbi", paket: "Large Group", tgl_foto: "26 sept", cash: 0, transfer: 100000, nominal: 100000, admin: "AMEL" },
  { day: 25, date: "2026-09-25", client: "Merlin", paket: "Family B", tgl_foto: "27 sept", cash: 0, transfer: 100000, nominal: 100000, admin: "AMEL" },
  { day: 25, date: "2026-09-25", client: "Mela", paket: "Family A", tgl_foto: "10 okt", cash: 0, transfer: 100000, nominal: 100000, admin: "AMEL" },
  { day: 25, date: "2026-09-25", client: "Vera Desita", paket: "Photofox", tgl_foto: "27 sept", cash: 0, transfer: 100000, nominal: 100000, admin: "AMEL" },
  { day: 25, date: "2026-09-25", client: "Ayunda", paket: "Single", tgl_foto: "25 sept", cash: 0, transfer: 200000, nominal: 200000, admin: "AMEL" },
  // Day 26
  { day: 26, date: "2026-09-26", client: "Diva", paket: "Graduation", tgl_foto: "29 sept", cash: 0, transfer: 100000, nominal: 100000, admin: "INDAH" },
  { day: 26, date: "2026-09-26", client: "Salma Ngarifatul", paket: "Couple A", tgl_foto: "26 sept", cash: 0, transfer: 150000, nominal: 150000, admin: "INDAH" },
  { day: 26, date: "2026-09-26", client: "Melody", paket: "Graduation", tgl_foto: "26 sept", cash: 0, transfer: 390000, nominal: 390000, admin: "INDAH" },
  { day: 26, date: "2026-09-26", client: "Umi Fatmah", paket: "Graduation Premium", tgl_foto: "26 sept", cash: 0, transfer: 670000, nominal: 670000, admin: "INDAH" },
  { day: 26, date: "2026-09-26", client: "Nashita", paket: "Large Group", tgl_foto: "26 sept", cash: 0, transfer: 375000, nominal: 375000, admin: "INDAH" },
  { day: 26, date: "2026-09-26", client: "Khofifah Wardah", paket: "All File", tgl_foto: "26 sept", cash: 0, transfer: 50000, nominal: 50000, admin: "INDAH" },
  { day: 26, date: "2026-09-26", client: "Vieri", paket: "Packing", tgl_foto: "09 sept", cash: 0, transfer: 20000, nominal: 20000, admin: "INDAH" },
];

const existingKeys = new Set(
  currentData.map((d: any) => d.day + "_" + d.client.toLowerCase().trim())
);

const toAdd = newRecords.filter(
  (r) => !existingKeys.has(r.day + "_" + r.client.toLowerCase().trim())
);

console.log("Records to add:", toAdd.length);

if (toAdd.length > 0) {
  const updated = [...currentData, ...toAdd];
  fs.writeFileSync(logPath, JSON.stringify(updated, null, 2), "utf8");
  console.log("Updated log_order_dp.json! Total records:", updated.length);
}

// Now sync to Neon DB
async function runSync() {
  console.log("Running syncLogOrderDPs to update database...");
  const result = await syncLogOrderDPs();
  console.log("Sync Result:", {
    totalDPCount: result.totalDPCount,
    totalDPRevenue: result.totalDPRevenue,
    matchedCount: result.matchedCount,
    createdCount: result.createdCount,
  });
}

runSync().catch(console.error);
