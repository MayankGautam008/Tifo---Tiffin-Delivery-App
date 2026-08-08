import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, BellRing, Check, CheckCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { formatDistanceToNow } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

const typeColors: Record<string, string> = {
  loyalty_points: "bg-yellow-100 text-yellow-700 border-yellow-200",
  system: "bg-blue-100 text-blue-700 border-blue-200",
  order: "bg-green-100 text-green-700 border-green-200",
  refund: "bg-purple-100 text-purple-700 border-purple-200",
};

const typeEmoji: Record<string, string> = {
  loyalty_points: "⭐",
  system: "🔔",
  order: "📦",
  refund: "💰",
};

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ["/api/notifications"],
    enabled: isAuthenticated,
    refetchInterval: 30000, // poll every 30s
  });

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/notifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  if (!isAuthenticated) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full hover:bg-red-50"
          data-testid="button-notifications"
        >
          {unreadCount > 0 ? (
            <BellRing className="w-5 h-5 text-red-600 animate-[wiggle_1s_ease-in-out_infinite]" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 shadow-xl border border-gray-200 rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4" />
            <span className="font-bold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <Badge className="bg-white text-red-600 text-xs px-1.5 py-0 h-4">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-white hover:bg-red-700 px-2"
                onClick={() => markAllReadMutation.mutate()}
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                All read
              </Button>
            )}
          </div>
        </div>

        {/* List */}
        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No notifications yet</p>
              <p className="text-xs text-gray-400 mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((n) => (
                <div
                  key={n._id}
                  className={`flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group ${
                    !n.isRead ? "bg-red-50/40" : ""
                  }`}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-base">
                    {typeEmoji[n.type] ?? "🔔"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-xs font-semibold leading-tight ${
                          !n.isRead ? "text-gray-900" : "text-gray-600"
                        }`}
                      >
                        {n.title}
                      </p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {!n.isRead && (
                          <button
                            onClick={() => markReadMutation.mutate(n._id)}
                            className="p-0.5 hover:text-green-600 text-gray-400"
                            title="Mark read"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteMutation.mutate(n._id)}
                          className="p-0.5 hover:text-red-600 text-gray-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500 mt-1.5" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400 text-center">
              Showing {notifications.length} of {data?.total ?? 0} notifications
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
