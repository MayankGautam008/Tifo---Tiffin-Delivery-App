import mongoose, { Schema, Document } from "mongoose";

export interface ISelectedAddOn {
  name: string;
  price: number;
  quantity: number;
}

export interface IWeeklyCustomizationBooking {
  name: string;
  price: number;
  days: string[];
}

// ✅ NEW: One entry per scheduled delivery day for a "weekly"/"monthly" subscription booking.
// Generated once when the subscription is booked, then the "status" of each entry is
// recomputed live (not stored) every time the schedule is fetched, based on today's date —
// so it always reflects reality instead of being a static snapshot.
export interface IDeliveryDay {
  date: Date;
  day: string; // e.g. "Monday"
  status: "Pending" | "Delivered" | "Missed"; // default/persisted fallback, recomputed on read
  rating?: number;
  review?: string;
  ratedAt?: Date;
  // ✅ NEW: customer can write a note the day before, for the next day's delivery
  customizationNote?: string;
  customizedAt?: Date;
}

export interface IBooking extends Document {
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  tiffinId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  deliveryAddress: string;
  date: Date;
  slot: string;
  quantity: number;
  
  // ✅ UPDATED: Price breakdown fields
  basePrice: number;
  addOnsPrice: number;
  deliveryCharge: number;
  discountAmount: number;
  totalPrice: number;
  
  // ✅ NEW: Coupon details
  couponCode?: string;
  couponDiscount?: number;
  
  status: "Pending" | "Confirmed" | "Cancelled" | "Delivered";
  bookingType: "single" | "trial" | "weekly" | "monthly";

  // ✅ NEW: Fixed Lunch/Dinner slot the customer picked — Tiffin module ONLY.
  // Undefined for Meal bookings (their existing free-text `slot` flow is untouched).
  tiffinSlotType?: "lunch" | "dinner";

  // ✅ NEW: Cancellation fields — who cancelled, why, and when. These were
  // referenced by routes/storage before but missing from this Mongoose
  // schema, so Mongoose's strict mode was silently dropping them on save.
  cancellationReason?: string;
  cancelledBy?: "customer" | "seller" | "system";
  cancelledAt?: Date;

  // ✅ NEW: Payment method chosen at checkout (cash on delivery vs online/UPI)
  paymentMethod: "cod" | "upi";

  // ✅ NEW: Cart checkout tracking - groups multiple items placed together in one payout
  cartOrderId?: string;

  // Add-ons and customizations for booking
  addOns: ISelectedAddOn[];
  weeklyCustomizations: IWeeklyCustomizationBooking[];
  selectedDays: string[];
  customization?: string;

  // ✅ NEW: Per-day delivery tracking for weekly/monthly subscriptions
  deliverySchedule: IDeliveryDay[];

  createdAt: Date;
}

const SelectedAddOnSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 }
});

const WeeklyCustomizationBookingSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  days: [{ type: String, required: true }]
});

// ✅ NEW: Delivery day sub-schema for weekly/monthly subscriptions
const DeliveryDaySchema = new Schema({
  date: { type: Date, required: true },
  day: { type: String, required: true },
  status: { type: String, enum: ["Pending", "Delivered", "Missed"], default: "Pending" },
  rating: { type: Number, min: 1, max: 5 },
  review: { type: String, maxlength: 500 },
  ratedAt: { type: Date },
  // ✅ NEW: customer-written note for that specific day's delivery, editable
  // only the day before (see PATCH /api/bookings/:id/schedule/:entryId/customize)
  customizationNote: { type: String, maxlength: 300 },
  customizedAt: { type: Date },
});

const BookingSchema = new Schema<IBooking>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "User" },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerAddress: { type: String, required: true },
    customerCity: { type: String, required: true },
    tiffinId: { type: Schema.Types.ObjectId, ref: "Tiffin", required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "Seller", required: true },
    deliveryAddress: { type: String, required: true },
    date: { type: Date, required: true },
    slot: { type: String, required: true },
    quantity: { type: Number, required: true },
    
    // ✅ UPDATED: Price breakdown
    basePrice: { type: Number, required: true },
    addOnsPrice: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 19 }, // Fixed ₹19 delivery charge
    discountAmount: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    
    // ✅ NEW: Coupon details
    couponCode: { type: String },
    couponDiscount: { type: Number, default: 0 },
    
    status: { type: String, enum: ["Pending", "Confirmed", "Cancelled", "Delivered"], default: "Pending" },
    bookingType: { type: String, enum: ["single", "trial", "weekly", "monthly"], required: true },

    // ✅ NEW: Fixed Lunch/Dinner slot — Tiffin module ONLY.
    tiffinSlotType: { type: String, enum: ["lunch", "dinner"] },

    // ✅ NEW: Payment method (this was previously missing from the schema,
    // so it was silently dropped by Mongoose and never saved to the DB —
    // that's why COD orders weren't showing correctly on the seller dashboard)
    paymentMethod: { type: String, enum: ["cod", "upi"], default: "cod" },

    // ✅ NEW: groups bookings that were placed together from the cart in one payout
    cartOrderId: { type: String },

    // Add-ons and customizations
    addOns: [SelectedAddOnSchema],
    weeklyCustomizations: [WeeklyCustomizationBookingSchema],
    selectedDays: [{ type: String }],
    customization: { type: String },

    // ✅ NEW: Per-day delivery tracking for weekly/monthly subscriptions
    deliverySchedule: [DeliveryDaySchema],
  },
  { timestamps: true }
);

// ✅ PERFORMANCE: these are the exact filters/sorts used across the app
// (seller dashboard "my orders", customer "my bookings", cart-order grouping,
// subscription lists). Without indexes every one of those was a full
// collection scan; as the bookings collection grows this is the single
// biggest thing slowing down order placement + status screens.
BookingSchema.index({ sellerId: 1, createdAt: -1 });
BookingSchema.index({ customerEmail: 1, createdAt: -1 });
BookingSchema.index({ cartOrderId: 1 });
BookingSchema.index({ sellerId: 1, bookingType: 1 });
BookingSchema.index({ customerEmail: 1, bookingType: 1 });

export const Booking = mongoose.model<IBooking>("Booking", BookingSchema);