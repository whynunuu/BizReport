"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ReceiptText,
  Plus,
  Search,
  Filter,
  CreditCard,
  Wallet,
  QrCode,
  Camera,
  Clock,
  User,
  CheckCircle2,
  Trash2,
  X,
  ChevronDown,
  Calendar,
  Building2,
} from "lucide-react";
import { generateTimeSlots, formatTimeSlotRange, getClosestTimeSlot } from "@/lib/timeUtils";

interface OrderItem {
  id?: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  tableNumber: string;
  orderType: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  totalAmount: number;
  status: string;
  cashierName: string;
  items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPayment, setFilterPayment] = useState("ALL");
  const [filterTimeSlot, setFilterTimeSlot] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Time Slots 20 Menit
  const timeSlots = useMemo(() => generateTimeSlots(6, 23, 20), []);
  const [newOrderTimeSlot, setNewOrderTimeSlot] = useState<string>(() => getClosestTimeSlot());

  // New Order Form State
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("Studio 1");
  const [orderType, setOrderType] = useState<string>("Booking Sesi");
  const [paymentMethod, setPaymentMethod] = useState<
    "QRIS" | "CASH" | "DEBIT" | "ONLINE_FOOD"
  >("QRIS");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    {
      productName: "Graduation Standard",
      category: "Graduation",
      quantity: 1,
      unitPrice: 350000,
      subtotal: 350000,
      notes: "Toga & properti wisuda",
    },
  ]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Quick Menu Presets for Photo Studio
  const quickMenuItems = [
    { name: "Graduation Standard", category: "Graduation", price: 350000 },
    { name: "Graduation Premium", category: "Graduation", price: 500000 },
    { name: "Photofox (Self Photo Box)", category: "Photofox", price: 200000 },
    { name: "Large Group (Per Pax)", category: "Group", price: 25000 },
    { name: "Family A (Keluarga Inti)", category: "Family", price: 350000 },
    { name: "Couple A", category: "Couple", price: 150000 },
    { name: "Pas Foto (Formal)", category: "Pas Foto", price: 50000 },
    { name: "Single (Portofolio)", category: "Single", price: 100000 },
  ];

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAddQuickItem = (item: { name: string; category: string; price: number }) => {
    const existingIndex = orderItems.findIndex((i) => i.productName === item.name);
    if (existingIndex > -1) {
      const updated = [...orderItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].subtotal =
        updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setOrderItems(updated);
    } else {
      setOrderItems([
        ...orderItems,
        {
          productName: item.name,
          category: item.category,
          quantity: 1,
          unitPrice: item.price,
          subtotal: item.price,
          notes: "",
        },
      ]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const modalTotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) return;
    setIsSubmittingOrder(true);

    try {
      const payload = {
        customerName: customerName || "Walk-in",
        tableNumber,
        orderType,
        paymentMethod,
        orderTimeSlot: newOrderTimeSlot,
        subtotal: modalTotal,
        discount: 0,
        totalAmount: modalTotal,
        cashierName: "Kasir Studio",
        items: orderItems,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setCustomerName("");
        setOrderItems([
          {
            productName: "Graduation Standard",
            category: "Graduation",
            quantity: 1,
            unitPrice: 350000,
            subtotal: 350000,
            notes: "Toga & properti",
          },
        ]);
        fetchOrders();
      }
    } catch (err) {
      console.error("Error creating order:", err);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Filter orders by search, payment method, and 20-minute time slot
  const filteredOrders = orders.filter((order) => {
    const matchSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some((i) =>
        i.productName.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchPayment =
      filterPayment === "ALL" || order.paymentMethod === filterPayment;

    let matchTimeSlot = true;
    if (filterTimeSlot !== "ALL") {
      const [slotH, slotM] = filterTimeSlot.split(":").map(Number);
      const slotStart = slotH * 60 + slotM;
      const slotEnd = slotStart + 20;

      const orderD = new Date(order.orderDate);
      const orderMinutes = orderD.getHours() * 60 + orderD.getMinutes();
      matchTimeSlot = orderMinutes >= slotStart && orderMinutes < slotEnd;
    }

    return matchSearch && matchPayment && matchTimeSlot;
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <Camera className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Daftar Booking & Sesi Foto Hari Ini
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Lihat rincian invoice booking sesi klien, filter per interval 20 menit, dan monitor rincian paket/add-on studio.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Buat Booking Baru</span>
        </button>
      </div>

      {/* FILTER & SEARCH BAR WITH 20-MINUTE INTERVAL SELECTOR */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari nomor invoice, nama klien, atau nama paket sesi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Time Slot Filter (20-Minute Interval) */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-[11px] font-bold text-slate-600 shrink-0">
              Interval 20 Menit:
            </span>
            <select
              value={filterTimeSlot}
              onChange={(e) => setFilterTimeSlot(e.target.value)}
              className="text-xs font-mono font-bold bg-transparent text-slate-800 border-none p-0 focus:ring-0 cursor-pointer"
            >
              <option value="ALL">Semua Jam (Full Day)</option>
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {formatTimeSlotRange(slot, 20)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Payment Filter Pill */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "ALL", label: "Semua Metode" },
            { id: "QRIS", label: "QRIS" },
            { id: "CASH", label: "Tunai (Cash)" },
            { id: "DEBIT", label: "EDC Debit" },
            { id: "ONLINE_FOOD", label: "Transfer Bank" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterPayment(tab.id)}
              className={`text-xs font-semibold px-3 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                filterPayment === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ORDERS LIST */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          Memuat daftar booking sesi studio...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Belum Ada Sesi Foto di Slot Waktu Ini</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Coba ubah filter slot jam 20 menit atau klik "+ Buat Booking Baru".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const orderDateObj = new Date(order.orderDate);
            const timeFormatted = orderDateObj.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            });

            // Hitung label slot 20 menit dari waktu order
            const h = orderDateObj.getHours();
            const m = Math.floor(orderDateObj.getMinutes() / 20) * 20;
            const slotStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
            const slotRange = formatTimeSlotRange(slotStr, 20);

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar Card */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                    <div>
                      <span className="font-mono font-bold text-xs text-slate-900 block">
                        {order.orderNumber}
                      </span>
                      {/* Interval 20 Menit Badge */}
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md mt-1 border border-amber-200/70">
                        <Clock className="w-3 h-3 text-amber-600" />
                        {slotRange} ({timeFormatted})
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        order.paymentMethod === "QRIS"
                          ? "bg-blue-100 text-blue-800"
                          : order.paymentMethod === "CASH"
                          ? "bg-emerald-100 text-emerald-800"
                          : order.paymentMethod === "DEBIT"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {order.paymentMethod === "CASH" && <Wallet className="w-3 h-3" />}
                      {order.paymentMethod === "QRIS" && <QrCode className="w-3 h-3" />}
                      {order.paymentMethod === "ONLINE_FOOD" && <CreditCard className="w-3 h-3" />}
                      {order.paymentMethod === "ONLINE_FOOD" ? "TRANSFER" : order.paymentMethod}
                    </span>
                  </div>

                  {/* Customer & Studio Room */}
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-3 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                    <span className="font-medium text-slate-800 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {order.customerName || "Walk-in"}
                    </span>
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                      {order.tableNumber || "Studio 1"} • {order.orderType}
                    </span>
                  </div>

                  {/* List Items Ordered */}
                  <div className="space-y-1.5 mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Paket & Layanan Sesi ({order.items.length} item):
                    </span>
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-xs flex items-start justify-between gap-2"
                      >
                        <div className="flex-1">
                          <span className="font-semibold text-slate-800">
                            {item.quantity}x {item.productName}
                          </span>
                          {item.notes && (
                            <span className="text-[10px] text-slate-400 block italic">
                              "{item.notes}"
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-slate-600 shrink-0 text-[11px]">
                          Rp {item.subtotal.toLocaleString("id-ID")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Bottom */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Total Biaya Sesi:</span>
                  <span className="font-mono font-extrabold text-sm text-slate-900">
                    Rp {order.totalAmount.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL BUAT BOOKING BARU */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 md:p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-600" />
                Input Booking / Sesi Baru
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Klien
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Sarah & Keluarga"
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Studio / Ruangan
                  </label>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Studio 1 / Photofox Box"
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* JAM INTERVAL 20 MENIT DI MODAL */}
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Jadwal Sesi (Interval 20 Menit)
                </label>
                <select
                  value={newOrderTimeSlot}
                  onChange={(e) => setNewOrderTimeSlot(e.target.value)}
                  className="w-full text-xs font-mono font-bold bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-800"
                >
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {formatTimeSlotRange(slot, 20)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipe Sesi
                  </label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 px-2.5 py-2 bg-slate-50/50"
                  >
                    <option value="Booking Sesi">Booking Sesi (Terjadwal)</option>
                    <option value="Walk-In">Walk-In (Langsung Datang)</option>
                    <option value="On-Site">On-Site (Wisuda Kampus/Outdoor)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full text-xs rounded-xl border border-slate-200 px-2.5 py-2 bg-slate-50/50"
                  >
                    <option value="QRIS">QRIS</option>
                    <option value="CASH">Tunai (Cash)</option>
                    <option value="DEBIT">Kartu Debit (EDC)</option>
                    <option value="ONLINE_FOOD">Transfer Bank</option>
                  </select>
                </div>
              </div>

              {/* Quick Menu Preset Buttons */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Klik Cepat Tambah Paket / Layanan:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {quickMenuItems.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddQuickItem(item)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-900 border border-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                    >
                      + {item.name} (Rp {item.price.toLocaleString("id-ID")})
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Items Table */}
              <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/50 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Rincian Layanan / Paket Dipilih:
                </span>
                {orderItems.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {item.productName}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-slate-400 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">
                          Jumlah Sesi
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...orderItems];
                            updated[index].quantity = Math.max(1, Number(e.target.value));
                            updated[index].subtotal =
                              updated[index].quantity * updated[index].unitPrice;
                            setOrderItems(updated);
                          }}
                          className="w-full font-mono text-xs rounded border border-slate-200 px-2 py-1 bg-slate-50"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">
                          Harga Satuan
                        </label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const updated = [...orderItems];
                            updated[index].unitPrice = Number(e.target.value);
                            updated[index].subtotal =
                              updated[index].quantity * updated[index].unitPrice;
                            setOrderItems(updated);
                          }}
                          className="w-full font-mono text-xs rounded border border-slate-200 px-2 py-1 bg-slate-50"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">
                          Subtotal
                        </label>
                        <div className="font-mono font-bold text-xs pt-1 text-slate-800">
                          Rp {item.subtotal.toLocaleString("id-ID")}
                        </div>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="Catatan sesi (background, add-on orang, dll)"
                        value={item.notes || ""}
                        onChange={(e) => {
                          const updated = [...orderItems];
                          updated[index].notes = e.target.value;
                          setOrderItems(updated);
                        }}
                        className="w-full text-[11px] rounded border border-slate-200 px-2 py-1 bg-slate-50"
                      />
                    </div>
                  </div>
                ))}

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-600">Total Biaya:</span>
                  <span className="font-mono font-bold text-sm text-slate-900">
                    Rp {modalTotal.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs cursor-pointer"
                >
                  {isSubmittingOrder ? "Menyimpan..." : "Simpan Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
