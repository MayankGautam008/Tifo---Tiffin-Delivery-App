import { Router, Response } from "express";
import crypto from "crypto";
import { authenticateToken, AuthRequest } from "./middleware/auth";
import { Invoice } from "./models/Invoice";
import { Booking } from "./models/Booking";
import { Seller } from "./models/Seller";
import { Tiffin } from "./models/Tiffin";
import { User } from "./models/User";
import { generateInvoicePDFBuffer } from "./services/pdfService";
import { sendInvoiceEmailToBoth } from "./emailService";

const router = Router();

// ✅ Core Helper: Idempotent Invoice Generator
export async function generateOrCreateInvoiceForBooking(bookingId: string) {
  // 1. Check if invoice already exists
  const existingInvoice = await Invoice.findOne({ bookingId });
  if (existingInvoice) {
    return { invoice: existingInvoice, isNew: false };
  }

  // 2. Fetch Booking details
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.status === "Cancelled") {
    throw new Error("Cannot generate invoice for a cancelled booking");
  }

  // 3. Fetch Seller details
  const seller = await Seller.findById(booking.sellerId);
  const sellerUser = seller ? await User.findById(seller.userId) : null;

  // 4. Fetch Tiffin details for fallback title
  const tiffin = await Tiffin.findById(booking.tiffinId);
  const tiffinTitle = tiffin ? tiffin.title : "Tifo Fresh Meal";

  // 5. Calculate financial snapshot
  const basePrice = booking.basePrice || (tiffin ? tiffin.price * booking.quantity : booking.totalPrice);
  const addOnsTotal = booking.addOnsPrice || (booking.addOns ? booking.addOns.reduce((acc, a) => acc + (a.price * a.quantity), 0) : 0);
  const customizationsTotal = booking.weeklyCustomizations ? booking.weeklyCustomizations.reduce((acc, c) => acc + (c.price * (c.days ? c.days.length : 1)), 0) : 0;
  const deliveryCharge = booking.deliveryCharge || 19;
  const discountAmount = booking.discountAmount || 0;
  const subtotal = basePrice + addOnsTotal + customizationsTotal;
  const totalPrice = booking.totalPrice || (subtotal + deliveryCharge - discountAmount);

  const dateSuffix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomHex = crypto.randomBytes(2).toString("hex").toUpperCase();
  const invoiceNumber = `INV-${dateSuffix}-${randomHex}`;
  const qrVerificationToken = crypto.randomBytes(16).toString("hex");

  const paymentStatus = (booking.paymentMethod === "upi" || booking.status === "Delivered") ? "Paid" : "Pending (COD)";

  // 6. Create immutable Invoice Document
  const invoice = new Invoice({
    invoiceNumber,
    bookingId: (booking as any)._id,
    orderId: (booking as any)._id.toString().slice(-8),

    customerId: booking.customerId,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    customerAddress: booking.customerAddress || booking.deliveryAddress,
    customerCity: booking.customerCity || "Nawabganj",

    sellerId: booking.sellerId,
    shopName: seller?.shopName || "Tifo Kitchen Partner",
    sellerPhone: seller?.contactNumber || sellerUser?.phone || "N/A",
    sellerAddress: seller?.address || "Partner Address",
    sellerCity: seller?.city || booking.customerCity || "Nawabganj",

    tiffinTitle,
    bookingType: booking.bookingType,
    tiffinSlotType: booking.tiffinSlotType,
    quantity: booking.quantity,
    deliveryDate: booking.date,
    slot: booking.slot,

    addOns: booking.addOns || [],
    weeklyCustomizations: booking.weeklyCustomizations || [],
    selectedDays: booking.selectedDays || [],
    customization: booking.customization,

    pricingBreakdown: {
      basePrice,
      addOnsTotal,
      customizationsTotal,
      deliveryCharge,
      discountAmount,
      couponCode: booking.couponCode,
      subtotal,
      totalPrice
    },

    paymentMethod: booking.paymentMethod || "cod",
    paymentStatus,
    status: "issued",
    qrVerificationToken,
    issuedAt: new Date()
  });

  await invoice.save();

  // 7. Background PDF Email Dispatch
  (async () => {
    try {
      const pdfBuffer = await generateInvoicePDFBuffer(invoice);
      const sellerEmail = sellerUser?.email || invoice.customerEmail;
      await sendInvoiceEmailToBoth(invoice.customerEmail, sellerEmail, invoice, pdfBuffer);
    } catch (err: any) {
      console.warn("⚠️ Invoice background email dispatch error:", err.message);
    }
  })();

  return { invoice, isNew: true };
}

// GET /api/invoices/booking/:bookingId - Fetch or create invoice for booking
router.get("/booking/:bookingId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Ownership check: User must be customer, seller of order, or admin
    const user = await User.findById(req.userId);
    const seller = await Seller.findOne({ userId: req.userId });

    const isCustomer = user && (user.email.toLowerCase() === booking.customerEmail.toLowerCase() || booking.customerId.toString() === req.userId);
    const isSeller = seller && (seller._id as any).toString() === booking.sellerId.toString();
    const isAdmin = user && user.role === "admin";

    if (!isCustomer && !isSeller && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to view invoice for this order" });
    }

    if (booking.status === "Pending") {
      return res.status(400).json({ message: "Invoice will be generated once seller confirms the order" });
    }

    if (booking.status === "Cancelled") {
      return res.status(400).json({ message: "Invoice is not available for cancelled orders" });
    }

    const { invoice } = await generateOrCreateInvoiceForBooking(bookingId);
    return res.json(invoice);
  } catch (error: any) {
    console.error("❌ Error fetching invoice for booking:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch invoice" });
  }
});

// GET /api/invoices/:id/pdf - Download/Stream Invoice PDF
router.get("/:id/pdf", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Authorization check
    const user = await User.findById(req.userId);
    const seller = await Seller.findOne({ userId: req.userId });

    const isCustomer = user && (user.email.toLowerCase() === invoice.customerEmail.toLowerCase() || invoice.customerId.toString() === req.userId);
    const isSeller = seller && (seller._id as any).toString() === invoice.sellerId.toString();
    const isAdmin = user && user.role === "admin";

    if (!isCustomer && !isSeller && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to download this PDF" });
    }

    const pdfBuffer = await generateInvoicePDFBuffer(invoice);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Invoice_${invoice.invoiceNumber}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error: any) {
    console.error("❌ Error generating PDF:", error);
    return res.status(500).json({ message: "Failed to generate PDF" });
  }
});

// GET /api/invoices/verify/:token - Public Verification of QR Code
router.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const invoice = await Invoice.findOne({ qrVerificationToken: token });

    if (!invoice) {
      return res.status(404).json({ authentic: false, message: "Invalid or expired invoice token" });
    }

    return res.json({
      authentic: true,
      invoiceNumber: invoice.invoiceNumber,
      orderId: invoice.orderId,
      shopName: invoice.shopName,
      customerName: invoice.customerName,
      tiffinTitle: invoice.tiffinTitle,
      quantity: invoice.quantity,
      totalPrice: invoice.pricingBreakdown.totalPrice,
      paymentMethod: invoice.paymentMethod,
      paymentStatus: invoice.paymentStatus,
      issuedAt: invoice.issuedAt
    });
  } catch (error: any) {
    return res.status(500).json({ authentic: false, message: "Verification failed" });
  }
});

// GET /api/invoices/customer - List Customer Invoices
router.get("/customer/list", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const invoices = await Invoice.find({
      $or: [{ customerId: req.userId }, { customerEmail: user.email.toLowerCase() }]
    }).sort({ createdAt: -1 });

    return res.json(invoices);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch invoices" });
  }
});

// GET /api/invoices/seller - List Seller Invoices
router.get("/seller/list", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const seller = await Seller.findOne({ userId: req.userId });
    if (!seller) {
      return res.status(404).json({ message: "Seller profile not found" });
    }

    const invoices = await Invoice.find({ sellerId: (seller as any)._id }).sort({ createdAt: -1 });
    return res.json(invoices);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch seller invoices" });
  }
});

export default router;
