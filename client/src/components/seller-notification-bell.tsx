import { Bell, BellRing, Package, Clock, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationStatus, type OrderNotification } from "@/lib/notification-constants";
import { useState } from "react";

// ---------------------------------------------------------------------------
// SellerNotificationBell
// ---------------------------------------------------------------------------
// Seller-specific notification bell component for the dashboard header.
// Shows unread count badge + animated bell. Popover lists recent orders.
//
// This is separate from the existing `notification-bell.tsx` which is for
// the general user/customer navbar and backed by the REST /api/notifications
// endpoint. This one is purely driven by the real-time socket notification
// queue from `useSellerNotifications`.
// ---------------------------------------------------------------------------

interface SellerNotificationBellProps {
  unreadCount: number;
  notifications: OrderNotification[];
  onMarkAllRead: () => void;
  onViewOrder?: (orderId: string) => void;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const priorityColors: Record<number, string> = {
  0: "", // Normal — no special highlight
  1: "border-l-4 border-l-amber-400", // Express
  2: "border-l-4 border-l-purple-500", // VIP
};

export function SellerNotificationBell({
  unreadCount,
  notifications,
  onMarkAllRead,
  onViewOrder,
}: SellerNotificationBellProps) {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0) {
      onMarkAllRead();
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-9 w-9 rounded-full border-border/80 hover:bg-orange-50"
          id="seller-notification-bell"
          aria-label={`Order notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          {unreadCount > 0 ? (
            <BellRing className="w-4.5 h-4.5 text-orange-600 animate-[wiggle_0.8s_ease-in-out_3]" />
          ) : (
            <Bell className="w-4.5 h-4.5" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 shadow-xl border border-gray-200 rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span className="font-bold text-sm">Order Alerts</span>
            {unreadCount > 0 && (
              <Badge className="bg-white text-orange-600 text-xs px-1.5 py-0 h-4">
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>

        {/* List */}
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No order notifications</p>
              <p className="text-xs text-gray-400 mt-1">
                New orders will appear here instantly
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.slice(0, 20).map((n) => (
                <div
                  key={n.orderId}
                  className={`flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group ${
                    n.status === NotificationStatus.UNREAD ? "bg-orange-50/40" : ""
                  } ${priorityColors[n.priority] || ""}`}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    {n.status === NotificationStatus.ACKNOWLEDGED ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Package className="w-4 h-4 text-orange-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-xs font-semibold leading-tight ${
                          n.status === NotificationStatus.UNREAD
                            ? "text-gray-900"
                            : "text-gray-600"
                        }`}
                      >
                        {n.customerName}
                      </p>
                      {onViewOrder && (
                        <button
                          onClick={() => onViewOrder(n.orderId)}
                          className="text-[10px] text-orange-600 hover:text-orange-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          View
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {n.items} • ₹{n.amount}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <p className="text-[10px] text-gray-400">
                        {formatTimeAgo(n.timestamp)}
                      </p>
                    </div>
                  </div>
                  {n.status === NotificationStatus.UNREAD && (
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-orange-500 mt-1.5" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400 text-center">
              Showing {Math.min(notifications.length, 20)} of {notifications.length} alerts
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
