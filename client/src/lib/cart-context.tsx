import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface CartAddOn {
  name: string;
  price: number;
  quantity: number;
}

export interface CartWeeklyCustomization {
  name: string;
  price: number;
  days: string[];
}

// One meal added to the cart. This mirrors exactly what /api/bookings expects,
// so checkout can POST each cart item straight to the existing booking route.
export interface CartItem {
  cartItemId: string;
  tiffinId: string;
  sellerId: string;
  tiffinTitle: string;
  bookingType: "single" | "trial" | "weekly" | "monthly";
  date: string;
  slot: string;
  quantity: number;
  basePrice: number;
  addOnsPrice: number;
  deliveryCharge: number;
  discountAmount: number;
  couponDiscount?: number;
  couponCode?: string;
  totalPrice: number;
  addOns?: CartAddOn[];
  weeklyCustomizations?: CartWeeklyCustomization[];
  selectedDays?: string[];
  customization?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "cartItemId">) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
}

const CART_STORAGE_KEY = "tiffo_cart";

const CartContext = createContext<CartContextType | undefined>(undefined);

function loadCartFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCartFromStorage());

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, "cartItemId">) => {
    const cartItemId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setItems((prev) => [...prev, { ...item, cartItemId }]);
  };

  const removeItem = (cartItemId: string) => {
    setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((i) => {
        if (i.cartItemId !== cartItemId) return i;
        // Re-derive price fields proportionally to the new quantity so the
        // per-unit price stays consistent when the shopper changes quantity
        // from the cart page.
        const perUnitBase = i.basePrice / i.quantity;
        const newBasePrice = Math.round(perUnitBase * quantity);
        const newTotalPrice =
          newBasePrice +
          (i.addOnsPrice || 0) +
          (i.deliveryCharge || 0) -
          (i.discountAmount || 0);
        return {
          ...i,
          quantity,
          basePrice: newBasePrice,
          totalPrice: newTotalPrice,
        };
      })
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
