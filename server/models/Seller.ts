import mongoose, { Schema, Document } from "mongoose";

export interface IRatingStats {
  averageRating: number;
  totalRatings: number;
  ratingBreakdown: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface ISeller extends Document {
  userId: mongoose.Types.ObjectId;
  shopName: string;
  address: string;
  city: string;
  contactNumber: string;
  status: "pending" | "active" | "suspended";
  ratingStats: IRatingStats;
  createdAt: Date;
  updatedAt: Date;
  isTopRated: boolean; // ✅ YEH ADD KARO
}

const SellerSchema = new Schema<ISeller>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    shopName: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    contactNumber: { type: String, required: true },  
    status: { 
      type: String, 
      enum: ["pending", "active", "suspended"], 
      default: "pending" 
    },
    
        // ✅ YEH NAYA FIELD ADD KARO
    isTopRated: { type: Boolean, default: false },

    ratingStats: {
      averageRating: { type: Number, default: 0, min: 0, max: 5 },
      totalRatings: { type: Number, default: 0 },
      ratingBreakdown: {
        1: { type: Number, default: 0 },
        2: { type: Number, default: 0 },
        3: { type: Number, default: 0 },
        4: { type: Number, default: 0 },
        5: { type: Number, default: 0 }
      }
    }
  },
  { timestamps: true }
);







// ✅ PERFORMANCE: every "who is this logged-in seller" lookup (profile,
// tiffins, bookings, subscriptions, status update) filters by userId.
SellerSchema.index({ userId: 1 });

export const Seller = mongoose.model<ISeller>("Seller", SellerSchema);