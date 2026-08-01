import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CouponInput } from "@/components/coupon-input";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Wallet,
  CreditCard,
  ArrowLeft,
  MapPin,
  Clock4,
  Truck,
  Tag,
  Star,
  Shield,
  PackageCheck,
  CalendarCheck,
  BadgePercent,
  BookOpen,
  ChefHat,
  PlusCircle,
  IndianRupee,
  Sparkles,
} from "lucide-react";

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

export default function CartPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { items, removeItem, updateQuantity, clearCart, totalAmount } = useCart();

  const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi">("cod");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);

  // Calculate delivery fee and savings
  // ₹100 se kam order pe ₹10 delivery fee, warna free delivery
  const deliveryFee = items.length > 0 && totalAmount < 100 ? 10 : 0;
  const savings = Math.round(totalAmount * 0.15);
  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const grandTotal = Math.max(0, totalAmount + deliveryFee - couponDiscount);

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please login to checkout your cart",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }

    if (items.length === 0) return;

    setIsPlacingOrder(true);

    try {
      const payloadItems = items.map(({ cartItemId, tiffinTitle, ...rest }) => rest);
      const response = await apiRequest("POST", "/api/cart/checkout", {
        items: payloadItems,
        paymentMethod,
        couponCode: appliedCoupon?.coupon?.code,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/bookings/customer"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      clearCart();
      setAppliedCoupon(null);

      const rewardTokens = response?.rewardTokens || 5;

      toast({
        title: paymentMethod === "cod" ? "Order Placed (COD)" : "Order Placed",
        description: `${items.length} meal${items.length > 1 ? "s" : ""} ordered successfully. 🎉 ${rewardTokens} tokens transferred to your wallet!`,
      });
      setLocation("/my-bookings");
    } catch (error: any) {
      toast({
        title: "Order Failed",
        description: error.message || "Could not place your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8">
      {/* Header - Same style as Home Page */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Continue Shopping</span>
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">T</span>
              </div>
              <span className="font-bold text-lg text-gray-800">Tiffo</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Cart Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Your Cart</h1>
              {items.length > 0 && (
                <p className="text-sm text-gray-500">{items.length} item{items.length > 1 ? "s" : ""} • ₹{totalAmount}</p>
              )}
            </div>
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-2 mt-3 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full w-fit">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-semibold">You're saving ₹{savings} on this order!</span>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          /* Empty Cart State - Professional Design */
          <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
            <CardContent className="py-16 text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
              <p className="text-gray-500 mb-2">Looks like you haven't added anything yet</p>
              <p className="text-gray-400 text-sm mb-8">Browse our delicious homemade meals and find something you love</p>
              <Link href="/">
                <Button className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 text-base">
                  Browse Meals
                </Button>
              </Link>
              <div className="mt-8 grid grid-cols-3 gap-3 max-w-md mx-auto">
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto mb-2 bg-green-50 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-xs text-gray-500">Hygienic Food</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto mb-2 bg-orange-50 rounded-full flex items-center justify-center">
                    <Truck className="w-5 h-5 text-orange-500" />
                  </div>
                  <p className="text-xs text-gray-500">Fast Delivery</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto mb-2 bg-blue-50 rounded-full flex items-center justify-center">
                    <IndianRupee className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-xs text-gray-500">Best Prices</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items - Left Side */}
            <div className="lg:col-span-2 space-y-4">
              {/* Quick Info Bar */}
              <div className="bg-white rounded-xl p-3 flex items-center gap-4 text-sm border border-gray-100 shadow-sm">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <MapPin className="w-4 h-4 text-red-400" />
                  <span>{user?.address || "Lucknow, UP"}</span>
                </div>
                <div className="w-px h-4 bg-gray-200"></div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Clock4 className="w-4 h-4 text-orange-400" />
                  <span>Delivery in 25-30 mins</span>
                </div>
              </div>

              {/* Cart Items List */}
              {items.map((item) => (
                <Card 
                  key={item.cartItemId} 
                  className="border-0 shadow-md hover:shadow-lg transition-all rounded-2xl overflow-hidden"
                  data-testid={`cart-item-${item.cartItemId}`}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex gap-4">
                      {/* Item Image */}
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                        <img
                          src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop"
                          alt={item.tiffinTitle}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-1">
                              {item.tiffinTitle}
                            </h3>
                            <div className="flex items-center gap-1 mt-1">
                              <div className="flex items-center gap-0.5 bg-green-600 text-white px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                <Star className="w-2.5 h-2.5 fill-white" />
                                4.5
                              </div>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500 capitalize">{item.bookingType}</span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">{item.date}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeItem(item.cartItemId)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded-lg"
                            data-testid={`button-remove-${item.cartItemId}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {item.addOns && item.addOns.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1.5">
                            + {item.addOns.map((a) => a.name).join(", ")}
                          </p>
                        )}

                        {item.couponCode && (
                          <div className="mt-2">
                            <Badge className="bg-green-50 text-green-600 border border-green-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              🎫 {item.couponCode}
                            </Badge>
                          </div>
                        )}

                        {/* Quantity Controls + Price */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Minus className="w-3 h-3 text-gray-600" />
                            </button>
                            <span className="w-8 text-center font-bold text-gray-800 text-sm">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                              className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center hover:bg-red-100 transition-colors"
                            >
                              <Plus className="w-3 h-3 text-red-500" />
                            </button>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-gray-900">₹{item.totalPrice}</span>
                            {item.quantity > 1 && (
                              <p className="text-[10px] text-gray-400">₹{Math.round(item.totalPrice / item.quantity)} each</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Free Delivery Banner */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Free Delivery Available!</p>
                  <p className="text-xs text-green-600">Add ₹{Math.max(0, 100 - totalAmount)} more for free delivery</p>
                </div>
              </div>
            </div>

            {/* Order Summary - Right Side */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24 border-0 shadow-xl rounded-2xl overflow-hidden">
                {/* Coupon Section */}
                <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-600">
                    <Tag className="w-4 h-4" />
                    <span>Apply Coupon</span>
                  </div>
                  <CouponInput
                    totalAmount={totalAmount}
                    onCouponApplied={setAppliedCoupon}
                    onCouponRemoved={() => setAppliedCoupon(null)}
                  />
                </div>

                <CardContent className="p-5 space-y-4">
                  <h3 className="font-extrabold text-gray-900 text-lg">Bill Details</h3>

                  {/* Item Total */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Item Total</span>
                    <span className="font-semibold text-gray-800">₹{totalAmount}</span>
                  </div>

                  {/* Delivery Fee */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Delivery Fee</span>
                    <div className="text-right">
                      <span className="text-gray-400 line-through text-xs mr-1">₹29</span>
                      <span className="font-semibold text-green-600">₹{deliveryFee}</span>
                    </div>
                  </div>

                  {/* Coupon Discount */}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between items-center text-sm bg-red-50 rounded-lg p-2 -mx-1">
                      <span className="text-red-700 font-medium flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        Coupon ({appliedCoupon?.coupon?.code})
                      </span>
                      <span className="font-bold text-red-700">-₹{couponDiscount}</span>
                    </div>
                  )}

                  {/* Savings */}
                  <div className="flex justify-between items-center text-sm bg-green-50 rounded-lg p-2 -mx-1">
                    <span className="text-green-700 font-medium">Your Savings</span>
                    <span className="font-bold text-green-700">-₹{savings}</span>
                  </div>

                  <div className="border-t border-dashed border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold text-gray-900">To Pay</span>
                      <div className="text-right">
                        <span className="text-2xl font-extrabold text-gray-900">₹{grandTotal}</span>
                        <p className="text-[10px] text-gray-400">incl. all taxes & charges</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold text-gray-800 mb-3">Payment Method</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => setPaymentMethod("cod")}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          paymentMethod === "cod" 
                            ? "border-red-500 bg-red-50 shadow-md" 
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        data-testid="button-payment-cod"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          paymentMethod === "cod" ? "bg-red-100" : "bg-gray-100"
                        }`}>
                          <Wallet className={`w-5 h-5 ${paymentMethod === "cod" ? "text-red-500" : "text-gray-500"}`} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`text-sm font-semibold ${paymentMethod === "cod" ? "text-red-600" : "text-gray-800"}`}>
                            Cash on Delivery
                          </p>
                          <p className="text-xs text-gray-500">Pay when your order arrives</p>
                        </div>
                        {paymentMethod === "cod" && (
                          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>

                      <button
                        onClick={() => setPaymentMethod("upi")}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          paymentMethod === "upi" 
                            ? "border-red-500 bg-red-50 shadow-md" 
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        data-testid="button-payment-upi"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          paymentMethod === "upi" ? "bg-red-100" : "bg-gray-100"
                        }`}>
                          <CreditCard className={`w-5 h-5 ${paymentMethod === "upi" ? "text-red-500" : "text-gray-500"}`} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`text-sm font-semibold ${paymentMethod === "upi" ? "text-red-600" : "text-gray-800"}`}>
                            UPI / Online
                          </p>
                          <p className="text-xs text-gray-500">Pay now via UPI or card</p>
                        </div>
                        {paymentMethod === "upi" && (
                          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Place Order Button */}
                  <Button
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-6 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                    onClick={handlePlaceOrder}
                    disabled={isPlacingOrder}
                    data-testid="button-place-order"
                  >
                    {isPlacingOrder ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Placing Order...
                      </div>
                    ) : paymentMethod === "cod" ? (
                      <div className="flex items-center gap-2">
                        <PackageCheck className="w-5 h-5" />
                        Place Order (COD)
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <IndianRupee className="w-5 h-5" />
                        Pay ₹{grandTotal} & Place Order
                      </div>
                    )}
                  </Button>

                  {/* Trust Badges */}
                  <div className="flex items-center justify-center gap-4 pt-2">
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Shield className="w-3 h-3" />
                      Secure Payment
                    </div>
                    <div className="w-px h-3 bg-gray-200"></div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Truck className="w-3 h-3" />
                      Free Delivery*
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Navigation Bar - Same as Home Page (Mobile Only) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 lg:hidden">
        <div className="flex justify-around items-end pt-2 pb-2 relative max-w-md mx-auto sm:max-w-xl">
          <Link href="/" className="flex flex-col items-center gap-1 w-1/5">
            <PackageCheck className="w-6 h-6 text-gray-500" />
            <span className="text-[11px] text-gray-600">Delivery</span>
          </Link>

          <Link href="/my-bookings" className="flex flex-col items-center gap-1 w-1/5">
            <CalendarCheck className="w-6 h-6 text-gray-500" />
            <span className="text-[11px] text-gray-600">Subscriptions</span>
          </Link>

          <a 
            href="https://mayankgautam008.github.io/story-rewards-for-tifo/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 w-1/5"
          >
            <BadgePercent className="w-6 h-6 text-gray-500" />
            <span className="text-[11px] text-gray-600">Offer's</span>
          </a>

          <div className="flex flex-col items-center w-1/5 -mt-7">
            <button className="w-14 h-14 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 shadow-lg border-4 border-white flex items-center justify-center">
              <div className="relative">
                <ChefHat className="w-6 h-6 text-amber-900" />
                <PlusCircle className="w-3.5 h-3.5 text-amber-900 absolute -bottom-1 -right-1 bg-white rounded-full" />
              </div>
            </button>
            <span className="text-[11px] font-bold text-gray-800 mt-1">New Tiffin</span>
          </div>

          <Link href="/my-bookings" className="flex flex-col items-center gap-1 w-1/5">
            <BookOpen className="w-6 h-6 text-gray-500" />
            <span className="text-[11px] text-gray-600">Orders</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
