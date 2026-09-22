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
} from "lucide-react";
import { generateTimeSlots, getClosestTimeSlot, formatTimeSlotRange } from "@/lib/timeUtils";

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
  const [tableNumber, setTableNumber] = useState("Meja 01");
  const [orderType, setOrderType] = useState<"Dine In" | "Take Away" | "Delivery">("Dine In");
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Time Slot with 20-minute Interval
  const timeSlots = useMemo(() => generateTimeSlots(6, 23, 20), []);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(() => getClosestTimeSlot());

  // Modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  // Payment State inside Checkout Modal
  const [paymentMethod, setPaymentMethod] = useState<"QRIS" | "CASH" | "DEBIT" | "ONLINE_FOOD">("QRIS");
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Product Form State
  const [newProdName, setNewProdName] = useState("");
  const [newProdCat, setNewProdCat] = useState("Coffee");
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

  // Cart Operations
  const handleAddToCart = (product: Product) => {
    const existingIndex = cart.findIndex((i) => i.productId === product.id);
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
          productId: product.id,
          productName: product.name,
          category: product.category,
          quantity: 1,
          unitPrice: product.price,
          subtotal: product.price,
          isPackage: product.isPackage,
          packageItems: product.packageItems,
          notes: "",
        },
      ]);
    }
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
    { id: "ALL", label: "🔥 Semua Menu" },
    { id: "Paket", label: "🎁 Paket Bundling", highlight: true },
    { id: "Coffee", label: "☕ Coffee" },
    { id: "Non-Coffee", label: "🍵 Non-Coffee" },
    { id: "Pastry", label: "🥐 Pastry & Bakery" },
    { id: "Food", label: "🍟 Snack & Makanan" },
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
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                <ShoppingBag className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                Terminal Kasir POS
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik menu atau paket bundling untuk memasukkannya ke struk pesanan.
            </p>
          </div>

          <button
            onClick={() => setIsAddProductOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Menu / Paket Baru</span>
          </button>
        </div>

        {/* Search Bar & Category Filter Tabs */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari nama menu kopi, makanan, atau paket hemat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
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
                    ? cat.highlight
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-slate-900 text-white shadow-xs"
                    : cat.highlight
                    ? "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* PRODUCT & PACKAGE GRID */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            Memuat katalog paket dan menu kasir...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <Coffee className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Menu Tidak Ditemukan</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Coba gunakan kata kunci pencarian lain atau pilih kategori Semua.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleAddToCart(product)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between group active:scale-98 ${
                  product.isPackage
                    ? "bg-gradient-to-br from-amber-50/70 to-orange-50/40 border-amber-200 hover:border-amber-400 hover:shadow-md"
                    : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
                }`}
              >
                <div>
                  {/* Card Header with Badges */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    {product.badge ? (
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          product.isPackage
                            ? "bg-amber-600 text-white"
                            : "bg-slate-900 text-white"
                        }`}
                      >
                        {product.badge}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {product.category}
                      </span>
                    )}

                    {product.isPackage && (
                      <span className="text-[10px] font-bold text-amber-700 flex items-center gap-0.5">
                        <Package className="w-3 h-3" /> Paket
                      </span>
                    )}
                  </div>

                  {/* Name & Desc */}
                  <h4 className="font-bold text-xs md:text-sm text-slate-900 leading-snug group-hover:text-amber-800 transition-colors">
                    {product.name}
                  </h4>
                  {product.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-tight">
                      {product.description}
                    </p>
                  )}
                </div>

                {/* Price & Add Indicator */}
                <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-mono font-extrabold text-xs md:text-sm text-slate-900">
                    Rp {product.price.toLocaleString("id-ID")}
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-amber-600 group-hover:text-white text-slate-600 flex items-center justify-center transition-all shadow-xs">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT SECTION: LIVE CART / STRUK PANEL */}
      <div className="w-full lg:w-96 shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 md:p-5 flex flex-col justify-between sticky top-20">
        <div>
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-slate-900 text-sm md:text-base">
                Struk Pesanan
              </h3>
            </div>
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-[11px] text-red-500 hover:text-red-700 font-medium cursor-pointer"
              >
                Kosongkan
              </button>
            )}
          </div>

          {/* Customer & Order Context Form */}
          <div className="space-y-2.5 mb-3 bg-slate-50 p-3 rounded-xl border border-slate-200/70 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                  Pelanggan
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama / Walk-in"
                  className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                  Meja / Area
                </label>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Meja 01"
                  className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1"
                />
              </div>
            </div>

            {/* JAM DENGAN INTERVAL 20 MENIT */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-amber-900 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" /> Waktu Pesan (Interval 20 Menit)
                </label>
                <button
                  type="button"
                  onClick={handleSetCurrentTimeSlot}
                  className="text-[10px] font-semibold text-amber-700 hover:underline cursor-pointer"
                >
                  Waktu Sekarang
                </button>
              </div>

              <select
                value={selectedTimeSlot}
                onChange={(e) => setSelectedTimeSlot(e.target.value)}
                className="w-full text-xs font-mono font-bold bg-white border border-amber-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-amber-500 text-slate-800 cursor-pointer"
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {formatTimeSlotRange(slot, 20)}
                  </option>
                ))}
              </select>
              <span className="text-[9px] text-slate-400 mt-0.5 block">
                Slot waktu 20 menit untuk memantau jam ramai & antrean dapur
              </span>
            </div>

            {/* Layanan */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
              <span className="text-[10px] font-medium text-slate-500">Layanan:</span>
              <div className="flex gap-1">
                {(["Dine In", "Take Away", "Delivery"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setOrderType(t)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                      orderType === t
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200"
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
            <div className="py-10 text-center text-slate-400 text-xs">
              <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
              <span>Belum ada pesanan yang dipilih</span>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 mb-3">
              {cart.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 text-xs space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        {item.isPackage && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black">
                            PAKET
                          </span>
                        )}
                        <span className="font-bold text-slate-900 leading-tight">
                          {item.productName}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500 block mt-0.5">
                        @Rp {item.unitPrice.toLocaleString("id-ID")}
                      </span>
                    </div>

                    <span className="font-mono font-bold text-xs text-slate-900 shrink-0">
                      Rp {item.subtotal.toLocaleString("id-ID")}
                    </span>
                  </div>

                  {/* Quantity adjustment & Notes */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                    <input
                      type="text"
                      placeholder="Catatan (less sugar, extra ice, dll)"
                      value={item.notes || ""}
                      onChange={(e) => {
                        const updated = [...cart];
                        updated[idx].notes = e.target.value;
                        setCart(updated);
                      }}
                      className="text-[10px] w-full bg-white border border-slate-200 rounded px-2 py-0.5"
                    />

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(idx, -1)}
                        className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-xs w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(idx, 1)}
                        className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(idx)}
                        className="text-slate-400 hover:text-red-500 ml-1 cursor-pointer"
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
        <div className="border-t border-slate-200 pt-3 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span className="font-mono font-semibold">
              Rp {cartSubtotal.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span>Diskon / Potongan:</span>
            <input
              type="number"
              value={discountAmount || ""}
              onChange={(e) => setDiscountAmount(Number(e.target.value))}
              placeholder="0"
              className="w-24 text-right font-mono text-xs rounded border border-slate-200 px-2 py-0.5 bg-slate-50"
            />
          </div>

          <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
            <span>Total Bayar:</span>
            <span className="font-mono text-base text-amber-900">
              Rp {cartTotal.toLocaleString("id-ID")}
            </span>
          </div>

          <button
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            <span>Bayar & Proses Order ({cart.length} item)</span>
          </button>
        </div>
      </div>

      {/* CHECKOUT & PAYMENT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 md:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Pembayaran Kasir
                </h3>
                <p className="text-xs text-slate-500">
                  Slot Waktu:{" "}
                  <strong className="text-amber-800 font-mono">
                    {formatTimeSlotRange(selectedTimeSlot, 20)}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-slate-600"
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
                { id: "ONLINE_FOOD", label: "Online Delivery", icon: Bike },
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
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
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
              <div className="space-y-3 bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/70 text-xs">
                <label className="block font-bold text-amber-900">
                  Uang Diterima dari Pelanggan:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={cashGiven || ""}
                    onChange={(e) => setCashGiven(Number(e.target.value))}
                    className="w-full text-sm font-bold pl-9 pr-3 py-1.5 bg-white border border-amber-300 rounded-xl"
                  />
                </div>

                {/* Quick Cash Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCashGiven(cartTotal)}
                    className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg font-bold text-amber-800 cursor-pointer"
                  >
                    Uang Pas
                  </button>
                  {[50000, 100000, 200000, 500000].map((nominal) => (
                    <button
                      key={nominal}
                      type="button"
                      onClick={() => setCashGiven(nominal)}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-mono cursor-pointer hover:bg-slate-50"
                    >
                      {nominal / 1000}k
                    </button>
                  ))}
                </div>

                {/* Kembalian */}
                <div className="pt-2 border-t border-amber-200/80 flex justify-between font-bold">
                  <span className="text-slate-700">Kembalian:</span>
                  <span className="font-mono text-sm text-emerald-800">
                    Rp {cashChange.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            )}

            {/* QRIS SECTION: QR CODE MOCK */}
            {paymentMethod === "QRIS" && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2">
                <div className="w-32 h-32 bg-white p-2 rounded-xl mx-auto border border-slate-200 flex items-center justify-center shadow-xs">
                  <QrCode className="w-24 h-24 text-slate-900" />
                </div>
                <span className="text-[11px] font-mono text-slate-500 block">
                  Scan QRIS • Nominal Rp {cartTotal.toLocaleString("id-ID")}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting || (paymentMethod === "CASH" && cashGiven < cartTotal)}
                onClick={handleConfirmPayment}
                className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? "Menyimpan..." : "Konfirmasi & Cetak Struk"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRINTABLE RECEIPT */}
      {isReceiptOpen && completedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Transaksi Berhasil!
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {completedOrder.orderNumber}
              </p>
            </div>

            {/* Receipt Preview Paper */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-left text-xs font-mono space-y-2">
              <div className="text-center font-bold text-slate-900 border-b border-slate-200 pb-1">
                KOPI SENJA - SUDIRMAN
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Pelanggan: {completedOrder.customerName}</span>
                <span>{completedOrder.tableNumber}</span>
              </div>
              <div className="text-[10px] text-slate-500">
                <span>Waktu Slot: {formatTimeSlotRange(completedOrder.orderTimeSlot || selectedTimeSlot, 20)}</span>
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-200">
                {completedOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span>
                      {item.quantity}x {item.productName}
                    </span>
                    <span>Rp {item.subtotal.toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                <span>TOTAL:</span>
                <span>Rp {completedOrder.totalAmount.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Metode Bayar:</span>
                <span>{completedOrder.paymentMethod}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Struk
              </button>
              <button
                onClick={() => setIsReceiptOpen(false)}
                className="flex-1 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Order Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PRODUK / PAKET BARU */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 md:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-600" />
                Tambah Menu Satuan / Paket Bundling
              </h3>
              <button
                onClick={() => setIsAddProductOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              {/* Toggle Paket vs Satuan */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setNewProdIsPackage(false)}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    !newProdIsPackage
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500"
                  }`}
                >
                  Menu Satuan (Regular)
                </button>
                <button
                  type="button"
                  onClick={() => setNewProdIsPackage(true)}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    newProdIsPackage
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-slate-500"
                  }`}
                >
                  🎁 Paket Bundling / Combo
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Menu / Paket
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    newProdIsPackage
                      ? "Contoh: Paket Sarapan Hemat (Kopi + Croissant)"
                      : "Contoh: Iced Hazelnut Latte"
                  }
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kategori
                  </label>
                  <select
                    disabled={newProdIsPackage}
                    value={newProdCat}
                    onChange={(e) => setNewProdCat(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-2.5 py-2 bg-slate-50/50"
                  >
                    <option value="Coffee">Coffee</option>
                    <option value="Non-Coffee">Non-Coffee</option>
                    <option value="Pastry">Pastry & Bakery</option>
                    <option value="Food">Food & Snack</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Harga Jual (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 45000"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full font-mono font-bold rounded-xl border border-slate-200 px-3 py-2 bg-slate-50/50"
                  />
                </div>
              </div>

              {newProdIsPackage && (
                <div>
                  <label className="block font-semibold text-amber-900 mb-1">
                    Isi Menu di Dalam Paket
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 1 Kopi Susu, 1 Butter Croissant"
                    value={newProdPackageItems}
                    onChange={(e) => setNewProdPackageItems(e.target.value)}
                    className="w-full rounded-xl border border-amber-300 px-3 py-2 bg-amber-50/40"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Badge Promo (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="BEST SELLER / HEMAT 20%"
                    value={newProdBadge}
                    onChange={(e) => setNewProdBadge(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Deskripsi Singkat
                  </label>
                  <input
                    type="text"
                    placeholder="Keterangan rasa / bahan"
                    value={newProdDesc}
                    onChange={(e) => setNewProdDesc(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-5 py-2 font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs cursor-pointer"
                >
                  {isSavingProduct ? "Menyimpan..." : "Simpan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
