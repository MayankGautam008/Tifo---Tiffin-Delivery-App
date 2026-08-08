import mongoose, { Schema, Document } from "mongoose";

export interface IRefund extends Document {
  bookingId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "processed";
  refundMethod: "original" | "wallet" | "loyalty_points";
  adminNote?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RefundSchema = new Schema<IRefund>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "Seller", required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "processed"],
      default: "pending",
    },
    refundMethod: {
      type: String,
      enum: ["original", "wallet", "loyalty_points"],
      default: "original",
    },
    adminNote: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

RefundSchema.index({ customerId: 1, status: 1 });
RefundSchema.index({ bookingId: 1 }, { unique: true });

export const Refund = mongoose.model<IRefund>("Refund", RefundSchema);
