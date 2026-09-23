// Cleanup via Neon HTTP API (serverless driver - no TCP port 5432 needed)
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_PgTm9BLQwd7f@ep-curly-art-b3ltno6q-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(DATABASE_URL);

async function cleanup() {
  const testPhones = ['6281234567801', '6281234567802', '628999123456'];

  for (const phone of testPhones) {
    const leads = await sql`SELECT id, name FROM "Lead" WHERE "phoneNumber" = ${phone}`;
    if (leads.length > 0) {
      const leadId = leads[0].id;
      const name = leads[0].name;
      await sql`DELETE FROM "LeadInteraction" WHERE "leadId" = ${leadId}`;
      await sql`DELETE FROM "Lead" WHERE id = ${leadId}`;
      console.log(`Dihapus: ${phone} - ${name || '(no name)'}`);
    } else {
      console.log(`Tidak ditemukan: ${phone}`);
    }
  }

  const [{ count }] = await sql`SELECT COUNT(*) as count FROM "Lead"`;
  console.log(`Sisa leads di DB: ${count}`);
}

cleanup().catch(console.error);
