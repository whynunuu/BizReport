/**
 * Helper utility untuk manajemen jam dengan interval 20 menit
 */

export const INTERVAL_MINUTES = 20;

// Menghasilkan daftar slot jam dari jam 06:00 sampai 23:40 dengan jeda 20 menit
export function generateTimeSlots(startHour = 6, endHour = 23, interval = INTERVAL_MINUTES): string[] {
  const slots: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += interval) {
      const hh = h.toString().padStart(2, "0");
      const mm = m.toString().padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

// Mendapatkan slot 20 menit terdekat berdasarkan waktu saat ini
export function getClosestTimeSlot(date = new Date(), interval = INTERVAL_MINUTES): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const roundedMinutes = Math.floor(minutes / interval) * interval;
  const hh = hours.toString().padStart(2, "0");
  const mm = roundedMinutes.toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

// Format label rentang waktu (misal: "07:20" -> "07:20 - 07:40")
export function formatTimeSlotRange(slot: string, interval = INTERVAL_MINUTES): string {
  const [hStr, mStr] = slot.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);

  const totalMinutes = h * 60 + m + interval;
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;

  const endHStr = endH.toString().padStart(2, "0");
  const endMStr = endM.toString().padStart(2, "0");

  return `${slot} - ${endHStr}:${endMStr}`;
}

// Menentukan slot 20 menit dari sebuah tanggal
export function getSlotFromDateTime(dateInput: Date | string, interval = INTERVAL_MINUTES): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return getClosestTimeSlot(date, interval);
}
