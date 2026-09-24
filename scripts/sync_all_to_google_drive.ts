process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const WEBHOOK_URL =
  process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
  "https://script.google.com/macros/s/AKfycbzholPN4efU3CWU1qmSwTA0S6T1Ld_fERyBGpYj3Yqmc4n8M16VaEKjBSGDkXAA7tCsyw/exec";

async function postLead(lead: any) {
  const payload = {
    phoneNumber: lead.phoneNumber,
    name: lead.name || "-",
    status: lead.status || "NEW",
    intentCategory: lead.intentCategory || "INFO_UMUM",
    temperature: lead.temperature || "COLD",
    leadScore: lead.leadScore || 0,
    handledByAdmin: lead.handledByAdmin || "Admin 1",
    messageText: lead.messageText || "-",
    summary: lead.summary || "-",
    recommendedReply: lead.recommendedReply || "-",
    suggestedAction: lead.suggestedAction || "-",
    needsFollowUp: Boolean(lead.needsFollowUp),
    timestamp: new Date(lead.createdAt).toISOString(),
  };

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = await res.json().catch(() => ({}));
  return json;
}

async function main() {
  console.log("Mengambil data leads dari database...");
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "asc" },
  });

  console.log(`Total leads: ${leads.length}`);
  console.log(`Mengirim ke Google Drive Webhook: ${WEBHOOK_URL}`);

  let successCount = 0;
  let failCount = 0;

  // Kirim dengan delay kecil dan concurrency 3
  const concurrency = 3;
  for (let i = 0; i < leads.length; i += concurrency) {
    const batch = leads.slice(i, i + concurrency);
    const promises = batch.map(async (lead) => {
      try {
        const result = await postLead(lead);
        successCount++;
        process.stdout.write(`\r[Syncing] ${successCount}/${leads.length} leads terkirim...`);
        return result;
      } catch (err: any) {
        failCount++;
        console.error(`\nGagal kirim lead ${lead.phoneNumber}: ${err.message}`);
        return null;
      }
    });

    await Promise.all(promises);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.log(`\n\n✅ Sinkronisasi Selesai!`);
  console.log(`- Berhasil: ${successCount} leads`);
  console.log(`- Gagal: ${failCount} leads`);
}

main()
  .catch((e) => {
    console.error("Fatal Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
