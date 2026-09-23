import { prisma } from "@/lib/prisma";

export interface ActiveShiftInfo {
  adminName: string; // "Admin 1" atau "Admin 2"
  hashtag: string; // "#Admin1" atau "#Admin2"
  shiftTime: string; // "09:00 - 15:00" atau "15:00 - 21:00"
  shiftName: string; // "Shift Pagi/Siang" atau "Shift Sore/Malam"
  phoneNumber: string;
  isAuto: boolean; // True jika mengikuti jam operasional otomatis
  isOffHours: boolean; // True jika di luar jam 09:00 - 21:00 WIB
  currentWibTime: string; // "13:30 WIB"
}

export function getCurrentWibInfo(): { hour: number; minute: number; timeStr: string } {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);
  const hour = wib.getHours();
  const minute = wib.getMinutes();
  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return { hour, minute, timeStr };
}

/**
 * Deteksi apakah teks pesan mengandung hashtag tanda tangan CS (misal: #Admin1, #Admin2, #Amel, #Indah)
 */
export function extractAdminFromHashtag(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes("#admin1") || lower.includes("#admin 1") || lower.includes("#amel")) {
    return "Admin 1";
  }
  if (lower.includes("#admin2") || lower.includes("#admin 2") || lower.includes("#indah")) {
    return "Admin 2";
  }
  return null;
}

/**
 * Memformat balasan CS dengan tanda tangan hashtag di bagian footer
 */
export function formatCsReplyWithSignature(reply: string, adminName: string): string {
  const cleanReply = reply.trim();
  const tag = adminName.includes("2") ? "#Admin2" : "#Admin1";

  // Jika sudah ada hashtag tanda tangan, jangan ditambahkan lagi
  if (/#(admin\s*1|admin\s*2|amel|indah)/i.test(cleanReply)) {
    return cleanReply;
  }

  return `${cleanReply}\n\n—\nSalam hangat, Foxe Studio\n${tag}`;
}

/**
 * Menentukan Admin Shift yang sedang aktif
 * 1. Jika ada hashtag di pesan, gunakan hashtag tersebut
 * 2. Cek apakah ada record AdminShift dengan status isActive = true di DB
 * 3. Jika mode Auto (atau DB kosong), hitung berdasarkan jam WIB:
 *    - 09:00 - 15:00 -> Admin 1
 *    - 15:00 - 21:00 -> Admin 2
 *    - 21:00 - 09:00 -> Off-hours (Default Admin 1 standby)
 */
export async function determineActiveShift(incomingMessageText?: string): Promise<ActiveShiftInfo> {
  const { hour, timeStr } = getCurrentWibInfo();

  // 1. Cek Hashtag dari pesan jika ada
  if (incomingMessageText) {
    const hashtagAdmin = extractAdminFromHashtag(incomingMessageText);
    if (hashtagAdmin) {
      const isShift2 = hashtagAdmin === "Admin 2";
      return {
        adminName: hashtagAdmin,
        hashtag: isShift2 ? "#Admin2" : "#Admin1",
        shiftTime: isShift2 ? "15:00 - 21:00" : "09:00 - 15:00",
        shiftName: isShift2 ? "Shift Sore/Malam" : "Shift Pagi/Siang",
        phoneNumber: process.env.ADMIN_PHONE_NUMBER || "6285159210021",
        isAuto: false,
        isOffHours: hour < 9 || hour >= 21,
        currentWibTime: `${timeStr} WIB`,
      };
    }
  }

  // 2. Cek manual override di Database
  try {
    const overrideShift = await prisma.adminShift.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    });

    if (overrideShift && overrideShift.adminName !== "AUTO") {
      const isShift2 = overrideShift.adminName.includes("2");
      const standardName = isShift2 ? "Admin 2" : "Admin 1";
      return {
        adminName: standardName,
        hashtag: isShift2 ? "#Admin2" : "#Admin1",
        shiftTime: isShift2 ? "15:00 - 21:00" : "09:00 - 15:00",
        shiftName: isShift2 ? "Shift Sore/Malam (Manual)" : "Shift Pagi/Siang (Manual)",
        phoneNumber: overrideShift.phoneNumber || process.env.ADMIN_PHONE_NUMBER || "6285159210021",
        isAuto: false,
        isOffHours: hour < 9 || hour >= 21,
        currentWibTime: `${timeStr} WIB`,
      };
    }
  } catch (err) {
    console.warn("[AdminShiftService] Gagal membaca override shift:", err);
  }

  // 3. Mode Otomatis Berdasarkan Jam Operasional (09:00 - 15:00 & 15:00 - 21:00)
  const isShift1 = hour >= 9 && hour < 15;
  const isShift2 = hour >= 15 && hour < 21;
  const isOffHours = !isShift1 && !isShift2;

  const currentAdminName = isShift2 ? "Admin 2" : "Admin 1";
  const currentHashtag = isShift2 ? "#Admin2" : "#Admin1";

  return {
    adminName: currentAdminName,
    hashtag: currentHashtag,
    shiftTime: isShift2 ? "15:00 - 21:00" : "09:00 - 15:00",
    shiftName: isShift2 ? "Shift Sore/Malam (Otomatis)" : "Shift Pagi/Siang (Otomatis)",
    phoneNumber: process.env.ADMIN_PHONE_NUMBER || "6285159210021",
    isAuto: true,
    isOffHours,
    currentWibTime: `${timeStr} WIB`,
  };
}
