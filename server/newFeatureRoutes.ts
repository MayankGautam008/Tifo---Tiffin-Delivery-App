/**
 * NEW FEATURE ROUTES
 * Add these routes inside registerRoutes() in routes.ts
 * Import at top of routes.ts:
 *   import { registerNewFeatureRoutes } from "./newFeatureRoutes";
 * Then call inside registerRoutes:
 *   registerNewFeatureRoutes(app);
 */

import type { Express } from "express";
import mongoose from "mongoose";
import { authenticateToken, requireRole, type AuthRequest } from "./middleware/auth";
import { Notification } from "./models/Notification";
import { Refund } from "./models/Refund";
import { Tiffin } from "./models/Tiffin";
import { Booking } from "./models/Booking";
import { Seller } from "./models/Seller";
import { User } from "./models/User";
import { Review } from "./models/Review";
import { earnPoints, redeemPoints, getLoyaltyInfo, getOrCreateAccount } from "./services/loyaltyService";
import { createNotification } from "./services/notificationService";

export function registerNewFeatureRoutes(app: Express) {

  // ============================================================
  // 🔔 NOTIFICATION ROUTES
  // ============================================================

  // Get my notifications
  app.get("/api/notifications", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const onlyUnread = req.query.unread === "true";

      const filter: any = { userId: req.userId };
      if (onlyUnread) filter.isRead = false;

      const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        Notification.countDocuments(filter),
        Notification.countDocuments({ userId: req.userId, isRead: false }),
      ]);

      res.json({ notifications, total, unreadCount, page, pages: Math.ceil(total / limit) });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Mark single notification as read
  app.patch("/api/notifications/:id/read", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const notif = await Notification.findOneAndUpdate(
        { _id: req.params.id, userId: req.userId },
        { isRead: true },
        { new: true }
      );
      if (!notif) return res.status(404).json({ message: "Notification not found" });
      res.json(notif);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Mark all notifications as read
  app.patch("/api/notifications/read-all", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const result = await Notification.updateMany(
        { userId: req.userId, isRead: false },
        { isRead: true }
      );
      res.json({ message: `${result.modifiedCount} notifications marked as read` });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Delete a notification
  app.delete("/api/notifications/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      await Notification.findOneAndDelete({ _id: req.params.id, userId: req.userId });
      res.json({ message: "Notification deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Get unread count only (lightweight poll)
  app.get("/api/notifications/unread-count", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const count = await Notification.countDocuments({ userId: req.userId, isRead: false });
      res.json({ count });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // ⭐ LOYALTY POINTS ROUTES
  // ============================================================

  // Get my loyalty info
  app.get("/api/loyalty", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const info = await getLoyaltyInfo(req.userId!);
      res.json(info);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Redeem points (called before checkout - returns discount amount)
  app.post("/api/loyalty/redeem", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { points } = req.body;
      if (!points || points <= 0) return res.status(400).json({ message: "Invalid points amount" });

      const result = await redeemPoints(req.userId!, points);
      if (!result.success) return res.status(400).json({ message: result.message });

      await createNotification(
        req.userId!,
        "loyalty_points",
        "Points Redeemed! 🎁",
        `You redeemed ${points} points for ₹${result.discountAmount} discount.`
      );

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Admin: Manually award bonus points to a user
  app.post("/api/admin/loyalty/bonus", authenticateToken, requireRole("admin"), async (req: AuthRequest, res) => {
    try {
      const { userId, points, reason } = req.body;
      if (!userId || !points || points <= 0) return res.status(400).json({ message: "userId and points required" });

      const account = await getOrCreateAccount(userId);
      account.availablePoints += points;
      account.totalPoints += points;
      account.lifetimeEarned += points;
      await account.save();

      await createNotification(userId, "loyalty_points", "Bonus Points! 🎉", reason || `Admin awarded ${points} bonus points.`);
      res.json({ message: `${points} bonus points awarded`, account });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // 🔍 ADVANCED SEARCH & FILTER
  // ============================================================

  app.get("/api/search/tiffins", async (req, res) => {
    try {
      const {
        q,
        city,
        category,
        minPrice,
        maxPrice,
        minRating,
        mealType,
        serviceType,
        dietary, // comma-separated tags
        availableDay,
        slot,
        sortBy = "rating", // rating | price_asc | price_desc | newest
        page = "1",
        limit = "12",
      } = req.query as Record<string, string>;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      // Build tiffin filter
      const tiffinFilter: any = {};
      if (q) tiffinFilter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
      if (category) tiffinFilter.category = category;
      if (mealType) tiffinFilter.mealType = mealType;
      if (serviceType) tiffinFilter.serviceType = serviceType;
      if (minPrice || maxPrice) {
        tiffinFilter.price = {};
        if (minPrice) tiffinFilter.price.$gte = Number(minPrice);
        if (maxPrice) tiffinFilter.price.$lte = Number(maxPrice);
      }
      if (dietary) {
        const tags = dietary.split(",").map(t => t.trim());
        tiffinFilter.dietaryTags = { $all: tags };
      }
      if (availableDay) tiffinFilter.availableDays = { $in: [availableDay] };
      if (slot) tiffinFilter.slots = { $in: [slot] };

      // Find active sellers filtered by city and rating
      const sellerFilter: any = { status: "active" };
      if (city) sellerFilter.city = { $regex: city, $options: "i" };
      if (minRating) sellerFilter["ratingStats.averageRating"] = { $gte: Number(minRating) };

      const activeSellers = await Seller.find(sellerFilter).select("_id ratingStats shopName city");
      const sellerIds = activeSellers.map(s => s._id);
      tiffinFilter.sellerId = { $in: sellerIds };

      // Build sort
      let sortOption: any = { createdAt: -1 };
      if (sortBy === "price_asc") sortOption = { price: 1 };
      else if (sortBy === "price_desc") sortOption = { price: -1 };
      else if (sortBy === "newest") sortOption = { createdAt: -1 };

      const [tiffins, total] = await Promise.all([
        Tiffin.find(tiffinFilter)
          .sort(sortOption)
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum),
        Tiffin.countDocuments(tiffinFilter),
      ]);

      // Attach seller info
      const sellerMap = new Map(activeSellers.map(s => [s._id.toString(), s]));
      const results = tiffins.map(t => {
        const obj = t.toObject() as any;
        obj.seller = sellerMap.get(obj.sellerId?.toString()) || null;
        return obj;
      });

      // Sort by rating if needed (after join)
      if (sortBy === "rating") {
        results.sort((a, b) => {
          const ra = a.seller?.ratingStats?.averageRating || 0;
          const rb = b.seller?.ratingStats?.averageRating || 0;
          return rb - ra;
        });
      }

      res.json({
        results,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        filters: { q, city, category, minPrice, maxPrice, minRating, mealType, sortBy },
      });
    } catch (err: any) {
      console.error("Search error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // Get available filter options (cities, categories etc)
  app.get("/api/search/filter-options", async (_req, res) => {
    try {
      const [cities, categories, mealTypes, slots] = await Promise.all([
        Seller.distinct("city", { status: "active" }),
        Tiffin.distinct("category"),
        Tiffin.distinct("mealType"),
        Tiffin.distinct("slots"),
      ]);

      const allSlots = Array.from(new Set((slots as string[][]).flat())).sort();

      res.json({
        cities: cities.sort(),
        categories,
        mealTypes,
        slots: allSlots,
        dietaryTags: ["Low-Calorie", "High-Protein", "Diabetic-Friendly", "Gluten-Free", "Low-Sodium", "Keto", "No-Onion-Garlic"],
        sortOptions: [
          { value: "rating", label: "Top Rated" },
          { value: "price_asc", label: "Price: Low to High" },
          { value: "price_desc", label: "Price: High to Low" },
          { value: "newest", label: "Newest First" },
        ],
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // 🏷️ DIETARY TAGS (on Tiffin)
  // ============================================================

  // Seller: Update dietary tags on their tiffin
  app.patch("/api/seller/tiffins/:id/dietary-tags", authenticateToken, requireRole("seller"), async (req: AuthRequest, res) => {
    try {
      const { tags } = req.body; // string[]
      if (!Array.isArray(tags)) return res.status(400).json({ message: "tags must be an array" });

      const allowedTags = ["Low-Calorie", "High-Protein", "Diabetic-Friendly", "Gluten-Free", "Low-Sodium", "Keto", "No-Onion-Garlic", "Jain", "Vegan"];
      const validTags = tags.filter(t => allowedTags.includes(t));

      const tiffin = await Tiffin.findByIdAndUpdate(
        req.params.id,
        { dietaryTags: validTags },
        { new: true }
      );
      if (!tiffin) return res.status(404).json({ message: "Tiffin not found" });
      res.json({ message: "Dietary tags updated", tiffin });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // 📊 ANALYTICS - ADMIN
  // ============================================================

  app.get("/api/admin/analytics/revenue", authenticateToken, requireRole("admin"), async (_req, res) => {
    try {
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Daily revenue for last 30 days
      const dailyRevenue = await Booking.aggregate([
        { $match: { createdAt: { $gte: last30Days }, status: { $ne: "Cancelled" } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$totalPrice" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Revenue by city
      const revenueByCity = await Booking.aggregate([
        { $match: { status: { $ne: "Cancelled" } } },
        {
          $group: {
            _id: "$customerCity",
            revenue: { $sum: "$totalPrice" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]);

      // Revenue by booking type
      const revenueByType = await Booking.aggregate([
        { $match: { status: { $ne: "Cancelled" } } },
        {
          $group: {
            _id: "$bookingType",
            revenue: { $sum: "$totalPrice" },
            orders: { $sum: 1 },
          },
        },
      ]);

      // Top 5 tiffins by revenue
      const topTiffins = await Booking.aggregate([
        { $match: { status: { $ne: "Cancelled" } } },
        { $group: { _id: "$tiffinId", revenue: { $sum: "$totalPrice" }, orders: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "tiffins",
            localField: "_id",
            foreignField: "_id",
            as: "tiffin",
          },
        },
        { $unwind: { path: "$tiffin", preserveNullAndEmptyArrays: true } },
      ]);

      // Weekly comparison
      const thisWeekRevenue = await Booking.aggregate([
        { $match: { createdAt: { $gte: last7Days }, status: { $ne: "Cancelled" } } },
        { $group: { _id: null, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } },
      ]);

      const prevWeekStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const prevWeekRevenue = await Booking.aggregate([
        { $match: { createdAt: { $gte: prevWeekStart, $lt: last7Days }, status: { $ne: "Cancelled" } } },
        { $group: { _id: null, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } },
      ]);

      res.json({
        dailyRevenue,
        revenueByCity,
        revenueByType,
        topTiffins,
        weeklyComparison: {
          thisWeek: thisWeekRevenue[0] || { total: 0, count: 0 },
          prevWeek: prevWeekRevenue[0] || { total: 0, count: 0 },
        },
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/analytics/overview", authenticateToken, requireRole("admin"), async (_req, res) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const [
        totalUsers,
        newUsersThisMonth,
        totalBookings,
        bookingsThisMonth,
        totalRevenue,
        revenueThisMonth,
        revenueLastMonth,
        totalSellers,
        activeSellers,
        pendingSellers,
        cancelledBookings,
        peakHours,
        cityStats,
        categoryStats,
      ] = await Promise.all([
        User.countDocuments({ role: "customer" }),
        User.countDocuments({ role: "customer", createdAt: { $gte: startOfMonth } }),
        Booking.countDocuments(),
        Booking.countDocuments({ createdAt: { $gte: startOfMonth } }),
        Booking.aggregate([{ $match: { status: { $ne: "Cancelled" } } }, { $group: { _id: null, total: { $sum: "$totalPrice" } } }]),
        Booking.aggregate([{ $match: { createdAt: { $gte: startOfMonth }, status: { $ne: "Cancelled" } } }, { $group: { _id: null, total: { $sum: "$totalPrice" } } }]),
        Booking.aggregate([{ $match: { createdAt: { $gte: startOfLastMonth, $lt: startOfMonth }, status: { $ne: "Cancelled" } } }, { $group: { _id: null, total: { $sum: "$totalPrice" } } }]),
        Seller.countDocuments(),
        Seller.countDocuments({ status: "active" }),
        Seller.countDocuments({ status: "pending" }),
        Booking.countDocuments({ status: "Cancelled" }),
        Booking.aggregate([
          { $group: { _id: { $hour: "$createdAt" }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]),
        Booking.aggregate([
          { $group: { _id: "$customerCity", count: { $sum: 1 }, revenue: { $sum: "$totalPrice" } } },
          { $sort: { count: -1 } },
          { $limit: 8 },
        ]),
        Tiffin.aggregate([
          { $group: { _id: "$category", count: { $sum: 1 } } },
        ]),
      ]);

      const thisMonthRev = revenueThisMonth[0]?.total || 0;
      const lastMonthRev = revenueLastMonth[0]?.total || 0;
      const revenueGrowth = lastMonthRev > 0 ? (((thisMonthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1) : "N/A";

      res.json({
        users: { total: totalUsers, newThisMonth: newUsersThisMonth },
        bookings: { total: totalBookings, thisMonth: bookingsThisMonth, cancelled: cancelledBookings },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          thisMonth: thisMonthRev,
          lastMonth: lastMonthRev,
          growthPercent: revenueGrowth,
        },
        sellers: { total: totalSellers, active: activeSellers, pending: pendingSellers },
        peakHours,
        cityStats,
        categoryStats,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // 📈 SELLER DASHBOARD STATS
  // ============================================================

  app.get("/api/seller/dashboard", authenticateToken, requireRole("seller"), async (req: AuthRequest, res) => {
    try {
      const seller = await Seller.findOne({ userId: req.userId });
      if (!seller) return res.status(404).json({ message: "Seller profile not found" });

      const sellerId = seller._id;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalOrders,
        ordersThisMonth,
        totalRevenue,
        revenueThisMonth,
        pendingOrders,
        confirmedOrders,
        cancelledOrders,
        deliveredOrders,
        topCustomers,
        recentBookings,
        dailyRevenue,
        tiffinPerformance,
      ] = await Promise.all([
        Booking.countDocuments({ sellerId }),
        Booking.countDocuments({ sellerId, createdAt: { $gte: startOfMonth } }),
        Booking.aggregate([{ $match: { sellerId, status: { $ne: "Cancelled" } } }, { $group: { _id: null, total: { $sum: "$totalPrice" } } }]),
        Booking.aggregate([{ $match: { sellerId, createdAt: { $gte: startOfMonth }, status: { $ne: "Cancelled" } } }, { $group: { _id: null, total: { $sum: "$totalPrice" } } }]),
        Booking.countDocuments({ sellerId, status: "Pending" }),
        Booking.countDocuments({ sellerId, status: "Confirmed" }),
        Booking.countDocuments({ sellerId, status: "Cancelled" }),
        Booking.countDocuments({ sellerId, status: "Delivered" }),
        Booking.aggregate([
          { $match: { sellerId, status: { $ne: "Cancelled" } } },
          { $group: { _id: "$customerEmail", name: { $first: "$customerName" }, orders: { $sum: 1 }, spent: { $sum: "$totalPrice" } } },
          { $sort: { spent: -1 } },
          { $limit: 5 },
        ]),
        Booking.find({ sellerId }).sort({ createdAt: -1 }).limit(10),
        Booking.aggregate([
          { $match: { sellerId, createdAt: { $gte: last7Days }, status: { $ne: "Cancelled" } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$totalPrice" }, orders: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        Booking.aggregate([
          { $match: { sellerId, status: { $ne: "Cancelled" } } },
          { $group: { _id: "$tiffinId", orders: { $sum: 1 }, revenue: { $sum: "$totalPrice" } } },
          { $sort: { orders: -1 } },
          { $limit: 5 },
          { $lookup: { from: "tiffins", localField: "_id", foreignField: "_id", as: "tiffin" } },
          { $unwind: { path: "$tiffin", preserveNullAndEmptyArrays: true } },
        ]),
      ]);

      res.json({
        seller: { shopName: seller.shopName, status: seller.status, ratingStats: seller.ratingStats, isTopRated: seller.isTopRated },
        orders: { total: totalOrders, thisMonth: ordersThisMonth, pending: pendingOrders, confirmed: confirmedOrders, cancelled: cancelledOrders, delivered: deliveredOrders },
        revenue: { total: totalRevenue[0]?.total || 0, thisMonth: revenueThisMonth[0]?.total || 0 },
        topCustomers,
        recentBookings,
        dailyRevenue,
        tiffinPerformance,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // 🔄 REFUND MANAGEMENT
  // ============================================================

  // Customer: Request refund
  app.post("/api/refunds", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { bookingId, reason, refundMethod = "original" } = req.body;
      if (!bookingId || !reason) return res.status(400).json({ message: "bookingId and reason required" });

      const booking = await Booking.findById(bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });
      if (booking.status !== "Cancelled") return res.status(400).json({ message: "Refund only allowed for cancelled bookings" });

      const existing = await Refund.findOne({ bookingId });
      if (existing) return res.status(400).json({ message: "Refund already requested for this booking" });

      const refund = await Refund.create({
        bookingId,
        customerId: req.userId,
        sellerId: booking.sellerId,
        amount: booking.totalPrice,
        reason,
        refundMethod,
      });

      await createNotification(req.userId!, "system", "Refund Requested 📋", `Refund of ₹${booking.totalPrice} is under review.`);

      res.status(201).json({ message: "Refund request submitted", refund });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Customer: My refunds
  app.get("/api/refunds/my", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const refunds = await Refund.find({ customerId: req.userId }).sort({ createdAt: -1 }).populate("bookingId", "totalPrice status createdAt");
      res.json(refunds);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Admin: All refunds
  app.get("/api/admin/refunds", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const { status } = req.query;
      const filter: any = {};
      if (status) filter.status = status;
      const refunds = await Refund.find(filter).sort({ createdAt: -1 }).populate("bookingId customerId", "totalPrice status name email");
      res.json(refunds);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Admin: Update refund status
  app.patch("/api/admin/refunds/:id", authenticateToken, requireRole("admin"), async (req: AuthRequest, res) => {
    try {
      const { status, adminNote } = req.body;
      const validStatuses = ["approved", "rejected", "processed"];
      if (!validStatuses.includes(status)) return res.status(400).json({ message: "Invalid status" });

      const refund = await Refund.findByIdAndUpdate(
        req.params.id,
        { status, adminNote, processedAt: new Date() },
        { new: true }
      );
      if (!refund) return res.status(404).json({ message: "Refund not found" });

      // Notify customer
      const msg = status === "approved"
        ? `Your refund of ₹${refund.amount} has been approved!`
        : status === "processed"
        ? `Your refund of ₹${refund.amount} has been processed.`
        : `Your refund request was rejected. ${adminNote || ""}`;

      await createNotification(refund.customerId.toString(), "system",
        `Refund ${status.charAt(0).toUpperCase() + status.slice(1)} 💰`, msg
      );

      res.json(refund);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // 🎁 LOYALTY AWARD on booking confirmed (hook)
  // POST /api/loyalty/award - called internally when order confirmed
  // ============================================================
  app.post("/api/loyalty/award", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { bookingId } = req.body;
      const booking = await Booking.findById(bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });
      if (booking.status !== "Confirmed" && booking.status !== "Delivered") {
        return res.status(400).json({ message: "Points awarded only for confirmed/delivered bookings" });
      }

      const customerId = booking.customerId?.toString();
      if (!customerId) return res.status(400).json({ message: "No customer ID on booking" });

      const points = await earnPoints(customerId, bookingId, booking.totalPrice);
      await createNotification(customerId, "loyalty_points", "Points Earned! 🌟", `You earned ${points} loyalty points for your order.`);

      res.json({ message: `${points} points awarded`, points });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // 📊 ADMIN: USER GROWTH
  // ============================================================
  app.get("/api/admin/analytics/user-growth", authenticateToken, requireRole("admin"), async (_req, res) => {
    try {
      const last6Months = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      const growth = await User.aggregate([
        { $match: { createdAt: { $gte: last6Months } } },
        { $group: { _id: { month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, role: "$role" }, count: { $sum: 1 } } },
        { $sort: { "_id.month": 1 } },
      ]);
      res.json(growth);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  console.log("✅ New feature routes registered: notifications, loyalty, search, analytics, seller dashboard, refunds");
}
