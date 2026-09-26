"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  Wallet,
  QrCode,
  CreditCard,
  Bike,
  Receipt,
  User,
  Store,
  Sparkles,
  Printer,
  X,
  ChevronRight,
  Coffee,
  Package,
  Check,
  Clock,
  Camera,
} from "lucide-react";
import { generateTimeSlots, getClosestTimeSlot, formatTimeSlotRange } from "@/lib/timeUtils";
import SweetgreenProductModal, {
  ModalProduct,
  IngredientOption,
} from "@/components/pos/SweetgreenProductModal";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string | null;
  isPackage: boolean;
  packageItems?: string | null;
  isAvailable: boolean;
  badge?: string | null;
}

interface CartItem {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
  isPackage: boolean;
  packageItems?: string | null;
}

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("Studio 1");
  const [orderType, setOrderType] = useState<string>("Booking Sesi");
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Time Slot with 20-minute Interval
  const timeSlots = useMemo(() => generateTimeSlots(6, 23, 20), []);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(() => getClosestTimeSlot());

  // Modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  // Sweetgreen Style Product & Ingredients Modal State
  const [selectedModalProduct, setSelectedModalProduct] = useState<ModalProduct | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Payment State inside Checkout Modal
  const [paymentMethod, setPaymentMethod] = useState<"QRIS" | "CASH" | "DEBIT" | "ONLINE_FOOD">("QRIS");
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Product Form State
  const [newProdName, setNewProdName] = useState("");
  const [newProdCat, setNewProdCat] = useState("Graduation");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdDesc, setNewProdDesc] = useState("");
  const [newProdIsPackage, setNewProdIsPackage] = useState(false);
  const [newProdPackageItems, setNewProdPackageItems] = useState("");
  const [newProdBadge, setNewProdBadge] = useState("");
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Fetch Products Catalog
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error("Gagal mengambil katalog produk:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Set to current time slot
  const handleSetCurrentTimeSlot = () => {
    setSelectedTimeSlot(getClosestTimeSlot(new Date(), 20));
  };

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - discountAmount);
  }, [cartSubtotal, discountAmount]);

  const cashChange = useMemo(() => {
    return Math.max(0, cashGiven - cartTotal);
  }, [cashGiven, cartTotal]);

  // Cart Operations & Sweetgreen Modal Handlers
  const handleOpenProductModal = (product: Product) => {
    setSelectedModalProduct({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      description: product.description,
      isPackage: product.isPackage,
      packageItems: product.packageItems,
      badge: product.badge,
      calories: product.badge?.includes("CAL") ? product.badge : undefined,
    });
    setIsProductModalOpen(true);
  };

  const handleAddFromModal = (
    prod: ModalProduct,
    ingredients: IngredientOption[],
    finalPrice: number,
    notes: string
  ) => {
    const existingIndex = cart.findIndex(
      (i) => i.productId === prod.id && i.notes === notes
    );
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].subtotal =
        updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          productId: prod.id,
          productName: prod.name,
          category: prod.category,
          quantity: 1,
          unitPrice: finalPrice,
          subtotal: finalPrice,
          isPackage: prod.isPackage,
          packageItems: prod.packageItems,
          notes: notes,
        },
      ]);
    }
  };

  const handleAddToCart = (product: Product) => {
    handleOpenProductModal(product);
  };

  const handleUpdateQty = (index: number, delta: number) => {
    const updated = [...cart];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      setCart(cart.filter((_, i) => i !== index));
    } else {
      updated[index].quantity = newQty;
      updated[index].subtotal = newQty * updated[index].unitPrice;
      setCart(updated);
    }
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountAmount(0);
  };

  // Open Checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setCashGiven(cartTotal);
    setIsCheckoutOpen(true);
  };

  // Submit Order to Backend
  const handleConfirmPayment = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        customerName: customerName || "Pelanggan",
        tableNumber: orderType === "Take Away" ? "Takeaway" : tableNumber,
        orderType,
        paymentMethod,
        orderTimeSlot: selectedTimeSlot, // Interval 20 Menit
        subtotal: cartSubtotal,
        discount: discountAmount,
        totalAmount: cartTotal,
        cashierName: "Kasir Bertugas",
        items: cart.map((i) => ({
          productName: i.productName,
          category: i.category,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.subtotal,
          notes: i.notes || null,
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setCompletedOrder({ ...data.data, orderTimeSlot: selectedTimeSlot });
        setIsCheckoutOpen(false);
        setIsReceiptOpen(true);
        handleClearCart();
      }
    } catch (err) {
      console.error("Gagal memproses pembayaran:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Product / Package to DB
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice) return;
    setIsSavingProduct(true);

    try {
      const payload = {
        name: newProdName,
        category: newProdIsPackage ? "Paket" : newProdCat,
        price: Number(newProdPrice),
        description: newProdDesc || null,
        isPackage: newProdIsPackage,
        packageItems: newProdPackageItems || null,
        badge: newProdBadge || null,
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsAddProductOpen(false);
        setNewProdName("");
        setNewProdPrice("");
        setNewProdDesc("");
        setNewProdIsPackage(false);
        setNewProdPackageItems("");
        setNewProdBadge("");
        fetchProducts();
      }
    } catch (err) {
      console.error("Gagal menambah produk:", err);
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Categories
  const categories = [
    { id: "ALL", label: "✨ Semua Layanan" },
    { id: "Paket", label: "🎁 Paket Kombo", highlight: true },
    { id: "Graduation", label: "🎓 Wisuda" },
    { id: "Photofox", label: "📸 Photofox" },
    { id: "Group", label: "👥 Large Group" },
    { id: "Family", label: "👨‍👩‍👧‍👦 Family" },
    { id: "Couple", label: "💑 Couple" },
    { id: "Pas Foto", label: "👔 Pas Foto" },
    { id: "Single", label: "👤 Single" },
    { id: "Add-On", label: "➕ Add-On" },
  ];

  const filteredProducts = products.filter((p) => {
    const matchCat =
      activeCategory === "ALL" ||
      (activeCategory === "Paket" ? p.isPackage : p.category === activeCategory);
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* LEFT SECTION: PRODUCT & PACKAGE CATALOG */}
      <div className="flex-1 w-full space-y-4">
        {/* Top Header & Fast Actions */}
        <div className="bg-zinc-900 p-4 md:p-5 rounded-2xl border border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-zinc-800 text-white border border-zinc-700">
                <Camera className="w-5 h-5 text-zinc-300" />
              </span>
              <h2 className="text-xl font-bold text-white">
                Terminal Booking Studio
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pilih paket foto wisuda, sesi Photofox, atau add-on untuk mencatat booking klien.
            </p>
          </div>

          <button
            onClick={() => setIsAddProductOpen(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Layanan / Paket Baru</span>
          </button>
        </div>

        {/* Search Bar & Category Filter Tabs */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari paket wisuda, photofox, family, couple, atau add-on..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-zinc-800 pl-10 pr-4 py-2.5 bg-zinc-900 text-zinc-200 placeholder-zinc-500 focus:ring-2 focus:ring-zinc-700 focus:border-zinc-600"
            />
          </div>

          {/* Category Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`text-xs font-semibold px-3.5 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-white text-zinc-950 font-bold shadow-xs"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* PRODUCT & PACKAGE GRID */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-zinc-500 bg-zinc-900 rounded-2xl border border-zinc-800">
            Memuat katalog pricelist dan layanan Foxe Studio...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center bg-zinc-900 rounded-2xl border border-zinc-800">
            <Camera className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-200">Layanan Tidak Ditemukan</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Coba gunakan kata kunci pencarian lain atau pilih kategori Semua Layanan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleOpenProductModal(product)}
                className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-850 transition-all cursor-pointer select-none flex flex-col justify-between group active:scale-98 shadow-xs"
              >
                <div>
                  {/* Card Header with Badges */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    {product.badge ? (
                      <span
                        className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-zinc-800 text-zinc-200 border border-zinc-700"
                      >
                        {product.badge}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {product.category}
                      </span>
                    )}

                    {product.isPackage && (
                      <span className="text-[10px] font-bold text-zinc-300 flex items-center gap-0.5">
                        <Package className="w-3 h-3 text-zinc-400" /> Paket
                      </span>
                    )}
                  </div>

                  {/* Name & Desc */}
                  <h4 className="font-bold text-xs md:text-sm text-white leading-snug group-hover:text-zinc-200 transition-colors">
                    {product.name}
                  </h4>
                  {product.description && (
                    <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-tight">
                      {product.description}
                    </p>
                  )}
                </div>

                {/* Price & Add Indicator */}
                <div className="pt-3 mt-2 border-t border-zinc-800 flex items-center justify-between">
                  <span className="font-mono font-extrabold text-xs md:text-sm text-white">
                    Rp {product.price.toLocaleString("id-ID")}
                  </span>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    title="Tambah Cepat"
                    className="w-7 h-7 rounded-xl bg-zinc-800 border border-zinc-700 group-hover:bg-white group-hover:text-zinc-950 text-zinc-300 flex items-center justify-center transition-all shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT SECTION: LIVE CART / STRUK PANEL */}
      <div className="w-full lg:w-96 shrink-0 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm p-4 md:p-5 flex flex-col justify-between sticky top-20">
        <div>
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-zinc-300" />
              <h3 className="font-bold text-white text-sm md:text-base">
                Invoice Booking Sesi Foto
              </h3>
            </div>
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-[11px] text-zinc-400 hover:text-white font-medium cursor-pointer"
              >
                Kosongkan
              </button>
            )}
          </div>

          {/* Customer & Order Context Form */}
          <div className="space-y-2.5 mb-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 block mb-0.5">
                  Nama Klien
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama Klien / Instansi"
                  className="w-full text-xs font-semibold bg-zinc-900 text-white border border-zinc-800 rounded-lg px-2 py-1 placeholder-zinc-500 focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-zinc-400 block mb-0.5">
                  Studio / Ruangan
                </label>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Studio 1"
                  className="w-full text-xs font-semibold bg-zinc-900 text-white border border-zinc-800 rounded-lg px-2 py-1 placeholder-zinc-500 focus:border-zinc-600"
                />
              </div>
            </div>

            {/* JAM DENGAN INTERVAL 20 MENIT */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-zinc-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-400" /> Jadwal Sesi (Interval 20 Menit)
                </label>
                <button
                  type="button"
                  onClick={handleSetCurrentTimeSlot}
                  className="text-[10px] font-semibold text-zinc-400 hover:text-white cursor-pointer"
                >
                  Waktu Sekarang
                </button>
              </div>

              <select
                value={selectedTimeSlot}
                onChange={(e) => setSelectedTimeSlot(e.target.value)}
                className="w-full text-xs font-mono font-bold bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-zinc-600 text-white cursor-pointer"
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot} className="bg-zinc-900 text-white">
                    {formatTimeSlotRange(slot, 20)}
                  </option>
                ))}
              </select>
              <span className="text-[9px] text-zinc-500 mt-0.5 block">
                Slot waktu 20 menit untuk memantau jadwal studio & persiapan lighting
              </span>
            </div>

            {/* Layanan */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <span className="text-[10px] font-medium text-zinc-400">Tipe Sesi:</span>
              <div className="flex gap-1">
                {(["Booking Sesi", "Walk-In", "On-Site"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setOrderType(t)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                      orderType === t
                        ? "bg-white text-zinc-950 font-bold shadow-xs"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cart Item List */}
          {cart.length === 0 ? (
            <div className="py-10 text-center text-zinc-500 text-xs">
              <Camera className="w-8 h-8 text-zinc-600 mx-auto mb-1.5" />
              <span>Belum ada layanan/paket yang dipilih</span>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 mb-3">
              {cart.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        {item.isPackage && (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 text-[9px] font-black">
                            PAKET
                          </span>
                        )}
                        <span className="font-bold text-white leading-tight">
                          {item.productName}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-zinc-400 block mt-0.5">
                        @Rp {item.unitPrice.toLocaleString("id-ID")}
                      </span>
                    </div>

                    <span className="font-mono font-bold text-xs text-white shrink-0">
                      Rp {item.subtotal.toLocaleString("id-ID")}
                    </span>
                  </div>

                  {/* Quantity adjustment & Notes */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800">
                    <input
                      type="text"
                      placeholder="Catatan sesi (background, dll)"
                      value={item.notes || ""}
                      onChange={(e) => {
                        const updated = [...cart];
                        updated[idx].notes = e.target.value;
                        setCart(updated);
                      }}
                      className="text-[10px] w-full bg-zinc-900 text-zinc-200 placeholder-zinc-500 border border-zinc-800 rounded px-2 py-0.5 focus:border-zinc-600"
                    />

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(idx, -1)}
                        className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-xs w-4 text-center text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(idx, 1)}
                        className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(idx)}
                        className="text-zinc-500 hover:text-rose-400 ml-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calculation & Checkout Button */}
        <div className="border-t border-zinc-800 pt-3 space-y-2 text-xs">
          <div className="flex justify-between text-zinc-400">
            <span>Subtotal:</span>
            <span className="font-mono font-semibold text-zinc-200">
              Rp {cartSubtotal.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex items-center justify-between text-zinc-400">
            <span>Diskon / Potongan:</span>
            <input
              type="number"
              value={discountAmount || ""}
              onChange={(e) => setDiscountAmount(Number(e.target.value))}
              placeholder="0"
              className="w-24 text-right font-mono text-xs rounded border border-zinc-800 px-2 py-0.5 bg-zinc-950 text-white focus:border-zinc-600"
            />
          </div>

          <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-zinc-800">
            <span>Total Bayar:</span>
            <span className="font-mono text-base text-white">
              Rp {cartTotal.toLocaleString("id-ID")}
            </span>
          </div>

          <button
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
            className="w-full mt-2 bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-950 font-bold py-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            <span>Bayar & Proses Order ({cart.length} item)</span>
          </button>
        </div>
      </div>

      {/* CHECKOUT & PAYMENT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-3xl max-w-md w-full p-5 md:p-6 shadow-2xl border border-zinc-800 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">
                  Pembayaran Kasir
                </h3>
                <p className="text-xs text-zinc-400">
                  Slot Waktu:{" "}
                  <strong className="text-zinc-200 font-mono">
                    {formatTimeSlotRange(selectedTimeSlot, 20)}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "QRIS", label: "QRIS", icon: QrCode },
                { id: "CASH", label: "Tunai (Cash)", icon: Wallet },
                { id: "DEBIT", label: "Kartu Debit EDC", icon: CreditCard },
                { id: "ONLINE_FOOD", label: "Transfer Bank", icon: Bike },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white text-zinc-950 border-white font-bold shadow-xs"
                        : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* CASH SECTION: QUICK BUTTONS & CHANGE CALCULATION */}
            {paymentMethod === "CASH" && (
              <div className="space-y-3 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 text-xs">
                <label className="block font-bold text-zinc-200">
                  Uang Diterima dari Pelanggan:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-zinc-500">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={cashGiven || ""}
                    onChange={(e) => setCashGiven(Number(e.target.value))}
                    className="w-full text-sm font-bold pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:border-zinc-500"
                  />
                </div>

                {/* Quick Cash Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCashGiven(cartTotal)}
                    className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg font-bold text-white cursor-pointer hover:bg-zinc-700"
                  >
                    Uang Pas
                  </button>
                  {[50000, 100000, 200000, 500000].map((nominal) => (
                    <button
                      key={nominal}
                      type="button"
                      onClick={() => setCashGiven(nominal)}
                      className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 font-mono cursor-pointer hover:bg-zinc-800 hover:text-white"
                    >
                      {nominal / 1000}k
                    </button>
                  ))}
                </div>

                {/* Kembalian */}
                <div className="pt-2 border-t border-zinc-800 flex justify-between font-bold">
                  <span className="text-zinc-400">Kembalian:</span>
                  <span className="font-mono text-sm text-emerald-400">
                    Rp {cashChange.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            )}

            {/* QRIS SECTION: QR CODE MOCK */}
            {paymentMethod === "QRIS" && (
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 text-center space-y-2">
                <div className="w-32 h-32 bg-white p-2 rounded-xl mx-auto border border-zinc-300 flex items-center justify-center shadow-xs">
                  <QrCode className="w-24 h-24 text-zinc-950" />
                </div>
                <span className="text-[11px] font-mono text-zinc-400 block">
                  Scan QRIS • Nominal Rp {cartTotal.toLocaleString("id-ID")}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="w-1/3 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting || (paymentMethod === "CASH" && cashGiven < cartTotal)}
                onClick={handleConfirmPayment}
                className="w-2/3 py-2.5 bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-950 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? "Menyimpan..." : "Konfirmasi & Cetak Struk"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRINTABLE RECEIPT */}
      {isReceiptOpen && completedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-zinc-800 space-y-4 text-center text-white">
            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-extrabold text-base text-white">
                Transaksi Berhasil!
              </h3>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                {completedOrder.orderNumber}
              </p>
            </div>

            {/* Receipt Preview Paper */}
            <div className="p-3.5 bg-zinc-950 rounded-xl border border-dashed border-zinc-800 text-left text-xs font-mono space-y-2 text-zinc-300">
              <div className="text-center font-bold text-white border-b border-zinc-800 pb-1">
                FOXE STUDIO - PHOTO MANAGEMENT
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>Pelanggan: {completedOrder.customerName}</span>
                <span>{completedOrder.tableNumber}</span>
              </div>
              <div className="text-[10px] text-zinc-400">
                <span>Waktu Slot: {formatTimeSlotRange(completedOrder.orderTimeSlot || selectedTimeSlot, 20)}</span>
              </div>

              <div className="space-y-1 pt-1 border-t border-zinc-800">
                {completedOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="text-zinc-200">
                      {item.quantity}x {item.productName}
                    </span>
                    <span className="text-white">Rp {item.subtotal.toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-zinc-800 flex justify-between font-bold text-white">
                <span>TOTAL:</span>
                <span>Rp {completedOrder.totalAmount.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>Metode Bayar:</span>
                <span>{completedOrder.paymentMethod}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-zinc-400" /> Cetak Struk
              </button>
              <button
                onClick={() => setIsReceiptOpen(false)}
                className="flex-1 py-2 text-xs font-bold bg-white hover:bg-zinc-200 text-zinc-950 rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                Order Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PRODUK / PAKET BARU */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-3xl max-w-lg w-full p-5 md:p-6 shadow-2xl border border-zinc-800 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-zinc-300" />
                Tambah Layanan Satuan / Paket Bundling
              </h3>
              <button
                onClick={() => setIsAddProductOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              {/* Toggle Paket vs Satuan */}
              <div className="flex gap-2 p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setNewProdIsPackage(false)}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    !newProdIsPackage
                      ? "bg-zinc-800 text-white border border-zinc-700 shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Layanan Satuan
                </button>
                <button
                  type="button"
                  onClick={() => setNewProdIsPackage(true)}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    newProdIsPackage
                      ? "bg-zinc-800 text-white border border-zinc-700 shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  🎁 Paket Bundling / Kombo
                </button>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">
                  Nama Layanan / Paket
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    newProdIsPackage
                      ? "Contoh: Paket Wisuda Lengkap (Graduation + Pas Foto)"
                      : "Contoh: Graduation Premium atau Photofox Box"
                  }
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 px-3 py-2 bg-zinc-950 text-white placeholder-zinc-500 focus:border-zinc-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">
                    Kategori Layanan
                  </label>
                  <select
                    disabled={newProdIsPackage}
                    value={newProdCat}
                    onChange={(e) => setNewProdCat(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 px-2.5 py-2 bg-zinc-950 text-white focus:border-zinc-600"
                  >
                    <option value="Graduation" className="bg-zinc-900">🎓 Wisuda (Graduation)</option>
                    <option value="Photofox" className="bg-zinc-900">📸 Photofox (Self Photo)</option>
                    <option value="Group" className="bg-zinc-900">👥 Large Group</option>
                    <option value="Family" className="bg-zinc-900">👨‍👩‍👧‍👦 Family</option>
                    <option value="Couple" className="bg-zinc-900">💑 Couple</option>
                    <option value="Pas Foto" className="bg-zinc-900">👔 Pas Foto Formal</option>
                    <option value="Single" className="bg-zinc-900">👤 Single Portofolio</option>
                    <option value="Add-On" className="bg-zinc-900">➕ Add-On (Orang / Tema)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">
                    Harga Jual (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 350000"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full font-mono font-bold rounded-xl border border-zinc-800 px-3 py-2 bg-zinc-950 text-white placeholder-zinc-500 focus:border-zinc-600"
                  />
                </div>
              </div>

              {newProdIsPackage && (
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">
                    Isi Layanan di Dalam Paket Kombo
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 1 Graduation Premium, 1 Pas Foto Formal, 1 Cetak Frame"
                    value={newProdPackageItems}
                    onChange={(e) => setNewProdPackageItems(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 px-3 py-2 bg-zinc-950 text-white placeholder-zinc-500 focus:border-zinc-600"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">
                    Badge Promo (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="BEST SELLER / HEMAT 20%"
                    value={newProdBadge}
                    onChange={(e) => setNewProdBadge(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 px-3 py-2 bg-zinc-950 text-white placeholder-zinc-500 focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">
                    Deskripsi Singkat
                  </label>
                  <input
                    type="text"
                    placeholder="Keterangan rincian paket"
                    value={newProdDesc}
                    onChange={(e) => setNewProdDesc(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 px-3 py-2 bg-zinc-950 text-white placeholder-zinc-500 focus:border-zinc-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2 text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-5 py-2 font-bold text-zinc-950 bg-white hover:bg-zinc-200 rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  {isSavingProduct ? "Menyimpan..." : "Simpan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SWEETGREEN-STYLE PRODUCT SELECTION & CUSTOMIZATION MODAL */}
      <SweetgreenProductModal
        product={selectedModalProduct}
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onAddToCart={handleAddFromModal}
      />
    </div>
  );
}
