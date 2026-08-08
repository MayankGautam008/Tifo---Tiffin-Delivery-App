// ✅ NEW FILE
// Generates and live-computes the day-by-day delivery schedule for a
// weekly/monthly tiffin subscription (bookingType "weekly" | "monthly").
//
// Design:
// - The schedule (which dates + which weekday) is generated ONCE, right when the
//   subscription is booked, and saved on the booking (`deliverySchedule`).
// - The STATUS of each day ("Pending" / "Delivered" / "Missed") is never stored —
//   it's recomputed every time the schedule is read, by comparing each day's date
//   to today. That's what makes "delivered or not" behave like a real, live
//   subscription instead of a static, hardcoded list: a day that shows "Pending"
//   today will automatically show "Delivered" tomorrow, with no extra code.

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface GeneratedDeliveryDay {
  date: Date;
  day: string;
  status: "Pending";
}

/**
 * Builds the list of delivery dates for a new subscription booking.
 * - weekly: 7 days starting from the booking's start date, but only on the
 *   weekdays the customer selected (selectedDays). If none were selected,
 *   falls back to every day of that week.
 * - monthly: 30 days starting from the booking's start date, delivered daily.
 */
export function generateDeliverySchedule(
  bookingType: string,
  startDate: Date | string,
  selectedDays: string[] = []
): GeneratedDeliveryDay[] {
  if (bookingType !== "weekly" && bookingType !== "monthly") return [];

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const totalSpanDays = bookingType === "monthly" ? 30 : 7;
  const schedule: GeneratedDeliveryDay[] = [];

  for (let i = 0; i < totalSpanDays; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const dayName = DAY_NAMES[current.getDay()];

    if (bookingType === "weekly" && selectedDays.length > 0 && !selectedDays.includes(dayName)) {
      continue;
    }

    schedule.push({ date: current, day: dayName, status: "Pending" });
  }

  return schedule;
}

export interface LiveDeliveryDay {
  _id?: any;
  date: Date;
  day: string;
  status: "Pending" | "Delivered" | "Missed";
  rating?: number;
  review?: string;
  ratedAt?: Date;
  customizationNote?: string;
  customizedAt?: Date;
}

/**
 * Takes the persisted deliverySchedule of a booking and returns it with each
 * entry's status resolved against *today's* date, without mutating the DB.
 *
 * ✅ UPDATED: sellers can now manually mark an individual day as "Delivered" or
 * "Missed" from the seller dashboard (see PATCH /api/seller/subscriptions/:id/schedule/:entryId/status).
 * A manual mark is a *persisted* status that is no longer "Pending", so it is
 * always trusted here and never auto-overwritten. Only entries that are still
 * at their default "Pending" state fall back to the old live/date-based guess.
 */
export function withLiveStatus(
  deliverySchedule: any[] = [],
  bookingStatus: string
): LiveDeliveryDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return deliverySchedule.map((entry: any) => {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);

    const isPastOrToday = entryDate.getTime() <= today.getTime();

    let status: "Pending" | "Delivered" | "Missed";
    if (entry.status && entry.status !== "Pending") {
      // Seller has manually set this day — always respect it.
      status = entry.status;
    } else if (bookingStatus === "Cancelled") {
      status = isPastOrToday ? "Delivered" : "Missed";
    } else {
      status = isPastOrToday ? "Delivered" : "Pending";
    }

    return {
      _id: entry._id,
      date: entry.date,
      day: entry.day,
      status,
      rating: entry.rating,
      review: entry.review,
      ratedAt: entry.ratedAt,
      customizationNote: entry.customizationNote,
      customizedAt: entry.customizedAt,
    };
  });
}

/**
 * ✅ NEW: "ek din pehle customization likh sakte ho" rule — a delivery day's
 * note can only be added/edited when that day is exactly tomorrow (relative
 * to right now) and the day is still Pending. Kept as one shared function so
 * the route and any future UI-side check use the identical rule.
 */
export function isCustomizableForTomorrow(entryDate: Date | string, entryStatus: string): boolean {
  if (entryStatus !== "Pending") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const entry = new Date(entryDate);
  entry.setHours(0, 0, 0, 0);

  return entry.getTime() === tomorrow.getTime();
}
