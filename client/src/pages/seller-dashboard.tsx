import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import {
  insertTiffinSchema,
  type InsertTiffin,
  type Tiffin,
  type BookingWithDetails,
  type Seller,
  type AddOn,
  type WeeklyCustomization,
} from "@shared/schema";
import {
  Plus,
  Edit,
  Trash2,
  UtensilsCrossed,
  Package,
  ArrowLeft,
  AlertCircle,
  Calendar,
  ChefHat,
  Users,
  X,
  CheckCircle2,
  IndianRupee,
  Settings,
  Eye,
  Phone,
  Mail,
  MapPin,
  Clock,
  User,
  ShoppingCart,
  TrendingUp,
  CreditCard,
  Wallet,
  Tag,
  LayoutGrid,
  ClipboardList,
  RefreshCw,
  Store,
  ChevronRight,
  LogOut,
  NotebookPen,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_SLOTS = [
  "6:00 AM - 7:00 AM",
  "7:00 AM - 8:00 AM",
  "8:00 AM - 9:00 AM",
  "9:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 1:00 PM",
  "1:00 PM - 2:00 PM",
  "2:00 PM - 3:00 PM",
  "3:00 PM - 4:00 PM",
  "4:00 PM - 5:00 PM",
  "5:00 PM - 6:00 PM",
  "6:00 PM - 7:00 PM",
  "7:00 PM - 8:00 PM",
  "8:00 PM - 9:00 PM",
  "9:00 PM - 10:00 PM",
];

const ORDER_STATUS_FILTERS = ["All", "Pending", "Confirmed", "Delivered", "Cancelled"] as const;
type OrderStatusFilter = (typeof ORDER_STATUS_FILTERS)[number];

// ------------------------------------------------------------------
// API helper
// ------------------------------------------------------------------
const apiRequest = async (method: string, url: string, data?: any) => {
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
    const errorData = await response.json();
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

// ------------------------------------------------------------------
// Small shared bits
// ------------------------------------------------------------------
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Confirmed: "bg-blue-50 text-blue-700 border-blue-200",
    Delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Cancelled: "bg-red-50 text-red-700 border-red-200",
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Mixed: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${map[status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
      {status}
    </Badge>
  );
}

function PaymentBadge({ method }: { method: string }) {
  const isCod = method === "cod";
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium gap-1 ${
        isCod ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
      }`}
    >
      {isCod ? <Wallet className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
      {isCod ? "Cash on delivery" : "UPI"}
    </Badge>
  );
}

// ------------------------------------------------------------------
// Revenue Statistics — flat, professional cards (no gradients)
// ------------------------------------------------------------------
function RevenueStats({ bookings }: { bookings: BookingWithDetails[] }) {
  const confirmedBookings = bookings.filter((b) => b.status === "Confirmed" || b.status === "Delivered");
  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalPrice, 0);

  const today = new Date().toDateString();
  const todayRevenue = confirmedBookings
    .filter((b) => new Date(b.date).toDateString() === today)
    .reduce((sum, b) => sum + b.totalPrice, 0);

  const monthlyRevenue = confirmedBookings
    .filter((b) => {
      const d = new Date(b.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, b) => sum + b.totalPrice, 0);

  const pendingOrders = bookings.filter((b) => b.status === "Pending").length;
  const confirmedOrders = confirmedBookings.length;

  const couponBookings = bookings.filter((b) => b.couponCode);
  const totalCouponDiscount = couponBookings.reduce((sum, b) => sum + (b.discountAmount || 0), 0);
  const uniqueCouponsUsed = [...new Set(couponBookings.map((b) => b.couponCode))].length;

  const stats = [
    {
      label: "Total revenue",
      value: `₹${totalRevenue}`,
      caption: `${confirmedOrders} confirmed orders`,
      icon: Wallet,
    },
    {
      label: "This month",
      value: `₹${monthlyRevenue}`,
      caption: "Monthly earnings",
      icon: TrendingUp,
    },
    {
      label: "Pending orders",
      value: pendingOrders,
      caption: "Awaiting confirmation",
      icon: Package,
    },
    {
      label: "Coupon discounts",
      value: `-₹${totalCouponDiscount}`,
      caption: `${uniqueCouponsUsed} coupons used`,
      icon: Tag,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <Card key={s.label} className="border-card-border">
          <CardContent className="p-3.5 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              <s.icon className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
            <div className="text-xl md:text-2xl font-bold tracking-tight">{s.value}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{s.caption}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------
// Order Details Dialog
// ------------------------------------------------------------------
function OrderDetails({ booking, onClose }: { booking: BookingWithDetails; onClose: () => void }) {
  const tiffin = booking.tiffin || {
    title: "Service not available",
    description: "This service is no longer available",
    category: "Unknown",
    price: 0,
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Order #{booking._id.slice(-8)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Customer Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-medium">{booking.customerName}</p>
                  <p className="text-muted-foreground">{booking.customerPhone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{booking.customerEmail}</p>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{booking.customerAddress}</p>
                    <p className="text-sm text-muted-foreground mb-1">{booking.customerCity}</p>
                    {booking.customerAddress && booking.customerCity && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          booking.customerAddress + ", " + booking.customerCity
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs inline-flex items-center gap-1"
                      >
                        View on Google Maps <ChevronRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {booking.paymentMethod === "cod" ? "Cash on delivery" : "UPI payment"}
                </p>
                <PaymentBadge method={booking.paymentMethod} />
              </div>
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                <p className="text-sm font-medium">Collect ₹{booking.totalPrice} on delivery</p>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Order summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{tiffin.title}</h4>
                  <p className="text-sm text-muted-foreground">{tiffin.description}</p>
                </div>
                <Badge variant="outline">{tiffin.category}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Delivery date</p>
                  <p className="font-medium">{new Date(booking.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Time slot</p>
                  <p className="font-medium">{booking.slot}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Booking type</p>
                  <p className="font-medium capitalize">{booking.bookingType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Quantity</p>
                  <p className="font-medium">{booking.quantity}</p>
                </div>
              </div>

              {booking.selectedDays && booking.selectedDays.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 border">
                  <p className="text-sm font-medium mb-2">Selected days</p>
                  <div className="flex flex-wrap gap-1">
                    {booking.selectedDays.map((day, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {day}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {booking.couponCode && (
                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 border">
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <span>Coupon: {booking.couponCode}</span>
                  </div>
                  <span className="text-sm font-medium">-₹{booking.discountAmount || 0}</span>
                </div>
              )}

              {booking.status === "Cancelled" && (booking as any).cancellationReason && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-sm font-medium mb-1 text-red-800">Cancellation reason</p>
                  <p className="text-sm text-red-700">{(booking as any).cancellationReason}</p>
                </div>
              )}

              {booking.customization && (
                <div className="bg-muted/50 rounded-lg p-3 border">
                  <p className="text-sm font-medium mb-1">Special instructions</p>
                  <p className="text-sm text-muted-foreground">{booking.customization}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add-ons */}
          {booking.addOns && booking.addOns.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add-ons ({booking.addOns.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {booking.addOns.map((addOn, index) => (
                  <div key={index} className="flex items-center justify-between p-2.5 border rounded-lg text-sm">
                    <div>
                      <p className="font-medium">{addOn.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Qty {addOn.quantity} · ₹{addOn.price} each
                      </p>
                    </div>
                    <p className="font-semibold">₹{addOn.price * addOn.quantity}</p>
                  </div>
                ))}
                <div className="border-t pt-2 mt-1 flex items-center justify-between font-semibold text-sm">
                  <span>Add-ons total</span>
                  <span>₹{booking.addOns.reduce((t, a) => t + a.price * a.quantity, 0)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weekly customizations */}
          {booking.weeklyCustomizations && booking.weeklyCustomizations.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Weekly customizations ({booking.weeklyCustomizations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {booking.weeklyCustomizations.map((custom, index) => {
                  const customDays = custom.days || [];
                  const selectedDays = booking.selectedDays || [];
                  const applicableDays = selectedDays.length > 0 ? customDays.filter((d) => selectedDays.includes(d)) : customDays;
                  const totalCost = (custom.price || 0) * applicableDays.length;

                  return (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{custom.name}</span>
                        <Badge variant="outline" className="text-xs">
                          ₹{custom.price}/day
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{custom.description}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {customDays.map((day, dayIndex) => (
                          <Badge
                            key={dayIndex}
                            variant="outline"
                            className={`text-xs ${
                              selectedDays.length > 0 && selectedDays.includes(day)
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {day}
                          </Badge>
                        ))}
                      </div>
                      {selectedDays.length > 0 && (
                        <div className="flex items-center justify-between text-xs font-medium bg-muted/50 p-2 rounded">
                          <span>{applicableDays.length} days applied</span>
                          <span>₹{totalCost}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {booking.selectedDays && booking.selectedDays.length > 0 && (
                  <div className="border-t pt-2 mt-1 flex items-center justify-between font-semibold text-sm">
                    <span>Customizations total</span>
                    <span>
                      ₹
                      {booking.weeklyCustomizations.reduce((total, custom) => {
                        const customDays = custom.days || [];
                        const selectedDays = booking.selectedDays || [];
                        const applicableDays =
                          selectedDays.length > 0 ? customDays.filter((d) => selectedDays.includes(d)) : customDays;
                        return total + (custom.price || 0) * applicableDays.length;
                      }, 0)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Price Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="w-4 h-4" />
                Price breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Base price</span>
                  <span>
                    ₹{(() => {
                      const basePrice = tiffin.price * booking.quantity;
                      if (booking.bookingType === "weekly" && booking.selectedDays) {
                        return basePrice * booking.selectedDays.length;
                      }
                      return basePrice;
                    })()}
                  </span>
                </div>

                {booking.addOns && booking.addOns.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Add-ons</span>
                    <span>+₹{booking.addOns.reduce((total, a) => total + a.price * a.quantity, 0)}</span>
                  </div>
                )}

                {booking.weeklyCustomizations && booking.weeklyCustomizations.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Weekly customizations</span>
                    <span>
                      +₹
                      {booking.weeklyCustomizations.reduce((total, custom) => {
                        const customDays = custom.days || [];
                        const selectedDays = booking.selectedDays || [];
                        const applicableDays =
                          selectedDays.length > 0 ? customDays.filter((d) => selectedDays.includes(d)) : customDays;
                        return total + custom.price * applicableDays.length;
                      }, 0)}
                    </span>
                  </div>
                )}

                {booking.deliveryCharge &&
                  booking.deliveryCharge > 0 &&
                  booking.bookingType !== "weekly" &&
                  booking.bookingType !== "monthly" && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Delivery charge</span>
                      <span>+₹{booking.deliveryCharge}</span>
                    </div>
                  )}

                {booking.couponCode && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Coupon ({booking.couponCode})</span>
                    <span>-₹{booking.discountAmount || 0}</span>
                  </div>
                )}

                <div className="border-t pt-2 mt-2 flex items-center justify-between text-base font-bold">
                  <span>Total</span>
                  <span>
                    ₹
                    {booking.bookingType === "weekly" || booking.bookingType === "monthly"
                      ? booking.totalPrice - (booking.deliveryCharge || 0)
                      : booking.totalPrice}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Status */}
          <Card>
            <CardContent className="pt-4 flex items-center justify-between">
              <StatusBadge status={booking.status} />
              <div className="text-xs text-muted-foreground text-right">
                Ordered {new Date(booking.createdAt).toLocaleDateString()}
                <br />
                {new Date(booking.createdAt).toLocaleTimeString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// Manage Customer Subscriptions
// ------------------------------------------------------------------
interface SellerDeliveryDay {
  _id: string;
  date: string;
  day: string;
  status: "Pending" | "Delivered" | "Missed";
  customizationNote?: string;
}

interface SellerSubscriptionBooking {
  _id: string;
  customerName: string;
  customerPhone: string;
  bookingType: "weekly" | "monthly";
  date: string;
  status: string;
  selectedDays?: string[];
  cancellationReason?: string;
  tiffin?: { title?: string };
  deliverySchedule: SellerDeliveryDay[];
}

function DayStatusButtons({ bookingId, entry }: { bookingId: string; entry: SellerDeliveryDay }) {
  const { toast } = useToast();

  const updateStatus = useMutation({
    mutationFn: async (status: "Pending" | "Delivered" | "Missed") => {
      return apiRequest("PATCH", `/api/seller/subscriptions/${bookingId}/schedule/${entry._id}/status`, { status });
    },
    // ✅ Update the day's status in the local cache immediately instead of
    // waiting on a full refetch — matches the pattern already used for the
    // main order-status buttons below, so this feels just as instant.
    onMutate: async (status) => {
      queryClient.setQueryData<SellerSubscriptionBooking[]>(["/api/seller/subscriptions"], (old) => {
        if (!old) return old;
        return old.map((sub) =>
          sub._id === bookingId
            ? {
                ...sub,
                deliverySchedule: sub.deliverySchedule.map((d) =>
                  d._id === entry._id ? { ...d, status } : d
                ),
              }
            : sub
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/subscriptions"], refetchType: "none" });
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't update day", description: error.message, variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/subscriptions"] });
    },
  });

  const options: { value: "Pending" | "Delivered" | "Missed"; label: string; activeClass: string }[] = [
    { value: "Pending", label: "Pending", activeClass: "bg-amber-500 text-white border-amber-500" },
    { value: "Delivered", label: "Delivered", activeClass: "bg-emerald-500 text-white border-emerald-500" },
    { value: "Missed", label: "Missed", activeClass: "bg-red-500 text-white border-red-500" },
  ];

  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={updateStatus.isPending}
          onClick={() => opt.value !== entry.status && updateStatus.mutate(opt.value)}
          className={`text-xs px-2.5 py-1.5 rounded-full border font-medium transition-colors disabled:opacity-50 min-h-[30px] ${
            entry.status === opt.value ? opt.activeClass : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SellerSubscriptionCard({ sub }: { sub: SellerSubscriptionBooking }) {
  const [expanded, setExpanded] = useState(false);
  const schedule = sub.deliverySchedule || [];
  const delivered = schedule.filter((d) => d.status === "Delivered").length;
  const missed = schedule.filter((d) => d.status === "Missed").length;
  const total = schedule.length;
  const isCancelled = sub.status === "Cancelled";

  return (
    <Card className="border-card-border">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3.5 md:p-4 flex items-center justify-between gap-3 min-h-[64px]"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm md:text-base truncate">{sub.customerName}</p>
            <Badge variant="outline" className="capitalize text-xs">
              {sub.bookingType}
            </Badge>
            {isCancelled && (
              <Badge className="text-xs bg-red-50 text-red-700 border-red-200">Cancelled</Badge>
            )}
          </div>
          <p className="text-xs md:text-sm text-muted-foreground truncate">
            {sub.tiffin?.title} · {sub.customerPhone}
          </p>
          {isCancelled ? (
            <p className="text-xs text-red-600 mt-0.5">{sub.cancellationReason || "Cancelled by user"}</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              {delivered}/{total} delivered{missed > 0 ? ` · ${missed} missed` : ""}
            </p>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t px-3.5 md:px-4 py-3 space-y-2 max-h-80 overflow-y-auto">
          {schedule.length === 0 ? (
            <p className="text-sm text-muted-foreground">No delivery days found for this subscription.</p>
          ) : (
            schedule.map((entry) => (
              <div key={entry._id} className="p-2.5 rounded-lg bg-muted/50 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{entry.day}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <DayStatusButtons bookingId={sub._id} entry={entry} />
                </div>
                {/* ✅ NEW: customer's note for that day, written one day ahead */}
                {entry.customizationNote && (
                  <div className="flex items-start gap-1.5 bg-blue-50 border border-blue-100 rounded-md px-2 py-1.5">
                    <NotebookPen className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700">{entry.customizationNote}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  );
}

function SubscriptionsManager() {
  const { data: subscriptions = [], isLoading } = useQuery<SellerSubscriptionBooking[]>({
    queryKey: ["/api/seller/subscriptions"],
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Weekly &amp; monthly plans customers have booked with you — mark each day's delivery status as you go.
      </p>
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <RefreshCw className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No customers have a weekly or monthly subscription yet.</p>
        </div>
      ) : (
        subscriptions.map((sub) => <SellerSubscriptionCard key={sub._id} sub={sub} />)
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Single order card (non-cart)
// ------------------------------------------------------------------
function SingleOrderCard({
  booking,
  onView,
  onStatusUpdate,
}: {
  booking: BookingWithDetails;
  onView: () => void;
  onStatusUpdate: (id: string, status: string) => void;
}) {
  const tiffin = booking.tiffin || {
    title: "Service not available",
    description: "This service is no longer available",
    category: "Unknown",
    price: 0,
  };

  return (
    <div className="border border-card-border rounded-lg p-3.5 md:p-4 hover:shadow-sm transition-shadow">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-sm md:text-base truncate">{tiffin.title}</h3>
              <Badge variant="outline" className="capitalize text-xs">
                {booking.bookingType}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> {booking.customerName}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" /> {booking.customerPhone}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onView} title="View order details" className="h-8 w-8 shrink-0">
            <Eye className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {new Date(booking.date).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1 truncate">
            <Clock className="w-3 h-3" /> {booking.slot}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <StatusBadge status={booking.status} />
          <PaymentBadge method={booking.paymentMethod} />
          {booking.addOns && booking.addOns.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {booking.addOns.length} add-ons
            </Badge>
          )}
          {booking.weeklyCustomizations && booking.weeklyCustomizations.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {booking.weeklyCustomizations.length} customizations
            </Badge>
          )}
          {booking.couponCode && (
            <Badge variant="outline" className="text-xs">
              {booking.couponCode}
            </Badge>
          )}
        </div>

        {/* ✅ NEW: cancellation reason, e.g. "Cancelled by user" */}
        {booking.status === "Cancelled" && (booking as any).cancellationReason && (
          <div className="flex items-start gap-1.5 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700">{(booking as any).cancellationReason}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-base font-semibold">
            ₹{booking.totalPrice}
            {booking.couponCode && <span className="text-xs text-muted-foreground ml-2">(-₹{booking.discountAmount || 0})</span>}
          </div>
          <div className="flex items-center gap-2">
            {booking.status === "Pending" && (
              <>
                <Button size="sm" onClick={() => onStatusUpdate(booking._id, "Confirmed")} className="h-9 text-xs px-3">
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStatusUpdate(booking._id, "Cancelled")}
                  className="h-9 text-xs px-3"
                >
                  Cancel
                </Button>
              </>
            )}
            {booking.status === "Confirmed" && (
              <Button size="sm" onClick={() => onStatusUpdate(booking._id, "Delivered")} className="h-9 text-xs px-3">
                Mark delivered
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Cart (grouped) order card
// ------------------------------------------------------------------
type OrderGroup = {
  key: string;
  cartOrderId: string | null;
  bookings: BookingWithDetails[];
  latestCreatedAt: string;
};

function GroupOrderCard({
  group,
  onView,
  onGroupStatusUpdate,
}: {
  group: OrderGroup;
  onView: (b: BookingWithDetails) => void;
  onGroupStatusUpdate: (ids: string[], status: string) => void;
}) {
  const primary = group.bookings[0];
  const groupTotal = group.bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  const allSameStatus = group.bookings.every((b) => b.status === primary.status);
  const groupStatus = allSameStatus ? primary.status : "Mixed";
  const pendingIds = group.bookings.filter((b) => b.status === "Pending").map((b) => b._id);
  const confirmedIds = group.bookings.filter((b) => b.status === "Confirmed").map((b) => b._id);

  return (
    <div className="border border-card-border rounded-lg p-3.5 md:p-4 hover:shadow-sm transition-shadow">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <ShoppingCart className="w-4 h-4 text-muted-foreground shrink-0" />
            <h3 className="font-semibold text-sm md:text-base">
              Order #{group.cartOrderId ? group.cartOrderId.slice(-8) : group.key.slice(-8)}
            </h3>
            <Badge variant="outline" className="text-xs">
              {group.bookings.length} items
            </Badge>
          </div>
          <StatusBadge status={groupStatus} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-muted/40 rounded-md p-2.5 border">
          <span className="flex items-center gap-1.5 truncate">
            <User className="w-3 h-3 text-muted-foreground" /> {primary.customerName}
          </span>
          <span className="flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-muted-foreground" /> {primary.customerPhone}
          </span>
          <span className="flex items-center gap-1.5 truncate sm:col-span-2">
            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" /> {primary.customerAddress}, {primary.customerCity}
          </span>
        </div>

        <div className="space-y-2">
          {group.bookings.map((booking) => {
            const tiffin = booking.tiffin || {
              title: "Service not available",
              description: "This service is no longer available",
              category: "Unknown",
              price: 0,
            };
            return (
              <div key={booking._id} className="flex items-center justify-between gap-3 bg-muted/30 rounded-md p-2.5 border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{tiffin.title}</span>
                    <StatusBadge status={booking.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    <span>Qty {booking.quantity}</span>
                    <span>{booking.slot}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold">₹{booking.totalPrice}</span>
                  <Button variant="ghost" size="icon" onClick={() => onView(booking)} className="h-7 w-7">
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-base font-semibold">Total ₹{groupTotal}</div>
          <div className="flex items-center gap-2">
            {pendingIds.length > 0 && (
              <>
                <Button size="sm" onClick={() => onGroupStatusUpdate(pendingIds, "Confirmed")} className="h-9 text-xs px-3">
                  Confirm all
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onGroupStatusUpdate(pendingIds, "Cancelled")}
                  className="h-9 text-xs px-3"
                >
                  Cancel all
                </Button>
              </>
            )}
            {pendingIds.length === 0 && confirmedIds.length > 0 && (
              <Button size="sm" onClick={() => onGroupStatusUpdate(confirmedIds, "Delivered")} className="h-9 text-xs px-3">
                Mark all delivered
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
export default function SellerDashboard() {
  const { isAuthenticated, isSeller, seller, user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [orderFilter, setOrderFilter] = useState<OrderStatusFilter>("All");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTiffin, setEditingTiffin] = useState<Tiffin | null>(null);
  const [isAddOnDialogOpen, setIsAddOnDialogOpen] = useState(false);
  const [isCustomizationDialogOpen, setIsCustomizationDialogOpen] = useState(false);
  const [selectedTiffinForManagement, setSelectedTiffinForManagement] = useState<Tiffin | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<BookingWithDetails | null>(null);
  const [newAddOn, setNewAddOn] = useState<Partial<AddOn>>({ name: "", description: "", price: 0, available: true });
  const [newCustomization, setNewCustomization] = useState<Partial<WeeklyCustomization>>({
    name: "",
    description: "",
    price: 0,
    days: [],
    available: true,
  });
  const [weeklyCustomizations, setWeeklyCustomizations] = useState<WeeklyCustomization[]>([]);
  const [tempCustomization, setTempCustomization] = useState<WeeklyCustomization>({
    name: "",
    description: "",
    price: 0,
    days: [],
    available: true,
  });

  useEffect(() => {
    if (!isAuthenticated || !isSeller) {
      setLocation("/login");
    }
  }, [isAuthenticated, isSeller, setLocation]);

  const { data: sellerData } = useQuery<Seller>({
    queryKey: ["/api/seller/profile"],
    enabled: isAuthenticated && isSeller,
  });

  const { data: tiffins = [], isLoading: tiffinsLoading } = useQuery<Tiffin[]>({
    queryKey: ["/api/seller/tiffins"],
    enabled: isAuthenticated && isSeller,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/seller/bookings"],
    enabled: isAuthenticated && isSeller,
  });

  // Group bookings placed together from the customer's cart (shared
  // cartOrderId) into a single order card.
  const groupedOrders: OrderGroup[] = useMemo(() => {
    const groups = new Map<string, OrderGroup>();

    for (const booking of bookings) {
      const b = booking as any;
      const key = b.cartOrderId || b._id;
      const createdAt = b.createdAt || new Date().toISOString();
      const existing = groups.get(key);
      if (existing) {
        existing.bookings.push(booking);
        if (new Date(createdAt) > new Date(existing.latestCreatedAt)) {
          existing.latestCreatedAt = createdAt;
        }
      } else {
        groups.set(key, { key, cartOrderId: b.cartOrderId || null, bookings: [booking], latestCreatedAt: createdAt });
      }
    }

    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
    );
  }, [bookings]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === "All") return groupedOrders;
    return groupedOrders.filter((g) => {
      const allSame = g.bookings.every((b) => b.status === g.bookings[0].status);
      const status = allSame ? g.bookings[0].status : "Mixed";
      return status === orderFilter;
    });
  }, [groupedOrders, orderFilter]);

  const orderCounts = useMemo(() => {
    const counts: Record<string, number> = { All: groupedOrders.length, Pending: 0, Confirmed: 0, Delivered: 0, Cancelled: 0 };
    groupedOrders.forEach((g) => {
      const allSame = g.bookings.every((b) => b.status === g.bookings[0].status);
      const status = allSame ? g.bookings[0].status : "Mixed";
      if (counts[status] !== undefined) counts[status] += 1;
    });
    return counts;
  }, [groupedOrders]);

  const form = useForm<InsertTiffin>({
    resolver: zodResolver(insertTiffinSchema),
    defaultValues: {
      sellerId: seller?._id || "",
      title: "",
      description: "",
      category: "Veg",
      price: 0,
      availableDays: [],
      slots: [],
      imageUrl: "",
      serviceType: "meal",
      mealType: "Lunch",
      trialPrice: 99,
      monthlyPrice: 2000,
      customizableOptions: [],
      addOns: [],
      weeklyCustomizations: [],
    },
  });

  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file again later

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Error", description: "Only JPG, PNG, WEBP or GIF images are allowed", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be under 5MB", variant: "destructive" });
      return;
    }

    setIsUploadingImage(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/seller/tiffins/upload-image", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        let message = text;
        try {
          const parsed = JSON.parse(text);
          message = parsed?.message || text;
        } catch {
          // not JSON, keep raw text
        }
        throw new Error(message || "Upload failed");
      }

      const data = await res.json();
      onChange(data.imageUrl);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to upload image", variant: "destructive" });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const selectedDays = form.watch("availableDays");
  const selectedSlots = form.watch("slots");
  const currentServiceType = form.watch("serviceType");

  const addWeeklyCustomization = () => {
    if (!tempCustomization.name || !tempCustomization.description || tempCustomization.price <= 0 || tempCustomization.days.length === 0) {
      toast({ title: "Error", description: "Please fill all fields and select at least one day", variant: "destructive" });
      return;
    }
    setWeeklyCustomizations([...weeklyCustomizations, { ...tempCustomization }]);
    setTempCustomization({ name: "", description: "", price: 0, days: [], available: true });
  };

  const removeWeeklyCustomization = (index: number) => {
    setWeeklyCustomizations(weeklyCustomizations.filter((_, i) => i !== index));
  };

  const addAddOnMutation = useMutation({
    mutationFn: async ({ tiffinId, addOn }: { tiffinId: string; addOn: Partial<AddOn> }) => {
      const tiffin = tiffins.find((t) => t._id === tiffinId);
      if (!tiffin) throw new Error("Service not found");
      const updatedAddOns = [...(tiffin.addOns || []), { ...addOn } as AddOn];
      return await apiRequest("PUT", `/api/seller/tiffins/${tiffinId}`, { ...tiffin, addOns: updatedAddOns });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Add-on added successfully" });
      setIsAddOnDialogOpen(false);
      setNewAddOn({ name: "", description: "", price: 0, available: true });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/tiffins"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addCustomizationMutation = useMutation({
    mutationFn: async ({ tiffinId, customization }: { tiffinId: string; customization: Partial<WeeklyCustomization> }) => {
      const tiffin = tiffins.find((t) => t._id === tiffinId);
      if (!tiffin) throw new Error("Service not found");
      const updatedCustomizations = [...(tiffin.weeklyCustomizations || []), { ...customization } as WeeklyCustomization];
      return await apiRequest("PUT", `/api/seller/tiffins/${tiffinId}`, { ...tiffin, weeklyCustomizations: updatedCustomizations });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Customization added successfully" });
      setIsCustomizationDialogOpen(false);
      setNewCustomization({ name: "", description: "", price: 0, days: [], available: true });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/tiffins"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateAddOnStatusMutation = useMutation({
    mutationFn: async ({ tiffinId, addOnName, available }: { tiffinId: string; addOnName: string; available: boolean }) => {
      const tiffin = tiffins.find((t) => t._id === tiffinId);
      if (!tiffin) throw new Error("Service not found");
      const updatedAddOns = tiffin.addOns?.map((a) => (a.name === addOnName ? { ...a, available } : a));
      return await apiRequest("PUT", `/api/seller/tiffins/${tiffinId}`, { ...tiffin, addOns: updatedAddOns });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Add-on updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/tiffins"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateCustomizationStatusMutation = useMutation({
    mutationFn: async ({
      tiffinId,
      customizationName,
      available,
    }: {
      tiffinId: string;
      customizationName: string;
      available: boolean;
    }) => {
      const tiffin = tiffins.find((t) => t._id === tiffinId);
      if (!tiffin) throw new Error("Service not found");
      const updatedCustomizations = tiffin.weeklyCustomizations?.map((c) =>
        c.name === customizationName ? { ...c, available } : c
      );
      return await apiRequest("PUT", `/api/seller/tiffins/${tiffinId}`, { ...tiffin, weeklyCustomizations: updatedCustomizations });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Customization updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/tiffins"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteAddOnMutation = useMutation({
    mutationFn: async ({ tiffinId, addOnName }: { tiffinId: string; addOnName: string }) => {
      const tiffin = tiffins.find((t) => t._id === tiffinId);
      if (!tiffin) throw new Error("Service not found");
      const updatedAddOns = tiffin.addOns?.filter((a) => a.name !== addOnName);
      return await apiRequest("PUT", `/api/seller/tiffins/${tiffinId}`, { ...tiffin, addOns: updatedAddOns });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Add-on deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/tiffins"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCustomizationMutation = useMutation({
    mutationFn: async ({ tiffinId, customizationName }: { tiffinId: string; customizationName: string }) => {
      const tiffin = tiffins.find((t) => t._id === tiffinId);
      if (!tiffin) throw new Error("Service not found");
      const updatedCustomizations = tiffin.weeklyCustomizations?.filter((c) => c.name !== customizationName);
      return await apiRequest("PUT", `/api/seller/tiffins/${tiffinId}`, { ...tiffin, weeklyCustomizations: updatedCustomizations });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Customization deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/tiffins"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addTiffinMutation = useMutation({
    mutationFn: async (data: InsertTiffin) => {
      const tiffinData = {
        title: data.title,
        description: data.description,
        category: data.category,
        price: data.price,
        availableDays: data.availableDays,
        slots: data.slots,
        imageUrl: data.imageUrl || "",
        serviceType: data.serviceType,
        weeklyCustomizations: weeklyCustomizations,
        ...(data.serviceType === "meal" && { mealType: data.mealType }),
        ...(data.serviceType === "tiffin" && {
          trialPrice: data.trialPrice,
          monthlyPrice: data.monthlyPrice,
          customizableOptions: data.customizableOptions,
        }),
      };
      return await apiRequest("POST", "/api/seller/tiffins", tiffinData);
    },
    onSuccess: () => {
      toast({ title: "Success", description: `${currentServiceType === "meal" ? "Meal" : "Tiffin service"} added successfully` });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/tiffins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tiffins"] });
      setIsAddDialogOpen(false);
      form.reset();
      setWeeklyCustomizations([]);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to add service", variant: "destructive" });
    },
  });

  const updateTiffinMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertTiffin }) => {
      const updateData = {
        title: data.title,
        description: data.description,
        category: data.category,
        price: data.price,
        availableDays: data.availableDays,
        slots: data.slots,
        imageUrl: data.imageUrl || "",
        serviceType: data.serviceType,
        weeklyCustomizations: weeklyCustomizations,
        ...(data.serviceType === "meal" && { mealType: data.mealType }),
        ...(data.serviceType === "tiffin" && {
          trialPrice: data.trialPrice,
          monthlyPrice: data.monthlyPrice,
          customizableOptions: data.customizableOptions,
        }),
      };
      return await apiRequest("PUT", `/api/seller/tiffins/${id}`, updateData);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Service updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/tiffins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tiffins"] });
      setEditingTiffin(null);
      form.reset();
      setWeeklyCustomizations([]);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update service", variant: "destructive" });
    },
  });

  const deleteTiffinMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/seller/tiffins/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Service deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/tiffins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tiffins"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete service", variant: "destructive" });
    },
  });

  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      return await apiRequest("PUT", `/api/seller/bookings/${bookingId}`, { status });
    },
    onSuccess: (_updatedBooking, variables) => {
      toast({ title: "Success", description: "Booking status updated successfully" });
      queryClient.setQueryData<BookingWithDetails[]>(["/api/seller/bookings"], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((b) => (b._id === variables.bookingId ? { ...b, status: variables.status } : b));
      });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/bookings"], refetchType: "none" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/bookings"] });
    },
  });

  // Poll bookings periodically so new orders show up without a refresh.
  useEffect(() => {
    if (isAuthenticated && isSeller) {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/seller/bookings"] });
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isSeller]);

  const handleAddAddOn = (tiffinId: string) => {
    if (!newAddOn.name || !newAddOn.description || !newAddOn.price) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    addAddOnMutation.mutate({ tiffinId, addOn: newAddOn });
  };

  const handleAddCustomization = (tiffinId: string) => {
    if (!newCustomization.name || !newCustomization.description || !newCustomization.price || newCustomization.days?.length === 0) {
      toast({ title: "Error", description: "Please fill all required fields and select at least one day", variant: "destructive" });
      return;
    }
    addCustomizationMutation.mutate({ tiffinId, customization: newCustomization });
  };

  const toggleDaySelection = (day: string) => {
    setNewCustomization((prev) => {
      const days = prev.days || [];
      return days.includes(day) ? { ...prev, days: days.filter((d) => d !== day) } : { ...prev, days: [...days, day] };
    });
  };

  const toggleTempDaySelection = (day: string) => {
    setTempCustomization((prev) => {
      const days = prev.days || [];
      return days.includes(day) ? { ...prev, days: days.filter((d) => d !== day) } : { ...prev, days: [...days, day] };
    });
  };

  const handleStatusUpdate = (bookingId: string, newStatus: string) => {
    updateBookingStatusMutation.mutate({ bookingId, status: newStatus });
  };

  const handleGroupStatusUpdate = (bookingIds: string[], newStatus: string) => {
    bookingIds.forEach((bookingId) => updateBookingStatusMutation.mutate({ bookingId, status: newStatus }));
  };

  const onSubmit = (data: InsertTiffin) => {
    if (data.availableDays.length === 0) {
      toast({ title: "Error", description: "Please select at least one available day", variant: "destructive" });
      return;
    }
    if (data.slots.length === 0) {
      toast({ title: "Error", description: "Please select at least one time slot", variant: "destructive" });
      return;
    }
    if (data.price <= 0) {
      toast({ title: "Error", description: "Please set a valid price", variant: "destructive" });
      return;
    }
    if (editingTiffin) {
      updateTiffinMutation.mutate({ id: editingTiffin._id, data });
    } else {
      addTiffinMutation.mutate(data);
    }
  };

  const handleEdit = (tiffin: Tiffin) => {
    setEditingTiffin(tiffin);
    setWeeklyCustomizations(tiffin.weeklyCustomizations || []);
    form.reset({
      sellerId: tiffin.sellerId,
      title: tiffin.title,
      description: tiffin.description,
      category: tiffin.category,
      price: tiffin.price,
      availableDays: tiffin.availableDays,
      slots: tiffin.slots,
      imageUrl: tiffin.imageUrl || "",
      serviceType: tiffin.serviceType || "meal",
      mealType: tiffin.mealType || "Lunch",
      trialPrice: tiffin.trialPrice || 99,
      monthlyPrice: tiffin.monthlyPrice || 2000,
      customizableOptions: tiffin.customizableOptions || [],
    });
  };

  if (!isAuthenticated || !isSeller) {
    return null;
  }

  const isSuspended = sellerData?.status === "suspended";
  const isPending = sellerData?.status === "pending";
  const meals = tiffins.filter((t) => t.serviceType === "meal");
  const tiffinServices = tiffins.filter((t) => t.serviceType === "tiffin");
  const pendingOrderCount = orderCounts.Pending;

  const goHome = () => setLocation("/");

  // ✅ Lets a seller log out straight from the dashboard's profile menu —
  // e.g. to switch and log in with a different seller/customer id. Landing
  // on "/" afterwards means the next "Login" tap opens the normal
  // login/register page, where a fresh account can be created too.
  const handleSellerLogout = () => {
    logout();
    setLocation("/");
  };

  const NAV_ITEMS = [
    { value: "overview", label: "Overview", icon: LayoutGrid },
    { value: "orders", label: "Orders", icon: ClipboardList, badge: pendingOrderCount },
    { value: "subscriptions", label: "Subscriptions", icon: RefreshCw },
    { value: "services", label: "Services", icon: Store },
  ];

  const statusStyles: Record<string, { dot: string; pill: string }> = {
    active: { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    suspended: { dot: "bg-red-500", pill: "bg-red-50 text-red-700 border-red-200" },
    pending: { dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700 border-amber-200" },
  };
  const currentStatusStyle = statusStyles[sellerData?.status || ""] || statusStyles.pending;
  const statusLabel = sellerData?.status
    ? sellerData.status.charAt(0).toUpperCase() + sellerData.status.slice(1)
    : "Loading";

  return (
    <div className="min-h-screen bg-background pb-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* ---------------------------------------------------- */}
        {/* Header — brand mark, live status pill, refined tabs  */}
        {/* ---------------------------------------------------- */}
        <div className="border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="max-w-7xl mx-auto px-3 md:px-5">
            <div className="flex items-center justify-between gap-3 py-3 md:py-4">
              <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl bg-orange-500 text-white shrink-0 shadow-sm">
                  <Store className="w-4.5 h-4.5 md:w-5 md:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-base md:text-2xl font-bold tracking-tight truncate">Seller dashboard</h1>
                    <span
                      className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${currentStatusStyle.pill}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${currentStatusStyle.dot}`} />
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground hidden sm:block truncate">
                    Manage your meals, tiffin services, and orders
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button onClick={goHome} variant="outline" size="sm" className="h-9 border-border/80">
                  <ArrowLeft className="w-4 h-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-9 h-9 rounded-full overflow-hidden border-2 border-orange-300 flex items-center justify-center bg-gray-100 hover:border-orange-400 transition-colors">
                      <img
                        src="https://tse2.mm.bing.net/th/id/OIP.7voziSoXjbJfxit4O9xJZgHaHa?r=0&pid=Api&P=0&h=180"
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl shadow-lg border border-gray-200">
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || seller?.shopName || "Seller"}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email || seller?.contactNumber}</p>
                    </div>
                    <DropdownMenuSeparator className="bg-gray-100" />
                    <DropdownMenuItem onClick={handleSellerLogout} className="text-red-600 hover:bg-red-50 cursor-pointer rounded-lg mx-1">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Mobile-first tab navigation — every section one tap away */}
            <TabsList className="grid grid-cols-4 w-full h-auto p-1 mb-0 bg-muted/60 rounded-xl gap-0.5">
              {NAV_ITEMS.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2.5 rounded-lg text-[11px] sm:text-sm relative font-medium text-muted-foreground data-[state=active]:shadow-sm data-[state=active]:bg-background data-[state=active]:text-orange-600 transition-all"
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  
                  {/* ⚠️ CHANGED SECTION: Badge ko ab flex-item banaya hai, absolute nahi */}
                  {!!item.badge && (
                    <Badge className="h-4 min-w-4 px-1 text-[10px] leading-none bg-orange-500 hover:bg-orange-500 border-0 flex items-center justify-center shrink-0">
                      {item.badge}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6 space-y-4">
          {isSuspended && (
            <Card className="border-destructive bg-destructive/5">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-destructive text-sm">Account suspended</h3>
                    <p className="text-sm text-destructive/90">
                      Your account has been suspended. You can't add new items until it's reactivated.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isPending && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-800 text-sm">Awaiting admin approval</h3>
                    <p className="text-sm text-amber-700">You'll be able to add items once your account is approved.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* --------------------------------------------------- */}
          {/* Overview tab */}
          {/* --------------------------------------------------- */}
          <TabsContent value="overview" className="mt-0 space-y-4">
            <RevenueStats bookings={bookings} />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="border-card-border">
                <CardContent className="p-3.5 md:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Total meals</span>
                    <UtensilsCrossed className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-xl md:text-2xl font-bold">{meals.length}</div>
                </CardContent>
              </Card>
              <Card className="border-card-border">
                <CardContent className="p-3.5 md:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Tiffin services</span>
                    <ChefHat className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-xl md:text-2xl font-bold">{tiffinServices.length}</div>
                </CardContent>
              </Card>
              <Card className="border-card-border">
                <CardContent className="p-3.5 md:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Total orders</span>
                    <Package className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-xl md:text-2xl font-bold">{groupedOrders.length}</div>
                </CardContent>
              </Card>
              <Card className="border-card-border">
                <CardContent className="p-3.5 md:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Account</span>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <Badge
                    variant={
                      sellerData?.status === "active" ? "default" : sellerData?.status === "suspended" ? "destructive" : "secondary"
                    }
                  >
                    {sellerData?.status || "Loading..."}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            <Card className="border-card-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Latest orders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {bookingsLoading ? (
                  [...Array(2)].map((_, i) => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)
                ) : groupedOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No orders yet.</p>
                ) : (
                  groupedOrders.slice(0, 3).map((group) =>
                    group.bookings.length > 1 ? (
                      <GroupOrderCard
                        key={group.key}
                        group={group}
                        onView={setSelectedOrder}
                        onGroupStatusUpdate={handleGroupStatusUpdate}
                      />
                    ) : (
                      <SingleOrderCard
                        key={group.bookings[0]._id}
                        booking={group.bookings[0]}
                        onView={() => setSelectedOrder(group.bookings[0])}
                        onStatusUpdate={handleStatusUpdate}
                      />
                    )
                  )
                )}
                {groupedOrders.length > 3 && (
                  <Button variant="outline" className="w-full" onClick={() => setActiveTab("orders")}>
                    View all orders
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* --------------------------------------------------- */}
          {/* Orders tab */}
          {/* --------------------------------------------------- */}
          <TabsContent value="orders" className="mt-0 space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {ORDER_STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setOrderFilter(f)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors min-h-[32px] ${
                    orderFilter === f ? "bg-primary text-primary-foreground border-primary" : "bg-background border-card-border text-muted-foreground"
                  }`}
                >
                  {f}
                  <span className="opacity-70">{orderCounts[f] ?? 0}</span>
                </button>
              ))}
            </div>

            {bookingsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <h3 className="text-base font-semibold mb-1">No orders here</h3>
                <p className="text-muted-foreground text-sm">Orders matching this filter will show up here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((group) =>
                  group.bookings.length > 1 ? (
                    <GroupOrderCard
                      key={group.key}
                      group={group}
                      onView={setSelectedOrder}
                      onGroupStatusUpdate={handleGroupStatusUpdate}
                    />
                  ) : (
                    <SingleOrderCard
                      key={group.bookings[0]._id}
                      booking={group.bookings[0]}
                      onView={() => setSelectedOrder(group.bookings[0])}
                      onStatusUpdate={handleStatusUpdate}
                    />
                  )
                )}
              </div>
            )}
          </TabsContent>

          {/* --------------------------------------------------- */}
          {/* Subscriptions tab */}
          {/* --------------------------------------------------- */}
          <TabsContent value="subscriptions" className="mt-0">
            <SubscriptionsManager />
          </TabsContent>

          {/* --------------------------------------------------- */}
          {/* Services tab */}
          {/* --------------------------------------------------- */}
          <TabsContent value="services" className="mt-0 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base md:text-lg font-semibold">My services</h2>
              <Button
                onClick={() => {
                  form.reset({
                    sellerId: seller?._id || "",
                    title: "",
                    description: "",
                    category: "Veg",
                    price: 0,
                    availableDays: [],
                    slots: [],
                    imageUrl: "",
                    serviceType: "meal",
                    mealType: "Lunch",
                    trialPrice: 99,
                    monthlyPrice: 2000,
                    customizableOptions: [],
                  });
                  setWeeklyCustomizations([]);
                  setEditingTiffin(null);
                  setIsAddDialogOpen(true);
                }}
                disabled={isSuspended || isPending}
                size="sm"
                className="h-9"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add service
              </Button>
            </div>

            <Tabs defaultValue="meals" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="meals" className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <UtensilsCrossed className="w-4 h-4" />
                  Meals ({meals.length})
                </TabsTrigger>
                <TabsTrigger value="tiffins" className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <ChefHat className="w-4 h-4" />
                  Tiffins ({tiffinServices.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="meals" className="mt-0">
                {tiffinsLoading ? (
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="h-20 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : meals.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <h3 className="text-base font-semibold mb-1">No meals yet</h3>
                    <p className="text-muted-foreground text-sm">Add your first meal to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {meals.map((tiffin) => (
                      <ServiceRow
                        key={tiffin._id}
                        tiffin={tiffin}
                        isSuspended={isSuspended}
                        onManageAddOns={() => {
                          setSelectedTiffinForManagement(tiffin);
                          setIsAddOnDialogOpen(true);
                        }}
                        onManageCustomizations={() => {
                          setSelectedTiffinForManagement(tiffin);
                          setIsCustomizationDialogOpen(true);
                        }}
                        onEdit={() => handleEdit(tiffin)}
                        onDelete={() => {
                          if (confirm("Are you sure you want to delete this service?")) {
                            deleteTiffinMutation.mutate(tiffin._id);
                          }
                        }}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tiffins" className="mt-0">
                {tiffinsLoading ? (
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="h-20 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : tiffinServices.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <ChefHat className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <h3 className="text-base font-semibold mb-1">No tiffin services yet</h3>
                    <p className="text-muted-foreground text-sm">Add your first tiffin service to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tiffinServices.map((tiffin) => (
                      <ServiceRow
                        key={tiffin._id}
                        tiffin={tiffin}
                        isSuspended={isSuspended}
                        isTiffinService
                        onManageAddOns={() => {
                          setSelectedTiffinForManagement(tiffin);
                          setIsAddOnDialogOpen(true);
                        }}
                        onManageCustomizations={() => {
                          setSelectedTiffinForManagement(tiffin);
                          setIsCustomizationDialogOpen(true);
                        }}
                        onEdit={() => handleEdit(tiffin)}
                        onDelete={() => {
                          if (confirm("Are you sure you want to delete this service?")) {
                            deleteTiffinMutation.mutate(tiffin._id);
                          }
                        }}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </div>
      </Tabs>

      {/* Order Details Dialog */}
      {selectedOrder && <OrderDetails booking={selectedOrder} onClose={() => setSelectedOrder(null)} />}

      {/* Add/Edit Service Dialog */}
      <Dialog
        open={isAddDialogOpen || !!editingTiffin}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingTiffin(null);
            form.reset();
            setWeeklyCustomizations([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTiffin ? "Edit service" : "Add new service"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentServiceType === "meal" ? "Meal photo" : "Tiffin photo"}</FormLabel>
                    <FormControl>
                      <div>
                        {field.value ? (
                          <div className="relative w-full h-40 rounded-lg overflow-hidden border border-card-border bg-muted">
                            <img src={field.value} alt="Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => field.onChange("")}
                              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5"
                              title="Remove photo"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label
                            htmlFor="tiffin-image-upload"
                            className={`flex flex-col items-center justify-center gap-2 w-full h-40 rounded-lg border-2 border-dashed border-card-border cursor-pointer hover:bg-muted/50 transition-colors ${
                              isUploadingImage ? "opacity-60 pointer-events-none" : ""
                            }`}
                          >
                            {isUploadingImage ? (
                              <>
                                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Tap to upload from gallery / files</span>
                                <span className="text-xs text-muted-foreground">JPG, PNG, WEBP or GIF — max 5MB</span>
                              </>
                            )}
                          </label>
                        )}
                        <input
                          id="tiffin-image-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) => handleImageFileChange(e, field.onChange)}
                          disabled={isUploadingImage}
                        />
                        {!field.value && (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            No photo? We'll show a default image to customers instead.
                          </p>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="meal">Single meal</SelectItem>
                        <SelectItem value="tiffin">Tiffin service</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentServiceType === "meal" ? "Meal title *" : "Tiffin service name *"}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={currentServiceType === "meal" ? "Butter chicken" : "Premium home tiffin service"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={currentServiceType === "meal" ? "Describe your meal..." : "Describe your tiffin service..."}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Veg">Vegetarian</SelectItem>
                        <SelectItem value="Non-Veg">Non-vegetarian</SelectItem>
                        <SelectItem value="Jain">Jain</SelectItem>
                        <SelectItem value="Customizable">Customizable</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {currentServiceType === "meal" && (
                <FormField
                  control={form.control}
                  name="mealType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meal type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select meal type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Breakfast">Breakfast</SelectItem>
                          <SelectItem value="Lunch">Lunch</SelectItem>
                          <SelectItem value="Dinner">Dinner</SelectItem>
                          <SelectItem value="Full Day">Full day</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {currentServiceType === "meal" ? (
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per meal (₹) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="120"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base price (₹) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="120"
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="trialPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trial price (₹) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="99"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="monthlyPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly price (₹) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="2000"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 2000)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Weekly Customizations */}
              <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Weekly customization options</h3>
                  <Badge variant="outline">{weeklyCustomizations.length} added</Badge>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Customization name (e.g. Extra protein)"
                      value={tempCustomization.name}
                      onChange={(e) => setTempCustomization({ ...tempCustomization, name: e.target.value })}
                    />
                    <Input
                      type="number"
                      placeholder="Additional price (₹)"
                      value={tempCustomization.price || ""}
                      onChange={(e) => setTempCustomization({ ...tempCustomization, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <Textarea
                    placeholder="Description (e.g. Extra chicken/paneer pieces)"
                    value={tempCustomization.description}
                    onChange={(e) => setTempCustomization({ ...tempCustomization, description: e.target.value })}
                  />

                  <div>
                    <p className="text-sm font-medium mb-2">Available days</p>
                    <div className="grid grid-cols-2 gap-2">
                      {DAYS.map((day) => (
                        <div key={day} className="flex items-center gap-2">
                          <Checkbox checked={tempCustomization.days.includes(day)} onCheckedChange={() => toggleTempDaySelection(day)} />
                          <label className="text-sm">{day}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button type="button" variant="outline" onClick={addWeeklyCustomization} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add weekly customization
                  </Button>
                </div>

                {weeklyCustomizations.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-sm font-medium">Added customizations</p>
                    {weeklyCustomizations.map((custom, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded bg-background">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{custom.name}</span>
                            <Badge variant="secondary">₹{custom.price}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{custom.description}</p>
                          <p className="text-xs text-muted-foreground">Days: {custom.days.join(", ")}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeWeeklyCustomization(index)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Days */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel>Available days *</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedDays?.length === DAYS.length) {
                        form.setValue("availableDays", []);
                      } else {
                        form.setValue("availableDays", [...DAYS]);
                      }
                    }}
                  >
                    {selectedDays?.length === DAYS.length ? "Deselect all" : "Select all days"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DAYS.map((day) => (
                    <div key={day} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedDays?.includes(day)}
                        onCheckedChange={(checked) => {
                          const updated = checked ? [...(selectedDays || []), day] : (selectedDays || []).filter((d) => d !== day);
                          form.setValue("availableDays", updated);
                        }}
                      />
                      <label className="text-sm">{day}</label>
                    </div>
                  ))}
                </div>
                {form.formState.errors.availableDays && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.availableDays.message}</p>
                )}
              </div>

              {/* Time Slots */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel>Available time slots *</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedSlots?.length === TIME_SLOTS.length) {
                        form.setValue("slots", []);
                      } else {
                        form.setValue("slots", [...TIME_SLOTS]);
                      }
                    }}
                  >
                    {selectedSlots?.length === TIME_SLOTS.length ? "Deselect all" : "Select all slots"}
                  </Button>
                </div>
                <div className="space-y-2">
                  {TIME_SLOTS.map((slot) => (
                    <div key={slot} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedSlots?.includes(slot)}
                        onCheckedChange={(checked) => {
                          const updated = checked ? [...(selectedSlots || []), slot] : (selectedSlots || []).filter((s) => s !== slot);
                          form.setValue("slots", updated);
                        }}
                      />
                      <label className="text-sm">{slot}</label>
                    </div>
                  ))}
                </div>
                {form.formState.errors.slots && <p className="text-sm text-destructive mt-1">{form.formState.errors.slots.message}</p>}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingTiffin(null);
                    form.reset();
                    setWeeklyCustomizations([]);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addTiffinMutation.isPending || updateTiffinMutation.isPending} className="flex-1">
                  {addTiffinMutation.isPending || updateTiffinMutation.isPending
                    ? "Saving..."
                    : editingTiffin
                    ? "Update service"
                    : "Add service"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add-on Dialog */}
      <Dialog open={isAddOnDialogOpen} onOpenChange={setIsAddOnDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage add-ons — {selectedTiffinForManagement?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="border rounded-lg p-4 bg-muted/20">
              <h4 className="font-semibold mb-3 text-sm">Add new add-on</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Add-on name (e.g. Extra cheese)"
                    value={newAddOn.name}
                    onChange={(e) => setNewAddOn({ ...newAddOn, name: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Additional price (₹)"
                    value={newAddOn.price || ""}
                    onChange={(e) => setNewAddOn({ ...newAddOn, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <Textarea
                  placeholder="Description"
                  value={newAddOn.description}
                  onChange={(e) => setNewAddOn({ ...newAddOn, description: e.target.value })}
                />
                <div className="flex items-center space-x-2">
                  <Switch checked={newAddOn.available} onCheckedChange={(checked) => setNewAddOn({ ...newAddOn, available: checked })} />
                  <label className="text-sm font-medium">Available for customers</label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => selectedTiffinForManagement && handleAddAddOn(selectedTiffinForManagement._id)}
                  className="w-full"
                  disabled={addAddOnMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {addAddOnMutation.isPending ? "Adding..." : "Add add-on"}
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3 text-sm">Existing add-ons</h4>
              {selectedTiffinForManagement?.addOns && selectedTiffinForManagement.addOns.length > 0 ? (
                <div className="space-y-3">
                  {selectedTiffinForManagement.addOns.map((addOn, index) => (
                    <div key={index} className="border rounded-lg p-3.5 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-sm truncate">{addOn.name}</h5>
                          {addOn.available ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{addOn.description}</p>
                        <p className="text-sm font-semibold">₹{addOn.price}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Switch
                          checked={addOn.available}
                          onCheckedChange={(checked) =>
                            selectedTiffinForManagement &&
                            updateAddOnStatusMutation.mutate({
                              tiffinId: selectedTiffinForManagement._id,
                              addOnName: addOn.name,
                              available: checked,
                            })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this add-on?")) {
                              selectedTiffinForManagement &&
                                deleteAddOnMutation.mutate({ tiffinId: selectedTiffinForManagement._id, addOnName: addOn.name });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground text-sm">No add-ons added yet.</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOnDialogOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customization Dialog */}
      <Dialog open={isCustomizationDialogOpen} onOpenChange={setIsCustomizationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage weekly customizations — {selectedTiffinForManagement?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="border rounded-lg p-4 bg-muted/20">
              <h4 className="font-semibold mb-3 text-sm">Add new weekly customization</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Customization name (e.g. Extra protein)"
                    value={newCustomization.name}
                    onChange={(e) => setNewCustomization({ ...newCustomization, name: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Additional price (₹)"
                    value={newCustomization.price || ""}
                    onChange={(e) => setNewCustomization({ ...newCustomization, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <Textarea
                  placeholder="Description"
                  value={newCustomization.description}
                  onChange={(e) => setNewCustomization({ ...newCustomization, description: e.target.value })}
                />

                <div>
                  <p className="text-sm font-medium mb-2">Available days</p>
                  <div className="grid grid-cols-2 gap-2">
                    {DAYS.map((day) => (
                      <div key={day} className="flex items-center gap-2">
                        <Checkbox checked={newCustomization.days?.includes(day)} onCheckedChange={() => toggleDaySelection(day)} />
                        <label className="text-sm">{day}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newCustomization.available}
                    onCheckedChange={(checked) => setNewCustomization({ ...newCustomization, available: checked })}
                  />
                  <label className="text-sm font-medium">Available for customers</label>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => selectedTiffinForManagement && handleAddCustomization(selectedTiffinForManagement._id)}
                  className="w-full"
                  disabled={addCustomizationMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {addCustomizationMutation.isPending ? "Adding..." : "Add customization"}
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3 text-sm">Existing weekly customizations</h4>
              {selectedTiffinForManagement?.weeklyCustomizations && selectedTiffinForManagement.weeklyCustomizations.length > 0 ? (
                <div className="space-y-3">
                  {selectedTiffinForManagement.weeklyCustomizations.map((custom, index) => (
                    <div key={index} className="border rounded-lg p-3.5 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-sm truncate">{custom.name}</h5>
                          {custom.available ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{custom.description}</p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="text-sm font-semibold">₹{custom.price}/day</p>
                          <div className="flex flex-wrap gap-1">
                            {custom.days.map((day) => (
                              <Badge key={day} variant="outline" className="text-xs">
                                {day}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Switch
                          checked={custom.available}
                          onCheckedChange={(checked) =>
                            selectedTiffinForManagement &&
                            updateCustomizationStatusMutation.mutate({
                              tiffinId: selectedTiffinForManagement._id,
                              customizationName: custom.name,
                              available: checked,
                            })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this customization?")) {
                              selectedTiffinForManagement &&
                                deleteCustomizationMutation.mutate({
                                  tiffinId: selectedTiffinForManagement._id,
                                  customizationName: custom.name,
                                });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground text-sm">No weekly customizations added yet.</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomizationDialogOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ------------------------------------------------------------------
// A single service (meal or tiffin) row in "My services"
// ------------------------------------------------------------------
function ServiceRow({
  tiffin,
  isSuspended,
  isTiffinService,
  onManageAddOns,
  onManageCustomizations,
  onEdit,
  onDelete,
}: {
  tiffin: Tiffin;
  isSuspended: boolean;
  isTiffinService?: boolean;
  onManageAddOns: () => void;
  onManageCustomizations: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 md:p-4 border border-card-border rounded-lg hover:shadow-sm transition-shadow gap-3">
      <div className="flex gap-3 flex-1 min-w-0">
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
          {tiffin.imageUrl ? (
            <img src={tiffin.imageUrl} alt={tiffin.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <h3 className="font-semibold text-sm md:text-base truncate">{tiffin.title}</h3>
          <Badge variant="outline" className="text-xs">
            {tiffin.category}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {isTiffinService ? "Tiffin service" : tiffin.mealType}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{tiffin.description}</p>
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {isTiffinService ? (
            <>
              <span className="font-semibold">Trial ₹{tiffin.trialPrice || 99}</span>
              <span className="font-semibold">Monthly ₹{tiffin.monthlyPrice || 2000}</span>
            </>
          ) : (
            <span className="font-semibold">₹{tiffin.price}</span>
          )}
          <span className="text-muted-foreground">{tiffin.availableDays.length} days</span>
          <span className="text-muted-foreground">
            {isTiffinService ? `${tiffin.customizableOptions?.length || 0} options` : `${tiffin.slots.length} slots`}
          </span>
          {tiffin.addOns && tiffin.addOns.filter((a) => a.available).length > 0 && (
            <Badge variant="outline" className="text-xs">
              {tiffin.addOns.filter((a) => a.available).length} add-ons
            </Badge>
          )}
          {tiffin.weeklyCustomizations && tiffin.weeklyCustomizations.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {tiffin.weeklyCustomizations.length} weekly options
            </Badge>
          )}
        </div>
      </div>
      </div>
      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <Button variant="ghost" size="icon" onClick={onManageAddOns} disabled={isSuspended} title="Manage add-ons" className="h-9 w-9">
          <IndianRupee className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onManageCustomizations}
          disabled={isSuspended}
          title="Manage customizations"
          className="h-9 w-9"
        >
          <Settings className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onEdit} disabled={isSuspended} className="h-9 w-9" title="Edit">
          <Edit className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} disabled={isSuspended} className="h-9 w-9" title="Delete">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
