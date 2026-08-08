import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  ArrowLeft,
  ChefHat,
  CalendarRange,
  PackageCheck,
  ChevronRight,
} from "lucide-react";

// ✅ NEW PAGE: shows ONLY the customer's weekly/monthly tiffin subscriptions —
// unlike "My Orders" (/my-bookings) which mixes every order type together.
// Tapping a card opens the existing day-by-day subscription manager.

interface DeliveryDay {
  _id: string;
  date: string;
  day: string;
  status: "Pending" | "Delivered" | "Missed";
}

interface SubscriptionBooking {
  _id: string;
  status: string;
  bookingType: "weekly" | "monthly";
  date: string;
  totalPrice: number;
  selectedDays?: string[];
  tiffin?: { title?: string; imageUrl?: string };
  seller?: { shopName?: string };
  deliverySchedule: DeliveryDay[];
}

export default function MySubscriptions() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  const { data: subscriptions = [], isLoading } = useQuery<SubscriptionBooking[]>({
    queryKey: ["/api/bookings/customer/subscriptions"],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/my-bookings")}
            className="bg-white border-gray-200 hover:bg-gray-50 shadow-sm rounded-lg text-xs sm:text-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Back to Orders
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-4 sm:mb-6 px-1">
          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
            <CalendarRange className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">My Subscriptions</h1>
            <p className="text-xs sm:text-sm text-gray-500">Your weekly &amp; monthly tiffin plans</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-32 animate-pulse bg-white border-gray-200 rounded-2xl" />
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center bg-white border-gray-200 shadow-sm rounded-2xl">
            <CalendarRange className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium mb-1">No active subscriptions yet</p>
            <p className="text-sm text-gray-500 mb-4">
              Book a weekly or monthly tiffin plan to see it here.
            </p>
            <Button
              onClick={() => setLocation("/")}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full"
            >
              Browse Tiffin Plans
            </Button>
          </Card>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {subscriptions.map((sub) => {
              const schedule = sub.deliverySchedule || [];
              const delivered = schedule.filter((d) => d.status === "Delivered").length;
              const missed = schedule.filter((d) => d.status === "Missed").length;
              const total = schedule.length;
              const progressPct = total > 0 ? Math.round((delivered / total) * 100) : 0;
              const nextDay = schedule.find((d) => d.status === "Pending");

              return (
                <Card
                  key={sub._id}
                  onClick={() => setLocation(`/my-bookings/${sub._id}/subscription`)}
                  className="bg-white border-gray-200 shadow-sm rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                          <ChefHat className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                            {sub.tiffin?.title || "Tiffin Subscription"}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500 truncate">
                            {sub.seller?.shopName}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-2" />
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <Badge className="bg-purple-50 text-purple-700 border-purple-200 capitalize">
                        {sub.bookingType} Plan
                      </Badge>
                      {sub.selectedDays && sub.selectedDays.length > 0 && (
                        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                          {sub.selectedDays.join(", ")}
                        </Badge>
                      )}
                      {missed > 0 && (
                        <Badge className="bg-red-50 text-red-700 border-red-200">
                          {missed} Missed
                        </Badge>
                      )}
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                          <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Delivery Progress
                        </div>
                        <span className="text-xs font-semibold text-gray-900">
                          {delivered}/{total} delivered
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      {nextDay && (
                        <p className="text-xs text-gray-500 mt-2">
                          Next delivery: <span className="font-medium text-gray-700">{nextDay.day}</span>,{" "}
                          {new Date(nextDay.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
