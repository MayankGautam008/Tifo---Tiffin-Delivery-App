import mongoose, { Schema, Document } from "mongoose";

export interface IWalletTransaction extends Document {
  customerId: mongoose.Types.ObjectId;
  type: "credit" | "debit";
  amount: number;
  balanceAfter: number;
  reason?: string;
  createdBy: mongoose.Types.ObjectId; // admin who made the change
  createdAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["credit", "debit"], required: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reason: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const WalletTransaction = mongoose.model<IWalletTransaction>(
  "WalletTransaction",
  WalletTransactionSchema
);
