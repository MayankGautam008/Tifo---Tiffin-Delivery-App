import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { IInvoice } from "../models/Invoice";

export async function generateInvoicePDFBuffer(invoice: IInvoice): Promise<Buffer> {
  // Generate QR Code image buffer for PDF embedding
  const appBaseUrl = process.env.APP_URL || "https://tifoindia.com";
  const verificationUrl = `${appBaseUrl}/invoice/verify/${invoice.qrVerificationToken}`;
  const qrCodeBuffer = await QRCode.toBuffer(verificationUrl, {
    margin: 1,
    width: 100,
    color: {
      dark: "#111827",
      light: "#FFFFFF"
    }
  });

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const PRIMARY_COLOR = "#b91c1c"; // Tifo accent red
      const TEXT_MAIN = "#111827";
      const TEXT_MUTED = "#6b7280";
      const BG_LIGHT = "#f9fafb";
      const BORDER_COLOR = "#e5e7eb";

      // 1. Header Banner
      doc
        .rect(40, 40, 515, 60)
        .fill(PRIMARY_COLOR);

      doc
        .fillColor("#FFFFFF")
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("TIFO", 55, 52);

      doc
        .fontSize(10)
        .font("Helvetica")
        .text("Fresh Homemade Meal Delivery", 55, 78);

      doc
        .fillColor("#FFFFFF")
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("TAX INVOICE", 400, 52, { align: "right" });

      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`# ${invoice.invoiceNumber}`, 400, 75, { align: "right" });

      doc.moveDown(3);

      // 2. Invoice Meta Bar
      let currentY = 115;
      doc
        .rect(40, currentY, 515, 30)
        .fill(BG_LIGHT)
        .strokeColor(BORDER_COLOR)
        .stroke();

      const formattedDate = new Date(invoice.issuedAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });

      doc
        .fillColor(TEXT_MUTED)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("ORDER ID:", 50, currentY + 10)
        .fillColor(TEXT_MAIN)
        .font("Helvetica")
        .text(invoice.orderId, 110, currentY + 10)

        .fillColor(TEXT_MUTED)
        .font("Helvetica-Bold")
        .text("DATE:", 220, currentY + 10)
        .fillColor(TEXT_MAIN)
        .font("Helvetica")
        .text(formattedDate, 260, currentY + 10)

        .fillColor(TEXT_MUTED)
        .font("Helvetica-Bold")
        .text("PAYMENT:", 370, currentY + 10)
        .fillColor(PRIMARY_COLOR)
        .font("Helvetica-Bold")
        .text(`${invoice.paymentMethod.toUpperCase()} (${invoice.paymentStatus})`, 430, currentY + 10);

      // 3. Seller (From) & Customer (To) Details
      currentY = 160;

      // Seller Column
      doc
        .fillColor(PRIMARY_COLOR)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("SELLER / KITCHEN DETAILS", 50, currentY);

      doc
        .fillColor(TEXT_MAIN)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(invoice.shopName, 50, currentY + 16)
        .font("Helvetica")
        .fontSize(9)
        .fillColor(TEXT_MUTED)
        .text(`Phone: ${invoice.sellerPhone}`, 50, currentY + 30)
        .text(`Address: ${invoice.sellerAddress}`, 50, currentY + 44, { width: 220 })
        .text(`City: ${invoice.sellerCity}`, 50, currentY + 70);

      // Customer Column
      doc
        .fillColor(PRIMARY_COLOR)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("CUSTOMER DETAILS", 300, currentY);

      doc
        .fillColor(TEXT_MAIN)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(invoice.customerName, 300, currentY + 16)
        .font("Helvetica")
        .fontSize(9)
        .fillColor(TEXT_MUTED)
        .text(`Email: ${invoice.customerEmail}`, 300, currentY + 30)
        .text(`Phone: ${invoice.customerPhone}`, 300, currentY + 44)
        .text(`Delivery Address: ${invoice.customerAddress}, ${invoice.customerCity}`, 300, currentY + 58, { width: 240 });

      // 4. Line Items Table Header
      currentY = 265;
      doc
        .rect(40, currentY, 515, 24)
        .fill(PRIMARY_COLOR);

      doc
        .fillColor("#FFFFFF")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("ITEM DESCRIPTION", 50, currentY + 7)
        .text("TYPE / SLOT", 240, currentY + 7)
        .text("QTY", 370, currentY + 7, { align: "center", width: 40 })
        .text("PRICE", 420, currentY + 7, { align: "right", width: 60 })
        .text("TOTAL", 490, currentY + 7, { align: "right", width: 55 });

      currentY += 24;

      // Primary Item Row
      doc
        .rect(40, currentY, 515, 28)
        .fill("#FFFFFF")
        .strokeColor(BORDER_COLOR)
        .stroke();

      const slotText = invoice.tiffinSlotType ? `${invoice.bookingType} (${invoice.tiffinSlotType})` : invoice.bookingType;

      doc
        .fillColor(TEXT_MAIN)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text(invoice.tiffinTitle, 50, currentY + 9)
        .font("Helvetica")
        .fillColor(TEXT_MUTED)
        .text(slotText, 240, currentY + 9)
        .text(String(invoice.quantity), 370, currentY + 9, { align: "center", width: 40 })
        .text(`Rs. ${invoice.pricingBreakdown.basePrice}`, 420, currentY + 9, { align: "right", width: 60 })
        .text(`Rs. ${invoice.pricingBreakdown.basePrice}`, 490, currentY + 9, { align: "right", width: 55 });

      currentY += 28;

      // Add-ons Rows (if any)
      if (invoice.addOns && invoice.addOns.length > 0) {
        invoice.addOns.forEach((addOn) => {
          doc
            .rect(40, currentY, 515, 24)
            .fill(BG_LIGHT)
            .strokeColor(BORDER_COLOR)
            .stroke();

          const addOnTotal = addOn.price * addOn.quantity;
          doc
            .fillColor(TEXT_MAIN)
            .fontSize(9)
            .font("Helvetica")
            .text(`Add-on: ${addOn.name}`, 60, currentY + 7)
            .text(`Rs. ${addOn.price}`, 420, currentY + 7, { align: "right", width: 60 })
            .text(String(addOn.quantity), 370, currentY + 7, { align: "center", width: 40 })
            .text(`Rs. ${addOnTotal}`, 490, currentY + 7, { align: "right", width: 55 });

          currentY += 24;
        });
      }

      // Weekly Customizations Rows (if any)
      if (invoice.weeklyCustomizations && invoice.weeklyCustomizations.length > 0) {
        invoice.weeklyCustomizations.forEach((custom) => {
          doc
            .rect(40, currentY, 515, 24)
            .fill(BG_LIGHT)
            .strokeColor(BORDER_COLOR)
            .stroke();

          const customCost = custom.price * (custom.days ? custom.days.length : 1);
          doc
            .fillColor(TEXT_MAIN)
            .fontSize(9)
            .font("Helvetica")
            .text(`Customization: ${custom.name} (${custom.days.join(", ")})`, 60, currentY + 7)
            .text(`Rs. ${custom.price}`, 420, currentY + 7, { align: "right", width: 60 })
            .text(String(custom.days.length), 370, currentY + 7, { align: "center", width: 40 })
            .text(`Rs. ${customCost}`, 490, currentY + 7, { align: "right", width: 55 });

          currentY += 24;
        });
      }

      currentY += 15;

      // 5. Summary Section & QR Code
      const summaryY = currentY;

      // Left Box: Special instructions & QR Code
      if (invoice.customization) {
        doc
          .fillColor(TEXT_MUTED)
          .fontSize(8)
          .font("Helvetica-Bold")
          .text("SPECIAL INSTRUCTIONS:", 50, summaryY);

        doc
          .fillColor(TEXT_MAIN)
          .fontSize(8)
          .font("Helvetica-Oblique")
          .text(`"${invoice.customization}"`, 50, summaryY + 12, { width: 240 });
      }

      // Embed QR Code for Invoice Verification
      doc.image(qrCodeBuffer, 50, summaryY + 40, { width: 75, height: 75 });
      doc
        .fillColor(TEXT_MUTED)
        .fontSize(7)
        .font("Helvetica")
        .text("Scan to verify invoice authenticity", 50, summaryY + 120);

      // Right Box: Price Breakdown Table
      const breakY = summaryY;
      const rightXLabel = 320;
      const rightXValue = 480;
      let rowY = breakY;

      const addRow = (label: string, value: string, isBold: boolean = false, isHighlight: boolean = false) => {
        if (isHighlight) {
          doc
            .rect(310, rowY - 2, 245, 22)
            .fill(BG_LIGHT)
            .strokeColor(PRIMARY_COLOR)
            .stroke();
        }

        doc
          .fillColor(isHighlight ? PRIMARY_COLOR : isBold ? TEXT_MAIN : TEXT_MUTED)
          .fontSize(isBold ? 10 : 9)
          .font(isBold ? "Helvetica-Bold" : "Helvetica")
          .text(label, rightXLabel, rowY + 3)
          .text(value, rightXValue, rowY + 3, { align: "right", width: 65 });

        rowY += 20;
      };

      addRow("Base Item Subtotal", `Rs. ${invoice.pricingBreakdown.subtotal - invoice.pricingBreakdown.deliveryCharge + invoice.pricingBreakdown.discountAmount}`);
      if (invoice.pricingBreakdown.addOnsTotal > 0) addRow("Add-ons Total", `+ Rs. ${invoice.pricingBreakdown.addOnsTotal}`);
      if (invoice.pricingBreakdown.customizationsTotal > 0) addRow("Customizations Total", `+ Rs. ${invoice.pricingBreakdown.customizationsTotal}`);
      addRow("Delivery Charge", `+ Rs. ${invoice.pricingBreakdown.deliveryCharge}`);
      if (invoice.pricingBreakdown.discountAmount > 0) {
        const discountLabel = `Discount ${invoice.pricingBreakdown.couponCode ? `(${invoice.pricingBreakdown.couponCode})` : ""}`;
        addRow(discountLabel, `- Rs. ${invoice.pricingBreakdown.discountAmount}`);
      }

      rowY += 5;
      addRow("GRAND TOTAL", `Rs. ${invoice.pricingBreakdown.totalPrice}`, true, true);

      // 6. Footer Policy & Disclaimer
      doc
        .lineCap("butt")
        .moveTo(40, 750)
        .lineTo(555, 750)
        .strokeColor(BORDER_COLOR)
        .stroke();

      doc
        .fillColor(TEXT_MUTED)
        .fontSize(8)
        .font("Helvetica")
        .text("This is a computer-generated tax invoice and requires no physical signature.", 40, 760, { align: "center", width: 515 })
        .text("Thank you for ordering with TIFO — Fresh Homemade Meal Delivery", 40, 772, { align: "center", width: 515 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
