// src/components/tiffin-detail.tsx
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { queryClient } from "@/lib/queryClient";
import {
  ChefHat,
  Clock,
  MapPin,
  UtensilsCrossed,
  CheckCircle2,
  Plus,
  Minus,
  Calendar,
  IndianRupee,
  CreditCard,
  Wallet,
  ArrowLeft,
  Tag,
  X,
} from "lucide-react";
import type { WeeklyCustomization, Review, AddOn, TiffinWithSeller } from "@shared/schema";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const PREDEFINED_OFFERS = [
  {
    code: "FIRST100",
    title: "Flat ₹44 Off on All Orders",
    subtitle: "Instant discount on minimum order value",
    tag: "FLAT ₹44 OFF",
  },
  {
    code: "FIRST200",
    title: "10% Off on First Order",
    subtitle: "Special welcome discount for new customers",
    tag: "10% OFF",
  },
  {
    code: "SAVE30",
    title: "30% Off on First Order",
    subtitle: "Enjoy a special discount as a limited-time reward",
    tag: "30% OFF",
  },
  {
    code: "FREEDEL",
    title: "FREE Delivery on Your Order",
    subtitle: "No delivery charges on your order",
    tag: "FREE DELIVERY",
  },
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BookingType = "single" | "trial" | "weekly" | "monthly";
type PaymentMethod = "cod" | "upi";

interface BookingData {
  tiffinId: string;
  date: string;
  slot: string;
  paymentMethod: PaymentMethod;
  quantity: number;
  totalPrice: number;
  bookingType: BookingType;
  weeklyCustomizations?: Array<{ name: string; price: number; days: string[] }>;
  addOns?: Array<{ name: string; price: number; quantity: number }>;
  selectedDays?: string[];
  customization?: string;
  couponCode?: string;
  basePrice: number;
  addOnsPrice: number;
  deliveryCharge: number;
  discountAmount: number;
  couponDiscount?: number;
}

interface SelectedAddOn {
  name: string;
  price: number;
  quantity: number;
}

interface CouponValidation {
  isValid: boolean;
  coupon?: {
    code: string;
    discountType: "fixed" | "percentage";
    discountValue: number;
    maxDiscountAmount?: number;
  };
  discountAmount: number;
  message: string;
}

interface PriceCalculation {
  basePrice: number;
  addOnsPrice: number;
  deliveryCharge: number;
  discountAmount: number;
  couponDiscount: number;
  finalAmount: number;
  couponCode?: string;
}

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------

async function apiRequest(method: string, url: string, data?: unknown) {
  const token = localStorage.getItem("token");

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(data && { body: JSON.stringify(data) }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed (${response.status})`);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Small pure helpers
// ---------------------------------------------------------------------------

function getGoogleMapsUrl(address: string, city: string) {
  const query = encodeURIComponent(`${address}, ${city}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function calculateDeliveryCharge(serviceType: string, bookingType: BookingType): number {
  if (serviceType === "meal") return 19;

  if (serviceType === "tiffin") {
    if (bookingType === "trial" || bookingType === "single") return 19;
    return 0; // weekly / monthly: free delivery
  }

  return 19;
}

function currency(amount: number) {
  return `₹${amount}`;
}

// ---------------------------------------------------------------------------
// Coupon section (input + predefined offers), lifted state, shared logic
// ---------------------------------------------------------------------------

function useCoupon(totalAmount: number) {
  const { toast } = useToast();
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);

  const validateMutation = useMutation({
    mutationFn: (couponCode: string) =>
      apiRequest("POST", "/api/coupons/validate", { couponCode, totalAmount }),
    onSuccess: (data: CouponValidation) => {
      if (data.isValid) {
        setAppliedCoupon(data);
        toast({ title: "Coupon applied", description: data.message });
      } else {
        toast({ title: "Invalid coupon", description: data.message, variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const applyCoupon = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      toast({ title: "Enter a coupon code", variant: "destructive" });
      return;
    }
    validateMutation.mutate(trimmed);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    toast({ title: "Coupon removed" });
  };

  return {
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    isApplying: validateMutation.isPending,
  };
}

function getDiscountLabel(coupon: CouponValidation) {
  if (!coupon.coupon) return "";
  const { discountType, discountValue, maxDiscountAmount } = coupon.coupon;
  return discountType === "fixed"
    ? `${currency(discountValue)} OFF`
    : `${discountValue}% OFF${maxDiscountAmount ? ` (max ${currency(maxDiscountAmount)})` : ""}`;
}

function CouponInput({
  appliedCoupon,
  isApplying,
  onApply,
  onRemove,
  onOpenOffers,
}: {
  appliedCoupon: CouponValidation | null;
  isApplying: boolean;
  onApply: (code: string) => void;
  onRemove: () => void;
  onOpenOffers: () => void;
}) {
  const [couponCode, setCouponCode] = useState("");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Coupon</label>
        <button
          type="button"
          onClick={onOpenOffers}
          className="flex items-center gap-1 text-xs font-medium text-primary"
        >
          <Tag className="h-3.5 w-3.5" />
          View offers
        </button>
      </div>

      <Card>
        <CardContent className="p-3">
          {appliedCoupon ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {appliedCoupon.coupon?.code}
                  </Badge>
                  <span className="text-sm font-medium text-green-600">
                    {getDiscountLabel(appliedCoupon)}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Discount applied</span>
                <span className="font-semibold text-green-600">
                  -{currency(appliedCoupon.discountAmount)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="h-11 flex-1"
              />
              <Button
                className="h-11"
                onClick={() => onApply(couponCode)}
                disabled={isApplying || !couponCode.trim()}
              >
                {isApplying ? "Applying…" : "Apply"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OffersSheet({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (code: string) => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-background sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h3 className="text-lg font-semibold">Available Offers</h3>
            <p className="text-xs text-muted-foreground">Tap an offer to apply it</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {PREDEFINED_OFFERS.map((offer) => (
            <button
              key={offer.code}
              type="button"
              onClick={() => {
                onSelect(offer.code);
                onClose();
              }}
              className="w-full rounded-lg border p-3 text-left transition-colors hover:border-primary"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-16 rounded bg-primary px-3 py-2 text-center text-primary-foreground">
                  <span className="text-sm font-bold">{offer.code}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold leading-tight">{offer.title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {offer.subtitle}
                  </p>
                  <span className="mt-2 inline-block rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    {offer.tag}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="border-t p-4">
          <Button variant="secondary" className="h-11 w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Booking type selector
// ---------------------------------------------------------------------------

function BookingTypeSelector({
  serviceType,
  price,
  trialPrice,
  monthlyPrice,
  value,
  onChange,
}: {
  serviceType: string;
  price: number;
  trialPrice?: number;
  monthlyPrice?: number;
  value: BookingType;
  onChange: (type: BookingType) => void;
}) {
  if (serviceType !== "tiffin") {
    return (
      <div className="rounded-lg bg-primary/10 p-4 text-center">
        <p className="font-semibold">Single Meal Order</p>
        <p className="text-sm text-muted-foreground">{currency(price)} per meal</p>
      </div>
    );
  }

  const options: Array<{ type: BookingType; label: string; sub: string }> = [
    { type: "trial", label: "Trial", sub: currency(trialPrice || 99) },
    { type: "weekly", label: "Weekly", sub: "Custom" },
    { type: "monthly", label: "Monthly", sub: currency(monthlyPrice || 2000) },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => (
        <Button
          key={option.type}
          type="button"
          variant={value === option.type ? "default" : "outline"}
          onClick={() => onChange(option.type)}
          className="h-auto flex-col gap-0.5 py-3"
        >
          <span className="text-sm font-semibold">{option.label}</span>
          <span className="text-xs opacity-90">{option.sub}</span>
        </Button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Price summary (reused in main form and confirm dialog)
// ---------------------------------------------------------------------------

function PriceSummary({
  bookingType,
  quantity,
  selectedDaysCount,
  basePrice,
  addOnsPrice,
  weeklyCustomizationsPrice,
  deliveryCharge,
  discountAmount,
  finalAmount,
  hasAddOns,
  hasWeeklyCustomizations,
}: {
  bookingType: BookingType;
  quantity: number;
  selectedDaysCount: number;
  basePrice: number;
  addOnsPrice: number;
  weeklyCustomizationsPrice: number;
  deliveryCharge: number;
  discountAmount: number;
  finalAmount: number;
  hasAddOns: boolean;
  hasWeeklyCustomizations: boolean;
}) {
  const basePriceLabel =
    bookingType === "single"
      ? "Meal Price"
      : bookingType === "trial"
      ? "Trial Package"
      : bookingType === "monthly"
      ? "Monthly Subscription"
      : "Weekly Subscription";

  const isFreeDelivery = deliveryCharge === 0 || discountAmount > 0;

  return (
    <div className="space-y-2 border-t pt-4">
      <Row label={basePriceLabel} value={currency(basePrice)} />

      {bookingType === "weekly" && <Row label="Selected Days" value={`${selectedDaysCount} days`} />}

      <Row label="Quantity" value={String(quantity)} />

      {hasAddOns && <Row label="Add-ons" value={`+${currency(addOnsPrice)}`} />}

      {hasWeeklyCustomizations && (
        <Row label="Weekly Customizations" value={`+${currency(weeklyCustomizationsPrice)}`} />
      )}

      {isFreeDelivery ? (
        <Row label="Delivery Charge" value="FREE" valueClassName="font-semibold text-green-600" />
      ) : (
        <Row label="Delivery Charge" value={`+${currency(deliveryCharge)}`} />
      )}

      {discountAmount > 0 && (
        <Row
          label="Coupon Discount"
          value={`-${currency(discountAmount)}`}
          valueClassName="text-green-600"
        />
      )}

      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-base font-semibold">Total Amount</span>
        <span className="text-xl font-bold text-primary">{currency(finalAmount)}</span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment method selector
// ---------------------------------------------------------------------------

function PaymentMethodSelector({
  value,
  onChange,
  finalAmount,
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  finalAmount: number;
}) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium">Payment Method</h4>

      <div className="space-y-2">
        <PaymentOption
          selected={value === "upi"}
          onSelect={() => onChange("upi")}
          icon={<CreditCard className="h-5 w-5 text-green-600" />}
          title="UPI Payment"
          description="Seller collects payment via UPI on delivery."
        />
        <PaymentOption
          selected={value === "cod"}
          onSelect={() => onChange("cod")}
          icon={<Wallet className="h-5 w-5 text-orange-600" />}
          title="Cash on Delivery"
          description="Pay cash when the seller delivers your order."
        />
      </div>

      <div className="rounded-lg border bg-muted/40 p-3 text-sm">
        Seller will collect <span className="font-semibold">{currency(finalAmount)}</span> via{" "}
        {value === "upi" ? "UPI" : "cash"} on delivery. Please keep{" "}
        {value === "upi" ? "your UPI app ready" : "exact change ready"}.
      </div>
    </div>
  );
}

function PaymentOption({
  selected,
  onSelect,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border-2 p-3 text-left transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            selected ? "border-primary bg-primary" : "border-muted-foreground/40"
          }`}
        >
          {selected && <div className="h-2 w-2 rounded-full bg-white" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {icon}
            <p className="font-semibold">{title}</p>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TiffinDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("upi");
  const [quantity, setQuantity] = useState(1);
  const [selectedBookingType, setSelectedBookingType] = useState<BookingType>("single");
  const [selectedWeeklyCustomizations, setSelectedWeeklyCustomizations] = useState<WeeklyCustomization[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<SelectedAddOn[]>([]);
  const [customInstructions, setCustomInstructions] = useState("");

  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isCustomizationDialogOpen, setIsCustomizationDialogOpen] = useState(false);
  const [isAddOnsDialogOpen, setIsAddOnsDialogOpen] = useState(false);
  const [isOffersSheetOpen, setIsOffersSheetOpen] = useState(false);

  const { data: tiffin, isLoading } = useQuery<TiffinWithSeller>({
    queryKey: [`/api/tiffins/${id}`],
    enabled: !!id,
  });

  const seller = tiffin?.seller;

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: tiffin ? [`/api/tiffins/${tiffin._id}/reviews`] : [],
    enabled: !!tiffin,
  });

  // ---- derived pricing (client-side, used for the live preview) ----------

  const getBasePrice = () => {
    if (!tiffin) return 0;
    switch (selectedBookingType) {
      case "single":
        return tiffin.price * quantity;
      case "trial":
        return (tiffin.trialPrice || 99) * quantity;
      case "weekly":
        return tiffin.price * quantity * selectedDays.length;
      case "monthly":
        return tiffin.monthlyPrice || 2000 * quantity;
      default:
        return 0;
    }
  };

  const weeklyCustomizationsPrice = useMemo(
    () =>
      selectedWeeklyCustomizations.reduce((total, custom) => {
        const applicableDays = custom.days.filter((day) => selectedDays.includes(day)).length;
        return total + custom.price * applicableDays;
      }, 0),
    [selectedWeeklyCustomizations, selectedDays],
  );

  const addOnsPrice = useMemo(
    () => selectedAddOns.reduce((total, addOn) => total + addOn.price * addOn.quantity, 0),
    [selectedAddOns],
  );

  const subtotal = getBasePrice() + weeklyCustomizationsPrice + addOnsPrice;
  const deliveryCharge = tiffin ? calculateDeliveryCharge(tiffin.serviceType, selectedBookingType) : 0;

  const { appliedCoupon, applyCoupon, removeCoupon, isApplying } = useCoupon(subtotal);

  // ---- server-side authoritative price calculation ------------------------

  const [priceCalculation, setPriceCalculation] = useState<PriceCalculation | null>(null);

  const calculatePriceMutation = useMutation({
    mutationFn: (bookingData: unknown) => apiRequest("POST", "/api/orders/calculate-price", bookingData),
    onSuccess: (data: PriceCalculation) => setPriceCalculation(data),
    onError: (error: Error) => console.error("Price calculation error:", error),
  });

  useEffect(() => {
    if (tiffin?.availableDays) setSelectedDays(tiffin.availableDays);
  }, [tiffin]);

  useEffect(() => {
    if (!tiffin) return;

    calculatePriceMutation.mutate({
      basePrice: getBasePrice(),
      addOns: selectedAddOns,
      weeklyCustomizations: selectedWeeklyCustomizations.map((custom) => ({
        ...custom,
        days: custom.days.filter((day) => selectedDays.includes(day)),
      })),
      deliveryCharge,
      couponCode: appliedCoupon?.coupon?.code,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiffin, selectedBookingType, quantity, selectedDays, selectedAddOns, selectedWeeklyCustomizations, appliedCoupon]);

  const finalAmount = priceCalculation?.finalAmount ?? subtotal + deliveryCharge - (appliedCoupon?.discountAmount || 0);

  // ---- booking submission --------------------------------------------------

  const bookingMutation = useMutation({
    mutationFn: (bookingData: BookingData) =>
      apiRequest("POST", "/api/bookings", {
        ...bookingData,
        customerName: user?.name || "Customer",
        customerEmail: user?.email || "",
        customerPhone: user?.phone || "",
        sellerId: tiffin?.sellerId || "",
        deliveryAddress: "Home Delivery",
        customization: customInstructions,
      }),
    onSuccess: (response: any) => {
      const rewardTokens = response?.rewardTokens || 5;
      toast({
        title: "Booking successful!",
        description: `Your order has been placed. 🎉 ${rewardTokens} tokens transferred to your wallet!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      setIsBookingDialogOpen(false);
      setLocation("/my-bookings");
    },
    onError: (error: Error) => {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    },
  });

  // ---- helpers --------------------------------------------------------------

  const requiresTimeSlot = selectedBookingType === "single" || selectedBookingType === "trial";

  const toggleWeeklyCustomization = (customization: WeeklyCustomization) => {
    setSelectedWeeklyCustomizations((prev) =>
      prev.some((c) => c.name === customization.name)
        ? prev.filter((c) => c.name !== customization.name)
        : [...prev, customization],
    );
  };

  const toggleDaySelection = (day: string) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const updateAddOnQuantity = (addOnName: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    setSelectedAddOns((prev) => {
      const existing = prev.find((a) => a.name === addOnName);
      if (existing) {
        if (newQuantity === 0) return prev.filter((a) => a.name !== addOnName);
        return prev.map((a) => (a.name === addOnName ? { ...a, quantity: newQuantity } : a));
      }
      if (newQuantity > 0) {
        const addOn = tiffin?.addOns?.find((a) => a.name === addOnName);
        if (addOn) return [...prev, { name: addOn.name, price: addOn.price, quantity: newQuantity }];
      }
      return prev;
    });
  };

  const getAddOnQuantity = (addOnName: string) =>
    selectedAddOns.find((a) => a.name === addOnName)?.quantity ?? 0;

  const handleBookNow = () => {
    if (!isAuthenticated) {
      toast({ title: "Login required", description: "Please login to book this service", variant: "destructive" });
      setLocation("/login");
      return;
    }
    if (requiresTimeSlot && !selectedSlot) {
      toast({ title: "Select a time slot", variant: "destructive" });
      return;
    }
    if (!selectedDate) {
      toast({ title: "Select a delivery date", variant: "destructive" });
      return;
    }
    if (selectedBookingType === "weekly" && selectedDays.length === 0) {
      toast({ title: "Select at least one day", variant: "destructive" });
      return;
    }
    setIsBookingDialogOpen(true);
  };

  const confirmBooking = () => {
    if (!tiffin || !selectedDate || !priceCalculation) return;

    const finalSlot = selectedSlot === "Now" ? "Instant Delivery - ASAP" : selectedSlot;

    const bookingData: BookingData = {
      tiffinId: tiffin._id,
      paymentMethod: selectedPaymentMethod,
      date: selectedDate,
      slot: finalSlot || "Flexible",
      quantity,
      totalPrice: priceCalculation.finalAmount,
      bookingType: selectedBookingType,
      basePrice: priceCalculation.basePrice,
      addOnsPrice: priceCalculation.addOnsPrice,
      deliveryCharge: priceCalculation.deliveryCharge,
      discountAmount: priceCalculation.discountAmount,
      couponDiscount: priceCalculation.couponDiscount,
      ...(selectedBookingType === "weekly" && { selectedDays }),
      ...(selectedWeeklyCustomizations.length > 0 && {
        weeklyCustomizations: selectedWeeklyCustomizations.map((custom) => ({
          name: custom.name,
          price: custom.price,
          days: custom.days.filter((day) => selectedDays.includes(day)),
        })),
      }),
      ...(selectedAddOns.length > 0 && { addOns: selectedAddOns }),
      ...(appliedCoupon?.coupon?.code && { couponCode: appliedCoupon.coupon.code }),
    };

    bookingMutation.mutate(bookingData);
  };

  const handleQuickOrderNow = () => {
    setSelectedSlot("Now");
    setSelectedDate(new Date().toISOString().split("T")[0]);
  };

  // ---- loading / not-found states --------------------------------------------

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse space-y-4 px-4 py-6">
        <div className="h-6 w-1/3 rounded bg-muted" />
        <div className="h-64 rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
      </div>
    );
  }

  if (!tiffin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <h1 className="mb-2 text-xl font-bold">Service Not Found</h1>
        <p className="mb-4 text-sm text-muted-foreground">The service you're looking for doesn't exist.</p>
        <Button onClick={() => setLocation("/")}>Back to Home</Button>
      </div>
    );
  }

  const hasAddOns = selectedAddOns.length > 0;
  const hasWeeklyCustomizations = selectedWeeklyCustomizations.length > 0;

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8">
      <div className="mx-auto max-w-5xl px-4 py-4 lg:py-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          {/* ---------------- Left column: details ---------------- */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="flex aspect-video items-center justify-center bg-muted lg:aspect-square">
                <UtensilsCrossed className="h-16 w-16 text-muted-foreground" />
              </div>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-4">
                <div>
                  <h1 className="text-xl font-bold leading-tight lg:text-2xl">{tiffin.title}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{tiffin.description}</p>
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3">
                  <IndianRupee className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{tiffin.price}</span>
                  <span className="text-sm text-muted-foreground">per meal</span>
                </div>

                {tiffin.serviceType === "meal" && tiffin.mealType && (
                  <Badge variant="outline">{tiffin.mealType} Meal</Badge>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="font-medium">Available Days</p>
                    <span className="text-xs text-muted-foreground">({tiffin.availableDays.length}/7)</span>
                  </div>
                  <WeekAvailability availableDays={tiffin.availableDays} />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="font-medium">Available Time Slots</p>
                    <span className="text-xs text-muted-foreground">({tiffin.slots.length})</span>
                  </div>
                  <TimeSlotList slots={tiffin.slots} />
                </div>

                {tiffin.addOns && tiffin.addOns.filter((a) => a.available).length > 0 && (
                  <InfoPanel
                    title="Add-on Options Available"
                    actionLabel="Add Items"
                    onAction={() => setIsAddOnsDialogOpen(true)}
                  >
                    {tiffin.addOns
                      .filter((a) => a.available)
                      .slice(0, 2)
                      .map((addOn: AddOn) => (
                        <Row key={addOn.name} label={addOn.name} value={`+${currency(addOn.price)}`} />
                      ))}
                  </InfoPanel>
                )}

                {tiffin.customizableOptions && tiffin.customizableOptions.length > 0 && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="mb-2 text-sm font-medium">Customization Options</p>
                    <div className="flex flex-wrap gap-2">
                      {tiffin.customizableOptions.map((option: string) => (
                        <Badge key={option} variant="secondary" className="text-xs">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {option}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {tiffin.weeklyCustomizations && tiffin.weeklyCustomizations.length > 0 && (
                  <InfoPanel
                    title="Weekly Customization Options"
                    actionLabel="Customize"
                    onAction={() => setIsCustomizationDialogOpen(true)}
                  >
                    {tiffin.weeklyCustomizations.slice(0, 2).map((custom: WeeklyCustomization) => (
                      <Row key={custom.name} label={custom.name} value={`+${currency(custom.price)}`} />
                    ))}
                  </InfoPanel>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">About the Seller</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <ChefHat className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{seller?.shopName || "Seller"}</p>
                    <Badge
                      variant={seller?.status === "active" ? "default" : "secondary"}
                      className="mt-1"
                    >
                      {seller?.status === "active" ? "Active" : seller?.status || "Active"}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Shop Address</p>
                    <p className="text-sm text-muted-foreground">
                      {seller?.address}
                      {seller?.address && seller?.city ? ", " : ""}
                      {seller?.city}
                    </p>
                  </div>
                </div>

                {seller?.address && seller?.city && (
                  <Button variant="outline" className="h-11 w-full" asChild>
                    <a
                      href={getGoogleMapsUrl(seller.address, seller.city)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Get Directions
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ---------------- Right column: booking form ---------------- */}
          <div>
            <Card className="lg:sticky lg:top-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg lg:text-xl">
                  {tiffin.serviceType === "meal" ? "Order Meal" : "Book Tiffin Service"}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-5">
                {!isAuthenticated ? (
                  <div className="py-6 text-center">
                    <p className="mb-3 text-sm text-muted-foreground">Please login to place an order</p>
                    <Link href="/login">
                      <Button className="h-11">Login to Order</Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Choose Your Plan</label>
                      <BookingTypeSelector
                        serviceType={tiffin.serviceType}
                        price={tiffin.price}
                        trialPrice={tiffin.trialPrice}
                        monthlyPrice={tiffin.monthlyPrice}
                        value={selectedBookingType}
                        onChange={setSelectedBookingType}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Delivery Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="h-11 w-full rounded-md border px-3"
                      />
                    </div>

                    {requiresTimeSlot ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Time Slot</label>
                        <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select time slot" />
                          </SelectTrigger>
                          <SelectContent>
                            {tiffin.slots.map((slot) => (
                              <SelectItem key={slot} value={slot}>
                                {slot}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {selectedSlot === "Now" && (
                          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <p className="text-sm font-medium text-green-700">
                              Instant delivery selected — seller will deliver ASAP.
                            </p>
                          </div>
                        )}

                        <Button variant="outline" className="h-11 w-full" onClick={handleQuickOrderNow}>
                          Order Now (Instant Delivery)
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          <span className="font-semibold">Flexible delivery:</span> for {selectedBookingType}{" "}
                          plans, the seller will contact you to confirm delivery timing.
                        </span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Quantity</label>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-11 w-11"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="min-w-8 text-center text-lg font-semibold">{quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-11 w-11"
                          onClick={() => setQuantity(quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <CouponInput
                      appliedCoupon={appliedCoupon}
                      isApplying={isApplying}
                      onApply={applyCoupon}
                      onRemove={removeCoupon}
                      onOpenOffers={() => setIsOffersSheetOpen(true)}
                    />

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Special Instructions</label>
                      <textarea
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        placeholder="Any special dietary requirements or instructions…"
                        className="min-h-[80px] w-full rounded-md border p-3 text-sm"
                      />
                    </div>

                    {tiffin.weeklyCustomizations &&
                      tiffin.weeklyCustomizations.length > 0 &&
                      selectedBookingType === "weekly" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Weekly Customizations</label>
                          <Button
                            variant="outline"
                            className="h-11 w-full"
                            onClick={() => setIsCustomizationDialogOpen(true)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            {selectedWeeklyCustomizations.length > 0
                              ? `${selectedWeeklyCustomizations.length} customizations selected`
                              : "Add weekly customizations"}
                          </Button>
                        </div>
                      )}

                    {(hasAddOns || hasWeeklyCustomizations) && (
                      <div className="space-y-1 rounded-lg border bg-muted/20 p-3">
                        <h4 className="mb-1 text-sm font-medium">Selected Items</h4>
                        {selectedAddOns.map((addOn) => (
                          <Row
                            key={addOn.name}
                            label={`${addOn.name} × ${addOn.quantity}`}
                            value={currency(addOn.price * addOn.quantity)}
                          />
                        ))}
                        {selectedWeeklyCustomizations.map((custom) => (
                          <Row key={custom.name} label={custom.name} value={`+${currency(custom.price)}/day`} />
                        ))}
                      </div>
                    )}

                    <PriceSummary
                      bookingType={selectedBookingType}
                      quantity={quantity}
                      selectedDaysCount={selectedDays.length}
                      basePrice={priceCalculation?.basePrice ?? getBasePrice()}
                      addOnsPrice={priceCalculation?.addOnsPrice ?? addOnsPrice}
                      weeklyCustomizationsPrice={weeklyCustomizationsPrice}
                      deliveryCharge={deliveryCharge}
                      discountAmount={priceCalculation?.discountAmount ?? 0}
                      finalAmount={finalAmount}
                      hasAddOns={hasAddOns}
                      hasWeeklyCustomizations={hasWeeklyCustomizations}
                    />

                    {/* Desktop action button (mobile uses sticky bottom bar) */}
                    <Button
                      className="hidden h-12 w-full lg:flex"
                      size="lg"
                      onClick={handleBookNow}
                      disabled={bookingMutation.isPending}
                    >
                      {bookingMutation.isPending
                        ? "Processing…"
                        : selectedBookingType === "monthly"
                        ? "Start Monthly Plan"
                        : selectedBookingType === "trial"
                        ? "Book Trial Package"
                        : "Confirm Order"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile sticky action bar */}
      {isAuthenticated && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background p-3 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="text-lg font-bold text-primary">{currency(finalAmount)}</p>
            </div>
            <Button
              className="h-12 flex-1"
              onClick={handleBookNow}
              disabled={bookingMutation.isPending}
            >
              {bookingMutation.isPending
                ? "Processing…"
                : selectedBookingType === "monthly"
                ? "Start Monthly Plan"
                : selectedBookingType === "trial"
                ? "Book Trial Package"
                : "Confirm Order"}
            </Button>
          </div>
        </div>
      )}

      <OffersSheet
        open={isOffersSheetOpen}
        onClose={() => setIsOffersSheetOpen(false)}
        onSelect={applyCoupon}
      />

      {/* ---------------- Add-ons Dialog ---------------- */}
      <Dialog open={isAddOnsDialogOpen} onOpenChange={setIsAddOnsDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-t-3xl p-0 sm:max-w-lg sm:rounded-3xl">
          <DialogHeader className="space-y-1 border-b px-5 pb-4 pt-5">
            <DialogTitle className="text-lg font-bold">Add Extra Items</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Select extra items and adjust quantities for your meal.
            </p>
          </DialogHeader>

          <div className="space-y-3 px-5 pb-4 pt-4">
            {tiffin.addOns
              ?.filter((addOn) => addOn.available)
              .map((addOn) => {
                const qty = getAddOnQuantity(addOn.name);
                return (
                  <div
                    key={addOn.name}
                    className={`rounded-lg border p-3 ${qty > 0 ? "border-primary bg-primary/5" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium">{addOn.name}</h4>
                          {qty > 0 && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{addOn.description}</p>
                        <p className="mt-1 text-sm font-semibold text-primary">+{currency(addOn.price)} each</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => updateAddOnQuantity(addOn.name, qty - 1)}
                          disabled={qty === 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-6 text-center font-semibold">{qty}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => updateAddOnQuantity(addOn.name, qty + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

            {hasAddOns && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between font-semibold">
                  <span>Total Add-ons Cost</span>
                  <span className="text-primary">{currency(addOnsPrice)}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t px-5 pb-5 pt-4">
            <Button variant="outline" className="h-11" onClick={() => setIsAddOnsDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="h-11" onClick={() => setIsAddOnsDialogOpen(false)}>
              Save Selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Weekly Customization Dialog ---------------- */}
      <Dialog open={isCustomizationDialogOpen} onOpenChange={setIsCustomizationDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-t-3xl p-0 sm:max-w-lg sm:rounded-3xl">
          <DialogHeader className="space-y-1 border-b px-5 pb-4 pt-5">
            <DialogTitle className="text-lg font-bold">Weekly Customization Options</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Pick your days and customize what you get on each one.
            </p>
          </DialogHeader>

          <div className="space-y-4 px-5 pb-4 pt-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Select Days</h4>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <Button
                    key={day}
                    variant={selectedDays.includes(day) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDaySelection(day)}
                    disabled={!tiffin.availableDays.includes(day)}
                  >
                    {day}
                    {selectedDays.includes(day) && <CheckCircle2 className="ml-1 h-3 w-3" />}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {tiffin.weeklyCustomizations?.map((customization) => {
                const isSelected = selectedWeeklyCustomizations.some((c) => c.name === customization.name);
                return (
                  <div
                    key={customization.name}
                    className={`cursor-pointer rounded-lg border p-3 ${
                      isSelected ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => toggleWeeklyCustomization(customization)}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox checked={isSelected} onChange={() => toggleWeeklyCustomization(customization)} />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium">{customization.name}</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">{customization.description}</p>

                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          <span className="text-xs font-medium">Available on:</span>
                          {customization.days.map((day) => (
                            <Badge
                              key={day}
                              variant="outline"
                              className={`text-xs ${selectedDays.includes(day) ? "bg-green-100 text-green-800" : ""}`}
                            >
                              {day}
                            </Badge>
                          ))}
                        </div>

                        <p className="mt-1 text-sm font-semibold text-primary">
                          +{currency(customization.price)} per selected day
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasWeeklyCustomizations && (
              <div className="space-y-2 border-t pt-3">
                {selectedWeeklyCustomizations.map((custom) => {
                  const applicableDays = custom.days.filter((day) => selectedDays.includes(day));
                  return (
                    <div key={custom.name} className="text-sm">
                      <Row label={custom.name} value={`+${currency(custom.price)}/day`} />
                      <p className="text-xs text-muted-foreground">Applied to: {applicableDays.join(", ")}</p>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between border-t pt-2 font-semibold">
                  <span>Total Customization Cost</span>
                  <span className="text-primary">{currency(weeklyCustomizationsPrice)}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t px-5 pb-5 pt-4">
            <Button variant="outline" className="h-11" onClick={() => setIsCustomizationDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="h-11" onClick={() => setIsCustomizationDialogOpen(false)}>
              Save Customizations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Booking Confirmation Dialog ---------------- */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-t-3xl p-0 sm:max-w-md sm:rounded-3xl">
          <DialogHeader className="space-y-1 border-b px-5 pb-4 pt-5">
            <DialogTitle className="text-lg font-bold">Confirm Your Order</DialogTitle>
            <p className="text-sm text-muted-foreground">Review the details before you place your order.</p>
          </DialogHeader>

          <div className="space-y-4 px-5 pb-4 pt-4">
            <div className="space-y-1 rounded-lg bg-muted p-3 text-sm">
              <Row label="Service" value={tiffin.title} />
              <Row label="Date" value={selectedDate} />
              <Row label="Time Slot" value={selectedSlot || "Flexible"} />
              <Row label="Booking Type" value={selectedBookingType} />
              <Row label="Quantity" value={String(quantity)} />
              {hasAddOns && (
                <Row label="Add-ons" value={`${selectedAddOns.reduce((s, a) => s + a.quantity, 0)} items`} />
              )}
              {hasWeeklyCustomizations && (
                <Row label="Customizations" value={`${selectedWeeklyCustomizations.length} selected`} />
              )}
              {deliveryCharge === 0 || appliedCoupon ? (
                <Row label="Delivery Charge" value="FREE" valueClassName="font-semibold text-green-600" />
              ) : (
                <Row label="Delivery Charge" value={`+${currency(deliveryCharge)}`} />
              )}
              {appliedCoupon && (
                <Row
                  label="Coupon"
                  value={`${appliedCoupon.coupon?.code} (-${currency(priceCalculation?.discountAmount ?? 0)})`}
                  valueClassName="text-green-600"
                />
              )}
              <div className="flex items-center justify-between border-t pt-2 font-semibold">
                <span>Total Amount</span>
                <span className="text-primary">{currency(priceCalculation?.finalAmount ?? 0)}</span>
              </div>
            </div>

            <PaymentMethodSelector
              value={selectedPaymentMethod}
              onChange={setSelectedPaymentMethod}
              finalAmount={priceCalculation?.finalAmount ?? 0}
            />

            {customInstructions && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <h4 className="mb-1 text-sm font-medium">Special Instructions</h4>
                <p className="text-sm text-blue-800">{customInstructions}</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 border-t px-5 pb-5 pt-4 sm:flex-row sm:gap-0">
            <Button variant="outline" className="h-11 w-full sm:w-auto" onClick={() => setIsBookingDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="h-11 w-full sm:w-auto" onClick={confirmBooking} disabled={bookingMutation.isPending}>
              {selectedPaymentMethod === "upi" ? (
                <CreditCard className="mr-2 h-4 w-4" />
              ) : (
                <Wallet className="mr-2 h-4 w-4" />
              )}
              {bookingMutation.isPending
                ? "Processing…"
                : selectedPaymentMethod === "upi"
                ? "Confirm UPI Order"
                : "Confirm COD Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small shared UI blocks
// ---------------------------------------------------------------------------

function WeekAvailability({ availableDays }: { availableDays: string[] }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {DAYS.map((day) => {
        const isAvailable = availableDays.includes(day);
        return (
          <div
            key={day}
            className={`flex flex-col items-center justify-center rounded-md border py-1.5 text-center ${
              isAvailable
                ? "border-primary bg-primary/10 text-primary"
                : "border-dashed text-muted-foreground/50"
            }`}
          >
            <span className="text-[11px] font-semibold">{day.slice(0, 3)}</span>
            {isAvailable && <CheckCircle2 className="mt-0.5 h-3 w-3" />}
          </div>
        );
      })}
    </div>
  );
}

function TimeSlotList({ slots }: { slots: string[] }) {
  const [showAll, setShowAll] = useState(false);
  const VISIBLE_LIMIT = 6;

  const visibleSlots = showAll ? slots : slots.slice(0, VISIBLE_LIMIT);
  const hiddenCount = slots.length - VISIBLE_LIMIT;

  if (slots.length === 0) {
    return <p className="text-sm text-muted-foreground">No time slots available.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {visibleSlots.map((slot) => (
          <div
            key={slot}
            className="flex items-center justify-center rounded-md border bg-muted/40 px-2 py-1.5 text-center text-xs font-medium"
          >
            {slot.replace(" - ", " – ")}
          </div>
        ))}
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-xs font-medium text-primary"
        >
          {showAll ? "Show less" : `+${hiddenCount} more slots`}
        </button>
      )}
    </div>
  );
}

function InfoPanel({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <Button variant="outline" size="sm" onClick={onAction}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {actionLabel}
        </Button>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}