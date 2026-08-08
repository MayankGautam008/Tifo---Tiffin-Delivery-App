import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: "order_placed" | "order_confirmed" | "order_cancelled" | "order_delivered" | "review_received" | "coupon_earned" | "loyalty_points" | "seller_approved" | "seller_suspended" | "system";
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["order_placed", "order_confirmed", "order_cancelled", "order_delivered", "review_received", "coupon_earned", "loyalty_points", "seller_approved", "seller_suspended", "system"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>("Notification", NotificationSchema);
