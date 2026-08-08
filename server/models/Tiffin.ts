import mongoose, { Schema, Document } from "mongoose";

export interface IAddOn {
  name: string;
  description: string;
  price: number;
  available: boolean;
}

export interface IWeeklyCustomization {
  name: string;
  description: string;
  price: number;
  days: string[];
  available: boolean;
}

// ✅ NEW: Fixed Lunch/Dinner delivery slots — Tiffin module ONLY.
// Times are stored as 24-hour "HH:mm" strings (native <input type="time"> format).
export interface IDeliverySlotConfig {
  enabled: boolean;
  deliveryStart: string; // e.g. "12:00"
  deliveryEnd: string; // e.g. "14:00"
  cutoffTime: string; // e.g. "10:30"
}

export interface IDeliverySlots {
  lunch: IDeliverySlotConfig;
  dinner: IDeliverySlotConfig;
}

export interface ITiffin extends Document {
  sellerId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: "Veg" | "Non-Veg" | "Jain";
  price: number;
  availableDays: string[];
  slots: string[];
  imageUrl?: string;

  // ✅ Out-of-stock toggle — seller flips this off when an item is
  // temporarily unavailable; customers see it immediately (real-time via
  // socket) and cannot place new orders for it while it's off.
  isAvailable: boolean;

  // Add-ons and customizations
  addOns: IAddOn[];
  weeklyCustomizations: IWeeklyCustomization[];
  
  // Service type specific fields
  serviceType: "meal" | "tiffin";
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Full Day";
  trialPrice: number;
  monthlyPrice: number;
  customizableOptions: string[];

  // ✅ NEW: Fixed Lunch/Dinner delivery slots — only meaningful when
  // serviceType === "tiffin". Meals are untouched by this feature.
  deliverySlots?: IDeliverySlots;

  createdAt: Date;
}

const AddOnSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  available: { type: Boolean, default: true }
});

const WeeklyCustomizationSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  days: [{ type: String, required: true }],
  available: { type: Boolean, default: true }
});

// ✅ NEW: Fixed Lunch/Dinner delivery slot config — Tiffin module ONLY.
const DeliverySlotConfigSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    deliveryStart: { type: String, default: "" },
    deliveryEnd: { type: String, default: "" },
    cutoffTime: { type: String, default: "" },
  },
  { _id: false }
);

const DeliverySlotsSchema = new Schema(
  {
    lunch: {
      type: DeliverySlotConfigSchema,
      default: () => ({ enabled: false, deliveryStart: "12:00", deliveryEnd: "14:00", cutoffTime: "10:30" }),
    },
    dinner: {
      type: DeliverySlotConfigSchema,
      default: () => ({ enabled: false, deliveryStart: "19:00", deliveryEnd: "21:00", cutoffTime: "17:30" }),
    },
  },
  { _id: false }
);

const TiffinSchema = new Schema<ITiffin>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "Seller", required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ["Veg", "Non-Veg", "Jain"], required: true },
    price: { type: Number, required: true },
    availableDays: { type: [String], required: true },
    slots: { type: [String], required: true },
    imageUrl: { type: String },

    // ✅ Out-of-stock toggle, defaults to available/in-stock.
    isAvailable: { type: Boolean, default: true },

    // Add-ons and customizations
    addOns: [AddOnSchema],
    weeklyCustomizations: [WeeklyCustomizationSchema],
    
    // Service type specific fields
    serviceType: { type: String, enum: ["meal", "tiffin"], default: "meal" },
    mealType: { type: String, enum: ["Breakfast", "Lunch", "Dinner", "Full Day"], default: "Lunch" },
    trialPrice: { type: Number, default: 99 },
    monthlyPrice: { type: Number, default: 2000 },
    customizableOptions: [{ type: String }],

    // ✅ NEW: Fixed Lunch/Dinner delivery slots — Tiffin module ONLY.
    deliverySlots: { type: DeliverySlotsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

// ✅ PERFORMANCE: sellerId is filtered on every seller dashboard load and
// every checkout item lookup groups by it.
TiffinSchema.index({ sellerId: 1, createdAt: -1 });

export const Tiffin = mongoose.model<ITiffin>("Tiffin", TiffinSchema);