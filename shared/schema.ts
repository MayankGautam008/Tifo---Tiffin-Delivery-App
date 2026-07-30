import { z } from "zod";

// User Schema
export const userSchema = z.object({
  _id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  password: z.string(),
  role: z.enum(["admin", "seller", "customer"]),
  createdAt: z.string(),
  address: z.string(),
  city: z.string(),
  walletBalance: z.number().optional(),
});

// ✅ NEW: Review Schema for Ratings
export const reviewSchema = z.object({
  _id: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  customerEmail: z.string(),
  sellerId: z.string(),
  bookingId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertReviewSchema = z.object({
  customerId: z.string(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  sellerId: z.string(),
  bookingId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export type Review = z.infer<typeof reviewSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;

// ✅ NEW: Seller Rating Stats
export const sellerRatingStatsSchema = z.object({
  averageRating: z.number(),
  totalRatings: z.number(),
  ratingBreakdown: z.object({
    1: z.number(),
    2: z.number(),
    3: z.number(),
    4: z.number(),
    5: z.number(),
  }),
});

export type SellerRatingStats = z.infer<typeof sellerRatingStatsSchema>;

export const insertUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "seller", "customer"]),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;

// Seller Schema
export const sellerSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  shopName: z.string(),
  address: z.string(),
  city: z.string(),
  contactNumber: z.string(),
  status: z.enum(["pending", "active", "suspended"]),
  createdAt: z.string(),
  ratingStats: sellerRatingStatsSchema.optional(),
  isTopRated: z.boolean().default(false), // ✅ YEH ADD KARO
});

// ✅ NEW: Seller with User and Ratings
export type SellerWithUserAndRatings = Seller & {
  user: User;
  ratingStats: SellerRatingStats;
};

export const insertSellerSchema = z.object({
  userId: z.string(),
  shopName: z.string().min(2, "Shop name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  contactNumber: z.string().min(10, "Contact number must be at least 10 digits"),
});

export const updateSellerStatusSchema = z.object({
  status: z.enum(["pending", "active", "suspended"]),
});

export type Seller = z.infer<typeof sellerSchema>;
export type InsertSeller = z.infer<typeof insertSellerSchema>;

// Add-on Schema
export const addOnSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.number(),
  available: z.boolean().default(true),
});

export type AddOn = z.infer<typeof addOnSchema>;

// Weekly Customization Schema
export const weeklyCustomizationSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.number(),
  days: z.array(z.string()),
  available: z.boolean().default(true),
});

export type WeeklyCustomization = z.infer<typeof weeklyCustomizationSchema>;

// Tiffin Schema
export const tiffinSchema = z.object({
  _id: z.string(),
  sellerId: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(["Veg", "Non-Veg", "Jain", "Customizable"]),
  price: z.number(),
  availableDays: z.array(z.string()),
  slots: z.array(z.string()),
  imageUrl: z.string().optional(),
  createdAt: z.string(),
  type: z.enum(["tiffin", "meal"]).default("meal"),
  serviceType: z.enum(["meal", "tiffin"]).default("meal"),
  mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Full Day"]).optional(),
  trialPrice: z.number().optional(),
  monthlyPrice: z.number().optional(),
  customizableOptions: z.array(z.string()).optional(),
  addOns: z.array(addOnSchema).optional().default([]),
  weeklyCustomizations: z.array(weeklyCustomizationSchema).optional().default([]),
});

export const insertTiffinSchema = z.object({
  sellerId: z.string(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.enum(["Veg", "Non-Veg", "Jain", "Customizable"]),
  price: z.number().min(1, "Price must be greater than 0"),
  availableDays: z.array(z.string()).min(1, "Select at least one available day"),
  slots: z.array(z.string()).min(1, "Select at least one time slot"),
  imageUrl: z.string().optional(),
  type: z.enum(["tiffin", "meal"]).default("meal"),
  serviceType: z.enum(["meal", "tiffin"]).default("meal"),
  mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Full Day"]).optional(),
  trialPrice: z.number().min(0).optional().default(99),
  monthlyPrice: z.number().min(0).optional().default(2000),
  customizableOptions: z.array(z.string()).optional().default([]),
  addOns: z.array(addOnSchema).optional().default([]),
  weeklyCustomizations: z.array(weeklyCustomizationSchema).optional().default([]),
});

export type Tiffin = z.infer<typeof tiffinSchema>;
export type InsertTiffin = z.infer<typeof insertTiffinSchema>;

// Booking Add-on Schema
export const bookingAddOnSchema = z.object({
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
});

export type BookingAddOn = z.infer<typeof bookingAddOnSchema>;

// ✅ NEW: Coupon Schema
export const couponSchema = z.object({
  _id: z.string(),
  code: z.string(),
  description: z.string(),
  discountType: z.enum(["fixed", "percentage"]),
  discountValue: z.number(),
  minOrderAmount: z.number(),
  maxDiscountAmount: z.number().optional(),
  validFrom: z.string(),
  validUntil: z.string(),
  usageLimit: z.number(),
  usedCount: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertCouponSchema = z.object({
  code: z.string().min(3, "Coupon code must be at least 3 characters"),
  description: z.string().min(5, "Description is required"),
  discountType: z.enum(["fixed", "percentage"]),
  discountValue: z.number().min(1, "Discount value must be at least 1"),
  minOrderAmount: z.number().min(0, "Minimum order amount cannot be negative"),
  maxDiscountAmount: z.number().optional(),
  validFrom: z.string().min(1, "Valid from date is required"),
  validUntil: z.string().min(1, "Valid until date is required"),
  usageLimit: z.number().min(1, "Usage limit must be at least 1"),
});

export const applyCouponSchema = z.object({
  couponCode: z.string().min(1, "Coupon code is required"),
  totalAmount: z.number().min(0, "Total amount must be positive"),
});

export type Coupon = z.infer<typeof couponSchema>;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type ApplyCoupon = z.infer<typeof applyCouponSchema>;

// ✅ NEW: One scheduled delivery day inside a weekly/monthly subscription booking.
// Status is computed live on the server (not a static stored value) — see
// server/services/deliveryScheduleService.ts.
export const deliveryDaySchema = z.object({
  _id: z.string(),
  date: z.string(),
  day: z.string(),
  status: z.enum(["Pending", "Delivered", "Missed"]),
  rating: z.number().min(1).max(5).optional(),
  review: z.string().optional(),
  ratedAt: z.string().optional(),
  // ✅ NEW: customer-written note for this specific day, editable only the day before
  customizationNote: z.string().optional(),
  customizedAt: z.string().optional(),
});

export type DeliveryDay = z.infer<typeof deliveryDaySchema>;

// ✅ UPDATED: Booking Schema with Price Breakdown
export const bookingSchema = z.object({
  _id: z.string(),
  customerId: z.string().optional(),
  customerName: z.string(),
  customerEmail: z.string(),
  customerPhone: z.string(),
  customerAddress: z.string(),
  customerCity: z.string(),
  paymentMethod: z.enum(["cod", "upi"]).default("upi"),
  
  tiffinId: z.string(),
  sellerId: z.string(),
  deliveryAddress: z.string(),
  date: z.string(),
  slot: z.string(),
  quantity: z.number(),
  
  // Price breakdown
  basePrice: z.number(),
  addOnsPrice: z.number(),
  deliveryCharge: z.number(),
  discountAmount: z.number(),
  totalPrice: z.number(),
  
  // Coupon details
  couponCode: z.string().optional(),
  couponDiscount: z.number().optional(),

  // ✅ NEW: Cancellation fields
  cancellationReason: z.string().optional(),
  cancelledBy: z.enum(['customer', 'seller', 'system']).optional(),
  cancelledAt: z.string().optional(),
  
  status: z.enum(["Pending", "Confirmed", "Cancelled", "Delivered"]),
  bookingType: z.enum(["single", "trial", "weekly", "monthly"]),
  customization: z.string().optional(),
  addOns: z.array(bookingAddOnSchema).optional().default([]),
  weeklyCustomizations: z.array(weeklyCustomizationSchema).optional().default([]),
  selectedDays: z.array(z.string()).optional().default([]),
  // ✅ NEW: per-day delivery tracking for weekly/monthly subscriptions
  deliverySchedule: z.array(deliveryDaySchema).optional().default([]),
  createdAt: z.string(),
});

export const insertBookingSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerEmail: z.string().email("Invalid email address"),
  customerPhone: z.string().min(10, "Phone must be at least 10 digits"),
  customerAddress: z.string(),
  customerCity: z.string(),
  tiffinId: z.string(),
  sellerId: z.string(),
  deliveryAddress: z.string().min(5, "Delivery address is required"),
  date: z.string().min(1, "Date is required"),
  slot: z.string().min(1, "Time slot is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),

   // ✅ NEW: Cancellation fields
  cancellationReason: z.string().optional(),
  cancelledBy: z.enum(['customer', 'seller', 'system']).optional(),
  cancelledAt: z.string().optional(),
  
  // Price breakdown
  basePrice: z.number(),
  addOnsPrice: z.number(),
  deliveryCharge: z.number(),
  discountAmount: z.number(),
  totalPrice: z.number(),
  
  // Coupon details
  couponCode: z.string().optional(),
  couponDiscount: z.number().optional(),
  
  bookingType: z.enum(["single", "trial", "weekly", "monthly"]),
  customization: z.string().optional(),
  addOns: z.array(bookingAddOnSchema).optional().default([]),
  weeklyCustomizations: z.array(weeklyCustomizationSchema).optional().default([]),
  selectedDays: z.array(z.string()).optional().default([]),
});

export type Booking = z.infer<typeof bookingSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

// ✅ NEW: Price Calculation Schema
export const priceCalculationSchema = z.object({
  basePrice: z.number(),
  addOnsPrice: z.number(),
  deliveryCharge: z.number(),
  discountAmount: z.number(),
  couponDiscount: z.number(),
  finalAmount: z.number(),
  couponCode: z.string().optional(),
});

export type PriceCalculation = z.infer<typeof priceCalculationSchema>;

// ✅ NEW: Coupon Validation Schema
export const couponValidationSchema = z.object({
  isValid: z.boolean(),
  coupon: couponSchema.optional(),
  discountAmount: z.number(),
  message: z.string(),
});

export type CouponValidation = z.infer<typeof couponValidationSchema>;

/* Review Schema
export const reviewSchema = z.object({
  _id: z.string(),
  tiffinId: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string(),
  createdAt: z.string(),
});

export const insertReviewSchema = z.object({
  tiffinId: z.string(),
  customerId: z.string(),
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  rating: z.number().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().min(10, "Comment must be at least 10 characters"),
});

export type Review = z.infer<typeof reviewSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;*/

// Auth Response
export type AuthResponse = {
  token: string;
  user: User;
  seller?: Seller;
};

// Seller with User data
export type SellerWithUser = Seller & {
  user: User;
};

// Tiffin with Seller data
export type TiffinWithSeller = Tiffin & {
  seller: Seller;
};

// Booking with details
export type BookingWithDetails = Booking & {
  tiffin: Tiffin;
  seller: Seller;
};

// Tiffin with Reviews
export type TiffinWithReviews = Tiffin & {
  seller: Seller;
  reviews: Review[];
};

// ✅ UPDATED: Admin Stats with Coupon Data
export const adminStatsSchema = z.object({
  totalSellers: z.number(),
  totalTiffins: z.number(),
  totalBookings: z.number(),
  pendingSellers: z.number(),
  activeSellers: z.number(),
  suspendedSellers: z.number(),
  totalRevenue: z.number(),
  totalCoupons: z.number(),
  activeCoupons: z.number(),
  couponUsage: z.number(),
});

export type AdminStats = z.infer<typeof adminStatsSchema>;

// Add-on Management Types
export type AddOnFormData = {
  name: string;
  description: string;
  price: number;
  available: boolean;
};

export type WeeklyCustomizationFormData = {
  name: string;
  description: string;
  price: number;
  days: string[];
  available: boolean;
};

// Customer Booking Summary
export type CustomerBookingSummary = {
  basePrice: number;
  addOnsTotal: number;
  customizationsTotal: number;
  deliveryCharge: number;
  discountAmount: number;
  totalAmount: number;
  selectedAddOns: BookingAddOn[];
  selectedCustomizations: WeeklyCustomization[];
};

// Form Data Types for Frontend
export type TiffinFormData = {
  sellerId: string;
  title: string;
  description: string;
  category: "Veg" | "Non-Veg" | "Jain" | "Customizable";
  price: number;
  availableDays: string[];
  slots: string[];
  imageUrl?: string;
  type: "tiffin" | "meal";
  serviceType: "meal" | "tiffin";
  mealType?: "Breakfast" | "Lunch" | "Dinner" | "Full Day";
  trialPrice?: number;
  monthlyPrice?: number;
  customizableOptions?: string[];
  addOns?: AddOn[];
  weeklyCustomizations?: WeeklyCustomization[];
};

export type BookingFormData = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  tiffinId: string;
  sellerId: string;
  deliveryAddress: string;
  date: string;
  slot: string;
  quantity: number;
  basePrice: number;
  addOnsPrice: number;
  deliveryCharge: number;
  discountAmount: number;
  totalPrice: number;
  couponCode?: string;
  couponDiscount?: number;
  bookingType: "single" | "trial" | "weekly" | "monthly";
  customization?: string;
  addOns?: BookingAddOn[];
  weeklyCustomizations?: WeeklyCustomization[];
  selectedDays?: string[];
};

// API Response Types
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// Search and Filter Types
export type TiffinSearchFilters = {
  category?: string[];
  type?: string[];
  serviceType?: string[];
  mealType?: string[];
  minPrice?: number;
  maxPrice?: number;
  availableDays?: string[];
  city?: string;
};

export type SellerSearchFilters = {
  status?: string[];
  city?: string;
};

// Dashboard Types
export type SellerDashboardStats = {
  totalTiffins: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  deliveredBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
};

export type CustomerDashboardStats = {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalSpent: number;
  favoriteCategory: string;
};

// Notification Types
export type Notification = {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
  link?: string;
};

// Payment Types
export type Payment = {
  _id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "refunded";
  paymentMethod: "cash" | "online" | "wallet";
  transactionId?: string;
  createdAt: string;
  completedAt?: string;
};

// Delivery Types
export type Delivery = {
  _id: string;
  bookingId: string;
  deliveryPersonId?: string;
  status: "pending" | "assigned" | "picked_up" | "on_the_way" | "delivered";
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  deliveryAddress: string;
  customerPhone: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

// Rating and Review Summary
export type RatingSummary = {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
};

// Menu and Category Types
export type MenuCategory = {
  _id: string;
  name: string;
  description: string;
  imageUrl?: string;
  displayOrder: number;
  active: boolean;
};

export type MenuItem = {
  _id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  available: boolean;
  customizable: boolean;
  addOns: AddOn[];
  tags: string[];
};

// Subscription Types
export type SubscriptionPlan = {
  _id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  features: string[];
  active: boolean;
  createdAt: string;
};

export type CustomerSubscription = {
  _id: string;
  customerId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "cancelled";
  autoRenew: boolean;
  createdAt: string;
};

// Analytics Types
export type SalesAnalytics = {
  date: string;
  orders: number;
  revenue: number;
  averageOrderValue: number;
};

export type CustomerAnalytics = {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  customerGrowthRate: number;
};

export type PopularItem = {
  tiffinId: string;
  tiffinName: string;
  orders: number;
  revenue: number;
  category: string;
  type: "tiffin" | "meal";
};

// ✅ NEW: Coupon Analytics
export type CouponAnalytics = {
  totalCoupons: number;
  activeCoupons: number;
  expiredCoupons: number;
  totalUsage: number;
  totalDiscountGiven: number;
  mostUsedCoupon: {
    code: string;
    usageCount: number;
    discountGiven: number;
  };
};

// ✅ NEW: Order Summary
export type OrderSummary = {
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  total: number;
  couponApplied: boolean;
  couponCode?: string;
  couponDiscount?: number;
};

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const verifyOTPSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
export type VerifyOTPData = z.infer<typeof verifyOTPSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

// ✅ NEW: Wallet schemas
export const walletCouponSchema = z.object({
  _id: z.string(),
  customerId: z.string(),
  code: z.string(),
  description: z.string().optional().default(""),
  discountType: z.enum(["fixed", "percentage"]),
  discountValue: z.number(),
  isActive: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type WalletCoupon = z.infer<typeof walletCouponSchema>;

export const walletTransactionSchema = z.object({
  _id: z.string(),
  customerId: z.string(),
  type: z.enum(["credit", "debit"]),
  amount: z.number(),
  balanceAfter: z.number(),
  reason: z.string().optional().default(""),
  createdAt: z.string().optional(),
});
export type WalletTransaction = z.infer<typeof walletTransactionSchema>;

export type WalletData = {
  balance: number;
  coupons: WalletCoupon[];
  transactions: WalletTransaction[];
};

export type WalletCustomer = Pick<User, "_id" | "name" | "email" | "phone"> & {
  walletBalance: number;
  createdAt: string;
};

export type AdminWalletDetail = {
  customer: WalletCustomer;
  coupons: WalletCoupon[];
  transactions: WalletTransaction[];
};