/**
 * ADDRESS BOOK ROUTES
 * Saved delivery addresses for a customer — shown from the navbar profile
 * menu ("Manage Addresses") and picked at cart checkout. Supports ordering
 * for someone else by saving a different recipient name/phone on an address.
 *
 * Mounted inside registerRoutes() in routes.ts:
 *   import { registerAddressRoutes } from "./addressRoutes";
 *   registerAddressRoutes(app);
 */

import type { Express } from "express";
import { authenticateToken, type AuthRequest } from "./middleware/auth";
import { Address } from "./models/Address";

export function registerAddressRoutes(app: Express) {
  // ============================================================
  // 📍 GET all my saved addresses (default first)
  // ============================================================
  app.get("/api/addresses", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const addresses = await Address.find({ userId: req.userId }).sort({
        isDefault: -1,
        createdAt: -1,
      });
      res.json(addresses);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // 📍 ADD a new address
  // ============================================================
  app.post("/api/addresses", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { label, recipientName, recipientPhone, addressLine, city, isForSomeoneElse, isDefault } = req.body;

      if (!recipientName || !recipientPhone || !addressLine || !city) {
        return res.status(400).json({ message: "Recipient name, phone, address and city are required" });
      }

      const existingCount = await Address.countDocuments({ userId: req.userId });
      const makeDefault = isDefault === true || existingCount === 0; // first address is default automatically

      if (makeDefault) {
        await Address.updateMany({ userId: req.userId }, { $set: { isDefault: false } });
      }

      const address = await Address.create({
        userId: req.userId,
        label: label || "Home",
        recipientName,
        recipientPhone,
        addressLine,
        city,
        isForSomeoneElse: !!isForSomeoneElse,
        isDefault: makeDefault,
      });

      res.status(201).json(address);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // 📍 UPDATE an existing address
  // ============================================================
  app.put("/api/addresses/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { label, recipientName, recipientPhone, addressLine, city, isForSomeoneElse, isDefault } = req.body;

      const address = await Address.findOne({ _id: req.params.id, userId: req.userId });
      if (!address) {
        return res.status(404).json({ message: "Address not found" });
      }

      if (label !== undefined) address.label = label;
      if (recipientName !== undefined) address.recipientName = recipientName;
      if (recipientPhone !== undefined) address.recipientPhone = recipientPhone;
      if (addressLine !== undefined) address.addressLine = addressLine;
      if (city !== undefined) address.city = city;
      if (isForSomeoneElse !== undefined) address.isForSomeoneElse = !!isForSomeoneElse;

      if (isDefault === true) {
        await Address.updateMany({ userId: req.userId }, { $set: { isDefault: false } });
        address.isDefault = true;
      }

      await address.save();
      res.json(address);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // 📍 SET an address as default
  // ============================================================
  app.patch("/api/addresses/:id/default", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const address = await Address.findOne({ _id: req.params.id, userId: req.userId });
      if (!address) {
        return res.status(404).json({ message: "Address not found" });
      }

      await Address.updateMany({ userId: req.userId }, { $set: { isDefault: false } });
      address.isDefault = true;
      await address.save();

      res.json(address);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ============================================================
  // 📍 DELETE an address
  // ============================================================
  app.delete("/api/addresses/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const address = await Address.findOneAndDelete({ _id: req.params.id, userId: req.userId });
      if (!address) {
        return res.status(404).json({ message: "Address not found" });
      }

      // If we just deleted the default address, promote the most recent remaining one.
      if (address.isDefault) {
        const next = await Address.findOne({ userId: req.userId }).sort({ createdAt: -1 });
        if (next) {
          next.isDefault = true;
          await next.save();
        }
      }

      res.json({ message: "Address deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}
