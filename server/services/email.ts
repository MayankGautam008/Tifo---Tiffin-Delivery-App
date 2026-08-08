import nodemailer from "nodemailer";

const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = process.env.EMAIL_PORT;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: parseInt(EMAIL_PORT || "587"),
  secure: false,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

export async function sendBookingConfirmationToCustomer(
  customerEmail: string,
  customerName: string,
  tiffinTitle: string,
  sellerName: string,
  sellerContact: string,
  date: string,
  slot: string,
  quantity: number,
  totalPrice: number
) {
  try {
    await transporter.sendMail({
      from: `"TiffinBox" <${EMAIL_USER}>`,
      to: customerEmail,
      subject: "Booking Confirmed - TiffinBox",
      html: `
        <h2>Booking Confirmation</h2>
        <p>Dear ${customerName},</p>
        <p>Your tiffin booking has been confirmed!</p>
        <h3>Booking Details:</h3>
        <ul>
          <li><strong>Tiffin:</strong> ${tiffinTitle}</li>
          <li><strong>Seller:</strong> ${sellerName}</li>
          <li><strong>Contact:</strong> ${sellerContact}</li>
          <li><strong>Date:</strong> ${date}</li>
          <li><strong>Time Slot:</strong> ${slot}</li>
          <li><strong>Quantity:</strong> ${quantity}</li>
          <li><strong>Total Amount:</strong> ₹${totalPrice}</li>
        </ul>
        <p>Thank you for choosing TiffinBox!</p>
      `,
    });
    console.log("✉️ Customer confirmation email sent");
  } catch (error) {
    console.error("Failed to send customer email:", error);
  }
}

export async function sendBookingNotificationToSeller(
  sellerEmail: string,
  sellerName: string,
  customerName: string,
  customerPhone: string,
  deliveryAddress: string,
  tiffinTitle: string,
  date: string,
  slot: string,
  quantity: number,
  totalPrice: number
) {
  try {
    await transporter.sendMail({
      from: `"TiffinBox" <${EMAIL_USER}>`,
      to: sellerEmail,
      subject: "New Booking Received - TiffinBox",
      html: `
        <h2>New Booking Alert</h2>
        <p>Dear ${sellerName},</p>
        <p>You have received a new tiffin booking!</p>
        <h3>Order Details:</h3>
        <ul>
          <li><strong>Tiffin:</strong> ${tiffinTitle}</li>
          <li><strong>Customer:</strong> ${customerName}</li>
          <li><strong>Phone:</strong> ${customerPhone}</li>
          <li><strong>Delivery Address:</strong> ${deliveryAddress}</li>
          <li><strong>Date:</strong> ${date}</li>
          <li><strong>Time Slot:</strong> ${slot}</li>
          <li><strong>Quantity:</strong> ${quantity}</li>
          <li><strong>Total Amount:</strong> ₹${totalPrice}</li>
        </ul>
        <p>Please prepare the order accordingly.</p>
      `,
    });
    console.log("✉️ Seller notification email sent");
  } catch (error) {
    console.error("Failed to send seller email:", error);
  }
}

export async function sendSellerStatusUpdate(
  sellerEmail: string,
  sellerName: string,
  status: string
) {
  try {
    const statusMessages = {
      active: "Your seller account has been approved! You can now start adding tiffin listings.",
      suspended: "Your seller account has been suspended. Please contact admin for more information.",
      pending: "Your seller account is pending approval.",
    };

    await transporter.sendMail({
      from: `"TiffinBox" <${EMAIL_USER}>`,
      to: sellerEmail,
      subject: `Account Status Update - TiffinBox`,
      html: `
        <h2>Account Status Update</h2>
        <p>Dear ${sellerName},</p>
        <p>${statusMessages[status as keyof typeof statusMessages]}</p>
        <p>Thank you for being part of TiffinBox!</p>
      `,
    });
    console.log("✉️ Seller status update email sent");
  } catch (error) {
    console.error("Failed to send status update email:", error);
  }
}









