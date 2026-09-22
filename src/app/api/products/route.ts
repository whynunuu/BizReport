import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/products - Mengambil daftar item menu dan paket bundling
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const isPackage = searchParams.get("isPackage");

    const where: any = { isAvailable: true };
    if (category && category !== "ALL") where.category = category;
    if (isPackage === "true") where.isPackage = true;
    if (isPackage === "false") where.isPackage = false;

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ isPackage: "desc" }, { category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ success: true, count: products.length, data: products });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil katalog produk: " + error.message },
      { status: 500 }
    );
  }
}

// POST /api/products - Menambah produk atau paket penjualan baru
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      category = "Coffee",
      price = 0,
      description,
      isPackage = false,
      packageItems,
      badge,
    } = body;

    if (!name || price <= 0) {
      return NextResponse.json(
        { success: false, error: "Nama produk dan harga wajib diisi dan valid." },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        category: isPackage ? "Paket" : category,
        price: Number(price),
        description: description || null,
        isPackage: Boolean(isPackage),
        packageItems: packageItems || null,
        badge: badge || null,
        isAvailable: true,
      },
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menambah produk: " + error.message },
      { status: 500 }
    );
  }
}
