// shared/tiffinSlots.ts
//
// ✅ NEW: Fixed Lunch/Dinner delivery-slot logic for the Tiffin module ONLY.
// Sellers configure up to two fixed slots (Lunch / Dinner), each with a
// delivery time window and an order cut-off time. Customers can only pick
// one of the seller's configured slots — never a custom time.
//
// This file is imported from BOTH the client (`@shared/tiffinSlots`) and the
// server (`@shared/tiffinSlots`) so the "has today's cut-off passed?" logic
// can never drift between what the UI shows and what the API enforces.
//
// Times are always stored/compared as 24-hour "HH:mm" strings (the native
// format of an <input type="time">), and only formatted to 12-hour AM/PM
// for display.

export type TiffinSlotKey = "lunch" | "dinner";

export interface DeliverySlotConfig {
  enabled: boolean;
  deliveryStart: string; // "HH:mm", 24-hour, e.g. "12:00"
  deliveryEnd: string; // "HH:mm", 24-hour, e.g. "14:00"
  cutoffTime: string; // "HH:mm", 24-hour, e.g. "10:30"
}

export interface DeliverySlots {
  lunch: DeliverySlotConfig;
  dinner: DeliverySlotConfig;
}

export const DEFAULT_DELIVERY_SLOTS: DeliverySlots = {
  lunch: { enabled: false, deliveryStart: "12:00", deliveryEnd: "14:00", cutoffTime: "10:30" },
  dinner: { enabled: false, deliveryStart: "19:00", deliveryEnd: "21:00", cutoffTime: "17:30" },
};

export const TIFFIN_SLOT_KEYS: TiffinSlotKey[] = ["lunch", "dinner"];

export function slotLabel(slotKey: TiffinSlotKey): string {
  return slotKey === "lunch" ? "Lunch" : "Dinner";
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatTime12h(time24?: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return "";
  const m = (mStr ?? "00").padStart(2, "0");
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${suffix}`;
}

export function formatSlotWindow(config: Pick<DeliverySlotConfig, "deliveryStart" | "deliveryEnd">): string {
  return `${formatTime12h(config.deliveryStart)} – ${formatTime12h(config.deliveryEnd)}`;
}

/** e.g. "Lunch · 12:00 PM – 2:00 PM" */
export function formatSlotSummary(slotKey: TiffinSlotKey, config: DeliverySlotConfig): string {
  return `${slotLabel(slotKey)} (${formatSlotWindow(config)})`;
}

// ---------------------------------------------------------------------------
// Cut-off / availability logic
// ---------------------------------------------------------------------------

function minutesFromTimeStr(t: string | undefined): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

function minutesNow(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

export interface SlotAvailability {
  slotKey: TiffinSlotKey;
  config: DeliverySlotConfig;
  enabled: boolean;
  /** true once "now" is at/after the seller's cut-off time for TODAY */
  todayCutoffPassed: boolean;
  /** which calendar day this slot would actually deliver on if booked right now */
  nextAvailableDay: "today" | "tomorrow";
}

export function getSlotConfig(deliverySlots: DeliverySlots | undefined, slotKey: TiffinSlotKey): DeliverySlotConfig {
  return deliverySlots?.[slotKey] || DEFAULT_DELIVERY_SLOTS[slotKey];
}

export function getSlotAvailability(
  deliverySlots: DeliverySlots | undefined,
  slotKey: TiffinSlotKey,
  now: Date = new Date(),
): SlotAvailability {
  const config = getSlotConfig(deliverySlots, slotKey);
  const enabled = !!config.enabled;
  const todayCutoffPassed = minutesNow(now) >= minutesFromTimeStr(config.cutoffTime);

  return {
    slotKey,
    config,
    enabled,
    todayCutoffPassed,
    nextAvailableDay: todayCutoffPassed ? "tomorrow" : "today",
  };
}

/** All slots the seller has switched on (Lunch and/or Dinner), each resolved against "now". */
export function getAvailableTiffinSlots(
  deliverySlots: DeliverySlots | undefined,
  now: Date = new Date(),
): SlotAvailability[] {
  return TIFFIN_SLOT_KEYS.map((key) => getSlotAvailability(deliverySlots, key, now)).filter((s) => s.enabled);
}

/** Local YYYY-MM-DD for "today" or "tomorrow", used as the booking's delivery date. */
export function resolveOrderDate(nextAvailableDay: "today" | "tomorrow", now: Date = new Date()): string {
  const d = new Date(now);
  if (nextAvailableDay === "tomorrow") d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Server-side guard: re-derives whether `slotKey` + `date` (YYYY-MM-DD) is a
 * legitimate booking right now, so a customer can never bypass the cut-off
 * by tampering with the request body. Returns null when valid, or an error
 * message when it should be rejected.
 */
export function validateTiffinSlotBooking(
  deliverySlots: DeliverySlots | undefined,
  slotKey: TiffinSlotKey | undefined | null,
  date: string | undefined | null,
  now: Date = new Date(),
): string | null {
  if (!slotKey || (slotKey !== "lunch" && slotKey !== "dinner")) {
    return "Please select a Lunch or Dinner delivery slot.";
  }
  const availability = getSlotAvailability(deliverySlots, slotKey, now);
  if (!availability.enabled) {
    return `${slotLabel(slotKey)} slot is not available for this tiffin.`;
  }
  if (!date) {
    return "Delivery date is required.";
  }
  const expectedDate = resolveOrderDate(availability.nextAvailableDay, now);
  if (date !== expectedDate && date < expectedDate) {
    // Allow booking further-out dates (e.g. a weekly plan starting later),
    // but never allow a date before the earliest slot that's still open.
    return "Today's slot is closed. Pre-order for tomorrow.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Seller-dashboard order grouping
// ---------------------------------------------------------------------------

export type OrderSlotBucket = "todayLunch" | "todayDinner" | "tomorrowLunch" | "tomorrowDinner" | "other";

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Buckets a tiffin booking's delivery date + slot type against "now" into
 * one of the four seller-dashboard groups. Anything that isn't a
 * lunch/dinner tiffin slot (e.g. a Meal order) falls into "other" so callers
 * can simply filter it out.
 */
export function getOrderSlotBucket(
  bookingDate: string | Date,
  tiffinSlotType: TiffinSlotKey | undefined | null,
  now: Date = new Date(),
): OrderSlotBucket {
  if (!tiffinSlotType) return "other";

  const today = toLocalDateStr(now);
  const tomorrow = toLocalDateStr(new Date(new Date(now).setDate(now.getDate() + 1)));
  const bookingDay = toLocalDateStr(new Date(bookingDate));

  if (bookingDay === today) return tiffinSlotType === "lunch" ? "todayLunch" : "todayDinner";
  if (bookingDay === tomorrow) return tiffinSlotType === "lunch" ? "tomorrowLunch" : "tomorrowDinner";
  return "other";
}
