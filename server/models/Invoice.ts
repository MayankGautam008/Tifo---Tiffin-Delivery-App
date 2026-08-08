import mongoose, { Schema, Document } from "mongoose";

export interface IInvoiceItem {
  title: string;
  quantity: number;
  unitPrice: number;
  totalItemPrice: number;
}

export interface IInvoiceAddOn {
  name: string;
  price: number;
  quantity: number;
}

export interface IInvoiceCustomization {
  name: string;
  price: number;
  days: string[];
}

export interface IInvoiceBreakdown {
  basePrice: number;
  addOnsTotal: number;
  customizationsTotal: number;
  deliveryCharge: number;
  discountAmount: number;
  couponCode?: string;
  subtotal: number;
  totalPrice: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  bookingId: mongoose.Types.ObjectId;
  orderId: string;
  
  // Customer snapshot
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;

  // Seller snapshot
  sellerId: mongoose.Types.ObjectId;
  shopName: string;
  sellerPhone: string;
  sellerAddress: string;
  sellerCity: string;

  // Order Details snapshot
  tiffinTitle: string;
  bookingType: "single" | "trial" | "weekly" | "monthly";
  tiffinSlotType?: "lunch" | "dinner";
  quantity: number;
  deliveryDate: Date;
  slot: string;

  addOns: IInvoiceAddOn[];
  weeklyCustomizations: IInvoiceCustomization[];
  selectedDays: string[];
  customization?: string;

  // Financial breakdown
  pricingBreakdown: IInvoiceBreakdown;

  // Payment
  paymentMethod: "cod" | "upi";
  paymentStatus: "Paid" | "Pending (COD)";
  status: "issued" | "cancelled";

  // Verification & Security
  qrVerificationToken: string;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    orderId: { type: String, required: true, index: true },

    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerAddress: { type: String, required: true },
    customerCity: { type: String, required: true },

    sellerId: { type: Schema.Types.ObjectId, ref: "Seller", required: true, index: true },
    shopName: { type: String, required: true },
    sellerPhone: { type: String, required: true },
    sellerAddress: { type: String, required: true },
    sellerCity: { type: String, required: true },

    tiffinTitle: { type: String, required: true },
    bookingType: { type: String, enum: ["single", "trial", "weekly", "monthly"], required: true },
    tiffinSlotType: { type: String, enum: ["lunch", "dinner"] },
    quantity: { type: Number, required: true },
    deliveryDate: { type: Date, required: true },
    slot: { type: String, required: true },

    addOns: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, default: 1 }
      }
    ],
    weeklyCustomizations: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
        days: [{ type: String, required: true }]
      }
    ],
    selectedDays: [{ type: String }],
    customization: { type: String },

    pricingBreakdown: {
      basePrice: { type: Number, required: true },
      addOnsTotal: { type: Number, default: 0 },
      customizationsTotal: { type: Number, default: 0 },
      deliveryCharge: { type: Number, default: 19 },
      discountAmount: { type: Number, default: 0 },
      couponCode: { type: String },
      subtotal: { type: Number, required: true },
      totalPrice: { type: Number, required: true }
    },

    paymentMethod: { type: String, enum: ["cod", "upi"], default: "cod" },
    paymentStatus: { type: String, enum: ["Paid", "Pending (COD)"], default: "Pending (COD)" },
    status: { type: String, enum: ["issued", "cancelled"], default: "issued" },

    qrVerificationToken: { type: String, required: true, unique: true },
    issuedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

InvoiceSchema.index({ customerId: 1, createdAt: -1 });
InvoiceSchema.index({ sellerId: 1, createdAt: -1 });

export const Invoice = mongoose.model<IInvoice>("Invoice", InvoiceSchema);
