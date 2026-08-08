import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// ✅ FORCE ENVIRONMENT RELOAD
dotenv.config();

const BRAND_NAME = 'TifoIndia';
const BRAND_TAGLINE = 'Fresh Tiffin Delivery';
const ACCENT = '#b91c1c';

// ✅ ENVIRONMENT VARIABLES CHECK WITH DETAILED DEBUGGING
const checkEmailConfig = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  console.log('\n🔧 EMAIL CONFIGURATION CHECK:');
  console.log('   📧 EMAIL_USER:', emailUser ? `${emailUser.substring(0, 3)}...` : '❌ NOT FOUND');
  console.log('   🔐 EMAIL_PASS:', emailPass ? `✅ FOUND (${emailPass.length} chars)` : '❌ NOT FOUND');
  console.log('   📁 All ENV vars:', Object.keys(process.env).filter(key => key.includes('EMAIL')));

  return { emailUser, emailPass };
};

// ✅ Shared professional email shell — consistent header/footer across every
// transactional email, sober typography, minimal color, no emoji clutter.
function wrapEmail(bodyHtml: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;max-width:600px;">
        <tr>
          <td style="background:${ACCENT};padding:28px 32px;">
            <h1 style="margin:0;font-size:20px;color:#ffffff;letter-spacing:0.3px;">${BRAND_NAME}</h1>
            <p style="margin:4px 0 0;color:#fecaca;font-size:12px;">${BRAND_TAGLINE}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#1f2937;font-size:14px;line-height:1.6;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:18px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">This is an automated message from ${BRAND_NAME}. Please do not reply directly to this email.</p>
            <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">&copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function otpBlock(otp: string, validity: string): string {
  return `
<div style="text-align:center;margin:24px 0;padding:20px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
  <div style="font-size:30px;font-weight:bold;letter-spacing:4px;color:${ACCENT};">${otp}</div>
  <p style="margin:8px 0 0;color:#6b7280;font-size:12px;">Valid for ${validity}</p>
</div>`;
}

function sectionTable(title: string, rows: [string, string][]): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;">
  <tr style="background:#f9fafb;">
    <td colspan="2" style="padding:10px 14px;font-weight:bold;color:#111827;border-bottom:1px solid #e5e7eb;font-size:13px;">${title}</td>
  </tr>
  ${rows.map(([label, value]) => `
  <tr>
    <td style="padding:8px 14px;color:#6b7280;width:40%;font-size:13px;">${label}</td>
    <td style="padding:8px 14px;font-size:13px;">${value}</td>
  </tr>`).join('')}
</table>`;
}

// ✅ Brevo HTTP API transporter — uses HTTPS (port 443), which Render's free
// tier does NOT block (unlike SMTP ports 25/465/587, which Render blocks on
// free web services as of Sep 2025). Prefer this over raw SMTP when running
// on a free Render instance. Get the key from Brevo dashboard → SMTP & API →
// API Keys tab (NOT the SMTP key — this is a separate key).
function parseAddress(input: string): { email: string; name?: string } {
  const match = input.match(/^"?([^"<]*)"?\s*<(.+)>$/);
  if (match) {
    const name = match[1].trim();
    return { email: match[2].trim(), name: name || undefined };
  }
  return { email: input.trim() };
}

const createBrevoApiTransporter = () => {
  console.log('✅ USING BREVO HTTP API - Emails will be sent via api.brevo.com (works on Render free tier)');
  return {
    sendMail: async (mailOptions: any) => {
      const sender = parseAddress(mailOptions.from || process.env.EMAIL_FROM || `noreply@tifoindia.com`);
      const toList = (Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to])
        .filter(Boolean)
        .map((addr: string) => parseAddress(addr));

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY as string,
          'Content-Type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { email: sender.email, name: sender.name || BRAND_NAME },
          to: toList,
          subject: mailOptions.subject,
          htmlContent: mailOptions.html,
          textContent: mailOptions.text,
          attachment: mailOptions.attachments ? mailOptions.attachments.map((att: any) => ({
            content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
            name: att.filename
          })) : undefined
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Brevo API error (${response.status}): ${errorBody}`);
      }

      const data = await response.json();
      return { messageId: data.messageId, response: 'Sent via Brevo API' };
    },
    verify: (callback: any) => {
      if (!process.env.BREVO_API_KEY) {
        callback(new Error('BREVO_API_KEY not set'), false);
      } else {
        callback(null, true);
      }
    },
  };
};

// Email transporter setup
const createTransporter = () => {
  // ✅ Prefer the Brevo HTTP API whenever BREVO_API_KEY is set — this works
  // on Render's free tier, unlike SMTP which gets blocked outbound.
  if (process.env.BREVO_API_KEY) {
    return createBrevoApiTransporter();
  }

  const { emailUser, emailPass } = checkEmailConfig();

  if (!emailUser || !emailPass) {
    console.log('🚨 USING CONSOLE TRANSPORTER - Emails will NOT be sent');
    console.log('💡 TIP: Check .env file in project root and restart server');
    return createConsoleTransporter();
  }

  // ✅ Preferred: a real transactional SMTP relay (Brevo / Resend / SES / Mailgun etc.)
  if (process.env.EMAIL_HOST) {
    console.log(`✅ USING SMTP RELAY (${process.env.EMAIL_HOST}) - Emails will be sent via your configured provider`);
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      connectionTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  console.log('✅ USING GMAIL TRANSPORTER (fallback) - Emails will be sent via Gmail');
  console.log('⚠️  Gmail SMTP has no domain authentication of its own — expect some OTP mails to land in spam.');
  console.log('⚠️  Set EMAIL_HOST/EMAIL_PORT to a provider like Brevo/Resend/SES for reliable inbox delivery.');

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    socketTimeout: 10000
  });
};

// Console transporter for development
const createConsoleTransporter = () => {
  return {
    sendMail: (mailOptions: any) => {
      console.log('\n📧 ========== EMAIL NOTIFICATION (CONSOLE MODE) ==========');
      console.log('📧 FROM:', mailOptions.from);
      console.log('📧 TO:', mailOptions.to);
      console.log('📧 SUBJECT:', mailOptions.subject);
      console.log('📧 STATUS: Email would be sent in production');
      console.log('📧 ======================================================\n');
      return Promise.resolve({
        messageId: 'console-mock-id',
        response: 'Email logged to console'
      });
    },
    verify: (callback: any) => {
      callback(null, true);
    }
  };
};

// Initialize transporter
const transporter = createTransporter();

// Test email configuration
transporter.verify((error: any) => {
  if (error) {
    console.error('❌ Email transporter configuration error:', error);
  } else {
    console.log('✅ Email transporter is ready to send emails');
  }
});

// ✅ SAFE EMAIL SENDING WRAPPER
export const sendEmailSafely = async (emailFunction: () => Promise<any>, emailType: string) => {
  try {
    console.log(`📧 Attempting to send ${emailType}...`);
    const result = await emailFunction();
    console.log(`✅ ${emailType} sent successfully`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to send ${emailType}:`, error);
    return null;
  }
};

// ✅ TEST EMAIL FUNCTION
export async function testEmailSending(toEmail?: string) {
  try {
    const testEmail = toEmail || process.env.EMAIL_FROM;
    if (!testEmail) {
      console.log('❌ No email specified for test');
      return null;
    }

    console.log('🧪 Testing email sending to:', testEmail);

    const mailOptions = {
      from: process.env.EMAIL_FROM || `noreply@tifoindia.com`,
      to: testEmail,
      subject: `${BRAND_NAME} — Email Configuration Test`,
      html: wrapEmail(`
        <h2 style="color:#111827;margin:0 0 12px;font-size:18px;">Email configuration test successful</h2>
        <p style="color:#4b5563;margin:0 0 16px;">This confirms your transactional email setup is working correctly.</p>
        ${sectionTable('Test Details', [
        ['Server', `${BRAND_NAME} Backend`],
        ['Time', new Date().toLocaleString()],
        ['Status', 'Working'],
      ])}
      `),
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    return result;
  } catch (error) {
    console.error('❌ Test email failed:', error);
    return null;
  }
}

// Send OTP Email
export async function sendPasswordResetOTP(email: string, otp: string, userName: string): Promise<void> {
  try {
    console.log(`\n📧 SENDING OTP EMAIL TO: ${email}`);
    console.log(`🔢 OTP: ${otp}`);

    const mailOptions = {
      from: `"${BRAND_NAME}" <${process.env.EMAIL_FROM || `noreply@tifoindia.com`}>`,
      to: email,
      subject: `${BRAND_NAME} verification code`,
      text: `Hello ${userName},\n\nYour ${BRAND_NAME} password reset code is: ${otp}\n\nThis code is valid for 15 minutes. If you did not request this, you can ignore this email.\n\n- ${BRAND_NAME}`,
      html: wrapEmail(`
        <h2 style="color:#111827;margin:0 0 12px;font-size:18px;">Password reset code</h2>
        <p style="color:#4b5563;margin:0;">Hello <strong>${userName}</strong>,</p>
        <p style="color:#4b5563;margin:8px 0 0;">Use the code below to reset your password.</p>
        ${otpBlock(otp, '15 minutes')}
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">If you did not request this, you can safely ignore this email.</p>
      `),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully`);

  } catch (error: any) {
    console.error('❌ Email error:', error.message);
    console.log(`📋 OTP for manual use: ${otp}`);
  }
}

// ✅ Email verification OTP sent at signup
export async function sendSignupOTP(email: string, otp: string, userName: string): Promise<void> {
  try {
    console.log(`\n📧 SENDING SIGNUP VERIFICATION OTP TO: ${email}`);
    console.log(`🔢 OTP: ${otp}`);

    const mailOptions = {
      from: process.env.EMAIL_FROM || `noreply@tifoindia.com`,
      to: email,
      subject: `${BRAND_NAME} — Verify your email`,
      html: wrapEmail(`
        <h2 style="color:#111827;margin:0 0 12px;font-size:18px;">Verify your email</h2>
        <p style="color:#4b5563;margin:0;">Hello <strong>${userName}</strong>,</p>
        <p style="color:#4b5563;margin:8px 0 0;">Use the code below to verify your email and finish creating your account.</p>
        ${otpBlock(otp, '10 minutes')}
      `),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Signup OTP email sent successfully`);

  } catch (error: any) {
    console.error('❌ Email error:', error.message);
    console.log(`📋 Signup OTP for manual use: ${otp}`);
  }
}

// ✅ Send booking confirmation to customer - WITH ADD-ONS & CUSTOMIZATIONS
export async function sendBookingConfirmationToCustomer(
  customerEmail: string,
  customerName: string,
  tiffinTitle: string,
  sellerName: string,
  sellerPhone: string,
  deliveryDate: string,
  slot: string,
  quantity: number,
  totalPrice: number,
  discountAmount: number = 0,
  couponCode: string | null = null,
  addOns: any[] = [],
  weeklyCustomizations: any[] = [],
  selectedDays: string[] = [],
  customization: string = ""
): Promise<void> {
  try {
    const subtotal = totalPrice + discountAmount;
    const addOnsTotal = addOns.reduce((total, addOn) => total + (addOn.price * addOn.quantity), 0);
    const customizationsTotal = weeklyCustomizations.reduce((total, custom) => {
      const applicableDays = custom.days.filter((day: string) => selectedDays.includes(day));
      return total + (custom.price * applicableDays.length);
    }, 0);
    const basePrice = subtotal - addOnsTotal - customizationsTotal;

    const orderRows: [string, string][] = [
      ['Item', tiffinTitle],
      ['Seller', sellerName],
      ['Seller Contact', sellerPhone],
      ['Delivery Date', deliveryDate],
      ['Time Slot', slot],
      ['Quantity', String(quantity)],
    ];
    if (selectedDays && selectedDays.length > 0) {
      orderRows.push(['Selected Days', selectedDays.join(', ')]);
    }

    const addOnsHtml = addOns && addOns.length > 0 ? sectionTable(
      'Add-ons',
      [
        ...addOns.map((a: any): [string, string] => [`${a.name} x ${a.quantity}`, `Rs. ${a.price * a.quantity}`]),
        ['Add-ons Total', `Rs. ${addOnsTotal}`],
      ]
    ) : '';

    const customizationsHtml = weeklyCustomizations && weeklyCustomizations.length > 0 ? sectionTable(
      'Weekly Customizations',
      [
        ...weeklyCustomizations.map((custom: any): [string, string] => {
          const applicableDays = custom.days.filter((day: string) => selectedDays.includes(day));
          const totalCost = custom.price * applicableDays.length;
          return [`${custom.name} (${applicableDays.join(', ')})`, `Rs. ${totalCost}`];
        }),
        ['Customizations Total', `Rs. ${customizationsTotal}`],
      ]
    ) : '';

    const priceRows: [string, string][] = [['Base Price', `Rs. ${basePrice}`]];
    if (addOnsTotal > 0) priceRows.push(['Add-ons', `+ Rs. ${addOnsTotal}`]);
    if (customizationsTotal > 0) priceRows.push(['Customizations', `+ Rs. ${customizationsTotal}`]);
    if (discountAmount > 0) priceRows.push([`Discount${couponCode ? ` (${couponCode})` : ''}`, `- Rs. ${discountAmount}`]);
    priceRows.push(['Total Amount', `Rs. ${totalPrice}`]);

    const mailOptions = {
      from: `"${BRAND_NAME}" <${process.env.EMAIL_FROM || `noreply@tifoindia.com`}>`,
      to: customerEmail,
      subject: `Order confirmation — ${tiffinTitle}`,
      html: wrapEmail(`
        <h2 style="color:#111827;margin:0 0 6px;font-size:18px;">Your order is confirmed</h2>
        <p style="color:#4b5563;margin:0 0 20px;">Hello ${customerName}, thank you for your order. Your booking details are below.</p>
        ${sectionTable('Order Summary', orderRows)}
        ${addOnsHtml}
        ${customizationsHtml}
        ${customization ? `
        <div style="background:#f9fafb;padding:14px;border-radius:4px;border:1px solid #e5e7eb;margin-bottom:16px;">
          <div style="font-weight:bold;color:#111827;margin-bottom:4px;font-size:13px;">Special Instructions</div>
          <div style="color:#4b5563;font-style:italic;font-size:13px;">"${customization}"</div>
        </div>` : ''}
        ${sectionTable('Price Breakdown', priceRows)}
        <p style="color:#6b7280;font-size:12px;margin:0;">
          Your food will be prepared fresh and delivered on time. For any questions about this order, please contact the seller directly using the details above.
        </p>
      `),
    };

    await transporter.sendMail(mailOptions);
    console.log(`Booking confirmation sent to ${customerEmail}`);
  } catch (error) {
    console.error('Error sending booking confirmation:', error);
    throw new Error('Failed to send booking confirmation email');
  }
}

// ✅ Send order notification to seller - WITH ADD-ONS & CUSTOMIZATIONS
export async function sendOrderNotificationToSeller(
  sellerEmail: string,
  orderDetails: any,
  sellerDashboardLink: string
) {
  try {
    const {
      customerCity,
      customerName,
      customerEmail,
      customerPhone,
      tiffinTitle,
      bookingType,
      quantity,
      totalPrice,
      deliveryDate,
      slot,
      deliveryAddress,
      addOns = [],
      weeklyCustomizations = [],
      selectedDays = [],
      customization,
      orderId,
      discountAmount = 0,
      couponCode = null,
      subtotal = totalPrice + discountAmount
    } = orderDetails;

    const addOnsTotal = addOns.reduce((total: number, addOn: any) => total + (addOn.price * addOn.quantity), 0);
    const customizationsTotal = weeklyCustomizations.reduce((total: number, custom: any) => {
      const applicableDays = custom.days.filter((day: string) => selectedDays.includes(day));
      return total + (custom.price * applicableDays.length);
    }, 0);
    const basePrice = subtotal - addOnsTotal - customizationsTotal;

    const orderRows: [string, string][] = [
      ['Item', tiffinTitle],
      ['Type', bookingType],
      ['Quantity', String(quantity)],
      ['Delivery', `${deliveryDate} at ${slot}`],
    ];
    if (selectedDays && selectedDays.length > 0) {
      orderRows.push(['Selected Days', selectedDays.join(', ')]);
    }

    const customerRows: [string, string][] = [
      ['Name', customerName],
      ['Phone', customerPhone],
      ['Email', customerEmail],
      ['Address', `${deliveryAddress}, ${customerCity}`],
    ];

    const addOnsHtml = addOns && addOns.length > 0 ? sectionTable(
      'Add-ons Requested',
      addOns.map((a: any): [string, string] => [`${a.name} x ${a.quantity}`, `Rs. ${a.price * a.quantity}`])
    ) : '';

    const customizationsHtml = weeklyCustomizations && weeklyCustomizations.length > 0 ? sectionTable(
      'Customizations Requested',
      weeklyCustomizations.map((custom: any): [string, string] => {
        const applicableDays = custom.days.filter((day: string) => selectedDays.includes(day));
        const totalCost = custom.price * applicableDays.length;
        return [`${custom.name} (${applicableDays.join(', ')})`, `Rs. ${totalCost}`];
      })
    ) : '';

    const valueRows: [string, string][] = [['Base Price', `Rs. ${basePrice}`]];
    if (addOnsTotal > 0) valueRows.push(['Add-ons', `+ Rs. ${addOnsTotal}`]);
    if (customizationsTotal > 0) valueRows.push(['Customizations', `+ Rs. ${customizationsTotal}`]);
    valueRows.push(['Subtotal', `Rs. ${subtotal}`]);
    if (discountAmount > 0) valueRows.push([`Customer Discount${couponCode ? ` (${couponCode})` : ''}`, `- Rs. ${discountAmount}`]);
    valueRows.push(['Final Amount', `Rs. ${totalPrice}`]);

    const mailOptions = {
      from: `"${BRAND_NAME}" <${process.env.EMAIL_FROM || `noreply@tifoindia.com`}>`,
      to: sellerEmail,
      subject: `New order #${orderId} — ${tiffinTitle} — Rs. ${totalPrice}`,
      html: wrapEmail(`
        <h2 style="color:#111827;margin:0 0 6px;font-size:18px;">New order received</h2>
        <p style="color:#4b5563;margin:0 0 20px;">You have received a new order. Please review the details below and prepare accordingly.</p>
        ${sectionTable(`Order #${orderId}`, orderRows)}
        ${sectionTable('Customer Details', customerRows)}
        ${addOnsHtml}
        ${customizationsHtml}
        ${customization ? `
        <div style="background:#f9fafb;padding:14px;border-radius:4px;border:1px solid #e5e7eb;margin-bottom:16px;">
          <div style="font-weight:bold;color:#111827;margin-bottom:4px;font-size:13px;">Special Instructions</div>
          <div style="color:#4b5563;font-style:italic;font-size:13px;">"${customization}"</div>
        </div>` : ''}
        ${sectionTable('Order Value', valueRows)}
        <div style="margin-top:8px;">
          <a href="${sellerDashboardLink}" style="background:${ACCENT};color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;display:inline-block;font-size:14px;">
            Manage Order in Dashboard
          </a>
        </div>
      `),
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Order notification email sent successfully to:', sellerEmail);
    return result;
  } catch (error) {
    console.error('Email sending failed:', error);
    return null;
  }
}

// ✅ Admin email that gets a copy of every order placed on the platform —
// so the admin doesn't have to open the admin panel to know an order came
// in. Hardcoded to shashank.work777@gmail.com by default; can be overridden
// with the ADMIN_NOTIFICATION_EMAIL env var without touching code.
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'shashank.work777@gmail.com';

// ✅ Send a real-time "new order" notification to the admin inbox, with
// full seller info attached, whenever ANY seller on the platform gets an
// order. Fire-and-forget from the caller's side — never blocks or breaks
// the seller/customer flow if it fails.
export async function sendOrderNotificationToAdmin(
  orderDetails: any,
  sellerInfo: { shopName?: string; sellerName?: string; sellerEmail?: string; sellerPhone?: string; sellerCity?: string }
): Promise<void> {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      tiffinTitle,
      bookingType,
      quantity,
      totalPrice,
      deliveryDate,
      slot,
      deliveryAddress,
      orderId,
    } = orderDetails;

    const sellerRows: [string, string][] = [
      ['Shop Name', sellerInfo.shopName || 'N/A'],
      ['Seller Name', sellerInfo.sellerName || 'N/A'],
      ['Seller Email', sellerInfo.sellerEmail || 'N/A'],
      ['Seller Phone', sellerInfo.sellerPhone || 'N/A'],
      ['Seller City', sellerInfo.sellerCity || 'N/A'],
    ];

    const orderRows: [string, string][] = [
      ['Item', tiffinTitle],
      ['Type', bookingType],
      ['Quantity', String(quantity)],
      ['Delivery', `${deliveryDate} at ${slot}`],
      ['Delivery Address', deliveryAddress || 'N/A'],
      ['Total Amount', `Rs. ${totalPrice}`],
    ];

    const customerRows: [string, string][] = [
      ['Name', customerName],
      ['Email', customerEmail],
      ['Phone', customerPhone],
    ];

    const mailOptions = {
      from: `"${BRAND_NAME}" <${process.env.EMAIL_FROM || `noreply@tifoindia.com`}>`,
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: `New order #${orderId} — ${sellerInfo.shopName || 'Seller'} — Rs. ${totalPrice}`,
      html: wrapEmail(`
        <h2 style="color:#111827;margin:0 0 6px;font-size:18px;">New order placed on the platform</h2>
        <p style="color:#4b5563;margin:0 0 20px;">A new order was placed. Seller and order details are below — no need to check the admin panel.</p>
        ${sectionTable(`Order #${orderId}`, orderRows)}
        ${sectionTable('Seller', sellerRows)}
        ${sectionTable('Customer', customerRows)}
      `),
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Admin order notification sent to', ADMIN_NOTIFICATION_EMAIL, result?.messageId || '');
  } catch (error: any) {
    console.error('❌ Failed to send admin order notification:', error.message);
  }
}

// ✅ Send order cancellation notification to seller
export async function sendOrderCancellationToSeller(
  sellerEmail: string,
  sellerName: string,
  customerName: string,
  customerPhone: string,
  tiffinTitle: string,
  orderId: string,
  orderTime: string,
  cancellationTime: string,
  totalAmount: number
): Promise<void> {
  try {
    console.log(`📧 SENDING CANCELLATION NOTIFICATION TO SELLER: ${sellerEmail}`);

    const mailOptions = {
      from: process.env.EMAIL_FROM || `noreply@tifoindia.com`,
      to: sellerEmail,
      subject: `Order cancelled — ${tiffinTitle}`,
      html: wrapEmail(`
        <h2 style="color:#111827;margin:0 0 6px;font-size:18px;">Order cancelled</h2>
        <p style="color:#4b5563;margin:0 0 20px;">Hello ${sellerName}, the order below was cancelled by the customer.</p>
        ${sectionTable('Cancellation Details', [
        ['Order ID', orderId],
        ['Tiffin', tiffinTitle],
        ['Customer Name', customerName],
        ['Customer Phone', customerPhone],
        ['Order Time', orderTime],
        ['Cancellation Time', cancellationTime],
        ['Amount', `Rs. ${totalAmount}`],
        ['Reason', 'Cancelled by customer within the 1-minute cancellation window'],
      ])}
        <div style="background:#f0fdf4;padding:14px;border-radius:4px;border:1px solid #bbf7d0;margin-bottom:16px;">
          <p style="color:#166534;margin:0;font-size:13px;">
            This order was automatically cancelled by the system as per customer request. No action is required from your side.
          </p>
        </div>
        <p style="color:#6b7280;font-size:12px;margin:0;">You can contact the customer at ${customerPhone} if you need any clarification.</p>
      `),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Cancellation notification sent to seller ${sellerEmail}`);

  } catch (error: any) {
    console.error('❌ Email error:', error.message);
  }
}

// ✅ Send seller status update email
export async function sendSellerStatusUpdate(
  sellerEmail: string,
  sellerName: string,
  status: string
): Promise<void> {
  try {
    const statusMessages: { [key: string]: { subject: string; message: string } } = {
      active: {
        subject: `Your ${BRAND_NAME} seller account is now active`,
        message: 'Your seller account has been approved and is now active. You can start adding tiffins and receiving orders.'
      },
      suspended: {
        subject: `Your ${BRAND_NAME} seller account has been suspended`,
        message: 'Your seller account has been temporarily suspended. Please contact support for more information.'
      },
      pending: {
        subject: `Your ${BRAND_NAME} seller account is under review`,
        message: 'Your seller account application is currently under review. We will notify you once it is approved.'
      }
    };

    const statusInfo = statusMessages[status] || {
      subject: `Update on your ${BRAND_NAME} seller account`,
      message: `Your seller account status has been updated to: ${status}`
    };

    const mailOptions = {
      from: process.env.EMAIL_FROM || `noreply@tifoindia.com`,
      to: sellerEmail,
      subject: statusInfo.subject,
      html: wrapEmail(`
        <h2 style="color:#111827;margin:0 0 12px;font-size:18px;">Account status update</h2>
        <p style="color:#4b5563;margin:0;">Hello <strong>${sellerName}</strong>,</p>
        <p style="color:#4b5563;margin:8px 0 20px;">${statusInfo.message}</p>
        <div style="background:#fef2f2;padding:20px;border-radius:8px;border:1px solid #fecaca;margin-bottom:16px;text-align:center;">
          <div style="color:#6b7280;font-size:12px;margin-bottom:4px;">Current Status</div>
          <div style="font-size:20px;font-weight:bold;color:${ACCENT};">${status.toUpperCase()}</div>
        </div>
        ${status === 'active' ? `
        <div style="background:#f0fdf4;padding:14px;border-radius:4px;border:1px solid #bbf7d0;">
          <p style="color:#166534;margin:0 0 6px;font-size:13px;font-weight:bold;">Next steps</p>
          <p style="color:#166534;margin:2px 0;font-size:13px;">Add your tiffin items</p>
          <p style="color:#166534;margin:2px 0;font-size:13px;">Set your available time slots</p>
          <p style="color:#166534;margin:2px 0;font-size:13px;">Start receiving orders</p>
        </div>` : ''}
      `),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Seller status update sent to ${sellerEmail}`);
  } catch (error) {
    console.error('❌ Error sending seller status update:', error);
    throw new Error('Failed to send seller status email');
  }
}

// Send a simple order status update to the customer (e.g. Confirmed / Delivered)
export async function sendOrderStatusUpdateToCustomer(
  customerEmail: string,
  customerName: string,
  tiffinTitle: string,
  orderId: string,
  status: string
): Promise<void> {
  try {
    const mailOptions = {
      from: `"${BRAND_NAME}" <${process.env.EMAIL_FROM || `noreply@tifoindia.com`}>`,
      to: customerEmail,
      subject: `Order update — #${orderId} is now ${status}`,
      html: wrapEmail(`
        <h2 style="color:#111827;margin:0 0 6px;font-size:18px;">Order status updated</h2>
        <p style="color:#4b5563;margin:0 0 16px;">Hello ${customerName}, there is an update on your order.</p>
        ${sectionTable('Order', [
        ['Order', `#${orderId} - ${tiffinTitle}`],
        ['Status', status],
      ])}
      `),
    };

    await transporter.sendMail(mailOptions);
    console.log(`Order status update sent to ${customerEmail}`);
  } catch (error: any) {
    console.error('Error sending order status update:', error.message);
  }
}

// ✅ Send PDF invoice to both customer and seller automatically
export async function sendInvoiceEmailToBoth(
  customerEmail: string,
  sellerEmail: string,
  invoice: any,
  pdfBuffer: Buffer
): Promise<void> {
  try {
    const filename = `Invoice_${invoice.invoiceNumber}.pdf`;

    // 1. Send to Customer
    const customerMailOptions = {
      from: `"${BRAND_NAME}" <${process.env.EMAIL_FROM || `noreply@tifoindia.com`}>`,
      to: customerEmail,
      subject: `Invoice #${invoice.invoiceNumber} — ${invoice.tiffinTitle}`,
      html: wrapEmail(`
        <h2 style="color:#111827;margin:0 0 6px;font-size:18px;">Tax Invoice & Bill</h2>
        <p style="color:#4b5563;margin:0 0 16px;">Hello ${invoice.customerName}, your order has been confirmed! Please find your official invoice attached to this email.</p>
        ${sectionTable('Invoice Overview', [
        ['Invoice Number', invoice.invoiceNumber],
        ['Order ID', invoice.orderId],
        ['Item', invoice.tiffinTitle],
        ['Total Amount', `Rs. ${invoice.pricingBreakdown.totalPrice}`],
        ['Payment Method', `${invoice.paymentMethod.toUpperCase()} (${invoice.paymentStatus})`],
      ])}
        <p style="color:#6b7280;font-size:12px;margin:12px 0 0;">
          You can also view and download this invoice anytime from your <strong>My Bookings</strong> dashboard.
        </p>
      `),
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    await sendEmailSafely(
      () => transporter.sendMail(customerMailOptions),
      `invoice email to customer (${customerEmail})`
    );

    // 2. Send to Seller
    const sellerMailOptions = {
      from: `"${BRAND_NAME}" <${process.env.EMAIL_FROM || `noreply@tifoindia.com`}>`,
      to: sellerEmail,
      subject: `Order Bill #${invoice.invoiceNumber} — ${invoice.tiffinTitle}`,
      html: wrapEmail(`
        <h2 style="color:#111827;margin:0 0 6px;font-size:18px;">Order Bill Copy</h2>
        <p style="color:#4b5563;margin:0 0 16px;">Hello ${invoice.shopName}, order #${invoice.orderId} has been confirmed. The customer invoice copy is attached for your records and accounting.</p>
        ${sectionTable('Bill Summary', [
        ['Invoice Number', invoice.invoiceNumber],
        ['Customer', invoice.customerName],
        ['Phone', invoice.customerPhone],
        ['Total Amount', `Rs. ${invoice.pricingBreakdown.totalPrice}`],
        ['Payment Status', invoice.paymentStatus],
      ])}
      `),
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    await sendEmailSafely(
      () => transporter.sendMail(sellerMailOptions),
      `invoice bill email to seller (${sellerEmail})`
    );

    console.log(`✅ Invoice emails queued/sent for invoice #${invoice.invoiceNumber}`);
  } catch (error: any) {
    console.error('❌ Failed to process invoice emails:', error.message);
  }
}

export default {
  sendPasswordResetOTP,
  sendBookingConfirmationToCustomer,
  sendOrderNotificationToSeller,
  sendOrderNotificationToAdmin,
  sendOrderCancellationToSeller,
  sendOrderStatusUpdateToCustomer,
  sendSellerStatusUpdate,
  sendInvoiceEmailToBoth,
  sendEmailSafely,
  testEmailSending
};
