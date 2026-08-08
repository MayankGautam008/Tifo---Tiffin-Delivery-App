// src/pages/seller-menu.tsx
// Shows a single seller's full menu (all their meals & tiffins) in a
// dedicated page, with a sticky category bar that appears once the user
// scrolls into the item list — clicking a category jumps straight to it.
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Search,
  Star,
  MapPin,
  Clock,
  PackageCheck,
  Plus,
  Minus,
  Menu as MenuIcon,
  X,
} from "lucide-react";
import type { TiffinWithSeller } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80";

// ---------------------------------------------------------------------------
// Category detection — the data model only stores Veg/Non-Veg/Jain, so we
// derive friendlier menu categories (Pizza, Burger, Biryani...) from each
// item's title/description. Anything that doesn't match a known keyword
// falls back into "Other Items".
// ---------------------------------------------------------------------------
const CATEGORY_KEYWORDS: Array<[string, string[]]> = [
  ["Pizza", ["pizza"]],
  ["Burgers", ["burger"]],
  ["Biryani & Rice", ["biryani", "pulao", "fried rice"]],
  ["Thali", ["thali"]],
  ["Chinese", ["noodles", "manchurian", "chowmein", "chinese", "momo"]],
  ["Rolls & Wraps", ["roll", "wrap", "frankie"]],
  ["South Indian", ["dosa", "idli", "uttapam", "vada", "sambar"]],
  ["Chaat & Snacks", ["chaat", "samosa", "pakora", "snack", "tikki"]],
  ["Sandwiches", ["sandwich"]],
  ["Beverages", ["shake", "juice", "lassi", "chai", "coffee", "drink"]],
  ["Desserts", ["sweet", "dessert", "ice cream", "kheer", "halwa", "cake"]],
  ["Tiffin & Meals", ["tiffin", "meal", "dal", "sabzi", "roti", "curry", "paneer", "chicken", "rice", "thali"]],
];

function getCategoryForItem(item: TiffinWithSeller): string {
  const text = `${item.title} ${item.description || ""}`.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => text.includes(k))) return category;
  }
  return "Other Items";
}

// Small deterministic "pseudo" ETA/distance so the header always shows the
// same numbers for the same seller instead of a real (unavailable) geo feed.
function pseudoFromId(id: string, min: number, max: number) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return min + (hash % (max - min + 1));
}

export default function SellerMenu() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { items: cartItems, addItem, updateQuantity, removeItem } = useCart();
  const { toast } = useToast();

  const { data: allItems = [], isLoading } = useQuery<TiffinWithSeller[]>({
    queryKey: ["/api/tiffins"],
  });

  const sellerItems = useMemo(
    () => allItems.filter((i) => i.seller?._id === id),
    [allItems, id]
  );
  const seller = sellerItems[0]?.seller;

  const [dietFilter, setDietFilter] = useState<"all" | "veg" | "nonveg">("all");
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [showJumpMenu, setShowJumpMenu] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("");

  const filteredItems = useMemo(() => {
    return sellerItems.filter((item) => {
      if (dietFilter === "veg" && item.category === "Non-Veg") return false;
      if (dietFilter === "nonveg" && item.category !== "Non-Veg") return false;
      if (query.trim() && !item.title.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [sellerItems, dietFilter, query]);

  // Group into categories, preserving the order categories first appear in.
  const grouped = useMemo(() => {
    const map = new Map<string, TiffinWithSeller[]>();
    for (const item of filteredItems) {
      const cat = getCategoryForItem(item);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries());
  }, [filteredItems]);

  const categoryNames = grouped.map(([name]) => name);

  // Sentinel placed right above the item list — once it scrolls out of
  // view, the category chip bar becomes sticky (mirrors the annotated
  // screenshots: scroll to the meals, and the category bar sticks up top).
  const sentinelRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const STICKY_OFFSET = 52; // height of the sticky bar itself

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-1px 0px 0px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [grouped.length]);

  useEffect(() => {
    if (categoryNames.length && !activeCategory) setActiveCategory(categoryNames[0]);
  }, [categoryNames, activeCategory]);

  useEffect(() => {
    const sections = Object.entries(sectionRefs.current).filter(([, el]) => el);
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cat = (entry.target as HTMLElement).dataset.category;
            if (cat) setActiveCategory(cat);
          }
        });
      },
      { rootMargin: `-${STICKY_OFFSET + 10}px 0px -70% 0px`, threshold: 0 }
    );
    sections.forEach(([, el]) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [grouped.length]);

  const scrollToCategory = useCallback((cat: string) => {
    const el = sectionRefs.current[cat];
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET - 8;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    setActiveCategory(cat);
    setShowJumpMenu(false);
  }, []);

  const cartQtyFor = (tiffinId: string) =>
    cartItems.find((i) => i.tiffinId === tiffinId)?.quantity || 0;

  const handleAdd = (item: TiffinWithSeller) => {
    if (!isAuthenticated) {
      toast({ title: "Login Required", description: "Please login to add items to your cart", variant: "destructive" });
      setLocation("/login");
      return;
    }
    const existing = cartItems.find((i) => i.tiffinId === item._id);
    if (existing) {
      updateQuantity(existing.cartItemId, existing.quantity + 1);
      return;
    }
    const deliveryCharge = 19;
    addItem({
      tiffinId: item._id,
      sellerId: item.sellerId,
      tiffinTitle: item.title,
      bookingType: "single",
      date: new Date().toISOString().split("T")[0],
      slot: "Instant Delivery - ASAP",
      quantity: 1,
      basePrice: item.price,
      addOnsPrice: 0,
      deliveryCharge,
      discountAmount: 0,
      totalPrice: item.price + deliveryCharge,
    });
    toast({ title: "Added to Cart", description: `${item.title} has been added to your cart.` });
  };

  const handleDecrement = (item: TiffinWithSeller) => {
    const existing = cartItems.find((i) => i.tiffinId === item._id);
    if (!existing) return;
    if (existing.quantity <= 1) removeItem(existing.cartItemId);
    else updateQuantity(existing.cartItemId, existing.quantity - 1);
  };

  const etaMins = seller ? pseudoFromId(seller._id, 20, 40) : 25;
  const distanceKm = seller ? (pseudoFromId(seller._id, 10, 45) / 10).toFixed(1) : "2.0";
  const rating = seller?.ratingStats?.averageRating || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-4 space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (!isLoading && sellerItems.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-bold text-gray-800">This seller isn't available right now.</p>
        <button
          onClick={() => setLocation("/")}
          className="px-5 py-2 rounded-full bg-red-600 text-white font-semibold text-sm"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 pt-3 pb-2">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setLocation("/")}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4 text-gray-700" />
            </button>
            {showSearch ? (
              <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search in ${seller?.shopName || "menu"}`}
                  className="bg-transparent outline-none text-sm flex-1"
                />
                <button onClick={() => { setShowSearch(false); setQuery(""); }}>
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <h1 className="font-extrabold text-lg text-gray-900 truncate">{seller?.shopName}</h1>
                </div>
                <button
                  onClick={() => setShowSearch(true)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"
                  aria-label="Search this menu"
                >
                  <Search className="w-4 h-4 text-gray-700" />
                </button>
              </>
            )}
          </div>

          {!showSearch && (
            <>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>{distanceKm} km · {seller?.city || seller?.address}</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3 fill-white" />
                  {rating > 0 ? rating.toFixed(1) : "New"}
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
                  <Clock className="w-3.5 h-3.5" />
                  {etaMins}-{etaMins + 5} mins
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <PackageCheck className="w-3.5 h-3.5" />
                  No packaging charges
                </span>
              </div>

              {/* Diet filter chips */}
              <div className="flex gap-2 mt-2.5 overflow-x-auto hide-scrollbar">
                {[
                  { key: "all", label: "All" },
                  { key: "veg", label: "🟢 Veg" },
                  { key: "nonveg", label: "🔺 Non-Veg" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setDietFilter(f.key as typeof dietFilter)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${
                      dietFilter === f.key
                        ? "bg-red-50 border-red-500 text-red-600"
                        : "bg-white border-gray-200 text-gray-700"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sentinel: when this leaves view, the category bar sticks to top */}
      <div ref={sentinelRef} />

      {/* Sticky category bar */}
      {categoryNames.length > 1 && (
        <div
          className={`sticky top-[0px] z-30 bg-white border-b border-gray-100 transition-shadow ${
            isSticky ? "shadow-md" : ""
          }`}
          style={{ top: 0 }}
        >
          <div className="max-w-3xl mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto hide-scrollbar">
            {categoryNames.map((cat) => (
              <button
                key={cat}
                onClick={() => scrollToCategory(cat)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu list */}
      <div className="max-w-3xl mx-auto px-4 pt-3">
        {grouped.length === 0 && (
          <p className="text-center text-gray-500 py-10 text-sm">No items match your filters.</p>
        )}
        {grouped.map(([cat, items]) => (
          <div
            key={cat}
            ref={(el) => { sectionRefs.current[cat] = el; }}
            data-category={cat}
            className="mb-6 scroll-mt-[110px]"
          >
            <h2 className="font-extrabold text-gray-900 text-base mb-2">{cat}</h2>
            <div className="space-y-3">
              {items.map((item) => {
                const qty = cartQtyFor(item._id);
                return (
                  <div
                    key={item._id}
                    className="flex items-start justify-between gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <span
                        className={`inline-flex items-center justify-center w-3.5 h-3.5 border rounded-sm mb-1 ${
                          item.category === "Non-Veg" ? "border-red-600" : "border-green-600"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.category === "Non-Veg" ? "bg-red-600" : "bg-green-600"
                          }`}
                        />
                      </span>
                      <p className="font-bold text-gray-900 text-sm leading-tight">{item.title}</p>
                      <p className="text-sm font-semibold text-gray-800 mt-1">₹{item.price}</p>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <div className="relative flex-shrink-0 w-24">
                      <img
                        src={item.imageUrl || FALLBACK_IMG}
                        alt={item.title}
                        className="w-24 h-24 object-cover rounded-xl border border-gray-100"
                      />
                      {qty === 0 ? (
                        <button
                          onClick={() => handleAdd(item)}
                          className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white border border-green-600 text-green-700 font-extrabold text-xs px-4 py-1.5 rounded-lg shadow-sm"
                        >
                          ADD
                        </button>
                      ) : (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white border border-green-600 rounded-lg shadow-sm flex items-center gap-2 px-1.5 py-1">
                          <button onClick={() => handleDecrement(item)} className="text-green-700">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-green-700 w-3 text-center">{qty}</span>
                          <button onClick={() => handleAdd(item)} className="text-green-700">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {item.addOns && item.addOns.length > 0 && (
                        <p className="text-[9px] text-gray-400 text-center mt-2.5">customisable</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Floating jump-to-category menu button */}
      {categoryNames.length > 1 && (
        <div className="fixed bottom-5 right-5 z-40">
          {showJumpMenu && (
            <div className="absolute bottom-14 right-0 bg-gray-900 text-white rounded-xl shadow-xl p-2 w-48 max-h-64 overflow-y-auto">
              {categoryNames.map((cat) => (
                <button
                  key={cat}
                  onClick={() => scrollToCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between ${
                    activeCategory === cat ? "bg-white/10 text-red-400" : "text-white"
                  }`}
                >
                  {cat}
                  <span className="text-gray-400 text-[10px]">
                    {grouped.find(([c]) => c === cat)?.[1].length}
                  </span>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowJumpMenu((v) => !v)}
            className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg"
          >
            {showJumpMenu ? <X className="w-4 h-4" /> : <MenuIcon className="w-4 h-4" />}
            Menu
          </button>
        </div>
      )}
    </div>
  );
}
