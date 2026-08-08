import mongoose, { Schema, Document } from "mongoose";

export interface ICoupon extends Document {
  code: string;
  description: string;
  discountType: "fixed" | "percentage";
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { 
      type: String, 
      required: true, 
      unique: true,
      uppercase: true,
      trim: true
    },
    description: { type: String, required: true },
    discountType: { 
      type: String, 
      enum: ["fixed", "percentage"], 
      required: true 
    },
    discountValue: { type: Number, required: true },
    minOrderAmount: { type: Number, required: true, default: 0 },
    maxDiscountAmount: { type: Number },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    usageLimit: { type: Number, required: true, default: 100 },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Index for efficient queries
CouponSchema.index({ code: 1, isActive: 1 });
CouponSchema.index({ validUntil: 1 });

export const Coupon = mongoose.model<ICoupon>("Coupon", CouponSchema);