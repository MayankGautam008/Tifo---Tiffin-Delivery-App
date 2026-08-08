import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail: string;
  sellerId: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema = new Schema({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  sellerId: {
    type: Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  bookingId: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Index for faster queries
ReviewSchema.index({ sellerId: 1, createdAt: -1 });
ReviewSchema.index({ bookingId: 1 }, { unique: true });
ReviewSchema.index({ customerId: 1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);