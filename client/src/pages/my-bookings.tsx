import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BookingWithDetails, Review } from "@shared/schema";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  IndianRupee, 
  Package, 
  ChefHat, 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock4,
  Truck,
  Star,
  Ban
} from "lucide-react";
import { RatingDialog } from "@/components/rating-dialog";

// ✅ NEW: 30 seconds — how long the "Cancel" button stays available after a
// single/trial order is placed. Weekly/monthly subscriptions are cancelled
// anytime from the Subscription section instead (see subscription-details.tsx).
const CANCEL_WINDOW_SECONDS = 30;

function CancelOrderButton({ booking }: { booking: BookingWithDetails }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const elapsed = (Date.now() - new Date(booking.createdAt).getTime()) / 1000;
    return Math.max(0, Math.ceil(CANCEL_WINDOW_SECONDS - elapsed));
  });

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft > 0]);

  const cancelMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/bookings/${booking._id}/cancel`, { reason: "Cancelled by user" }),
    onSuccess: () => {
      toast({ title: "Order cancelled", description: "Your order has been cancelled." });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/customer"] });
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't cancel order", description: error.message, variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/customer"] });
    },
  });

  // Only single/trial orders show this quick-cancel window; weekly/monthly
  // are managed anytime from "Manage Subscription".
  if (booking.bookingType === "weekly" || booking.bookingType === "monthly") return null;
  if (booking.status !== "Pending" && booking.status !== "Confirmed") return null;
  if (secondsLeft <= 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <Button
        onClick={() => cancelMutation.mutate()}
        disabled={cancelMutation.isPending}
        variant="outline"
        size="sm"
        className="w-full bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800"
      >
        <Ban className="w-4 h-4 mr-2" />
        {cancelMutation.isPending ? "Cancelling..." : `Cancel Order (${secondsLeft}s)`}
      </Button>
    </div>
  );
}

export default function MyBookings() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedSeller, setSelectedSeller] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  const { data: bookings = [], isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings/customer"],
    enabled: isAuthenticated,
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ["/api/reviews/my-reviews"],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return null;
  }

  const handleRateOrder = (booking: any, seller: any) => {
    setSelectedBooking(booking);
    setSelectedSeller(seller);
    setRatingDialogOpen(true);
  };

  const isRateable = (booking: any) => {
    // ✅ FIX: Check if reviews array exists and is loaded
    if (!reviews || reviewsLoading) return false;
    
    return booking.status === "Delivered" && 
           !reviews.some((review: Review) => review.bookingId === booking._id);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Confirmed":
        return <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />;
      case "Cancelled":
        return <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />;
      case "Delivered":
        return <Truck className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />;
      default:
        return <Clock4 className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Confirmed":
        return "bg-green-50 text-green-700 border-green-200";
      case "Cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      case "Delivered":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-orange-50 text-orange-700 border-orange-200";
    }
  };

  const renderRatingButton = (booking: any, seller: any) => {
    if (!isRateable(booking)) return null;

    return (
      <div className="mt-3 pt-3 border-t border-gray-200">
        <Button
          onClick={() => handleRateOrder(booking, seller)}
          variant="outline"
          size="sm"
          className="w-full bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-800"
        >
          <Star className="w-4 h-4 mr-2" />
          Rate Your Experience
        </Button>
      </div>
    );
  };

  const renderAlreadyRated = (booking: any) => {
    // ✅ FIX: Check if reviews array exists
    if (!reviews || reviewsLoading) return null;
    
    const review = reviews.find((r: Review) => r.bookingId === booking._id);
    if (!review) return null;

    return (
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= review.rating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-600">You rated</span>
          </div>
          {review.comment && (
            <Badge variant="outline" className="text-xs">
              With Feedback
            </Badge>
          )}
        </div>
        {review.comment && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{review.comment}</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      
      {/* Mobile First Design */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header - Mobile Optimized */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/")}
              className="bg-white border-red-200 hover:bg-red-50 shadow-sm rounded-lg text-xs sm:text-sm"
            >
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Back
            </Button>
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-lg sm:rounded-2xl flex items-center justify-center shadow">
              <Package className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
          
          <div className="text-center">
            <h1 className="font-bold text-2xl sm:text-4xl bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent mb-2">
              My Orders
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Track your tiffin orders
            </p>
            {bookings.some((b: any) => b.bookingType === "weekly" || b.bookingType === "monthly") && (
              <Button
                onClick={() => setLocation("/my-subscriptions")}
                variant="outline"
                size="sm"
                className="mt-3 bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:text-purple-800 rounded-full"
              >
                <Calendar className="w-4 h-4 mr-2" />
                View My Subscriptions
              </Button>
            )}
          </div>

          {/* Stats Cards - Mobile Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-4 sm:mt-6">
            <Card className="bg-white border-red-200 p-2 sm:p-4 text-center">
              <div className="text-lg sm:text-2xl font-bold text-red-600">{bookings.length}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total</div>
            </Card>
            <Card className="bg-white border-green-200 p-2 sm:p-4 text-center">
              <div className="text-lg sm:text-2xl font-bold text-green-600">
                {bookings.filter(b => b.status === "Confirmed").length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Confirmed</div>
            </Card>
            <Card className="bg-white border-blue-200 p-2 sm:p-4 text-center">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">
                {bookings.filter(b => b.status === "Delivered").length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Delivered</div>
            </Card>
            <Card className="bg-white border-gray-200 p-2 sm:p-4 text-center">
              <div className="text-lg sm:text-2xl font-bold text-gray-600">
                {bookings.filter(b => b.status === "Cancelled").length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Cancelled</div>
            </Card>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-3 sm:space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-4 sm:p-6 animate-pulse bg-white border-red-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 sm:h-6 bg-red-200 rounded w-1/3"></div>
                  <div className="h-4 sm:h-6 bg-red-200 rounded w-16 sm:w-20"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 sm:h-4 bg-red-200 rounded w-2/3"></div>
                  <div className="h-3 sm:h-4 bg-red-200 rounded w-1/2"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <Card className="p-6 sm:p-12 text-center bg-white border-red-200 shadow-sm rounded-2xl">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Package className="w-8 h-8 sm:w-12 sm:h-12 text-red-500" />
            </div>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">No orders yet</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Discover delicious tiffins and place your first order!
            </p>
            <Button 
              onClick={() => setLocation("/")}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base"
            >
              Browse Tiffins
            </Button>
          </Card>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {bookings.map((booking) => {
              const tiffin = booking.tiffin || {
                title: "Service Not Available",
                description: "This service is no longer available"
              };
              
              const seller = booking.seller || {
                shopName: "Seller Not Available"
              };

const totalAmount = booking.totalPrice;

              return (
                <Card 
                  key={booking._id} 
                  className="bg-white border-red-200 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl sm:rounded-2xl overflow-hidden"
                >
                  {/* Header with Red Accent */}
                  <div className="bg-red-600 p-3 sm:p-4 text-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <ChefHat className="w-4 h-4 sm:w-5 sm:h-5" />
                          <h3 className="font-bold text-sm sm:text-base truncate">{tiffin.title}</h3>
                        </div>
                        <p className="text-red-100 text-xs sm:text-sm truncate">{seller.shopName}</p>
                      </div>
                      <Badge 
                        className={`${getStatusColor(booking.status)} text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 rounded-full flex items-center gap-1 sm:gap-2`}
                      >
                        {getStatusIcon(booking.status)}
                        {booking.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Order Details - Mobile Compact */}
                  <div className="p-3 sm:p-4">
                    {/* Key Info Grid - Mobile Stacked */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-600 truncate">Date</p>
                          <p className="font-semibold text-gray-900 text-xs sm:text-sm truncate">
                            {new Date(booking.date).toLocaleDateString('en-IN', { 
                              day: 'numeric', 
                              month: 'short' 
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-600 truncate">Time</p>
                          <p className="font-semibold text-gray-900 text-xs sm:text-sm truncate">
                            {booking.slot.split(' ')[0]}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                        <Package className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                        <div>
                          <p className="text-xs text-gray-600">Qty</p>
                          <p className="font-semibold text-gray-900 text-xs sm:text-sm">{booking.quantity}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                        <IndianRupee className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                        <div>
                          <p className="text-xs text-gray-600">Amount</p>
                          <p className="font-bold text-green-700 text-xs sm:text-sm">₹{totalAmount}</p>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Address - Mobile Compact */}
                    <div className="flex items-start gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg mb-3 sm:mb-4">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-xs sm:text-sm mb-1">Delivery Address</p>
                        <p className="text-gray-600 text-xs sm:text-sm line-clamp-2">{booking.deliveryAddress}</p>
                      </div>
                    </div>

                    {/* Tags - Mobile Wrap */}
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {booking.addOns && booking.addOns.length > 0 && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-2 py-0">
                          +{booking.addOns.length} Add-ons
                        </Badge>
                      )}
                      {booking.weeklyCustomizations && booking.weeklyCustomizations.length > 0 && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2 py-0">
                          {booking.weeklyCustomizations.length} Custom
                        </Badge>
                      )}
                      {booking.selectedDays && booking.selectedDays.length > 0 && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-2 py-0">
                          {booking.selectedDays.length} Days
                        </Badge>
                      )}
                      {booking.bookingType && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs px-2 py-0 capitalize">
                          {booking.bookingType}
                        </Badge>
                      )}
                      {booking.deliveryCharge > 0 && booking.bookingType !== "weekly" && booking.bookingType !== "monthly" && (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-2 py-0">
                          Delivery: ₹{booking.deliveryCharge}
                        </Badge>
                      )}
                    </div>

                    {/* Cancellation reason - shown once the order is cancelled */}
                    {booking.status === "Cancelled" && booking.cancellationReason && (
                      <div className="flex items-start gap-2 p-2 sm:p-3 bg-red-50 rounded-lg mb-3 sm:mb-4 border border-red-100">
                        <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <p className="text-red-700 text-xs sm:text-sm">{booking.cancellationReason}</p>
                      </div>
                    )}

                    {/* Manage Subscription - weekly/monthly bookings only */}
                    {(booking.bookingType === "weekly" || booking.bookingType === "monthly") && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <Button
                          onClick={() => setLocation(`/my-bookings/${booking._id}/subscription`)}
                          variant="outline"
                          size="sm"
                          className="w-full bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:text-purple-800"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Manage Subscription
                        </Button>
                      </div>
                    )}

                    {/* Cancel Order - single/trial orders, within 30 seconds of placing */}
                    <CancelOrderButton booking={booking} />

                    {/* Rating Section */}
                    {renderAlreadyRated(booking)}
                    {renderRatingButton(booking, seller)}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Rating Dialog */}
      <RatingDialog
        open={ratingDialogOpen}
        onOpenChange={setRatingDialogOpen}
        booking={selectedBooking}
        seller={selectedSeller}
      />
    </div>
  );
}










