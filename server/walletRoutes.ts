/**
 * WALLET ROUTES
 * Customer wallet (money icon next to cart) + admin controls to
 * increase/decrease a customer's wallet balance and to create/activate
 * a coupon code that only shows up on that specific customer's wallet.
 *
 * Mounted inside registerRoutes() in routes.ts:
 *   import { registerWalletRoutes } from "./walletRoutes";
 *   registerWalletRoutes(app);
 */

import type { Express } from "express";
import { authenticateToken, requireRole, type AuthRequest } from "./middleware/auth";
import { User } from "./models/User";
import { WalletTransaction } from "./models/WalletTransaction";
import { WalletCoupon } from "./models/WalletCoupon";

export function registerWalletRoutes(app: Express) {
  // ============================================================
  // 💰 CUSTOMER: view my own wallet
  // ============================================================

  // GET /api/wallet -> balance + active/visible coupons + recent history
  app.get("/api/wallet", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await User.findById(req.userId).select("walletBalance name email");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only coupons the admin has ACTIVATED are visible to the customer.
      const coupons = await WalletCoupon.find({
        customerId: req.userId,
        isActive: true,
      }).sort({ createdAt: -1 });

      const transactions = await WalletTransaction.find({ customerId: req.userId })
        .sort({ createdAt: -1 })
        .limit(20);

      res.json({
        balance: user.walletBalance || 0,
        coupons,
        transactions,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================
  // 🛠️ ADMIN: manage every customer's wallet
  // ============================================================

  // GET /api/admin/wallet/customers -> list all customers + balances (search by name/email/phone)
  app.get(
    "/api/admin/wallet/customers",
    authenticateToken,
    requireRole("admin"),
    async (req: AuthRequest, res) => {
      try {
        const search = (req.query.search as string) || "";
        const filter: any = { role: "customer" };

        if (search.trim()) {
          const regex = new RegExp(search.trim(), "i");
          filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
        }

        const customers = await User.find(filter)
          .select("name email phone walletBalance createdAt")
          .sort({ createdAt: -1 });

        res.json(customers);
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    }
  );

  // GET /api/admin/wallet/:userId -> balance + coupons (all, active or not) + history for that customer
  app.get(
    "/api/admin/wallet/:userId",
    authenticateToken,
    requireRole("admin"),
    async (req: AuthRequest, res) => {
      try {
        const user = await User.findById(req.params.userId).select("name email phone walletBalance");
        if (!user || user == null) {
          return res.status(404).json({ message: "Customer not found" });
        }

        const coupons = await WalletCoupon.find({ customerId: req.params.userId }).sort({
          createdAt: -1,
        });
        const transactions = await WalletTransaction.find({ customerId: req.params.userId })
          .sort({ createdAt: -1 })
          .limit(50);

        res.json({ customer: user, coupons, transactions });
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    }
  );

  // PATCH /api/admin/wallet/:userId -> increase/decrease a customer's wallet balance
  // body: { type: "credit" | "debit", amount: number, reason?: string }
  app.patch(
    "/api/admin/wallet/:userId",
    authenticateToken,
    requireRole("admin"),
    async (req: AuthRequest, res) => {
      try {
        const { type, amount, reason } = req.body;

        if (type !== "credit" && type !== "debit") {
          return res.status(400).json({ message: "type must be 'credit' or 'debit'" });
        }
        const numericAmount = Number(amount);
        if (!numericAmount || numericAmount <= 0) {
          return res.status(400).json({ message: "amount must be a positive number" });
        }

        const user = await User.findById(req.params.userId);
        if (!user || user.role !== "customer") {
          return res.status(404).json({ message: "Customer not found" });
        }

        if (type === "debit" && (user.walletBalance || 0) < numericAmount) {
          return res.status(400).json({ message: "Insufficient wallet balance to deduct" });
        }

        user.walletBalance =
          type === "credit"
            ? (user.walletBalance || 0) + numericAmount
            : (user.walletBalance || 0) - numericAmount;

        await user.save();

        await WalletTransaction.create({
          customerId: user._id,
          type,
          amount: numericAmount,
          balanceAfter: user.walletBalance,
          reason: reason || "",
          createdBy: req.userId,
        });

        res.json({
          message: `Wallet ${type === "credit" ? "credited" : "debited"} successfully`,
          balance: user.walletBalance,
        });
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    }
  );

  // ============================================================
  // 🎟️ ADMIN: create / activate / deactivate a coupon on a customer's wallet
  // ============================================================

  // POST /api/admin/wallet/:userId/coupon -> create a coupon for this customer (hidden by default)
  app.post(
    "/api/admin/wallet/:userId/coupon",
    authenticateToken,
    requireRole("admin"),
    async (req: AuthRequest, res) => {
      try {
        const { code, description, discountType, discountValue, isActive } = req.body;

        if (!code || !discountValue) {
          return res.status(400).json({ message: "code and discountValue are required" });
        }

        const customer = await User.findById(req.params.userId);
        if (!customer || customer.role !== "customer") {
          return res.status(404).json({ message: "Customer not found" });
        }

        const coupon = await WalletCoupon.create({
          customerId: customer._id,
          code: String(code).toUpperCase().trim(),
          description: description || "",
          discountType: discountType === "percentage" ? "percentage" : "fixed",
          discountValue: Number(discountValue),
          isActive: !!isActive, // false = hidden until admin activates it
          createdBy: req.userId,
        });

        res.status(201).json(coupon);
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    }
  );

  // PATCH /api/admin/wallet/coupon/:couponId -> edit fields and/or toggle isActive (show/hide on wallet)
  app.patch(
    "/api/admin/wallet/coupon/:couponId",
    authenticateToken,
    requireRole("admin"),
    async (req: AuthRequest, res) => {
      try {
        const { code, description, discountType, discountValue, isActive } = req.body;
        const update: any = {};
        if (code !== undefined) update.code = String(code).toUpperCase().trim();
        if (description !== undefined) update.description = description;
        if (discountType !== undefined) update.discountType = discountType;
        if (discountValue !== undefined) update.discountValue = Number(discountValue);
        if (isActive !== undefined) update.isActive = !!isActive;

        const coupon = await WalletCoupon.findByIdAndUpdate(req.params.couponId, update, {
          new: true,
        });
        if (!coupon) {
          return res.status(404).json({ message: "Coupon not found" });
        }
        res.json(coupon);
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    }
  );

  // DELETE /api/admin/wallet/coupon/:couponId
  app.delete(
    "/api/admin/wallet/coupon/:couponId",
    authenticateToken,
    requireRole("admin"),
    async (req: AuthRequest, res) => {
      try {
        const deleted = await WalletCoupon.findByIdAndDelete(req.params.couponId);
        if (!deleted) {
          return res.status(404).json({ message: "Coupon not found" });
        }
        res.json({ message: "Coupon deleted successfully" });
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    }
  );
}
