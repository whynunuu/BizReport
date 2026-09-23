import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/raw-files/jobs - Ambil semua antrean file foto mentah studio
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    const where: any = {};
    if (status && status !== "ALL") where.status = status;
    if (priority && priority !== "ALL") where.priority = priority;

    // Auto-seed initial photo jobs if table is empty
    const totalCount = await prisma.photoDeliveryJob.count();
    if (totalCount === 0) {
      await prisma.photoDeliveryJob.createMany({
        data: [
          {
            clientName: "Amanda & Fajar",
            phoneNumber: "081298765432",
            packageType: "Photofox",
            fileCount: 45,
            priority: "KILAT_24H",
            status: "READY_TO_SEND",
            driveUrl: "https://drive.google.com/drive/folders/foxe-photofox-amanda-fajar",
            notes: "Tone vintage pastel, request link WA secepatnya untuk diposting story",
          },
          {
            clientName: "Dimas Prasetyo (Wisuda UGM)",
            phoneNumber: "085712345678",
            packageType: "Graduation Premium",
            fileCount: 65,
            priority: "HIGH_PRIORITY",
            status: "EDITING",
            driveUrl: "https://drive.google.com/drive/folders/foxe-wisuda-dimas-ugm",
            notes: "Retouch toga & selempang cumlaude, skin natural",
          },
          {
            clientName: "Keluarga dr. Hendra",
            phoneNumber: "081388990011",
            packageType: "Family A",
            fileCount: 80,
            priority: "NORMAL",
            status: "RAW_READY",
            driveUrl: "https://drive.google.com/drive/folders/foxe-family-dr-hendra",
            notes: "Sesi foto 8 pax, edit 5 foto pilihan",
          },
        ],
      });
    }

    let jobs = await prisma.photoDeliveryJob.findMany({
      where,
      orderBy: [
        { priority: "asc" }, // Akan disortir kustom di bawah
        { deadline: "asc" },
        { createdAt: "desc" },
      ],
    });

    // Custom sorting: KILAT_24H -> HIGH_PRIORITY -> NORMAL
    const priorityRank: Record<string, number> = {
      KILAT_24H: 1,
      HIGH_PRIORITY: 2,
      NORMAL: 3,
    };

    jobs = jobs.sort((a, b) => {
      const pA = priorityRank[a.priority] || 99;
      const pB = priorityRank[b.priority] || 99;
      if (pA !== pB) return pA - pB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Hitung ringkasan statistik
    const allJobs = await prisma.photoDeliveryJob.findMany();
    const stats = {
      total: allJobs.length,
      kilatCount: allJobs.filter((j) => j.priority === "KILAT_24H").length,
      waitingUpload: allJobs.filter((j) => j.status === "WAITING_UPLOAD").length,
      editingCount: allJobs.filter((j) => j.status === "EDITING").length,
      readyToSend: allJobs.filter((j) => j.status === "READY_TO_SEND").length,
      deliveredCount: allJobs.filter((j) => j.status === "DELIVERED").length,
    };

    return NextResponse.json({
      success: true,
      stats,
      data: jobs,
    });
  } catch (error: any) {
    console.error("Error fetching photo delivery jobs:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data antrean foto: " + error.message },
      { status: 500 }
    );
  }
}

// POST /api/raw-files/jobs - Tambah sesi / antrean file foto baru
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientName,
      phoneNumber,
      packageType = "Photofox",
      sessionDate,
      driveUrl,
      fileCount = 0,
      priority = "NORMAL",
      status = "RAW_READY",
      deadline,
      notes,
    } = body;

    if (!clientName || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: "Nama klien dan nomor WhatsApp wajib diisi." },
        { status: 400 }
      );
    }

    const job = await prisma.photoDeliveryJob.create({
      data: {
        clientName,
        phoneNumber,
        packageType,
        sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
        driveUrl: driveUrl || null,
        fileCount: Number(fileCount) || 0,
        priority: priority || "NORMAL",
        status: status || "RAW_READY",
        deadline: deadline ? new Date(deadline) : null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating photo delivery job:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menambahkan antrean foto: " + error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/raw-files/jobs - Update status / link drive / pengiriman
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, driveUrl, priority, notes, markDelivered } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID pekerjaan wajib disertakan." },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (driveUrl !== undefined) updateData.driveUrl = driveUrl;
    if (priority !== undefined) updateData.priority = priority;
    if (notes !== undefined) updateData.notes = notes;
    if (markDelivered) {
      updateData.status = "DELIVERED";
      updateData.sentAt = new Date();
    }

    const updatedJob = await prisma.photoDeliveryJob.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updatedJob });
  } catch (error: any) {
    console.error("Error updating photo delivery job:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui antrean foto: " + error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/raw-files/jobs - Hapus antrean foto
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID pekerjaan wajib disertakan." },
        { status: 400 }
      );
    }

    await prisma.photoDeliveryJob.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Antrean berhasil dihapus." });
  } catch (error: any) {
    console.error("Error deleting photo delivery job:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus antrean: " + error.message },
      { status: 500 }
    );
  }
}
