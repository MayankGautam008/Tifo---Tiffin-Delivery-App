import mongoose, { Schema, Document } from "mongoose";

export interface ILoyaltyTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  type: "earned" | "redeemed" | "expired" | "bonus";
  points: number;
  description: string;
  balance: number; // points balance after this transaction
  expiresAt?: Date;
  createdAt: Date;
}

export interface ILoyaltyAccount extends Document {
  userId: mongoose.Types.ObjectId;
  totalPoints: number;
  redeemedPoints: number;
  availablePoints: number;
  lifetimeEarned: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  updatedAt: Date;
}

const LoyaltyTransactionSchema = new Schema<ILoyaltyTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    type: { type: String, enum: ["earned", "redeemed", "expired", "bonus"], required: true },
    points: { type: Number, required: true },
    description: { type: String, required: true },
    balance: { type: Number, required: true },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

const LoyaltyAccountSchema = new Schema<ILoyaltyAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    totalPoints: { type: Number, default: 0 },
    redeemedPoints: { type: Number, default: 0 },
    availablePoints: { type: Number, default: 0 },
    lifetimeEarned: { type: Number, default: 0 },
    tier: { type: String, enum: ["bronze", "silver", "gold", "platinum"], default: "bronze" },
  },
  { timestamps: true }
);

LoyaltyTransactionSchema.index({ userId: 1, createdAt: -1 });
LoyaltyAccountSchema.index({ userId: 1 }, { unique: true });

export const LoyaltyTransaction = mongoose.model<ILoyaltyTransaction>("LoyaltyTransaction", LoyaltyTransactionSchema);
export const LoyaltyAccount = mongoose.model<ILoyaltyAccount>("LoyaltyAccount", LoyaltyAccountSchema);
