import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { getSocket } from "@/lib/socket";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { useToast } from "@/hooks/use-toast";
import {
  BELL_DEBOUNCE_MS,
  REMINDER_INTERVALS,
  REMINDER_MAX_RETRIES,
  NOTIFICATION_TIMEOUT_MS,
  NEW_BADGE_DURATION_MS,
  OrderPriority,
  NotificationStatus,
  devLog,
  type OrderNotification,
} from "@/lib/notification-constants";

// ---------------------------------------------------------------------------
// useSellerNotifications
// ---------------------------------------------------------------------------
// The core notification-lifecycle hook. Only active when the user is a seller.
//
// Responsibilities:
//   1. Listens for `order:new` and `order:pending-sync` socket events
//   2. De-duplicates by orderId
//   3. Batches rapid arrivals (debounce) → one bell + one toast
//   4. Schedules repeat-reminder bells for unacknowledged orders
//   5. Fires Browser Notification API when tab is inactive
//   6. Tracks unread count and "new order" IDs for UI glow/badge
//   7. Full cleanup on unmount (timers, listeners, audio)
// ---------------------------------------------------------------------------

export function useSellerNotifications() {
  const { isSeller } = useAuth();
  const { play: playBellDebounced, playImmediate: playBellImmediate } = useNotificationSound();
  const { toast } = useToast();

  // ---- State ----
  const [unreadCount, setUnreadCount] = useState(0);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);

  // ---- Refs (non-reactive) ----
  const queueRef = useRef<Map<string, OrderNotification>>(new Map());
  const batchBufferRef = useRef<OrderNotification[]>([]);
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reminderTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reminderCountRef = useRef(0);
  const browserPermissionRef = useRef<NotificationPermission>("default");
  const newBadgeTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ---- Browser Notification permission (requested once) ----
  useEffect(() => {
    if (!isSeller) return;
    if (typeof Notification === "undefined") return;

    browserPermissionRef.current = Notification.permission;
    if (Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        browserPermissionRef.current = perm;
        devLog("Browser notification permission:", perm);
      });
    }
  }, [isSeller]);

  // ---- Helpers ----

  const showBrowserNotification = useCallback((title: string, body: string) => {
    if (typeof Notification === "undefined") return;
    if (browserPermissionRef.current !== "granted") return;
    if (!document.hidden) return; // Only show when tab is inactive

    try {
      const n = new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: "tifo-order", // Collapses duplicates
        requireInteraction: false,
      });
      // Auto-close after timeout
      setTimeout(() => n.close(), NOTIFICATION_TIMEOUT_MS);
    } catch {
      // Silently ignore — some environments block the constructor
    }
  }, []);

  const clearAllReminders = useCallback(() => {
    reminderTimersRef.current.forEach(clearTimeout);
    reminderTimersRef.current = [];
    reminderCountRef.current = 0;
    devLog("Reminders cleared");
  }, []);

  const startReminders = useCallback(() => {
    clearAllReminders();

    REMINDER_INTERVALS.forEach((interval, index) => {
      if (index >= REMINDER_MAX_RETRIES) return;

      const timer = setTimeout(() => {
        // Check if there are still unacknowledged orders
        const hasUnacked = Array.from(queueRef.current.values()).some(
          (n) => n.status === NotificationStatus.UNREAD
        );
        if (!hasUnacked) {
          clearAllReminders();
          return;
        }

        playBellImmediate();
        devLog("Reminder triggered", `attempt ${index + 1}`);

        const unackedCount = Array.from(queueRef.current.values()).filter(
          (n) => n.status === NotificationStatus.UNREAD
        ).length;

        showBrowserNotification(
          "⏰ Pending Orders",
          `You have ${unackedCount} order${unackedCount > 1 ? "s" : ""} waiting for confirmation`
        );

        reminderCountRef.current = index + 1;
      }, interval);

      reminderTimersRef.current.push(timer);
    });
  }, [clearAllReminders, playBellImmediate, showBrowserNotification]);

  // ---- Flush the batch buffer → 1 bell + 1 toast ----
  const flushBatch = useCallback(() => {
    const batch = [...batchBufferRef.current];
    batchBufferRef.current = [];
    batchTimerRef.current = null;

    if (batch.length === 0) return;

    // Add to queue (de-dup by orderId)
    let addedCount = 0;
    for (const notif of batch) {
      if (!queueRef.current.has(notif.orderId)) {
        queueRef.current.set(notif.orderId, notif);
        addedCount++;
      }
    }

    if (addedCount === 0) return; // All were duplicates

    // Update React state
    setNotifications(Array.from(queueRef.current.values()).sort(
      (a, b) => b.timestamp - a.timestamp || b.priority - a.priority
    ));
    setUnreadCount((prev) => prev + addedCount);

    // Track new order IDs for glow effect
    const addedIds = batch
      .filter((n) => !newOrderIds.has(n.orderId))
      .map((n) => n.orderId);
    if (addedIds.length > 0) {
      setNewOrderIds((prev) => {
        const next = new Set(prev);
        addedIds.forEach((id) => next.add(id));
        return next;
      });

      // Auto-remove "new" badge after timeout
      addedIds.forEach((id) => {
        const timer = setTimeout(() => {
          setNewOrderIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          newBadgeTimersRef.current.delete(id);
        }, NEW_BADGE_DURATION_MS);
        newBadgeTimersRef.current.set(id, timer);
      });
    }

    // Play bell (already debounced by the audio hook, but we call once per flush)
    playBellDebounced();
    devLog("New order(s)", `${addedCount} added, total queue: ${queueRef.current.size}`);

    // Toast notification
    if (addedCount === 1) {
      const order = batch[0];
      toast({
        title: "🆕 New Order!",
        description: `${order.customerName} — ₹${order.amount}`,
        duration: NOTIFICATION_TIMEOUT_MS,
      });
    } else {
      toast({
        title: `🆕 ${addedCount} New Orders Received`,
        description: `You have ${addedCount} new orders waiting for confirmation`,
        duration: NOTIFICATION_TIMEOUT_MS,
      });
    }

    // Browser notification (when tab is inactive)
    if (addedCount === 1) {
      showBrowserNotification(
        "🆕 New Order!",
        `${batch[0].customerName} — ₹${batch[0].amount}`
      );
    } else {
      showBrowserNotification(
        `🆕 ${addedCount} New Orders`,
        `${addedCount} new orders waiting for confirmation`
      );
    }

    // Start (or restart) reminders
    startReminders();
  }, [playBellDebounced, toast, showBrowserNotification, startReminders, newOrderIds]);

  // ---- Parse a socket event payload into an OrderNotification ----
  const parseOrderEvent = useCallback((data: any): OrderNotification | null => {
    try {
      // Handle both single booking and cart-order payloads
      const orderId = data?._id || data?.cartOrderId || data?.orderId || "";
      if (!orderId) return null;

      const customerName = data?.customerName || data?.bookings?.[0]?.customerName || "Customer";
      const items = data?.tiffinTitle || data?.itemCount
        ? `${data?.itemCount || 1} item(s)`
        : "Order";
      const amount = data?.totalPrice
        || data?.bookings?.reduce((s: number, b: any) => s + (b.totalPrice || 0), 0)
        || 0;
      const sellerId = data?.sellerId || data?.bookings?.[0]?.sellerId || "";

      return {
        orderId: String(orderId),
        customerName,
        items,
        amount,
        timestamp: Date.now(),
        priority: OrderPriority.NORMAL,
        status: NotificationStatus.UNREAD,
        sellerId: String(sellerId),
        rawPayload: data,
      };
    } catch {
      return null;
    }
  }, []);

  // ---- Enqueue an order event (buffered for debounce) ----
  const enqueueOrder = useCallback((data: unknown) => {
    const notif = parseOrderEvent(data);
    if (!notif) return;

    // De-duplicate: skip if already in queue
    if (queueRef.current.has(notif.orderId)) {
      devLog("Duplicate skipped", notif.orderId);
      return;
    }

    batchBufferRef.current.push(notif);

    // Start or restart the debounce timer
    if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
    batchTimerRef.current = setTimeout(flushBatch, BELL_DEBOUNCE_MS);
  }, [parseOrderEvent, flushBatch]);

  // ---- Acknowledge an order (seller accepted/rejected) ----
  const acknowledgeOrder = useCallback((orderId: string) => {
    const entry = queueRef.current.get(orderId);
    if (entry) {
      entry.status = NotificationStatus.ACKNOWLEDGED;
      queueRef.current.set(orderId, entry);
      devLog("Order acknowledged", orderId);
    }

    // Recalculate unread count
    const remaining = Array.from(queueRef.current.values()).filter(
      (n) => n.status === NotificationStatus.UNREAD
    ).length;
    setUnreadCount(remaining);

    // Remove "new" badge
    setNewOrderIds((prev) => {
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
    const badgeTimer = newBadgeTimersRef.current.get(orderId);
    if (badgeTimer) {
      clearTimeout(badgeTimer);
      newBadgeTimersRef.current.delete(orderId);
    }

    // If no more unread orders, cancel all reminders
    if (remaining === 0) {
      clearAllReminders();
    }

    // Notify server (best-effort — helps server clean its pending map)
    try {
      getSocket()?.emit("order:acknowledged", { orderId });
    } catch {
      // Non-critical
    }
  }, [clearAllReminders]);

  // ---- Mark all as read (when bell popover opens) ----
  const markAllRead = useCallback(() => {
    queueRef.current.forEach((n) => {
      if (n.status === NotificationStatus.UNREAD) {
        n.status = NotificationStatus.READ;
      }
    });
    setUnreadCount(0);
    setNotifications(Array.from(queueRef.current.values()));
    devLog("All marked read");
  }, []);

  // ---- Clear processed notifications ----
  const clearProcessed = useCallback(() => {
    const toRemove: string[] = [];
    queueRef.current.forEach((n, id) => {
      if (n.status === NotificationStatus.ACKNOWLEDGED) toRemove.push(id);
    });
    toRemove.forEach((id) => queueRef.current.delete(id));
    setNotifications(Array.from(queueRef.current.values()));
    devLog("Cleared processed", toRemove.length);
  }, []);

  // ---- Socket event listeners ----
  useEffect(() => {
    if (!isSeller) return;

    const socket = getSocket();
    if (!socket) return;

    const handleNewOrder = (data: unknown) => {
      devLog("order:new received", data);
      enqueueOrder(data);
    };

    const handlePendingSync = (data: unknown) => {
      devLog("order:pending-sync received", data);
      if (Array.isArray(data)) {
        data.forEach((item) => enqueueOrder(item));
      }
    };

    socket.on("order:new", handleNewOrder);
    socket.on("order:pending-sync", handlePendingSync);

    return () => {
      socket.off("order:new", handleNewOrder);
      socket.off("order:pending-sync", handlePendingSync);
    };
  }, [isSeller, enqueueOrder]);

  // ---- Full cleanup on unmount ----
  useEffect(() => {
    return () => {
      if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
      reminderTimersRef.current.forEach(clearTimeout);
      newBadgeTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  return {
    /** Number of unread/unacknowledged order notifications. */
    unreadCount,
    /** Set of order IDs that should display the "New" glow/badge. */
    newOrderIds,
    /** All notifications in the queue, sorted by recency then priority. */
    notifications,
    /** Call when seller accepts/rejects an order to stop reminders. */
    acknowledgeOrder,
    /** Call when the notification popover opens to mark all as read. */
    markAllRead,
    /** Remove acknowledged notifications from the queue. */
    clearProcessed,
  };
}
