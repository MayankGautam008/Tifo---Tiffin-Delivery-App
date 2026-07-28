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

export interface ITiffin extends Document {
  sellerId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: "Veg" | "Non-Veg" | "Jain";
  price: number;
  availableDays: string[];
  slots: string[];
  imageUrl?: string;
  
  // Add-ons and customizations
  addOns: IAddOn[];
  weeklyCustomizations: IWeeklyCustomization[];
  
  // Service type specific fields
  serviceType: "meal" | "tiffin";
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Full Day";
  trialPrice: number;
  monthlyPrice: number;
  customizableOptions: string[];
  
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
    
    // Add-ons and customizations
    addOns: [AddOnSchema],
    weeklyCustomizations: [WeeklyCustomizationSchema],
    
    // Service type specific fields
    serviceType: { type: String, enum: ["meal", "tiffin"], default: "meal" },
    mealType: { type: String, enum: ["Breakfast", "Lunch", "Dinner", "Full Day"], default: "Lunch" },
    trialPrice: { type: Number, default: 99 },
    monthlyPrice: { type: Number, default: 2000 },
    customizableOptions: [{ type: String }]
  },
  { timestamps: true }
);

// ✅ PERFORMANCE: sellerId is filtered on every seller dashboard load and
// every checkout item lookup groups by it.
TiffinSchema.index({ sellerId: 1, createdAt: -1 });

export const Tiffin = mongoose.model<ITiffin>("Tiffin", TiffinSchema);