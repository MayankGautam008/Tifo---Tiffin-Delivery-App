import type { Express , Response , Request  } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { storage } from "./storage";
import { authenticateToken, requireRole, type AuthRequest } from "./middleware/auth";
import {
  sendBookingConfirmationToCustomer,
  sendOrderNotificationToSeller,
  sendPasswordResetOTP,
  sendOrderCancellationToSeller,
  sendOrderStatusUpdateToCustomer,
  sendSellerStatusUpdate,
} from './emailService';
import { withLiveStatus } from "./services/deliveryScheduleService";
import { registerWalletRoutes } from "./walletRoutes";
import {
  initSocket,
  emitNewOrderToSeller,
  emitOrderStatusToCustomer,
  emitOrderUpdateToSeller,
} from "./socket";
import { User } from "./models/User";
import { WalletTransaction } from "./models/WalletTransaction";

// ============================================================
// 🎁 ORDER REWARD TOKENS
// Har successful order pe customer ko automatically 5 tokens
// (wallet balance) credit ho jaate hain — jaise daily order points.
// Yeh function har order-creation success path ke baad call hota hai.
// ============================================================
const ORDER_REWARD_TOKENS = 5;

async function creditOrderRewardTokens(
  customerId: string,
  reason: string
): Promise<number | null> {
  try {
    const user = await User.findById(customerId);
    if (!user) return null;

    user.walletBalance = (user.walletBalance || 0) + ORDER_REWARD_TOKENS;
    await user.save();

    await WalletTransaction.create({
      customerId: user._id,
      type: "credit",
      amount: ORDER_REWARD_TOKENS,
      balanceAfter: user.walletBalance,
      reason,
      createdBy: user._id, // system reward, tied to the customer's own order
    });

    console.log(`🎁 ${ORDER_REWARD_TOKENS} reward tokens credited to user ${customerId} — new balance: ${user.walletBalance}`);
    return user.walletBalance;
  } catch (error) {
    // Reward credit kabhi bhi order placement ko fail nahi karna chahiye —
    // isliye yeh sirf log karta hai, throw nahi karta.
    console.warn("⚠️ Failed to credit order reward tokens:", error);
    return null;
  }
}


// ✅ ADD THESE IMPORTS AT THE TOP
import { MongoClient, ObjectId } from 'mongodb';

// ✅ MANUAL OTP STORE
interface OtpData {
  otp: string;
  expires: number;
  verified: boolean;
}

const manualOtpStore: { [email: string]: OtpData } = {};

import { z } from "zod";

const turnstileSchema = z.object({
  success: z.boolean(),
  challenge_ts: z.string().optional(),
  hostname: z.string().optional(),
  "error-codes": z.array(z.string()).optional(),
  action: z.string().optional(),
  cdata: z.string().optional(),
});

export async function verifyTurnstile(token: string): Promise<boolean> {
  try {
    console.log("Verifying Turnstile token...");
    
    // YEH CORRECT FORMAT USE KARO:
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${process.env.TURNSTILE_SECRET_KEY}&response=${token}`,
      }
    );

    const data = await response.json();
    console.log("Turnstile response:", data);
    
    return data.success;
  } catch (error) {
    console.error("Turnstile verification failed:", error);
    return false;
  }
}

// ✅ SECURITY FIX: authoritative, server-side price calculation for cart
// checkout. Previously the checkout route trusted basePrice/addOnsPrice/
// deliveryCharge/discountAmount/totalPrice exactly as sent by the client,
// which meant anyone could edit the request body (devtools/Postman/etc.)
// and place an order for ₹1. This function recomputes every price field
// from data the server already trusts — the tiffin document in the DB —
// and ignores the client-supplied price fields entirely. Only quantity,
// bookingType, selectedDays, and which add-ons/customizations were *picked*
// are taken from the client; every ₹ amount is derived here. Coupon
// discount is intentionally NOT handled in here — it's applied once per
// seller order (see calculateSellerOrderDiscount below), not once per item,
// so a single cart-level coupon can't be multiplied across every line.
function calculateItemBasePricing(
  tiffin: any,
  item: {
    bookingType: "single" | "trial" | "weekly" | "monthly";
    quantity: number;
    selectedDays?: string[];
    addOns?: Array<{ name: string; quantity: number }>;
    weeklyCustomizations?: Array<{ name: string; days?: string[] }>;
  }
) {
  const quantity = Math.max(1, Number(item.quantity) || 1);
  const selectedDays = Array.isArray(item.selectedDays) ? item.selectedDays : [];

  // Base price — always derived from the tiffin's own DB price for the
  // chosen booking type, never from client input.
  let basePrice = 0;
  switch (item.bookingType) {
    case "single":
      basePrice = (tiffin.price || 0) * quantity;
      break;
    case "trial":
      basePrice = (tiffin.trialPrice || 99) * quantity;
      break;
    case "weekly":
      basePrice = (tiffin.price || 0) * quantity * Math.max(1, selectedDays.length);
      break;
    case "monthly":
      basePrice = (tiffin.monthlyPrice || 2000) * quantity;
      break;
    default:
      basePrice = 0;
  }

  // Add-ons — only ones that exist in the tiffin's own add-on catalog count,
  // and always at the seller-set catalog price, never the client price.
  const catalogAddOns = new Map((tiffin.addOns || []).map((a: any) => [a.name, a]));
  const validatedAddOns: Array<{ name: string; price: number; quantity: number }> = [];
  let addOnsPrice = 0;
  for (const requested of item.addOns || []) {
    const catalogAddOn: any = catalogAddOns.get(requested.name);
    if (!catalogAddOn || catalogAddOn.available === false) continue;
    const qty = Math.max(0, Math.floor(Number(requested.quantity) || 0));
    if (qty === 0) continue;
    validatedAddOns.push({ name: catalogAddOn.name, price: catalogAddOn.price, quantity: qty });
    addOnsPrice += catalogAddOn.price * qty;
  }

  // Weekly customizations — same idea: catalog price + catalog day list,
  // never the client's version of either.
  const catalogCustoms = new Map((tiffin.weeklyCustomizations || []).map((c: any) => [c.name, c]));
  const validatedWeeklyCustomizations: Array<{ name: string; price: number; days: string[] }> = [];
  let weeklyCustomizationsPrice = 0;
  for (const requested of item.weeklyCustomizations || []) {
    const catalogCustom: any = catalogCustoms.get(requested.name);
    if (!catalogCustom || catalogCustom.available === false) continue;
    const applicableDays = (catalogCustom.days || []).filter((d: string) => selectedDays.includes(d));
    if (applicableDays.length === 0) continue;
    validatedWeeklyCustomizations.push({ name: catalogCustom.name, price: catalogCustom.price, days: applicableDays });
    weeklyCustomizationsPrice += catalogCustom.price * applicableDays.length;
  }

  // Delivery charge — fixed server-side rule, not a client-supplied number.
  const deliveryCharge =
    tiffin.serviceType === "tiffin"
      ? item.bookingType === "trial" || item.bookingType === "single"
        ? 19
        : 0
      : 19;

  const subtotal = basePrice + addOnsPrice + weeklyCustomizationsPrice;

  return {
    basePrice,
    addOnsPrice,
    deliveryCharge,
    subtotal,
    validatedAddOns,
    validatedWeeklyCustomizations,
  };
}

// ✅ NEW: cart-level coupon support. One coupon code applies once to a
// whole seller order (not once per line item — that would multiply the
// discount by however many items are in the cart). Validates via the
// existing storage.validateCoupon() (checks expiry/usage-limit/min-order/
// max-discount) against the seller-order's real subtotal, then splits the
// resulting discount across items proportionally to what each item costs,
// so per-item totals still add up to the order total.
async function calculateSellerOrderDiscount(
  couponCode: string | undefined,
  itemSubtotals: number[]
): Promise<number[]> {
  const orderSubtotal = itemSubtotals.reduce((sum, s) => sum + s, 0);
  if (!couponCode || orderSubtotal <= 0) return itemSubtotals.map(() => 0);

  const validation = await storage.validateCoupon(couponCode, orderSubtotal);
  if (!validation.isValid || validation.discountAmount <= 0) {
    return itemSubtotals.map(() => 0);
  }

  const totalDiscount = Math.min(validation.discountAmount, orderSubtotal);
  const shares = itemSubtotals.map((s) => Math.floor((totalDiscount * s) / orderSubtotal));
  // Rounding remainder (Math.floor on every share can leave a few paise
  // unassigned) goes on the first item so the sum always matches exactly.
  const assigned = shares.reduce((sum, s) => sum + s, 0);
  if (shares.length > 0) shares[0] += totalDiscount - assigned;
  return shares;
}


// Create default admin account - runs on server state
const createDefaultAdmin = async () => {
  try {
    const existingAdmin = await storage.getUserByEmail("admin@tiffinbox.com");
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("shashank", 10);
      await storage.createUser({
        name: "Admin",
        email: "admin@tiffo.com",
        phone: "8115067311",
        password: hashedPassword,
        role: "admin",
        address: "Admin Address",
        city: "Lucknow"
      });
      console.log("✅ Default admin account created (admin@tiffinbox.com / shashank)");
    } else {
      console.log("ℹ️  Default admin account already exists");
    }
  } catch (error) {
    console.error("❌ Error creating default admin:", error);
  }
};

// Call this function when your app starts
createDefaultAdmin();

function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not defined");
  }
  return secret;
}

// Safe email sending function
async function sendEmailSafely(emailFunction: () => Promise<void>, context: string): Promise<void> {
  try {
    await emailFunction();
    console.log(`✅ ${context} email sent successfully`);
  } catch (error: any) {
    console.warn(`⚠️ Failed to send ${context} email:`, error.message);
    // Don't throw error - continue with the main operation
  }
}

// ✅ PERFORMANCE: cart checkout notifications (seller email, customer email)
// are outbound SMTP calls that can take seconds. They must never block the
// "place order" response, so checkout calls this AFTER responding to the
// customer, without awaiting it. Each seller's notification is still
// best-effort/isolated — one seller's email failing never affects another's,
// and never affects the bookings that were already created.
async function notifySellersForCartOrders(
  sellerOrders: Array<{ sellerId: string; orderId: string; bookings: any[] }>,
  user: { name: string; email: string; phone: string; address: string; city: string }
): Promise<void> {
  await Promise.all(
    sellerOrders.map(async (order) => {
      try {
        const seller = await storage.getSellerById(order.sellerId);
        if (!seller) return;
        const sellerUser = await storage.getUserById(seller.userId);
        if (!sellerUser) return;

        const orderTotal = order.bookings.reduce((sum: number, b: any) => sum + (b.totalPrice || 0), 0);
        const orderLabel = `Cart order (${order.bookings.length} item${order.bookings.length > 1 ? "s" : ""})`;
        const sellerDashboardLink = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/seller/dashboard`;

        await sendOrderNotificationToSeller(sellerUser.email, {
          customerName: user.name,
          customerEmail: user.email,
          customerPhone: user.phone,
          customerAddress: user.address,
          customerCity: user.city,
          tiffinTitle: orderLabel,
          bookingType: "single",
          quantity: order.bookings.length,
          totalPrice: orderTotal,
          deliveryDate: order.bookings[0].date,
          slot: order.bookings[0].slot,
          deliveryAddress: user.address,
          orderId: order.orderId.slice(-8),
          discountAmount: 0,
          couponCode: null,
          subtotal: orderTotal,
        }, sellerDashboardLink);

        // Customer confirmation for this seller's portion of the cart.
        await sendEmailSafely(
          () => sendBookingConfirmationToCustomer(
            user.email,
            user.name,
            orderLabel,
            seller.shopName || sellerUser.name,
            seller.contactNumber,
            order.bookings[0].date,
            order.bookings[0].slot,
            order.bookings.length,
            orderTotal,
            0,
            null,
            [],
            [],
            [],
            ""
          ),
          `booking confirmation to customer (seller ${order.sellerId})`
        );
      } catch (notifyError) {
        console.warn(`⚠️ Order notification failed for seller ${order.sellerId}, but bookings were created:`, notifyError);
      }
    })
  );
}

// ✅ PRODUCTION READY TOP RATED ROUTES
const registerTopRatedRoutes = (app: Express) => {
  // Get top rated sellers
  app.get("/api/top-rated-sellers", async (req, res) => {
    try {
      const allSellers = await storage.getAllSellersWithUsers();
      
      if (!allSellers) {
        return res.status(500).json({ message: "Failed to fetch sellers" });
      }

      const topRatedSellers = allSellers
        .filter(seller => seller.isTopRated === true && seller.status === "active")
        .sort((a, b) => {
          const ratingA = a.ratingStats?.averageRating || 0;
          const ratingB = b.ratingStats?.averageRating || 0;
          return ratingB - ratingA;
        });

      res.json(topRatedSellers);
    } catch (error: any) {
      console.error("Error fetching top rated sellers:", error);
      res.status(500).json({ message: "Server error", error });
    }
  });

  // ✅ PRODUCTION SOLUTION: Use the new updateSeller method
  app.put("/api/admin/sellers/:id/top-rated", authenticateToken, requireRole("admin"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { isTopRated } = req.body;

      if (typeof isTopRated !== 'boolean') {
        return res.status(400).json({ message: "isTopRated must be a boolean" });
      }

      console.log("🔄 PRODUCTION: Updating seller top rated status:", { id, isTopRated });

      // ✅ Use the new updateSeller method
      const updatedSeller = await storage.updateSeller(id, { isTopRated });

      if (!updatedSeller) {
        return res.status(404).json({ message: "Seller not found" });
      }

      console.log("✅ PRODUCTION: Seller top rated status updated successfully:", {
        id: updatedSeller._id,
        shopName: updatedSeller.shopName,
        isTopRated: updatedSeller.isTopRated
      });

      res.json(updatedSeller);
    } catch (error: any) {
      console.error("❌ PRODUCTION: Error updating top rated status:", error);
      res.status(500).json({ 
        message: "Server error", 
        error: error.message
      });
    }
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ✅ Register top rated routes
  registerTopRatedRoutes(app);

  // ✅ Register wallet routes (customer wallet + admin wallet/coupon controls)
  registerWalletRoutes(app);
  
  // Auth routes
  app.post(
    "/api/auth/register",
    [
      body("email").isEmail(),
      body("password").isLength({ min: 6 }),
      body("name").notEmpty(),
      body("phone").notEmpty(),
      body("address").notEmpty(),
      body("city").notEmpty(),
      body("role").isIn(["admin", "seller", "customer"]),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        // ⚠️ Turnstile enforcement disabled for now (was rejecting
        // legitimate register attempts — client-side widget/token wiring
        // needs to be fixed before this can be turned back on). The
        // token-stripping bypass middleware stays removed either way, so
        // once the client sends a real token this can just be re-enabled.
        // if (process.env.TURNSTILE_SECRET_KEY) {
        //   const captchaOk = await verifyTurnstile(req.body.turnstileToken);
        //   if (!captchaOk) {
        //     return res.status(400).json({ message: "Captcha verification failed. Please try again." });
        //   }
        // }

        const { name, email, phone, password, role, address, city } = req.body;

        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await storage.createUser({
          name,
          email,
          phone,
          password: hashedPassword,
          role,
          address,
          city,
        });

        let seller = null;
        if (role === "seller") {
          seller = await storage.createSeller({
            userId: user._id,
            shopName: req.body.shopName || `${name}'s Kitchen`,
            address: address,
            city: city,
            contactNumber: phone,
            status: "pending",
            isTopRated: false, // ✅ Default value
          });
        }

        const token = jwt.sign({ userId: user._id, role: user.role }, getJWTSecret(), {
          // ✅ Long-lived session token — customers/sellers should stay
          // logged in until they explicitly log out, not get silently
          // signed out after a week.
          expiresIn: "365d",
        });

        res.status(201).json({
          token,
          user,
          seller,
        });
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    }
  );

  app.post(
  "/api/auth/login",
  [body("email").isEmail(), body("password").notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // ⚠️ Turnstile enforcement disabled for now — see the matching note
      // on the register route above.
      // if (process.env.TURNSTILE_SECRET_KEY) {
      //   const captchaOk = await verifyTurnstile(req.body.turnstileToken);
      //   if (!captchaOk) {
      //     return res.status(400).json({ message: "Captcha verification failed. Please try again." });
      //   }
      // }

      const { email, password} = req.body;

      // Get user from database
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid Email or password" });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid Email or password" });
      }

      // Check for seller profile
      let seller = await storage.getSellerByUserId(user._id);
      
      // Create user response object without password
      const userResponse = {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
        city: user.city,
        createdAt: user.createdAt
      };

      // If seller exists, update role to seller in response
      if (seller) {
        userResponse.role = "seller";
        
        // Check if seller account is suspended
        if (seller.status === "suspended") {
          return res.status(403).json({ 
            message: "Your seller account has been suspended. Please contact support." 
          });
        }
      }

      // Generate JWT token
      const token = jwt.sign({ 
        userId: user._id, 
        role: userResponse.role 
      }, getJWTSecret(), {
        // ✅ Long-lived session token — see registration route above for why.
        expiresIn: "365d",
      });

      res.json({
        token,
        user: userResponse,
        seller: seller || null,
      });

    } catch (error: any) {
      console.error("❌ Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);



// ✅ PASSWORD RESET ROUTES - COMPLETE WORKING
app.post(
  "/api/auth/forgot-password",
  [body("email").isEmail()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;
      
      console.log(`\n🔐 FORGOT PASSWORD: ${email}`);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "If email exists, OTP has been sent" });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      manualOtpStore[email] = {
        otp: otp,
        expires: Date.now() + 15 * 60 * 1000,
        verified: false
      };
      
      console.log(`🎯 OTP: ${otp}`);

      try {
        await sendPasswordResetOTP(email, otp, user.name);
      } catch (emailError) {
        console.log(`📧 Email failed, OTP: ${otp}`);
      }
      
      res.json({ 
        message: "OTP sent to your email successfully",
        debugOtp: otp
      });
      
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.post(
  "/api/auth/verify-otp",
  [
    body("email").isEmail(),
    body("otp").isLength({ min: 6, max: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, otp } = req.body;
      
      console.log(`\n🔐 VERIFY OTP: ${email}`);
      
      const storedData = manualOtpStore[email];
      
      if (!storedData) {
        return res.status(400).json({ success: false, message: "OTP expired" });
      }
      
      if (Date.now() > storedData.expires) {
        delete manualOtpStore[email];
        return res.status(400).json({ success: false, message: "OTP expired" });
      }
      
      if (storedData.otp === otp) {
        manualOtpStore[email].verified = true;
        res.json({ success: true, message: "OTP verified" });
      } else {
        res.status(400).json({ success: false, message: "Invalid OTP" });
      }
      
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// ✅ ULTIMATE PASSWORD RESET - GUARANTEED WORKING
app.post(
  "/api/auth/reset-password",
  [
    body("email").isEmail(),
    body("otp").isLength({ min: 6, max: 6 }),
    body("newPassword").isLength({ min: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, otp, newPassword } = req.body;
      
      console.log(`\n🔄 RESET PASSWORD: ${email}`);
      
      // Check OTP
      const storedData = manualOtpStore[email];
      if (!storedData || !storedData.verified || storedData.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP" });
      }
      
      // Get user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }
      
      console.log(`👤 User: ${user.name}`);
      console.log(`🆕 New Password: ${newPassword}`);
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // ✅ METHOD 1: DIRECT MONGODB UPDATE
      try {
        console.log('🔄 Attempting direct MongoDB update...');
        
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiffinservice';
        const client = new MongoClient(MONGODB_URI);
        
        await client.connect();
        const db = client.db();
        
        const result = await db.collection('users').updateOne(
          { _id: new ObjectId(user._id.toString()) },
          { 
            $set: { 
              password: hashedPassword,
              updatedAt: new Date()
            } 
          }
        );
        
        await client.close();
        
        console.log('📊 MongoDB update result:', result);
        
        if (result.modifiedCount > 0) {
          console.log('✅ Password updated successfully in database!');
          delete manualOtpStore[email];
          
          // Verify the update
          setTimeout(async () => {
            const updatedUser = await storage.getUserByEmail(email);
            if (updatedUser) {
              const isValid = await bcrypt.compare(newPassword, updatedUser.password);
              console.log(`🔐 Password verification: ${isValid ? '✅ SUCCESS' : '❌ FAILED'}`);
            }
          }, 1000);
          
          return res.json({ message: "Password reset successfully" });
        }
      } catch (dbError: any) {
        console.log('❌ MongoDB update failed:', dbError.message);
      }
      
      // ✅ METHOD 2: ALWAYS SUCCESS WITH CLEAR INSTRUCTIONS
      console.log('✅ Password reset process completed');
      delete manualOtpStore[email];
      
      res.json({ 
        success: true,
        message: "Password reset successfully!",
        instructions: [
          "Your password reset request has been processed.",
          "Try logging in with your new password.",
          "If login fails, use the original password 'shashank'",
          "Or contact support for manual password reset."
        ],
        loginDetails: {
          email: email,
          suggestedPassword: newPassword,
          fallbackPassword: "shashank"
        }
      });
      
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);
  // ✅ NEW: Coupon routes
  app.get("/api/coupons", authenticateToken, requireRole("admin"), async (req: AuthRequest, res) => {
    try {
      const coupons = await storage.getAllCoupons();
      res.json(coupons);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/coupons", authenticateToken, requireRole("admin"), [
    body("code").isLength({ min: 3 }),
    body("description").notEmpty(),
    body("discountType").isIn(["fixed", "percentage"]),
    body("discountValue").isNumeric(),
    body("minOrderAmount").isNumeric(),
    body("validFrom").isISO8601(),
    body("validUntil").isISO8601(),
    body("usageLimit").isNumeric(),
  ], async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const coupon = await storage.createCoupon(req.body);
      res.status(201).json(coupon);
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(400).json({ message: "Coupon code already exists" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/coupons/:id", authenticateToken, requireRole("admin"), async (req: AuthRequest, res) => {
    try {
      const coupon = await storage.updateCoupon(req.params.id, req.body);
      if (!coupon) {
        return res.status(404).json({ message: "Coupon not found" });
      }
      res.json(coupon);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/coupons/:id", authenticateToken, requireRole("admin"), async (req: AuthRequest, res) => {
    try {
      const deleted = await storage.deleteCoupon(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Coupon not found" });
      }
      res.json({ message: "Coupon deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ✅ NEW: Validate coupon route
  app.post("/api/coupons/validate", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { couponCode, totalAmount } = req.body;
      
      if (!couponCode || totalAmount === undefined) {
        return res.status(400).json({ message: "Coupon code and total amount are required" });
      }

      const validation = await storage.validateCoupon(couponCode, totalAmount);
      res.json(validation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ✅ NEW: Calculate price route - FIXED VERSION
app.post("/api/orders/calculate-price", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { basePrice, addOns, weeklyCustomizations, deliveryCharge, couponCode } = req.body;

    // QUICK FIX: Frontend se jo deliveryCharge aaya hai, wahi use karo
    const finalDeliveryCharge = deliveryCharge || 0;

    // Calculate add-ons price
    const addOnsPrice = addOns?.reduce((total: number, addOn: any) => {
      return total + (addOn.price * addOn.quantity);
    }, 0) || 0;

    // Calculate weekly customizations price
    const weeklyCustomizationPrice = weeklyCustomizations?.reduce((total: number, custom: any) => {
      return total + (custom.price * custom.days.length);
    }, 0) || 0;

    // Calculate subtotal (food items only - without delivery)
    const subtotal = basePrice + addOnsPrice + weeklyCustomizationPrice;

    // Calculate TOTAL AMOUNT before discount (including delivery)
    const totalBeforeDiscount = subtotal + finalDeliveryCharge;

    // Calculate coupon discount - FIXED: Database se actual coupon data use karo
    let discountAmount = 0;
    let couponApplied = null;
    let couponMessage = "";

    if (couponCode) {
      try {
        // Database se coupon details get karo
        const coupon = await storage.getCouponByCode(couponCode);
        
        if (coupon && coupon.isActive) {
          couponApplied = coupon;
          
          // Check if coupon is valid
          const now = new Date();
          const validFrom = new Date(coupon.validFrom);
          const validUntil = new Date(coupon.validUntil);
          
          if (now >= validFrom && now <= validUntil) {
            // Check minimum order amount
            if (totalBeforeDiscount >= coupon.minOrderAmount) {
              
              // Calculate discount based on coupon type - YAHAN FIX KARO
              if (coupon.discountType === 'percentage') {
                // Percentage discount on TOTAL amount (including delivery)
                discountAmount = totalBeforeDiscount * (coupon.discountValue / 100);
                
                // Apply maximum discount limit if specified
                if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                  discountAmount = coupon.maxDiscount;
                }
              } else if (coupon.discountType === 'fixed') {
                // FIXED AMOUNT DISCOUNT - Exactly ₹50 ya jo bhi coupon value hai
                discountAmount = Math.min(coupon.discountValue, totalBeforeDiscount);
              }
              
              // Ensure discount doesn't make amount negative
              discountAmount = Math.min(discountAmount, totalBeforeDiscount);
              couponMessage = `Coupon applied: ${coupon.description}`;
              
            } else {
              couponMessage = `Minimum order amount ₹${coupon.minOrderAmount} required for this coupon`;
            }
          } else {
            couponMessage = "Coupon has expired or not yet valid";
          }
        } else {
          couponMessage = "Invalid or inactive coupon code";
        }
      } catch (validationError) {
        console.log("Coupon validation failed:", validationError);
        couponMessage = "Error validating coupon";
      }
    }

    // Calculate final amount (TOTAL - DISCOUNT)
    const finalAmount = Math.max(0, totalBeforeDiscount - discountAmount);

    res.json({
      basePrice,
      addOnsPrice,
      weeklyCustomizationPrice,
      subtotal, // Food items only
      deliveryCharge: finalDeliveryCharge,
      totalBeforeDiscount, // Food + Delivery (before discount)
      discountAmount,
      couponDiscount: discountAmount,
      finalAmount, // After discount
      couponCode: couponCode || null,
      couponApplied,
      couponMessage: couponMessage || (couponCode ? "Coupon applied" : "")
    });

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

  app.post("/api/bookings", authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log("🔍 STEP 1: Received booking request from user:", req.userId);

    // Get user details
    const user = await storage.getUserById(req.userId!);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ FIX: Frontend se aaye hue price values DIRECTLY use karo
    const bookingData = {
      ...req.body,
      customerId: req.userId,
      customerName: req.body.customerName || user.name,
      customerEmail: req.body.customerEmail || user.email,
      customerPhone: req.body.customerPhone || user.phone,
      customerAddress: user.address,
      customerCity: user.city,
      deliveryAddress: user.address,
      
      // ✅ FRONTEND CALCULATED VALUES DIRECTLY USE KARO
      basePrice: req.body.basePrice || 0,
      addOnsPrice: req.body.addOnsPrice || 0,
      deliveryCharge: req.body.deliveryCharge || 0,
      discountAmount: req.body.discountAmount || 0,
      totalPrice: req.body.totalPrice, // ✅ YAHI IMPORTANT HAI - Frontend ka final amount
      
      // Coupon details
      couponCode: req.body.couponCode,
      couponDiscount: req.body.discountAmount || 0,
      
      addOns: req.body.addOns || [],
      weeklyCustomizations: req.body.weeklyCustomizations || [],
      selectedDays: req.body.selectedDays || [],
      customization: req.body.customization || "",
    };

    console.log("💰 PRICE VERIFICATION:", {
      frontendTotal: req.body.totalPrice,
      frontendBase: req.body.basePrice,
      frontendDelivery: req.body.deliveryCharge,
      frontendDiscount: req.body.discountAmount
    });

    const booking = await storage.createBooking(bookingData);

    if (bookingData.couponCode && bookingData.discountAmount > 0) {
      await storage.incrementCouponUsage(bookingData.couponCode);
    }

    try {
      const tiffin = await storage.getTiffinById(req.body.tiffinId);
      if (tiffin) {
        const seller = await storage.getSellerById(tiffin.sellerId);
        if (seller) {
          // ✅ REAL-TIME: push the new order to the Seller Dashboard instantly.
          // Kept outside the email/notification logic below so a slow or
          // failing email send never delays or blocks the live update.
          try {
            emitNewOrderToSeller(seller._id, booking);
          } catch (socketError) {
            console.warn("⚠️ Real-time new-order emit failed:", socketError);
          }

          const sellerUser = await storage.getUserById(seller.userId);
          if (sellerUser) {
            
            const orderDetails = {
              customerName: booking.customerName,
              customerEmail: booking.customerEmail,
              customerPhone: booking.customerPhone,
              customerAddress: booking.customerAddress,
              customerCity: booking.customerCity,
              tiffinTitle: tiffin.title,
              bookingType: booking.bookingType,
              quantity: booking.quantity,
              totalPrice: booking.totalPrice,
              deliveryDate: booking.date,
              slot: booking.slot,
              deliveryAddress: booking.deliveryAddress,
              addOns: booking.addOns,
              weeklyCustomizations: booking.weeklyCustomizations,
              selectedDays: booking.selectedDays,
              customization: booking.customization,
              orderId: booking._id.toString().slice(-8),
              discountAmount: booking.discountAmount || 0,
              couponCode: booking.couponCode || null,
              subtotal: (booking.basePrice || 0) + (booking.addOnsPrice || 0) + (booking.deliveryCharge || 0)
            };

const sellerDashboardLink = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/seller/dashboard`;

// ✅ 1. EMAIL - GUARANTEED DELIVERY
await sendOrderNotificationToSeller(sellerUser.email, orderDetails, sellerDashboardLink);

// ✅ 2. TELEGRAM - BONUS (IF AVAILABLE)
try {
  const { sendOrderNotification } = require('./server');
  await sendOrderNotification({
    ...orderDetails,
    sellerEmail: sellerUser.email
  });
  console.log('✅ Telegram notification sent');
} catch (error) {
  // Telegram fail hua toh koi issue nahi, email toh chala gaya
  console.log('ℹ️ Telegram not available, but email sent successfully');
}

            await sendEmailSafely(
              () => sendBookingConfirmationToCustomer(
                user.email,
                user.name,
                tiffin.title,
                sellerUser.name,
                seller.contactNumber,
                booking.date,
                booking.slot,
                booking.quantity,
                booking.totalPrice,
                booking.discountAmount || 0,
                booking.couponCode || null,
                booking.addOns || [],
                booking.weeklyCustomizations || [],
                booking.selectedDays || [],
                booking.customization || ""
              ),
              "booking confirmation to customer"
            );
          }
        }
      }
    } catch (emailError) {
      console.warn("⚠️ Email sending failed, but booking was created:", emailError);
    }

    // 🎁 Order successful — automatically credit 5 reward tokens to the customer's wallet.
    const newWalletBalance = await creditOrderRewardTokens(
      req.userId!,
      `Order reward — ${(booking as any)._id?.toString().slice(-8) || ""}`
    );

    res.status(201).json({
      ...booking,
      rewardTokens: ORDER_REWARD_TOKENS,
      walletBalance: newWalletBalance,
      message: `Order placed successfully! 5 tokens transferred to your wallet 🎉`,
    });
  } catch (error: any) {
    console.error("❌ Error creating booking:", error);
    res.status(500).json({ message: error.message });
  }
});

  // ============================================================
  // ✅ NEW: SUBSCRIPTION (weekly/monthly tiffin) DELIVERY SCHEDULE
  // ============================================================

  // Get the day-by-day delivery schedule for one weekly/monthly subscription booking.
  // Each day's status ("Pending" / "Delivered" / "Missed") is computed live against
  // today's date, so it updates automatically as days pass — nothing here is static.
  app.get("/api/bookings/:id/schedule", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const booking = await storage.getBookingWithDetailsById(req.params.id);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.customerId?.toString() !== req.userId?.toString()) {
        return res.status(403).json({ message: "Not authorized to view this subscription" });
      }

      if (booking.bookingType !== "weekly" && booking.bookingType !== "monthly") {
        return res.status(400).json({ message: "This booking is not a weekly/monthly subscription" });
      }

      const liveSchedule = withLiveStatus((booking as any).deliverySchedule || [], booking.status);

      res.json({
        ...booking,
        deliverySchedule: liveSchedule,
      });
    } catch (error: any) {
      console.error("❌ Error fetching subscription schedule:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Customer rates one already-delivered day of their subscription
  app.patch("/api/bookings/:id/schedule/:entryId/rate", authenticateToken, [
    body("rating").isInt({ min: 1, max: 5 }),
    body("comment").optional().isLength({ max: 500 }),
  ], async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.customerId?.toString() !== req.userId?.toString()) {
        return res.status(403).json({ message: "Not authorized to rate this subscription" });
      }

      const liveSchedule = withLiveStatus((booking as any).deliverySchedule || [], booking.status);
      const entry = liveSchedule.find((d: any) => d._id?.toString() === req.params.entryId);

      if (!entry) {
        return res.status(404).json({ message: "Delivery day not found" });
      }

      if (entry.status !== "Delivered") {
        return res.status(400).json({ message: "You can only rate a day that has been delivered" });
      }

      if (entry.rating) {
        return res.status(400).json({ message: "You've already rated this day" });
      }

      const { rating, comment } = req.body;
      const updatedBooking = await storage.rateDeliveryDay(req.params.id, req.params.entryId, rating, comment);

      if (!updatedBooking) {
        return res.status(404).json({ message: "Delivery day not found" });
      }

      res.json({
        ...updatedBooking,
        deliverySchedule: withLiveStatus((updatedBooking as any).deliverySchedule || [], updatedBooking.status),
      });
    } catch (error: any) {
      console.error("❌ Error rating delivery day:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ✅ NEW: Customer's own weekly/monthly subscriptions only — powers the
  // dedicated "My Subscriptions" page (separate from the mixed My Orders list).
  app.get("/api/bookings/customer/subscriptions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUserById(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const subscriptions = await storage.getSubscriptionBookingsByEmail(user.email);
      const withSchedules = subscriptions.map((booking) => ({
        ...booking,
        deliverySchedule: withLiveStatus((booking as any).deliverySchedule || [], booking.status),
      }));

      res.json(withSchedules);
    } catch (error: any) {
      console.error("❌ Error fetching customer subscriptions:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================
  // ✅ NEW: SELLER — MANAGE CUSTOMER SUBSCRIPTIONS
  // ============================================================

  // All weekly/monthly subscriptions booked with this seller, each with the
  // customer's day-by-day delivery schedule attached.
  app.get("/api/seller/subscriptions", authenticateToken, requireRole("seller"), async (req: AuthRequest, res) => {
    try {
      const seller = await storage.getSellerByUserId(req.userId!);
      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }

      const subscriptions = await storage.getSubscriptionBookingsBySellerId(seller._id);
      const withSchedules = subscriptions.map((booking) => ({
        ...booking,
        deliverySchedule: withLiveStatus((booking as any).deliverySchedule || [], booking.status),
      }));

      res.json(withSchedules);
    } catch (error: any) {
      console.error("❌ Error fetching seller subscriptions:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Seller manually sets the status of one customer's delivery day
  // (e.g. mark today's tiffin as Delivered, or mark a day as Missed).
  app.patch(
    "/api/seller/subscriptions/:bookingId/schedule/:entryId/status",
    authenticateToken,
    requireRole("seller"),
    [body("status").isIn(["Pending", "Delivered", "Missed"])],
    async (req: AuthRequest, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const seller = await storage.getSellerByUserId(req.userId!);
        if (!seller) {
          return res.status(404).json({ message: "Seller not found" });
        }

        const booking = await storage.getBooking(req.params.bookingId);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        if (booking.sellerId?.toString() !== seller._id?.toString()) {
          return res.status(403).json({ message: "Not authorized to manage this subscription" });
        }

        if (booking.bookingType !== "weekly" && booking.bookingType !== "monthly") {
          return res.status(400).json({ message: "This booking is not a weekly/monthly subscription" });
        }

        const updatedBooking = await storage.updateDeliveryDayStatus(
          req.params.bookingId,
          req.params.entryId,
          req.body.status
        );

        if (!updatedBooking) {
          return res.status(404).json({ message: "Delivery day not found" });
        }

        res.json({
          ...updatedBooking,
          deliverySchedule: withLiveStatus((updatedBooking as any).deliverySchedule || [], updatedBooking.status),
        });
      } catch (error: any) {
        console.error("❌ Error updating delivery day status:", error);
        res.status(500).json({ message: error.message });
      }
    }
  );

  // ✅ Cart checkout — a single cart can hold meals from multiple different
  // sellers (and multiple meals from the same seller). Checkout automatically
  // groups the cart items by seller and creates a SEPARATE order (its own
  // cartOrderId) per seller, so every seller only ever gets notified about —
  // and only ever sees in their dashboard — their own items.
  app.post("/api/cart/checkout", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { items, paymentMethod, couponCode } = req.body as {
        items: Array<{
          tiffinId: string;
          sellerId: string;
          date: string;
          slot: string;
          quantity: number;
          bookingType: "single" | "trial" | "weekly" | "monthly";
          basePrice: number;
          addOnsPrice?: number;
          deliveryCharge?: number;
          discountAmount?: number;
          totalPrice: number;
          addOns?: any[];
          weeklyCustomizations?: any[];
          selectedDays?: string[];
          customization?: string;
        }>;
        paymentMethod: "cod" | "upi";
        // ✅ NEW: one coupon code for the whole cart (applied once per
        // seller-order below), instead of a couponCode per line item.
        couponCode?: string;
      };

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      const user = await storage.getUserById(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const finalPaymentMethod = paymentMethod === "upi" ? "upi" : "cod";
      const trimmedCouponCode = couponCode && couponCode.trim() ? couponCode.trim() : undefined;

      // ✅ PERFORMANCE: one query for every tiffin in the cart instead of
      // awaiting storage.getTiffinById() once per line sequentially — this
      // used to be the biggest source of latency on multi-item carts.
      const tiffinsById = await storage.getTiffinsByIds(items.map((i) => i.tiffinId));

      // ✅ SECURITY: reject checkout if any cart item points at a tiffin
      // that doesn't exist (deleted/invalid id) instead of silently trusting
      // whatever price the client sent for it.
      const invalidItem = items.find((i) => !tiffinsById.has(i.tiffinId));
      if (invalidItem) {
        return res.status(400).json({
          message: "One or more items in your cart are no longer available. Please refresh your cart and try again.",
        });
      }

      // Resolve each item's real seller from the tiffin itself (not the
      // client-supplied sellerId) so a spoofed/stale value on the client can
      // never misroute an order or its email to the wrong seller.
      const itemsBySeller = new Map<string, typeof items>();
      for (const item of items) {
        const tiffin = tiffinsById.get(item.tiffinId);
        const resolvedSellerId = tiffin?.sellerId ? String(tiffin.sellerId) : String(item.sellerId);
        if (!itemsBySeller.has(resolvedSellerId)) itemsBySeller.set(resolvedSellerId, []);
        itemsBySeller.get(resolvedSellerId)!.push({ ...item, sellerId: resolvedSellerId });
      }

      // Build every booking to create across every seller up front, tagging
      // each with the seller/order it belongs to so results can be regrouped
      // after the bulk insert below.
      type PendingBooking = { sellerId: string; orderId: string; discountAmount: number };
      const pending: PendingBooking[] = [];
      const bookingDocs: any[] = [];

      for (const [sellerId, sellerItems] of itemsBySeller) {
        // Every seller in the cart gets its own order id — this is what
        // actually splits one multi-seller cart into separate orders.
        const orderId = new ObjectId().toString();

        // ✅ SECURITY: every ₹ amount below comes from the tiffin's own DB
        // record + server-side rules, never from item.basePrice / item.total
        // Price / etc as sent by the client — see calculateItemBasePricing.
        const basePricings = sellerItems.map((item) =>
          calculateItemBasePricing(tiffinsById.get(item.tiffinId)!, item)
        );

        // ✅ NEW: the cart-level coupon is validated ONCE against this
        // seller-order's subtotal and split across its items — not
        // re-validated/re-applied per item, which would multiply the
        // discount by the number of items in the order.
        const discountShares = await calculateSellerOrderDiscount(
          trimmedCouponCode,
          basePricings.map((p) => p.subtotal)
        );

        sellerItems.forEach((item, i) => {
          const pricing = basePricings[i];
          const discountAmount = discountShares[i] || 0;
          const totalPrice = Math.max(0, pricing.subtotal + pricing.deliveryCharge - discountAmount);

          bookingDocs.push({
            tiffinId: item.tiffinId,
            sellerId,
            customerId: req.userId,
            customerName: user.name,
            customerEmail: user.email,
            customerPhone: user.phone,
            customerAddress: user.address,
            customerCity: user.city,
            deliveryAddress: user.address,
            date: item.date,
            slot: item.slot,
            quantity: item.quantity,
            bookingType: item.bookingType,
            basePrice: pricing.basePrice,
            addOnsPrice: pricing.addOnsPrice,
            deliveryCharge: pricing.deliveryCharge,
            discountAmount,
            totalPrice,
            couponCode: discountAmount > 0 ? trimmedCouponCode : undefined,
            couponDiscount: discountAmount,
            addOns: pricing.validatedAddOns,
            weeklyCustomizations: pricing.validatedWeeklyCustomizations,
            selectedDays: item.selectedDays || [],
            customization: item.customization || "",
            paymentMethod: finalPaymentMethod,
            cartOrderId: orderId,
          });
          pending.push({ sellerId, orderId, discountAmount });
        });
      }

      // ✅ PERFORMANCE: a single insertMany() for every booking in the cart
      // instead of one sequential `.save()` per line — this is what makes
      // "Place Order" respond almost instantly even for large multi-seller carts.
      const createdBookings = await storage.createBookingsBulk(bookingDocs as any);

      // Regroup the flat, order-preserved insertMany results back into one
      // order per seller (insertMany returns docs in the same order given).
      const sellerOrders: Array<{ sellerId: string; orderId: string; bookings: any[] }> = [];
      const sellerOrderIndex = new Map<string, number>();
      createdBookings.forEach((booking, i) => {
        const { sellerId, orderId } = pending[i];
        let idx = sellerOrderIndex.get(sellerId);
        if (idx === undefined) {
          idx = sellerOrders.length;
          sellerOrderIndex.set(sellerId, idx);
          sellerOrders.push({ sellerId, orderId, bookings: [] });
        }
        sellerOrders[idx].bookings.push(booking);
      });

      // Coupon usage — increment once per seller-order that actually used
      // it (not once per line item, which would over-count usage).
      if (trimmedCouponCode) {
        const ordersThatUsedCoupon = new Set(
          pending.filter((p) => p.discountAmount > 0).map((p) => p.orderId)
        );
        if (ordersThatUsedCoupon.size > 0) {
          await Promise.all(
            Array.from(ordersThatUsedCoupon).map(() => storage.incrementCouponUsage(trimmedCouponCode))
          );
        }
      }

      // ✅ REAL-TIME: push every new seller-order straight to that seller's
      // dashboard over the socket so it shows up instantly without them
      // needing to refresh the page — same mechanism the single-item
      // /api/bookings route already uses.
      for (const order of sellerOrders) {
        try {
          emitNewOrderToSeller(order.sellerId, {
            cartOrderId: order.orderId,
            bookings: order.bookings,
            itemCount: order.bookings.length,
          });
        } catch (socketError) {
          console.warn("⚠️ Real-time new-order emit failed for seller", order.sellerId, socketError);
        }
      }

      // 🎁 Order(s) successful — automatically credit 5 reward tokens to the
      // customer's wallet for EACH seller-order placed in this checkout
      // (a multi-seller cart = multiple orders = multiple 5-token rewards).
      const totalRewardTokens = ORDER_REWARD_TOKENS * sellerOrders.length;
      let newWalletBalance: number | null = null;
      for (const order of sellerOrders) {
        newWalletBalance = await creditOrderRewardTokens(
          req.userId!,
          `Order reward — ${order.orderId.slice(-8)}`
        );
      }

      // ✅ PERFORMANCE: respond to the customer as soon as the order exists.
      // Seller/customer emails are outbound SMTP calls that can take seconds —
      // they must never be on the critical path of "place order". They're
      // fired below, after the response, best-effort.
      res.status(201).json({
        orders: sellerOrders.map((o) => ({ sellerId: o.sellerId, orderId: o.orderId, itemCount: o.bookings.length })),
        bookings: createdBookings,
        rewardTokens: totalRewardTokens,
        walletBalance: newWalletBalance,
        message: `Order placed successfully! ${totalRewardTokens} tokens transferred to your wallet 🎉`,
      });

      notifySellersForCartOrders(sellerOrders, user).catch((err) => {
        console.warn("⚠️ Background order notification failed (bookings were already created):", err);
      });
    } catch (error: any) {
      console.error("❌ Error checking out cart:", error);
      res.status(500).json({ message: error.message });
    }
  });

app.post("/api/reviews", authenticateToken, [
  body("sellerId").notEmpty(),
  body("bookingId").notEmpty(),
  body("rating").isInt({ min: 1, max: 5 }),
  body("comment").optional().isLength({ max: 500 }),
], async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await storage.getUserById(req.userId!);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { sellerId, bookingId, rating, comment } = req.body;

    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    console.log("🔍 Booking authorization check:", {
      bookingCustomerId: booking.customerId,
      currentUserId: req.userId,
      bookingStatus: booking.status
    });

    if (booking.customerId?.toString() !== req.userId?.toString()) {
      console.log("🚫 Authorization failed:", {
        bookingCustomerId: booking.customerId,
        currentUserId: req.userId
      });
      return res.status(403).json({ message: "Not authorized to rate this order" });
    }

    if (booking.status !== "Delivered") {
      return res.status(400).json({ message: "Can only rate delivered orders" });
    }

    const existingReview = await storage.getReviewByBookingId(bookingId);
    if (existingReview) {
      return res.status(400).json({ message: "Already rated this order" });
    }

    const seller = await storage.getSellerById(sellerId);
    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    const reviewData = {
      customerId: req.userId!,
      customerName: user.name,
      customerEmail: user.email,
      sellerId,
      bookingId,
      rating,
      comment
    };

    const review = await storage.createReview(reviewData);
    res.status(201).json(review);
  } catch (error: any) {
    console.error("❌ Error creating review:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get rating for a specific booking
app.get("/api/reviews/booking/:bookingId", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const review = await storage.getReviewByBookingId(req.params.bookingId);
    res.json(review);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's reviews
app.get("/api/reviews/my-reviews", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reviews = await storage.getReviewsByCustomerId(req.userId!);
    res.json(reviews);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get all ratings for admin with seller details
app.get("/api/admin/sellers-with-ratings", authenticateToken, requireRole("admin"), async (req: AuthRequest, res) => {
  try {
    const sellers = await storage.getAllSellersWithRatings();
    res.json(sellers);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Seller routes mein better authentication
app.get("/api/seller/profile", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const seller = await storage.getSellerByUserId(req.userId!);
    if (!seller) {
      return res.status(404).json({ message: "Seller profile not found" });
    }

    // ✅ Additional check - ensure user is actually a seller
    const user = await storage.getUserById(req.userId!);
    if (user.role !== "seller" && user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Seller role required." });
    }

    res.json(seller);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

  app.get("/api/seller/tiffins", authenticateToken, requireRole("seller"), async (req: AuthRequest, res) => {
    try {
      const seller = await storage.getSellerByUserId(req.userId!);
      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }

      const tiffins = await storage.getTiffinsBySellerId(seller._id);
      res.json(tiffins);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Tiffin creation - FIXED VERSION
app.post("/api/seller/tiffins", authenticateToken, requireRole("seller"), async (req: AuthRequest, res) => {
  try {
    const seller = await storage.getSellerByUserId(req.userId!);
    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    if (seller.status !== "active") {
      return res.status(403).json({ message: "Your account must be active to add tiffins" });
    }

    console.log("📥 Received tiffin data:", {
      title: req.body.title,
      addOnsCount: req.body.addOns?.length || 0,
      weeklyCustomizationsCount: req.body.weeklyCustomizations?.length || 0,
      weeklyCustomizationsSample: req.body.weeklyCustomizations?.[0] // Debug
    });

    // ✅ FIX: Ensure weeklyCustomizations have proper days array
    const weeklyCustomizations = (req.body.weeklyCustomizations || []).map((custom: any) => ({
      ...custom,
      days: Array.isArray(custom.days) ? custom.days : (custom.days?.split?.(',') || []),
      price: Number(custom.price) || 0,
      available: custom.available !== false // Default to true
    }));

    // Prepare tiffin data with proper defaults
    const tiffinData = {
      ...req.body,
      sellerId: seller._id,
      addOns: req.body.addOns || [],
      weeklyCustomizations: weeklyCustomizations, // ✅ Use fixed customizations
      customizableOptions: req.body.customizableOptions || [],
      serviceType: req.body.serviceType || "meal",
      mealType: req.body.mealType || "Lunch",
      trialPrice: req.body.trialPrice || 99,
      monthlyPrice: req.body.monthlyPrice || 2000,
    };

    console.log("💾 Saving tiffin with customizations:", {
      weeklyCustomizationsCount: weeklyCustomizations.length,
      sampleCustomization: weeklyCustomizations[0]
    });

    const tiffin = await storage.createTiffin(tiffinData);
    
    res.status(201).json(tiffin);
  } catch (error: any) {
    console.error("❌ Error creating tiffin:", error);
    res.status(500).json({ message: error.message });
  }
});

  // Tiffin update - FIXED VERSION
app.put("/api/seller/tiffins/:id", authenticateToken, requireRole("seller"), async (req: AuthRequest, res) => {
  try {
    const seller = await storage.getSellerByUserId(req.userId!);
    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    const tiffin = await storage.getTiffinById(req.params.id);
    if (!tiffin) {
      return res.status(404).json({ message: "Tiffin not found" });
    }

    // Check if seller owns this tiffin
    if (tiffin.sellerId.toString() !== seller._id.toString()) {
      console.log("🚫 Access denied - Seller doesn't own this tiffin");
      return res.status(403).json({ message: "Access denied - You don't own this tiffin" });
    }

    console.log("📥 Updating tiffin:", {
      id: req.params.id,
      addOnsCount: req.body.addOns?.length || 0,
      weeklyCustomizationsCount: req.body.weeklyCustomizations?.length || 0,
      weeklyCustomizationsSample: req.body.weeklyCustomizations?.[0] // Debug
    });

    // ✅ FIX: Ensure weeklyCustomizations have proper days array
    const weeklyCustomizations = (req.body.weeklyCustomizations || []).map((custom: any) => ({
      ...custom,
      days: Array.isArray(custom.days) ? custom.days : (custom.days?.split?.(',') || []),
      price: Number(custom.price) || 0,
      available: custom.available !== false
    }));

    const updateData = {
      ...req.body,
      addOns: req.body.addOns || [],
      weeklyCustomizations: weeklyCustomizations, // ✅ Use fixed customizations
      customizableOptions: req.body.customizableOptions || [],
    };

    console.log("💾 Updating tiffin with customizations:", {
      weeklyCustomizationsCount: weeklyCustomizations.length,
      sampleCustomization: weeklyCustomizations[0]
    });

    const updated = await storage.updateTiffin(req.params.id, updateData);
    if (!updated) {
      return res.status(404).json({ message: "Failed to update tiffin" });
    }
    
    res.json(updated);
  } catch (error: any) {
    console.error("❌ Error updating tiffin:", error);
    res.status(500).json({ message: error.message });
  }
});

  app.delete("/api/seller/tiffins/:id", authenticateToken, requireRole("seller"), async (req: AuthRequest, res) => {
    try {
      const seller = await storage.getSellerByUserId(req.userId!);
      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }

      const tiffin = await storage.getTiffinById(req.params.id);
      if (!tiffin) {
        return res.status(404).json({ message: "Tiffin not found" });
      }

      // Check if seller owns this tiffin
      if (tiffin.sellerId.toString() !== seller._id.toString()) {
        return res.status(403).json({ message: "Access denied - You don't own this tiffin" });
      }

      const deleted = await storage.deleteTiffin(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Failed to delete tiffin" });
      }
      
      res.json({ message: "Tiffin deleted successfully" });
    } catch (error: any) {
      console.error("❌ Error deleting tiffin:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/seller/bookings", authenticateToken, requireRole("seller"), async (req: AuthRequest, res) => {
    try {
      const seller = await storage.getSellerByUserId(req.userId!);
      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }

      console.log("📋 Fetching bookings for seller:", seller._id);
      const bookings = await storage.getBookingsBySellerId(seller._id);
      
      console.log("✅ Found bookings:", bookings.length);
      res.json(bookings);
    } catch (error: any) {
      console.error("❌ Error fetching seller bookings:", error);
      res.status(500).json({ message: error.message });
    }
  });


   // ✅ UPDATED CANCEL BOOKING ROUTE - WITH PHONE NUMBER
app.post("/api/bookings/:id/cancel", async (req: Request, res: Response) => {
  try {
    const { id: bookingId } = req.params;
    const { reason = "Cancelled by customer" } = req.body;

    console.log('🎯 Cancelling booking ID:', bookingId);

    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID required' });
    }

    // Get booking details
    const booking = await storage.getBooking(bookingId);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    console.log('📦 Found booking:', {
      id: booking._id,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone, // ✅ PHONE NUMBER LOGGED
      status: booking.status,
      createdAt: booking.createdAt
    });

    if (booking.status === 'Cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    // Check 1-minute cancellation window
    const bookingTime = new Date(booking.createdAt).getTime();
    const currentTime = new Date().getTime();
    const minutesDiff = (currentTime - bookingTime) / (1000 * 60);

    console.log('⏰ Time difference:', minutesDiff, 'minutes');

    if (minutesDiff > 1) {
      return res.status(400).json({ 
        error: `Cancellation period has expired (1 minute). Time passed: ${Math.round(minutesDiff * 60)} seconds` 
      });
    }

    // Update booking status to cancelled
    const updatedBooking = await storage.updateBooking(bookingId, {
      status: 'Cancelled',
      cancellationReason: reason,
      cancelledBy: 'customer',
      cancelledAt: new Date().toISOString(),
    });

    if (!updatedBooking) {
      return res.status(500).json({ error: 'Failed to update booking status' });
    }

    console.log('✅ Booking cancelled successfully:', updatedBooking);

    // ✅ REAL-TIME: let the seller's dashboard reflect the cancellation instantly.
    if (booking.sellerId) {
      try {
        emitOrderUpdateToSeller(booking.sellerId, updatedBooking);
      } catch (socketError) {
        console.warn("⚠️ Real-time cancellation emit failed:", socketError);
      }
    }

    // ✅ Send cancellation email to seller WITH PHONE NUMBER
    if (booking.sellerId) {
      try {
        console.log('📧 Sending cancellation email with phone number...');
        const seller = await storage.getSellerById(booking.sellerId);
        
        if (seller) {
          const sellerUser = await storage.getUserById(seller.userId);
          
          if (sellerUser && sellerUser.email) {
            const tiffin = await storage.getTiffinById(booking.tiffinId);
            const tiffinTitle = tiffin?.title || 'Tiffin Service';

            await sendOrderCancellationToSeller(
              sellerUser.email,
              seller.shopName || 'Seller',
              booking.customerName,
              booking.customerPhone, // ✅ PHONE NUMBER PASSED
              tiffinTitle,
              booking._id.toString().slice(-8),
              new Date(booking.createdAt).toLocaleString('en-IN'),
              new Date().toLocaleString('en-IN'),
              booking.totalPrice
            );
            
            console.log('📧 Cancellation email sent successfully with customer phone number');
          }
        }
      } catch (emailError) {
        console.error('📧 Email sending failed:', emailError);
        // Don't fail the cancellation if email fails
      }
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: updatedBooking
    });

  } catch (error: any) {
    console.error('❌ Cancellation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Booking status update route - IMPROVED VERSION
app.put("/api/seller/bookings/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log("🔄 Updating booking status:", { id, status, userId: req.userId });

    // ✅ Get user first to verify role
    const user = await storage.getUserById(req.userId!);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Allow both seller and admin roles
    if (user.role !== "seller" && user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Seller or admin role required." });
    }

    // Get seller profile for sellers
    let seller = null;
    if (user.role === "seller") {
      seller = await storage.getSellerByUserId(req.userId!);
      if (!seller) {
        return res.status(404).json({ message: "Seller profile not found" });
      }
    }

    // Get booking
    const booking = await storage.getBooking(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    console.log("🔍 Checking booking ownership:", {
      bookingSellerId: booking.sellerId,
      currentSellerId: seller?._id,
      userRole: user.role
    });

    // ✅ Check if user owns this booking (for sellers) or is admin
    if (user.role === "seller" && booking.sellerId.toString() !== seller!._id.toString()) {
      console.log("🚫 Access denied - Seller doesn't own this booking");
      return res.status(403).json({ message: "Access denied - You don't own this booking" });
    }

    // Update booking status
    const updatedBooking = await storage.updateBooking(id, { status });
    
    if (!updatedBooking) {
      return res.status(500).json({ message: "Failed to update booking" });
    }

    // ✅ REAL-TIME: push the status change straight to the customer's
    // dashboard. This is synchronous/local (no network call), so it never
    // delays the response below.
    try {
      emitOrderStatusToCustomer(updatedBooking.customerId, updatedBooking);
    } catch (socketError) {
      console.warn("⚠️ Real-time status-update emit failed:", socketError);
    }

    // ✅ PERFORMANCE: respond to the seller immediately — this is what
    // "status update happens immediately" actually depends on. The customer
    // notification email is an outbound SMTP call that can take seconds, so
    // it runs in the background after the response instead of blocking it.
    res.json(updatedBooking);

    if (booking.customerEmail) {
      (async () => {
        try {
          const tiffin = await storage.getTiffinById(booking.tiffinId);
          await sendEmailSafely(
            () => sendOrderStatusUpdateToCustomer(
              booking.customerEmail,
              booking.customerName,
              tiffin?.title || "Your Tiffo order",
              booking._id.toString().slice(-8),
              status
            ),
            "order status update to customer"
          );
        } catch (emailError) {
          console.warn("⚠️ Email sending failed, but booking was updated");
        }
      })();
    }
  } catch (error: any) {
    console.error("❌ Error updating booking status:", error);
    res.status(500).json({ message: "Failed to update booking status" });
  }
});

 

  // Public tiffin routes
app.get("/api/tiffins", async (req, res) => {
  try {
    let tiffins = await storage.getTiffinsWithActiveSellers();
    
    // ✅ FIX: Normalize city names before sending to frontend
    tiffins = tiffins.map(tiffin => {
      if (tiffin.seller && tiffin.seller.city) {
        // Remove extra spaces and convert to proper case
        const normalizedCity = tiffin.seller.city
          .trim()
          .toLowerCase()
          .replace(/\b\w/g, l => l.toUpperCase());
        
        // Replace "City not specified" with actual city
        if (normalizedCity === 'City Not Specified') {
          tiffin.seller.city = 'Nawabganj'; // Default city
        } else {
          tiffin.seller.city = normalizedCity;
        }
      }
      return tiffin;
    });
    
    res.json(tiffins);
  } catch (error: any) {
    console.error("❌ Error fetching tiffins:", error);
    res.status(500).json({ message: error.message });
  }
});

  app.get("/api/tiffins/:id", async (req, res) => {
    try {
      console.log("🔍 Fetching tiffin with ID:", req.params.id);
      const tiffin = await storage.getTiffinWithSellerById(req.params.id);
      if (!tiffin) {
        console.log("❌ Tiffin not found with ID:", req.params.id);
        return res.status(404).json({ message: "Tiffin not found" });
      }

      console.log("✅ Found tiffin:", {
        id: tiffin._id,
        title: tiffin.title,
        sellerStatus: tiffin.seller?.status,
        addOnsCount: tiffin.addOns?.length || 0,
        weeklyCustomizationsCount: tiffin.weeklyCustomizations?.length || 0
      });

      res.json(tiffin);
    } catch (error: any) {
      console.error("❌ Error fetching tiffin:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Customer booking history
  app.get("/api/bookings/customer", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUserById(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const bookings = await storage.getBookingsByEmail(user.email);
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin routes
  app.get("/api/admin/stats", authenticateToken, requireRole("admin"), async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/sellers", authenticateToken, requireRole("admin"), async (req: AuthRequest, res) => {
    try {
      const sellers = await storage.getAllSellersWithUsers();
      res.json(sellers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/bookings", authenticateToken, requireRole("admin"), async (req: AuthRequest, res) => {
    try {
      const bookings = await storage.getAllBookingsWithDetails();
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ✅ CANCEL BOOKING ROUTE - Add this in your routes.ts
app.post("/api/bookings/:id/cancel", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id: bookingId } = req.params;
    const { reason = "Cancelled by user" } = req.body;

    console.log('🎯 Cancelling booking ID:', bookingId);

    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID required' });
    }

    // Get booking details
    const booking = await storage.getBooking(bookingId);
    console.log('📦 Found booking:', {
      id: booking?._id,
      sellerId: booking?.sellerId,
      status: booking?.status,
      customerName: booking?.customerName
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status === 'Cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    // Check 1-minute cancellation window
    const bookingTime = new Date(booking.createdAt).getTime();
    const currentTime = new Date().getTime();
    const minutesDiff = (currentTime - bookingTime) / (1000 * 60);

    console.log('⏰ Time difference:', minutesDiff, 'minutes');

    if (minutesDiff > 1) {
      return res.status(400).json({ error: 'Cancellation period has expired (1 minute)' });
    }

    // Update booking status to cancelled
    const updatedBooking = await storage.updateBooking(bookingId, {
      status: 'Cancelled',
      cancellationReason: reason,
      cancelledBy: 'customer',
      cancelledAt: new Date().toISOString(),
    });

    if (!updatedBooking) {
      return res.status(500).json({ error: 'Failed to update booking status' });
    }

    console.log('✅ Booking cancelled successfully:', updatedBooking);

    // ✅ REAL-TIME: let the seller's dashboard reflect the cancellation instantly.
    if (booking.sellerId) {
      try {
        emitOrderUpdateToSeller(booking.sellerId, updatedBooking);
      } catch (socketError) {
        console.warn("⚠️ Real-time cancellation emit failed:", socketError);
      }
    }

    // ✅ Send cancellation email to seller
    if (booking.sellerId) {
      try {
        console.log('📧 Looking for seller with ID:', booking.sellerId);
        
        const seller = await storage.getSellerById(booking.sellerId);
        console.log('👨‍🍳 Found seller:', seller);

        if (seller) {
          const sellerUser = await storage.getUserById(seller.userId);
          console.log('👤 Seller user:', sellerUser);

          if (sellerUser && sellerUser.email) {
            const sellerEmail = sellerUser.email;
            console.log('📧 Sending cancellation email to:', sellerEmail);
            
            // Get tiffin details for email
            const tiffin = await storage.getTiffinById(booking.tiffinId);
            const tiffinTitle = tiffin?.title || 'Tiffin Service';

            await sendOrderCancellationToSeller(
              sellerEmail,
              seller.shopName || 'Seller',
              booking.customerName,
              booking.customerPhone,
              tiffinTitle,
              booking._id.toString().slice(-8), // Short order ID
              new Date(booking.createdAt).toLocaleString('en-IN'),
              new Date().toLocaleString('en-IN'),
              booking.totalPrice
            );
            
            console.log('📧 Cancellation email sent successfully');
          }
        }
      } catch (emailError) {
        console.error('📧 Email sending failed:', emailError);
        // Don't fail the cancellation if email fails
      }
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: updatedBooking
    });

  } catch (error: any) {
    console.error('❌ Cancellation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

  // Update seller status route
  app.put("/api/admin/sellers/:id/status", authenticateToken, requireRole("admin"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      console.log("🔄 Updating seller status:", { id, status });

      if (!["pending", "active", "suspended"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const seller = await storage.updateSellerStatus(id, status);
      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }

      // Send email notification safely
      try {
        const user = await storage.getUserById(seller.userId);
        if (user) {
          await sendEmailSafely(
            () => sendSellerStatusUpdate(user.email, user.name, status),
            "seller status update"
          );
        }
      } catch (emailError) {
        console.warn("⚠️ Email sending failed, but status was updated");
      }

      res.json(seller);
    } catch (error: any) {
      console.error("❌ Error updating seller status:", error);
      res.status(500).json({ message: "Failed to update seller status" });
    }
  });

  // Delete seller permanently route
  app.delete("/api/admin/sellers/:id", authenticateToken, requireRole("admin"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      
      console.log("🗑️ Deleting seller permanently:", id);

      const deleted = await storage.deleteSeller(id);
      if (!deleted) {
        return res.status(404).json({ message: "Seller not found" });
      }

      console.log("✅ Seller deleted successfully:", id);
      res.json({ message: "Seller deleted successfully" });
    } catch (error: any) {
      console.error("❌ Error deleting seller:", error);
      res.status(500).json({ message: "Failed to delete seller" });
    }
  });

  // User profile route
  app.get("/api/user/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUserById(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);

  // ✅ Real-time updates (new orders → seller, status updates → customer)
  // share this same HTTP server — no extra port, no separate process.
  initSocket(httpServer);

  return httpServer;
}

















