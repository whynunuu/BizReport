"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Plus,
  Check,
  Camera,
  Sparkles,
  Flame,
  Layers,
  Heart,
  ChevronRight,
  GraduationCap,
  Users,
  Image as ImageIcon,
  Palette,
  Clock,
  HardDrive,
  FileCheck,
} from "lucide-react";

export interface IngredientOption {
  id: string;
  name: string;
  category: string; // "INCLUSIONS" | "ADD-ON ORANG" | "BACKGROUND" | "CETAK & FRAME"
  priceExtra?: number;
  calories?: number;
  iconType?: string;
  emoji?: string;
  isDefault?: boolean;
}

export interface ModalProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  calories?: string;
  description?: string | null;
  isPackage: boolean;
  packageItems?: string | null;
  badge?: string | null;
  imageUrl?: string | null;
  defaultIngredients?: IngredientOption[];
  availableOptions?: {
    [category: string]: IngredientOption[];
  };
}

interface SweetgreenProductModalProps {
  product: ModalProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (
    product: ModalProduct,
    selectedIngredients: IngredientOption[],
    finalPrice: number,
    notes: string
  ) => void;
}

// Visual Photo Studio Icon Helper
function IngredientIcon({ item }: { item: IngredientOption }) {
  if (item.emoji) {
    return <span className="text-3xl drop-shadow-xs">{item.emoji}</span>;
  }

  switch (item.category) {
    case "INCLUSIONS":
      return <Camera className="w-8 h-8 text-amber-700 drop-shadow-xs" />;
    case "ADD-ON ORANG":
      return <Users className="w-8 h-8 text-blue-600 drop-shadow-xs" />;
    case "BACKGROUND":
      return <Palette className="w-8 h-8 text-purple-600 drop-shadow-xs" />;
    case "CETAK & FRAME":
      return <ImageIcon className="w-8 h-8 text-emerald-600 drop-shadow-xs" />;
    default:
      return <Sparkles className="w-8 h-8 text-amber-600 drop-shadow-xs" />;
  }
}

export default function SweetgreenProductModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
}: SweetgreenProductModalProps) {
  // Mode: "OVERVIEW" (Screen 1) or "MODIFY" (Screen 2)
  const [viewMode, setViewMode] = useState<"OVERVIEW" | "MODIFY">("OVERVIEW");

  // Generate Default Inclusions based on Studio Product Category
  const defaultComponents = useMemo(() => {
    if (!product) return [];

    const cat = product.category;
    const name = product.name.toLowerCase();

    // 1. WISUDA / GRADUATION
    if (cat === "Graduation" || name.includes("wisuda")) {
      return [
        { id: "inc-time-30", name: "Sesi Foto 30 Menit", category: "INCLUSIONS", emoji: "⏱️", isDefault: true },
        { id: "inc-all-soft", name: "All Digital Files (GDrive)", category: "INCLUSIONS", emoji: "💾", isDefault: true },
        { id: "inc-frame-10r", name: "Cetak + Frame 10RP", category: "CETAK & FRAME", emoji: "🖼️", isDefault: true },
        { id: "inc-toga-prop", name: "Toga & Properti Wisuda", category: "INCLUSIONS", emoji: "🎓", isDefault: true },
        { id: "inc-retouch-5", name: "5 Foto Full Retouching", category: "INCLUSIONS", emoji: "✨", isDefault: true },
        { id: "inc-bg-solid", name: "Background Studio Elegan", category: "BACKGROUND", emoji: "🎨", isDefault: true },
      ];
    }

    // 2. PHOTOFOX (SELF PHOTO BOX)
    if (cat === "Photofox" || name.includes("photofox")) {
      return [
        { id: "inc-box-15", name: "Sesi Box 15 Menit", category: "INCLUSIONS", emoji: "⏱️", isDefault: true },
        { id: "inc-all-soft", name: "All Digital Softcopy", category: "INCLUSIONS", emoji: "💾", isDefault: true },
        { id: "inc-strip-4r", name: "Cetak Strip 4R Eksklusif", category: "CETAK & FRAME", emoji: "🎞️", isDefault: true },
        { id: "inc-remote", name: "Wireless Shutter Remote", category: "INCLUSIONS", emoji: "🔘", isDefault: true },
        { id: "inc-min-3", name: "Include 3 Orang", category: "INCLUSIONS", emoji: "👥", isDefault: true },
        { id: "inc-bg-solid", name: "Background Monochrome", category: "BACKGROUND", emoji: "⚪", isDefault: true },
      ];
    }

    // 3. LARGE GROUP
    if (cat === "Group" || name.includes("group")) {
      return [
        { id: "inc-time-45", name: "Sesi Foto Group 45 Menit", category: "INCLUSIONS", emoji: "⏱️", isDefault: true },
        { id: "inc-all-soft", name: "All Digital Files HD", category: "INCLUSIONS", emoji: "💾", isDefault: true },
        { id: "inc-min-7", name: "Min. 7 Pax", category: "INCLUSIONS", emoji: "👥", isDefault: true },
        { id: "inc-direct", name: "Pengarah Gaya Profesional", category: "INCLUSIONS", emoji: "📸", isDefault: true },
        { id: "inc-bg-wide", name: "Wide Backdrop Studio", category: "BACKGROUND", emoji: "🎨", isDefault: true },
        { id: "inc-frame-12r", name: "Cetak Frame Group 12R", category: "CETAK & FRAME", emoji: "🖼️", isDefault: true },
      ];
    }

    // 4. FAMILY / COUPLE
    if (cat === "Family" || cat === "Couple" || name.includes("family") || name.includes("couple")) {
      return [
        { id: "inc-time-40", name: "Sesi Foto 40 Menit", category: "INCLUSIONS", emoji: "⏱️", isDefault: true },
        { id: "inc-all-soft", name: "All Files Digital HD", category: "INCLUSIONS", emoji: "💾", isDefault: true },
        { id: "inc-outfit-2", name: "Maksimal 2 Outfit", category: "INCLUSIONS", emoji: "👗", isDefault: true },
        { id: "inc-frame-10r", name: "Cetak Frame 10RP", category: "CETAK & FRAME", emoji: "🖼️", isDefault: true },
        { id: "inc-retouch-all", name: "Full Retouching Halus", category: "INCLUSIONS", emoji: "✨", isDefault: true },
        { id: "inc-bg-warm", name: "Warm Ambient Studio", category: "BACKGROUND", emoji: "🟤", isDefault: true },
      ];
    }

    // 5. PAS FOTO / SINGLE
    if (cat === "Pas Foto" || cat === "Single" || name.includes("pas foto") || name.includes("single")) {
      return [
        { id: "inc-time-15", name: "Sesi Cepat 15 Menit", category: "INCLUSIONS", emoji: "⏱️", isDefault: true },
        { id: "inc-all-soft", name: "File Digital HD Ready", category: "INCLUSIONS", emoji: "💾", isDefault: true },
        { id: "inc-print-pas", name: "Cetak Pas Foto 4x6 / 3x4", category: "CETAK & FRAME", emoji: "👔", isDefault: true },
        { id: "inc-bg-change", name: "Ganti Warna Background", category: "BACKGROUND", emoji: "🎨", isDefault: true },
        { id: "inc-retouch-face", name: "Face Retouching Alami", category: "INCLUSIONS", emoji: "✨", isDefault: true },
      ];
    }

    // 6. PAKET KOMBO / BUNDLING DEFAULT
    return [
      { id: "inc-all-soft", name: "All Files Digital HD", category: "INCLUSIONS", emoji: "💾", isDefault: true },
      { id: "inc-frame-10r", name: "Cetak Frame Eksklusif", category: "CETAK & FRAME", emoji: "🖼️", isDefault: true },
      { id: "inc-bg-solid", name: "Pilihan Background Bebas", category: "BACKGROUND", emoji: "🎨", isDefault: true },
      { id: "inc-retouch-5", name: "Full Edit & Retouching", category: "INCLUSIONS", emoji: "✨", isDefault: true },
      { id: "inc-direct", name: "Pengarah Gaya Studio", category: "INCLUSIONS", emoji: "📸", isDefault: true },
    ];
  }, [product]);

  // Selected Ingredients State
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientOption[]>([]);

  // Reset selected ingredients when modal opens or product changes
  React.useEffect(() => {
    if (product) {
      setSelectedIngredients(defaultComponents);
      setViewMode("OVERVIEW");
    }
  }, [product, defaultComponents]);

  // Available Customization Groups
  const categoriesList = ["SESI & FILE", "ADD-ON ORANG", "BACKGROUND", "CETAK & FRAME"];
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("ADD-ON ORANG");

  // Master options available to select in photo studio
  const allAvailableOptions: IngredientOption[] = useMemo(() => {
    return [
      // ─── SESI & FILE ──────────────────────────────
      { id: "extra-time-15", name: "Tambah Waktu Sesi 15 Menit", category: "SESI & FILE", emoji: "⏱️", priceExtra: 50000 },
      { id: "extra-retouch-all", name: "Retouching Semua Foto (All Files)", category: "SESI & FILE", emoji: "✨", priceExtra: 75000 },
      { id: "extra-flashdisk", name: "Flashdisk USB 16GB Eksklusif", category: "SESI & FILE", emoji: "💾", priceExtra: 65000 },
      { id: "extra-express", name: "Express Edit (Same Day 3 Jam)", category: "SESI & FILE", emoji: "⚡", priceExtra: 50000 },

      // ─── ADD-ON ORANG ─────────────────────────────
      { id: "extra-pax-grad-1", name: "+1 Orang (Wisuda / Graduation)", category: "ADD-ON ORANG", emoji: "🎓", priceExtra: 20000 },
      { id: "extra-pax-grad-2", name: "+2 Orang (Wisuda / Graduation)", category: "ADD-ON ORANG", emoji: "🎓", priceExtra: 40000 },
      { id: "extra-pax-foxe-1", name: "+1 Orang (Photofox Box)", category: "ADD-ON ORANG", emoji: "📸", priceExtra: 25000 },
      { id: "extra-pax-foxe-2", name: "+2 Orang (Photofox Box)", category: "ADD-ON ORANG", emoji: "📸", priceExtra: 50000 },
      { id: "extra-pax-family", name: "+1 Orang (Family / Group)", category: "ADD-ON ORANG", emoji: "👥", priceExtra: 30000 },

      // ─── BACKGROUND ───────────────────────────────
      { id: "bg-white", name: "Background White Seamless", category: "BACKGROUND", emoji: "⚪" },
      { id: "bg-grey", name: "Background Minimalist Grey", category: "BACKGROUND", emoji: "🔘" },
      { id: "bg-warm", name: "Background Warm Almond", category: "BACKGROUND", emoji: "🟤" },
      { id: "extra-theme-foxe", name: "Tambah Tema Photofox (+1 Background)", category: "BACKGROUND", emoji: "🎨", priceExtra: 100000 },
      { id: "extra-theme-group", name: "Tambah Tema Large Group (+1 Theme)", category: "BACKGROUND", emoji: "🎭", priceExtra: 175000 },

      // ─── CETAK & FRAME ────────────────────────────
      { id: "extra-frame-10r", name: "Cetak Frame 10RP Tambahan", category: "CETAK & FRAME", emoji: "🖼️", priceExtra: 65000 },
      { id: "extra-frame-12r", name: "Cetak Frame 12R Premium", category: "CETAK & FRAME", emoji: "🖼️", priceExtra: 95000 },
      { id: "extra-strip-4r", name: "Cetak Foto Strip 4R (+1 Lembar)", category: "CETAK & FRAME", emoji: "🎞️", priceExtra: 15000 },
      { id: "extra-album-mini", name: "Hardcover Photo Book Mini", category: "CETAK & FRAME", emoji: "📖", priceExtra: 150000 },
    ];
  }, []);

  // Toggle selection of an ingredient
  const handleToggleIngredient = (item: IngredientOption) => {
    const isSelected = selectedIngredients.some((i) => i.id === item.id);
    if (isSelected) {
      setSelectedIngredients(selectedIngredients.filter((i) => i.id !== item.id));
    } else {
      setSelectedIngredients([...selectedIngredients, item]);
    }
  };

  const handleRemoveSelected = (id: string) => {
    setSelectedIngredients(selectedIngredients.filter((i) => i.id !== id));
  };

  // Calculate Extra Price
  const extraPrice = useMemo(() => {
    return selectedIngredients.reduce((sum, item) => sum + (item.priceExtra || 0), 0);
  }, [selectedIngredients]);

  const finalPrice = (product?.price || 0) + extraPrice;

  // Compile notes from selected ingredients
  const notesString = useMemo(() => {
    return selectedIngredients.map((i) => i.name).join(", ");
  }, [selectedIngredients]);

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-0 md:p-4 overflow-y-auto">
      {/* MOBILE FULLSCREEN / DESKTOP SHELL */}
      <div className="bg-zinc-900 text-white w-full max-w-md min-h-screen md:min-h-[750px] md:max-h-[92vh] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col justify-between border border-zinc-800 relative font-sans">
        
        {/* ========================================================= */}
        {/* SCREEN 1: PRODUCT OVERVIEW & INCLUSION GRID              */}
        {/* ========================================================= */}
        {viewMode === "OVERVIEW" && (
          <div className="flex-1 flex flex-col justify-between p-5 md:p-6 overflow-y-auto">
            <div className="space-y-4">
              {/* Header with Close (X) Icon */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all shadow-xs cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300">
                  <span>{product.category}</span>
                </div>
              </div>

              {/* Hero Studio Visual Presentation */}
              <div className="py-2 flex justify-center items-center">
                <div className="relative w-60 h-60 md:w-64 md:h-64 rounded-full bg-zinc-950 p-4 shadow-xl border-4 border-zinc-800 flex items-center justify-center">
                  <div className="text-center space-y-1">
                    <span className="text-7xl md:text-8xl block drop-shadow-md select-none">
                      {product.isPackage
                        ? "🎁"
                        : product.category === "Graduation"
                        ? "🎓"
                        : product.category === "Photofox"
                        ? "📸"
                        : product.category === "Family"
                        ? "👨‍👩‍👧‍👦"
                        : product.category === "Couple"
                        ? "💑"
                        : product.category === "Group"
                        ? "👥"
                        : product.category === "Pas Foto"
                        ? "👔"
                        : "📷"}
                    </span>
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      {product.isPackage ? "Paket Kombo Wisuda" : "Official Studio Package"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1 pt-1">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  {product.name}
                </h2>
                <div className="flex items-center gap-2 text-sm md:text-base font-semibold text-zinc-300">
                  <span className="text-white font-mono font-bold">Rp {finalPrice.toLocaleString("id-ID")}</span>
                  <span>—</span>
                  <span className="text-xs text-zinc-400 font-normal">
                    {product.calories || (product.isPackage ? "Kombo Hemat Lengkap" : "Professional Lighting & Retouching")}
                  </span>
                </div>
              </div>

              {/* Components / Inclusions 3-Column Grid */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Fasilitas & Layanan Termasuk:
                  </span>
                  <span className="text-[11px] text-zinc-300 font-semibold">
                    {selectedIngredients.length} item
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {selectedIngredients.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 rounded-2xl p-3 flex flex-col items-center justify-center text-center aspect-square shadow-xs transition-all"
                    >
                      <div className="mb-2">
                        <IngredientIcon item={item} />
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-200 leading-tight line-clamp-2">
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Floating Action Bar (Modify & Add to invoice) */}
            <div className="pt-6 pb-2 flex items-center gap-3">
              {/* Modify Button */}
              <button
                type="button"
                onClick={() => setViewMode("MODIFY")}
                className="flex-1 py-3.5 px-5 rounded-full border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm shadow-xs transition-all cursor-pointer text-center"
              >
                Kustom / Add-On
              </button>

              {/* Add to Bag Button */}
              <button
                type="button"
                onClick={() => {
                  onAddToCart(product, selectedIngredients, finalPrice, notesString);
                  onClose();
                }}
                className="flex-1 py-3.5 px-5 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm shadow-xs transition-all cursor-pointer text-center"
              >
                Pilih Sesi Ini
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 2: MODIFY / CUSTOMIZATION INTERACTIVE VIEW        */}
        {/* ========================================================= */}
        {viewMode === "MODIFY" && (
          <div className="flex-1 flex flex-col justify-between p-5 md:p-6 overflow-y-auto">
            <div className="space-y-4">
              {/* Header Title & Subtitle */}
              <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  {product.name}
                </h2>
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                  <span className="font-mono text-white font-bold">Rp {finalPrice.toLocaleString("id-ID")}</span>
                  <span>—</span>
                  <span className="text-xs text-zinc-400 font-normal">
                    {extraPrice > 0 ? `+Rp ${extraPrice.toLocaleString("id-ID")} Add-On` : "Fasilitas Standar"}
                  </span>
                </div>
              </div>

              {/* Live Active Selected Chips */}
              <div className="pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Item & Add-On Terpilih:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {selectedIngredients.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-200 shadow-xs"
                    >
                      <span>{item.emoji}</span>
                      <span>{item.name}</span>
                      {item.priceExtra ? (
                        <span className="text-[10px] text-zinc-400 font-mono">
                          (+{item.priceExtra / 1000}k)
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleRemoveSelected(item.id)}
                        className="ml-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {categoriesList.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategoryTab(cat)}
                      className={`text-xs font-bold uppercase tracking-wider py-1.5 px-3 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                        activeCategoryTab === cat
                          ? "bg-white text-zinc-950 font-bold shadow-xs"
                          : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800 hover:bg-zinc-800"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Available Options 3-Column Selectable Grid */}
              <div className="pt-2 max-h-[320px] overflow-y-auto pr-1">
                <div className="grid grid-cols-3 gap-2.5">
                  {allAvailableOptions
                    .filter((opt) => opt.category === activeCategoryTab)
                    .map((item) => {
                      const isSelected = selectedIngredients.some((i) => i.id === item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleIngredient(item)}
                          className={`rounded-2xl p-2.5 flex flex-col items-center justify-between text-center aspect-square transition-all cursor-pointer relative select-none ${
                            isSelected
                              ? "bg-zinc-800 border-2 border-white text-white shadow-sm"
                              : "bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 shadow-xs"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white text-zinc-950 flex items-center justify-center font-bold">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}

                          <div className="pt-2">
                            <IngredientIcon item={item} />
                          </div>

                          <div className="w-full">
                            <span className="text-[10px] font-bold text-zinc-200 leading-tight line-clamp-2 block">
                              {item.name}
                            </span>
                            {item.priceExtra && (
                              <span className="text-[9px] font-mono font-bold text-zinc-400 block mt-0.5">
                                +Rp {item.priceExtra.toLocaleString("id-ID")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Bottom Actions: Cancel & Done */}
            <div className="pt-4 pb-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode("OVERVIEW")}
                className="flex-1 py-3 px-5 rounded-full border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm shadow-xs transition-all cursor-pointer text-center"
              >
                Kembali
              </button>

              <button
                type="button"
                onClick={() => setViewMode("OVERVIEW")}
                className="flex-1 py-3 px-5 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm shadow-xs transition-all cursor-pointer text-center"
              >
                Selesai Kustom
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
