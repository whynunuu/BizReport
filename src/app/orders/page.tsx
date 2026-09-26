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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-zinc-800 text-white border border-zinc-700">
              <Camera className="w-5 h-5 text-zinc-300" />
            </span>
            <h2 className="text-xl font-bold text-white">
              Daftar Booking & Sesi Foto Hari Ini
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Lihat rincian invoice booking sesi klien, filter per interval 20 menit, dan monitor rincian paket/add-on studio.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
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
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari nomor invoice, nama klien, atau nama paket sesi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-zinc-800 pl-10 pr-4 py-2.5 bg-zinc-900 text-zinc-200 placeholder-zinc-500 focus:ring-2 focus:ring-zinc-700 focus:border-zinc-600"
            />
          </div>

          {/* Time Slot Filter (20-Minute Interval) */}
          <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
            <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="text-[11px] font-bold text-zinc-400 shrink-0">
              Interval 20 Menit:
            </span>
            <select
              value={filterTimeSlot}
              onChange={(e) => setFilterTimeSlot(e.target.value)}
              className="text-xs font-mono font-bold bg-transparent text-white border-none p-0 focus:ring-0 cursor-pointer"
            >
              <option value="ALL" className="bg-zinc-900 text-white">Semua Jam (Full Day)</option>
              {timeSlots.map((slot) => (
                <option key={slot} value={slot} className="bg-zinc-900 text-white">
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
                  ? "bg-white text-zinc-950 font-bold shadow-xs"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ORDERS LIST */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-zinc-500 bg-zinc-900 rounded-2xl border border-zinc-800">
          Memuat daftar booking sesi studio...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900 rounded-2xl border border-zinc-800">
          <Camera className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-200">Belum Ada Sesi Foto di Slot Waktu Ini</p>
          <p className="text-xs text-zinc-500 mt-0.5">
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
                className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 shadow-sm hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar Card */}
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-2.5">
                    <div>
                      <span className="font-mono font-bold text-xs text-white block">
                        {order.orderNumber}
                      </span>
                      {/* Interval 20 Menit Badge */}
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-md mt-1 border border-zinc-700">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        {slotRange} ({timeFormatted})
                      </span>
                    </div>

                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 bg-zinc-800 text-zinc-200 border border-zinc-700"
                    >
                      {order.paymentMethod === "CASH" && <Wallet className="w-3 h-3" />}
                      {order.paymentMethod === "QRIS" && <QrCode className="w-3 h-3" />}
                      {order.paymentMethod === "ONLINE_FOOD" && <CreditCard className="w-3 h-3" />}
                      {order.paymentMethod === "ONLINE_FOOD" ? "TRANSFER" : order.paymentMethod}
                    </span>
                  </div>

                  {/* Customer & Studio Room */}
                  <div className="flex items-center justify-between text-xs text-zinc-300 mb-3 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-800/80">
                    <span className="font-medium text-white flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      {order.customerName || "Walk-in"}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                      {order.tableNumber || "Studio 1"} • {order.orderType}
                    </span>
                  </div>

                  {/* List Items Ordered */}
                  <div className="space-y-1.5 mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                      Paket & Layanan Sesi ({order.items.length} item):
                    </span>
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-xs flex items-start justify-between gap-2"
                      >
                        <div className="flex-1">
                          <span className="font-semibold text-zinc-200">
                            {item.quantity}x {item.productName}
                          </span>
                          {item.notes && (
                            <span className="text-[10px] text-zinc-500 block italic">
                              "{item.notes}"
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-zinc-400 shrink-0 text-[11px]">
                          Rp {item.subtotal.toLocaleString("id-ID")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Bottom */}
                <div className="pt-2.5 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-medium">Total Biaya Sesi:</span>
                  <span className="font-mono font-extrabold text-sm text-white">
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 rounded-3xl max-w-lg w-full p-5 md:p-6 shadow-2xl border border-zinc-800 my-8 text-white">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Camera className="w-5 h-5 text-zinc-300" />
                Input Booking / Sesi Baru
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Nama Klien
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Sarah & Keluarga"
                    className="w-full text-xs rounded-xl border border-zinc-800 px-3 py-2 bg-zinc-950 text-white placeholder-zinc-500 focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Studio / Ruangan
                  </label>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Studio 1 / Photofox Box"
                    className="w-full text-xs rounded-xl border border-zinc-800 px-3 py-2 bg-zinc-950 text-white placeholder-zinc-500 focus:border-zinc-600"
                  />
                </div>
              </div>

              {/* JAM INTERVAL 20 MENIT DI MODAL */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" /> Jadwal Sesi (Interval 20 Menit)
                </label>
                <select
                  value={newOrderTimeSlot}
                  onChange={(e) => setNewOrderTimeSlot(e.target.value)}
                  className="w-full text-xs font-mono font-bold bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:border-zinc-500"
                >
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot} className="bg-zinc-900 text-white">
                      {formatTimeSlotRange(slot, 20)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Tipe Sesi
                  </label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value)}
                    className="w-full text-xs rounded-xl border border-zinc-800 px-2.5 py-2 bg-zinc-950 text-white focus:border-zinc-600"
                  >
                    <option value="Booking Sesi" className="bg-zinc-900">Booking Sesi (Terjadwal)</option>
                    <option value="Walk-In" className="bg-zinc-900">Walk-In (Langsung Datang)</option>
                    <option value="On-Site" className="bg-zinc-900">On-Site (Wisuda Kampus/Outdoor)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full text-xs rounded-xl border border-zinc-800 px-2.5 py-2 bg-zinc-950 text-white focus:border-zinc-600"
                  >
                    <option value="QRIS" className="bg-zinc-900">QRIS</option>
                    <option value="CASH" className="bg-zinc-900">Tunai (Cash)</option>
                    <option value="DEBIT" className="bg-zinc-900">Kartu Debit (EDC)</option>
                    <option value="ONLINE_FOOD" className="bg-zinc-900">Transfer Bank</option>
                  </select>
                </div>
              </div>

              {/* Quick Menu Preset Buttons */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Klik Cepat Tambah Paket / Layanan:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {quickMenuItems.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddQuickItem(item)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
                    >
                      + {item.name} (Rp {item.price.toLocaleString("id-ID")})
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Items Table */}
              <div className="border border-zinc-800 rounded-2xl p-3 bg-zinc-950 space-y-2">
                <span className="text-xs font-bold text-zinc-300 block">
                  Rincian Layanan / Paket Dipilih:
                </span>
                {orderItems.map((item, index) => (
                  <div
                    key={index}
                    className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">
                        {item.productName}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-zinc-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">
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
                          className="w-full font-mono text-xs rounded border border-zinc-700 px-2 py-1 bg-zinc-950 text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">
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
                          className="w-full font-mono text-xs rounded border border-zinc-700 px-2 py-1 bg-zinc-950 text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-0.5">
                          Subtotal
                        </label>
                        <div className="font-mono font-bold text-xs pt-1 text-white">
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
                        className="w-full text-[11px] rounded border border-zinc-700 px-2 py-1 bg-zinc-950 text-zinc-200 placeholder-zinc-500"
                      />
                    </div>
                  </div>
                ))}

                <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs">
                  <span className="font-semibold text-zinc-400">Total Biaya:</span>
                  <span className="font-mono font-bold text-sm text-white">
                    Rp {modalTotal.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="px-5 py-2 text-xs font-bold text-zinc-950 bg-white hover:bg-zinc-200 rounded-xl shadow-xs cursor-pointer transition-colors"
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
