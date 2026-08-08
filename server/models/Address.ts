import mongoose, { Schema, Document } from "mongoose";

// ✅ NEW: Saved delivery addresses for a customer.
// A user can save multiple addresses (Home/Work/Other) and, for any of them,
// mark it as being for someone else by filling recipientName/recipientPhone
// different from their own account details. Whichever address is selected at
// checkout is what gets sent to the seller as the delivery address.
export interface IAddress extends Document {
  userId: mongoose.Types.ObjectId;
  label: string; // e.g. "Home", "Work", "Other"
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  city: string;
  isForSomeoneElse: boolean;
  isDefault: boolean;
  createdAt: Date;
}

const AddressSchema = new Schema<IAddress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    label: { type: String, required: true, default: "Home" },
    recipientName: { type: String, required: true },
    recipientPhone: { type: String, required: true },
    addressLine: { type: String, required: true },
    city: { type: String, required: true },
    isForSomeoneElse: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Address = mongoose.model<IAddress>("Address", AddressSchema);
