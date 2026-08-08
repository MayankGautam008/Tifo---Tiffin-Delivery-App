import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "admin" | "seller" | "customer";
  createdAt: Date;
    address: string; // ✅ ADD THIS
  city: string; // ✅ ADD THIS

  // ✅ NEW: Password reset fields
  resetPasswordOtp?: string;
  resetPasswordOtpExpiry?: Date;
  resetPasswordAttempts?: number;

  // ✅ NEW: Wallet field
  walletBalance: number;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "seller", "customer"], required: true },
        address: { type: String, required: true, default: "Address not provided" }, // ✅ ADD THIS
    city: { type: String, required: true, default: "City not provided" }, // ✅ ADD THIS

     // ✅ NEW: Password reset fields
  resetPasswordOtp: { type: String },
  resetPasswordOtpExpiry: { type: Date },
  resetPasswordAttempts: { type: Number, default: 0 },

  // ✅ NEW: Wallet field - admin can increase/decrease this
  walletBalance: { type: Number, required: true, default: 0 }
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);