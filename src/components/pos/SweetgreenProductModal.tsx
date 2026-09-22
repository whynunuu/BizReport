"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Plus,
  Check,
  Coffee,
  Sparkles,
  Flame,
  Leaf,
  Apple,
  Cookie,
  Droplets,
  Nut,
  Wheat,
  UtensilsCrossed,
  Layers,
  Heart,
  ChevronRight,
} from "lucide-react";

export interface IngredientOption {
  id: string;
  name: string;
  category: string; // "BASES" | "TOPPINGS" | "PREMIUMS" | "DRESSINGS" | "KOMPONEN" | "SUGAR" | "MILK"
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

// Visual Food/Ingredient Icon Helper
function IngredientIcon({ item }: { item: IngredientOption }) {
  if (item.emoji) {
    return <span className="text-3xl drop-shadow-xs">{item.emoji}</span>;
  }

  switch (item.category) {
    case "BASES":
      return <Leaf className="w-8 h-8 text-emerald-600 drop-shadow-xs" />;
    case "TOPPINGS":
      return <Apple className="w-8 h-8 text-amber-600 drop-shadow-xs" />;
    case "PREMIUMS":
      return <Flame className="w-8 h-8 text-rose-600 drop-shadow-xs" />;
    case "DRESSINGS":
      return <Droplets className="w-8 h-8 text-orange-500 drop-shadow-xs" />;
    case "MILK":
      return <Droplets className="w-8 h-8 text-sky-500 drop-shadow-xs" />;
    case "SUGAR":
      return <Sparkles className="w-8 h-8 text-amber-500 drop-shadow-xs" />;
    default:
      return <Coffee className="w-8 h-8 text-amber-800 drop-shadow-xs" />;
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

  // Generate Default & Available Ingredients based on product
  const defaultComponents = useMemo(() => {
    if (!product) return [];

    // Jika produk salad/bowl
    if (product.category === "Food" || product.name.toLowerCase().includes("bowl") || product.name.toLowerCase().includes("chicken")) {
      return [
        { id: "romaine", name: "Romaine", category: "BASES", emoji: "🥬", isDefault: true },
        { id: "spring-mix", name: "Spring Mix", category: "BASES", emoji: "🌿", isDefault: true },
        { id: "sweet-potato", name: "Roasted Sweet Potato", category: "TOPPINGS", emoji: "🍠", isDefault: true },
        { id: "almonds", name: "Almonds", category: "TOPPINGS", emoji: "🥜", isDefault: true },
        { id: "apples", name: "Apples", category: "TOPPINGS", emoji: "🍎", isDefault: true },
        { id: "brussels", name: "2 Roasted Brussels Sprouts", category: "TOPPINGS", emoji: "🥦", isDefault: true },
      ];
    }

    // Jika Paket Bundling
    if (product.isPackage) {
      return [
        { id: "kopi-susu", name: "Kopi Susu Gula Aren", category: "KOMPONEN", emoji: "☕", isDefault: true },
        { id: "croissant", name: "Butter Croissant", category: "KOMPONEN", emoji: "🥐", isDefault: true },
        { id: "fresh-milk", name: "Fresh Milk", category: "MILK", emoji: "🥛", isDefault: true },
        { id: "normal-sugar", name: "Normal Sugar (100%)", category: "SUGAR", emoji: "✨", isDefault: true },
        { id: "normal-ice", name: "Normal Ice", category: "TOPPINGS", emoji: "🧊", isDefault: true },
      ];
    }

    // Default Minuman Kopi / Minuman
    return [
      { id: "espresso", name: "Double Shot Espresso", category: "KOMPONEN", emoji: "☕", isDefault: true },
      { id: "fresh-milk", name: "Fresh Milk", category: "MILK", emoji: "🥛", isDefault: true },
      { id: "gula-aren", name: "Gula Aren Organik", category: "SUGAR", emoji: "🍯", isDefault: true },
      { id: "ice", name: "Cube Ice", category: "TOPPINGS", emoji: "🧊", isDefault: true },
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
  const categoriesList = useMemo(() => {
    if (!product) return [];
    if (product.category === "Food" || product.name.toLowerCase().includes("chicken") || product.name.toLowerCase().includes("bowl")) {
      return ["BASES", "TOPPINGS", "PREMIUMS", "DRESSINGS"];
    }
    return ["KOMPONEN", "SUGAR", "MILK", "EXTRA"];
  }, [product]);

  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("TOPPINGS");

  // Master options available to select
  const allAvailableOptions: IngredientOption[] = useMemo(() => {
    if (!product) return [];
    if (product.category === "Food" || product.name.toLowerCase().includes("chicken") || product.name.toLowerCase().includes("bowl")) {
      return [
        // BASES
        { id: "romaine", name: "Romaine", category: "BASES", emoji: "🥬" },
        { id: "spring-mix", name: "Spring Mix", category: "BASES", emoji: "🌿" },
        { id: "spinach", name: "Baby Spinach", category: "BASES", emoji: "🍃" },
        { id: "warm-quinoa", name: "Warm Quinoa", category: "BASES", emoji: "🥣" },
        { id: "brown-rice", name: "Brown Rice", category: "BASES", emoji: "🍚" },

        // TOPPINGS
        { id: "raisins", name: "Raisins", category: "TOPPINGS", emoji: "🍇" },
        { id: "apples", name: "Apples", category: "TOPPINGS", emoji: "🍎" },
        { id: "basil", name: "Basil", category: "TOPPINGS", emoji: "🌱" },
        { id: "carrots", name: "Carrots", category: "TOPPINGS", emoji: "🥕" },
        { id: "chickpeas", name: "Chickpeas", category: "TOPPINGS", emoji: "🧆" },
        { id: "cilantro", name: "Cilantro", category: "TOPPINGS", emoji: "☘️" },
        { id: "sweet-potato", name: "Roasted Sweet Potato", category: "TOPPINGS", emoji: "🍠" },
        { id: "almonds", name: "Almonds", category: "TOPPINGS", emoji: "🥜" },
        { id: "brussels", name: "2 Roasted Brussels Sprouts", category: "TOPPINGS", emoji: "🥦" },

        // PREMIUMS
        { id: "roasted-chicken", name: "Roasted Chicken", category: "PREMIUMS", emoji: "🍗", priceExtra: 15000 },
        { id: "avocado", name: "Fresh Avocado", category: "PREMIUMS", emoji: "🥑", priceExtra: 12000 },
        { id: "hard-egg", name: "Hard Boiled Egg", category: "PREMIUMS", emoji: "🥚", priceExtra: 7000 },
        { id: "parmesan", name: "Parmesan Crisp", category: "PREMIUMS", emoji: "🧀", priceExtra: 9000 },

        // DRESSINGS
        { id: "balsamic", name: "Balsamic Vinaigrette", category: "DRESSINGS", emoji: "🍶" },
        { id: "caesar", name: "Creamy Caesar", category: "DRESSINGS", emoji: "🥣" },
        { id: "goddess", name: "Green Goddess Ranch", category: "DRESSINGS", emoji: "🥑" },
      ];
    }

    // Pilihan Minuman / FnB Cafe / Paket
    return [
      // KOMPONEN
      { id: "kopi-susu", name: "Kopi Susu Gula Aren", category: "KOMPONEN", emoji: "☕" },
      { id: "croissant", name: "Butter Croissant", category: "KOMPONEN", emoji: "🥐" },
      { id: "fries", name: "Truffle Cheese Fries", category: "KOMPONEN", emoji: "🍟" },
      { id: "cinnamon", name: "Cinnamon Roll", category: "KOMPONEN", emoji: "🥨" },

      // SUGAR
      { id: "sugar-100", name: "Normal Sugar (100%)", category: "SUGAR", emoji: "✨" },
      { id: "sugar-50", name: "Less Sugar (50%)", category: "SUGAR", emoji: "🍯" },
      { id: "sugar-0", name: "No Sugar (0%)", category: "SUGAR", emoji: "🚫" },
      { id: "sugar-extra", name: "Extra Aren (+Rp 3k)", category: "SUGAR", emoji: "🤎", priceExtra: 3000 },

      // MILK
      { id: "fresh-milk", name: "Fresh Milk (Dairy)", category: "MILK", emoji: "🥛" },
      { id: "oatmilk", name: "Oat Milk Oatly (+Rp 6k)", category: "MILK", emoji: "🌾", priceExtra: 6000 },
      { id: "almond-milk", name: "Almond Milk (+Rp 8k)", category: "MILK", emoji: "🥜", priceExtra: 8000 },

      // EXTRA
      { id: "extra-shot", name: "Extra Espresso Shot", category: "EXTRA", emoji: "☕", priceExtra: 6000 },
      { id: "ice-cream", name: "Vanilla Ice Cream", category: "EXTRA", emoji: "🍨", priceExtra: 10000 },
      { id: "caramel-sauce", name: "Caramel Drizzle", category: "EXTRA", emoji: "🍯", priceExtra: 4000 },
    ];
  }, [product]);

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 md:p-4 overflow-y-auto">
      {/* MOBILE FULLSCREEN / DESKTOP PHONE SHELL (Matching Screenshot Aspect) */}
      <div className="bg-[#F8F5EE] text-[#1E2320] w-full max-w-md min-h-screen md:min-h-[750px] md:max-h-[92vh] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col justify-between border border-[#E8E2D5] relative font-sans">
        
        {/* ========================================================= */}
        {/* SCREEN 1: PRODUCT OVERVIEW & INGREDIENT/COMPONENT GRID   */}
        {/* ========================================================= */}
        {viewMode === "OVERVIEW" && (
          <div className="flex-1 flex flex-col justify-between p-5 md:p-6 overflow-y-auto">
            <div className="space-y-4">
              {/* Header with Close (X) Icon */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/90 border border-[#E5DFD3] flex items-center justify-center text-[#2C322E] hover:bg-white transition-all shadow-xs cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAE4D7] text-xs font-semibold text-[#4F5952]">
                  <span>{product.category}</span>
                </div>
              </div>

              {/* Hero Food Visual Presentation with Soft Warm Lighting */}
              <div className="py-2 flex justify-center items-center">
                <div className="relative w-60 h-60 md:w-64 md:h-64 rounded-full bg-gradient-to-b from-[#FFFDF9] to-[#F1EBE0] p-4 shadow-xl border-4 border-white flex items-center justify-center">
                  <div className="text-center space-y-1">
                    <span className="text-7xl md:text-8xl block drop-shadow-md select-none">
                      {product.isPackage ? "🍱" : product.category === "Coffee" ? "☕" : product.category === "Pastry" ? "🥐" : "🥗"}
                    </span>
                    <span className="text-[11px] font-bold text-[#647167] uppercase tracking-wider block">
                      {product.isPackage ? "Paket Bundling" : "Chef Selected Recipe"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1 pt-1">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#181D1A]">
                  {product.name}
                </h2>
                <div className="flex items-center gap-2 text-sm md:text-base font-semibold text-[#48534C]">
                  <span>Rp {finalPrice.toLocaleString("id-ID")}</span>
                  <span>—</span>
                  <span className="text-xs text-[#707D74] font-normal">
                    {product.calories || (product.isPackage ? "Kombo Hemat Favorit" : "485 cal • Fresh Prepared")}
                  </span>
                </div>
              </div>

              {/* Components / Ingredients 3-Column Grid */}
              <div className="pt-2">
                <div className="grid grid-cols-3 gap-2.5">
                  {selectedIngredients.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#EFE9DC] hover:bg-[#EAE2D3] border border-[#E5DDD0] rounded-2xl p-3 flex flex-col items-center justify-center text-center aspect-square shadow-2xs transition-all"
                    >
                      <div className="mb-2">
                        <IngredientIcon item={item} />
                      </div>
                      <span className="text-[11px] font-semibold text-[#232A25] leading-tight line-clamp-2">
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Floating Action Bar (Modify & Add to bag) */}
            <div className="pt-6 pb-2 flex items-center gap-3">
              {/* Modify Button (White Outline Pill) */}
              <button
                type="button"
                onClick={() => setViewMode("MODIFY")}
                className="flex-1 py-3.5 px-5 rounded-full border border-[#D5CDBC] bg-white hover:bg-[#F3EFE7] text-[#1E2320] font-bold text-sm shadow-xs transition-all cursor-pointer text-center"
              >
                Modify
              </button>

              {/* Add to Bag Button (Dark Forest Green Solid Pill) */}
              <button
                type="button"
                onClick={() => {
                  onAddToCart(product, selectedIngredients, finalPrice, notesString);
                  onClose();
                }}
                className="flex-1 py-3.5 px-5 rounded-full bg-[#183B2D] hover:bg-[#122E23] text-white font-bold text-sm shadow-md transition-all cursor-pointer text-center"
              >
                Add to bag
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
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#181D1A]">
                  {product.name}
                </h2>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#48534C]">
                  <span>Rp {finalPrice.toLocaleString("id-ID")}</span>
                  <span>—</span>
                  <span className="text-xs text-[#707D74] font-normal">
                    {product.calories || "485 cal"}
                  </span>
                </div>
              </div>

              {/* Horizontal Selected Items Preview with (x) chip tags */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F7C73]">
                  Pilihan Aktif ({selectedIngredients.length}):
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {selectedIngredients.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#EFE9DC] border border-[#E5DDD0] rounded-xl p-2 shrink-0 flex flex-col items-center justify-between w-20 h-22 relative group shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveSelected(item.id)}
                        className="absolute top-1 left-1 w-4 h-4 rounded-full bg-[#DCD4C5] text-[#475249] flex items-center justify-center text-[10px] hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                      <div className="mt-2 scale-75">
                        <IngredientIcon item={item} />
                      </div>
                      <span className="text-[9px] font-bold text-[#232A25] text-center leading-tight line-clamp-1 w-full">
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-navigation Category Tabs (BASES, TOPPINGS, PREMIUMS, DRESSINGS) */}
              <div className="border-b border-[#DFD7C8] flex items-center gap-6 overflow-x-auto no-scrollbar pt-1">
                {categoriesList.map((cat) => {
                  const isActive = activeCategoryTab === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategoryTab(cat)}
                      className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all relative cursor-pointer ${
                        isActive
                          ? "text-[#183B2D]"
                          : "text-[#818E84] hover:text-[#38423B]"
                      }`}
                    >
                      <span>{cat}</span>
                      {isActive && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#183B2D] rounded-full"></span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Section Header: e.g. Toppings (3/10) */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-bold text-[#1F2722]">
                  {activeCategoryTab} ({selectedIngredients.filter((i) => i.category === activeCategoryTab).length} dipilih)
                </span>
                <span className="text-[11px] text-[#748278]">
                  Klik untuk tambah / hapus
                </span>
              </div>

              {/* 3-Column Selectable Ingredients Grid */}
              <div className="grid grid-cols-3 gap-2.5 max-h-[290px] overflow-y-auto pr-1">
                {allAvailableOptions
                  .filter((opt) => opt.category === activeCategoryTab)
                  .map((opt) => {
                    const isSelected = selectedIngredients.some((i) => i.id === opt.id);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleToggleIngredient(opt)}
                        className={`border rounded-2xl p-3 flex flex-col items-center justify-center text-center aspect-square transition-all cursor-pointer select-none relative ${
                          isSelected
                            ? "bg-[#E6E0D1] border-[#183B2D] shadow-xs ring-2 ring-[#183B2D]/30"
                            : "bg-[#EFE9DC] hover:bg-[#EAE2D3] border-[#E5DDD0]"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#183B2D] text-white flex items-center justify-center text-[9px]">
                            ✓
                          </div>
                        )}
                        <div className="mb-1.5">
                          <IngredientIcon item={opt} />
                        </div>
                        <span className="text-[11px] font-bold text-[#232A25] leading-tight line-clamp-2">
                          {opt.name}
                        </span>
                        {opt.priceExtra ? (
                          <span className="text-[10px] font-mono text-emerald-800 font-bold mt-0.5">
                            +Rp {opt.priceExtra.toLocaleString("id-ID")}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Bottom Action Bar (Cancel & I'm done) */}
            <div className="pt-6 pb-2 flex items-center gap-3">
              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => setViewMode("OVERVIEW")}
                className="flex-1 py-3.5 px-5 rounded-full border border-[#D5CDBC] bg-white hover:bg-[#F3EFE7] text-[#1E2320] font-bold text-sm shadow-xs transition-all cursor-pointer text-center"
              >
                Cancel
              </button>

              {/* I'm done Button */}
              <button
                type="button"
                onClick={() => setViewMode("OVERVIEW")}
                className="flex-1 py-3.5 px-5 rounded-full bg-[#183B2D] hover:bg-[#122E23] text-white font-bold text-sm shadow-md transition-all cursor-pointer text-center"
              >
                I&apos;m done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
