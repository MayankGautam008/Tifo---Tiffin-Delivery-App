// ---------------------------------------------------------------------------
// Notification System — Configurable Constants
// ---------------------------------------------------------------------------
// All tunable values live here so nothing is hardcoded across the codebase.
// Changing a value here is all you need — no hunting through components.
// ---------------------------------------------------------------------------

/** How long to batch incoming order events before firing one bell + toast. */
export const BELL_DEBOUNCE_MS = 1500;

/** Intervals (ms) for repeat-reminder bells when an order is not accepted. */
export const REMINDER_INTERVALS = [30_000, 60_000] as const;

/** Maximum number of reminder bells per unacknowledged order batch. */
export const REMINDER_MAX_RETRIES = 2;

/** How long a toast notification stays visible (ms). */
export const NOTIFICATION_TIMEOUT_MS = 8000;

/** Bell sound volume (0 = silent, 1 = max). */
export const AUDIO_VOLUME = 0.85;

/** Relative path to the bell sound file (served from /public). */
export const AUDIO_PATH = "/sounds/order_notification_bell.mpeg";

/** How long (ms) the "New" badge stays visible on a fresh order card. */
export const NEW_BADGE_DURATION_MS = 30_000;

/** How long (ms) the glow animation plays on a new order card. */
export const GLOW_DURATION_MS = 4500;

// ---------------------------------------------------------------------------
// Order Priorities (future-proof — currently all orders are NORMAL)
// ---------------------------------------------------------------------------
export enum OrderPriority {
  NORMAL = 0,
  EXPRESS = 1,
  VIP = 2,
}

// ---------------------------------------------------------------------------
// Notification Status
// ---------------------------------------------------------------------------
export enum NotificationStatus {
  /** Just arrived, not yet seen by seller. */
  UNREAD = "unread",
  /** Seller saw it (opened bell popover / scrolled past it). */
  READ = "read",
  /** Seller accepted or rejected the order. */
  ACKNOWLEDGED = "acknowledged",
}

// ---------------------------------------------------------------------------
// OrderNotification shape — stored in the client-side queue
// ---------------------------------------------------------------------------
export interface OrderNotification {
  orderId: string;
  customerName: string;
  items: string;
  amount: number;
  timestamp: number;
  priority: OrderPriority;
  status: NotificationStatus;
  sellerId: string;
  /** Raw booking payload from the socket event (for "View Details"). */
  rawPayload?: unknown;
}

// ---------------------------------------------------------------------------
// Dev-only logger
// ---------------------------------------------------------------------------
const isDev = typeof window !== "undefined"
  ? (window as any).__TIFO_DEV__ ?? import.meta.env?.DEV ?? false
  : false;

export function devLog(label: string, ...args: unknown[]) {
  if (isDev) {
    console.log(`🔔 [Notification] ${label}`, ...args);
  }
}
