import mongoose, { Schema, Document } from "mongoose";

// A coupon that the admin creates for ONE specific customer's wallet.
// It stays hidden from the customer (isActive: false) until the admin
// activates it. Once active, it shows up when the customer opens their
// wallet. Deactivating it again hides it without deleting the history.
export interface IWalletCoupon extends Document {
  customerId: mongoose.Types.ObjectId;
  code: string;
  description: string;
  discountType: "fixed" | "percentage";
  discountValue: number;
  isActive: boolean; // admin toggles this to show/hide it to the customer
  createdBy: mongoose.Types.ObjectId; // admin who created it
  createdAt: Date;
  updatedAt: Date;
}

const WalletCouponSchema = new Schema<IWalletCoupon>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, default: "" },
    discountType: { type: String, enum: ["fixed", "percentage"], required: true, default: "fixed" },
    discountValue: { type: Number, required: true },
    isActive: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

WalletCouponSchema.index({ customerId: 1, isActive: 1 });

export const WalletCoupon = mongoose.model<IWalletCoupon>("WalletCoupon", WalletCouponSchema);
