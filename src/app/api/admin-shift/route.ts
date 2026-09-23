import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { determineActiveShift } from "@/lib/services/admin-shift-service";

export async function GET() {
  try {
    const activeShift = await determineActiveShift();
    return NextResponse.json({
      success: true,
      activeShift,
      options: [
        { id: "AUTO", label: "🟢 Otomatis (Ikuti Jam: 09-15 Admin 1 / 15-21 Admin 2)" },
        { id: "Admin 1", label: "👤 Admin 1 (Shift 09:00 - 15:00 WIB)" },
        { id: "Admin 2", label: "👤 Admin 2 (Shift 15:00 - 21:00 WIB)" },
      ],
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Gagal mengambil shift aktif";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { targetAdmin } = body as { targetAdmin: "AUTO" | "Admin 1" | "Admin 2" };

    if (!targetAdmin || !["AUTO", "Admin 1", "Admin 2"].includes(targetAdmin)) {
      return NextResponse.json(
        { success: false, error: "Pilihan admin tidak valid (pilih: AUTO, Admin 1, atau Admin 2)" },
        { status: 400 }
      );
    }

    // Set semua shift lama menjadi nonaktif
    await prisma.adminShift.updateMany({
      data: { isActive: false },
    });

    if (targetAdmin === "AUTO") {
      // Dalam mode AUTO, buat record marker AUTO
      await prisma.adminShift.create({
        data: {
          adminName: "AUTO",
          phoneNumber: process.env.ADMIN_PHONE_NUMBER || "6285189210021",
          shiftDay: "SETIAP_HARI",
          startTime: "09:00",
          endTime: "21:00",
          isActive: true,
        },
      });
    } else {
      const isShift2 = targetAdmin === "Admin 2";
      await prisma.adminShift.create({
        data: {
          adminName: targetAdmin,
          phoneNumber: process.env.ADMIN_PHONE_NUMBER || "6285189210021",
          shiftDay: "SETIAP_HARI",
          startTime: isShift2 ? "15:00" : "09:00",
          endTime: isShift2 ? "21:00" : "15:00",
          isActive: true,
        },
      });
    }

    const updatedShift = await determineActiveShift();

    return NextResponse.json({
      success: true,
      message: `Shift berhasil diubah ke: ${targetAdmin}`,
      activeShift: updatedShift,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Gagal memperbarui shift admin";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
