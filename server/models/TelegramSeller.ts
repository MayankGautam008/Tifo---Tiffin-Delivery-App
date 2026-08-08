import mongoose, { Schema, Document } from "mongoose";

export interface ITelegramSeller extends Document {
  sellerId: mongoose.Types.ObjectId;
  email: string;
  telegramChatId: number;
  isVerified: boolean;
  verificationCode: string;
  createdAt: Date;
}

const TelegramSellerSchema = new Schema<ITelegramSeller>(
  {
    sellerId: { 
      type: Schema.Types.ObjectId, 
      ref: "Seller", 
      required: true
    },
    email: { 
      type: String, 
      required: true
    },
    telegramChatId: { 
      type: Number, 
      required: true
    },
    isVerified: { 
      type: Boolean, 
      default: false 
    },
    verificationCode: { 
      type: String, 
      required: true 
    }
  },
  { timestamps: true }
);

export const TelegramSeller = mongoose.model<ITelegramSeller>("TelegramSeller", TelegramSellerSchema);