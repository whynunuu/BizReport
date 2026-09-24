import { syncLogOrderDPs } from "../src/lib/services/log-order-sync";

async function main() {
  console.log("Menjalankan sinkronisasi Log Order untuk Day 24...");
  const result = await syncLogOrderDPs({ onlyDay: 24 });
  console.log("Hasil Sinkronisasi Day 24:", JSON.stringify(result, null, 2));

  console.log("\nMenjalankan sinkronisasi penuh seluruh hari Log Order...");
  const fullResult = await syncLogOrderDPs();
  console.log("Hasil Sinkronisasi Penuh:", {
    totalRecords: fullResult.totalRecordsInSheet,
    totalDPCount: fullResult.totalDPCount,
    totalDPRevenue: fullResult.totalDPRevenue,
    matchedCount: fullResult.matchedCount,
    createdCount: fullResult.createdCount,
  });
}

main().catch(console.error);
