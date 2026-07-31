import nodemailer from 'nodemailer';
import dotenv from 'dotenv';


// ✅ FORCE ENVIRONMENT RELOAD
dotenv.config();

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
      const sender = parseAddress(mailOptions.from || process.env.EMAIL_FROM || 'noreply@tiffo.com');
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
          sender: { email: sender.email, name: sender.name || 'Tiffo' },
          to: toList,
          subject: mailOptions.subject,
          htmlContent: mailOptions.html,
          textContent: mailOptions.text,
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
  // Set EMAIL_HOST + EMAIL_PORT in .env to use this path instead of raw Gmail.
  // This is what actually fixes inbox-vs-spam placement, because these providers
  // let you verify your own sending domain with SPF/DKIM/DMARC records.
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
transporter.verify((error) => {
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
      from: process.env.EMAIL_FROM || 'noreply@tiffo.com',
      to: testEmail,
      subject: 'Tiffo - Email Configuration Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #dc2626; border-radius: 10px; overflow: hidden;">
          <div style="background: #dc2626; padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Tiffo</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Fresh Food Delivery</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #dc2626; margin-bottom: 20px; text-align: center;">✅ Email Test Successful!</h2>
            
            <p style="color: #4b5563; line-height: 1.6; text-align: center;">
              Congratulations! Your email configuration is working correctly.
            </p>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border: 1px solid #fecaca; margin: 20px 0;">
              <h3 style="color: #dc2626; margin-top: 0; text-align: center;">Test Details</h3>
              <p style="text-align: center;"><strong>Server:</strong> Tiffo Backend</p>
              <p style="text-align: center;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              <p style="text-align: center;"><strong>Status:</strong> ✅ Working</p>
            </div>
          </div>
          
          <div style="background: #dc2626; padding: 20px; text-align: center; color: white; font-size: 14px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} Tiffo. All rights reserved.</p>
          </div>
        </div>
      `,
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
      from: `"Tiffo" <${process.env.EMAIL_FROM || 'noreply@tiffo.com'}>`,
      to: email,
      subject: 'Your Tiffo verification code',
      text: `Hello ${userName},\n\nYour Tiffo password reset code is: ${otp}\n\nThis code is valid for 15 minutes. If you did not request this, you can ignore this email.\n\n- Tiffo`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #dc2626; border-radius: 10px; overflow: hidden;">
          <div style="background: #dc2626; padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Tiffo</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Fresh Food Delivery</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #dc2626; margin-bottom: 20px; text-align: center;">Password Reset OTP</h2>
            
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Use this OTP to reset your password:</p>
            
            <div style="text-align: center; margin: 25px 0; padding: 20px; background: #fef2f2; border-radius: 8px;">
              <div style="font-size: 32px; font-weight: bold; color: #dc2626;">${otp}</div>
              <p style="color: #666; font-size: 14px;">Valid for 15 minutes</p>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">If you did not request this, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully`);
    
  } catch (error: any) {
    console.error('❌ Email error:', error.message);
    console.log(`📋 OTP for manual use: ${otp}`);
  }
}

// ✅ NEW: Email verification OTP sent at signup (FREE — same Gmail SMTP
// transporter used for password reset, no paid service involved).
export async function sendSignupOTP(email: string, otp: string, userName: string): Promise<void> {
  try {
    console.log(`\n📧 SENDING SIGNUP VERIFICATION OTP TO: ${email}`);
    console.log(`🔢 OTP: ${otp}`);

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@tiffo.com',
      to: email,
      subject: 'Tiffo - Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #dc2626; border-radius: 10px; overflow: hidden;">
          <div style="background: #dc2626; padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Tiffo</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Fresh Food Delivery</p>
          </div>

          <div style="padding: 30px; background: white;">
            <h2 style="color: #dc2626; margin-bottom: 20px; text-align: center;">Verify Your Email</h2>

            <p>Hello <strong>${userName}</strong>,</p>
            <p>Use this OTP to verify your email and finish creating your account:</p>

            <div style="text-align: center; margin: 25px 0; padding: 20px; background: #fef2f2; border-radius: 8px;">
              <div style="font-size: 32px; font-weight: bold; color: #dc2626;">${otp}</div>
              <p style="color: #666; font-size: 14px;">Valid for 10 minutes</p>
            </div>
          </div>
        </div>
      `,
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
    
    // Calculate add-ons total
    const addOnsTotal = addOns.reduce((total, addOn) => total + (addOn.price * addOn.quantity), 0);
    
    // Calculate customizations total
    const customizationsTotal = weeklyCustomizations.reduce((total, custom) => {
      const applicableDays = custom.days.filter((day: string) => selectedDays.includes(day));
      return total + (custom.price * applicableDays.length);
    }, 0);

    const basePrice = subtotal - addOnsTotal - customizationsTotal;

    const mailOptions = {
      from: `"Tiffo" <${process.env.EMAIL_FROM || 'noreply@tiffinservice.com'}>`,
      to: customerEmail,
      subject: `Order Confirmation - ${tiffinTitle}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; color: #1f2937;">
          <div style="background: #b91c1c; padding: 24px 30px; text-align: left;">
            <h1 style="margin: 0; font-size: 22px; color: #ffffff; letter-spacing: 0.5px;">Tiffo</h1>
            <p style="margin: 4px 0 0 0; color: #fecaca; font-size: 13px;">Fresh Food Delivery</p>
          </div>

          <div style="padding: 30px; background: #ffffff;">
            <h2 style="color: #111827; margin: 0 0 6px 0; font-size: 19px;">Your order is confirmed</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
              Hello ${customerName}, thank you for your order. Your booking details are below.
            </p>

            <!-- Order Summary -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden;">
              <tr style="background: #f9fafb;">
                <td colspan="2" style="padding: 10px 14px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; font-size: 14px;">Order Summary</td>
              </tr>
              <tr><td style="padding: 8px 14px; color: #6b7280; width: 40%;">Item</td><td style="padding: 8px 14px;">${tiffinTitle}</td></tr>
              <tr><td style="padding: 8px 14px; color: #6b7280;">Seller</td><td style="padding: 8px 14px;">${sellerName}</td></tr>
              <tr><td style="padding: 8px 14px; color: #6b7280;">Seller Contact</td><td style="padding: 8px 14px;">${sellerPhone}</td></tr>
              <tr><td style="padding: 8px 14px; color: #6b7280;">Delivery Date</td><td style="padding: 8px 14px;">${deliveryDate}</td></tr>
              <tr><td style="padding: 8px 14px; color: #6b7280;">Time Slot</td><td style="padding: 8px 14px;">${slot}</td></tr>
              <tr><td style="padding: 8px 14px; color: #6b7280;">Quantity</td><td style="padding: 8px 14px;">${quantity}</td></tr>
              ${selectedDays && selectedDays.length > 0 ? `
              <tr><td style="padding: 8px 14px; color: #6b7280;">Selected Days</td><td style="padding: 8px 14px;">${selectedDays.join(', ')}</td></tr>
              ` : ''}
            </table>

            ${addOns && addOns.length > 0 ? `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden;">
              <tr style="background: #f9fafb;">
                <td colspan="2" style="padding: 10px 14px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; font-size: 14px;">Add-ons</td>
              </tr>
              ${addOns.map(addOn => `
              <tr>
                <td style="padding: 8px 14px; color: #374151;">${addOn.name} x ${addOn.quantity}</td>
                <td style="padding: 8px 14px; text-align: right;">Rs. ${addOn.price * addOn.quantity}</td>
              </tr>
              `).join('')}
              <tr>
                <td style="padding: 8px 14px; font-weight: bold; border-top: 1px solid #e5e7eb;">Add-ons Total</td>
                <td style="padding: 8px 14px; text-align: right; font-weight: bold; border-top: 1px solid #e5e7eb;">Rs. ${addOnsTotal}</td>
              </tr>
            </table>
            ` : ''}

            ${weeklyCustomizations && weeklyCustomizations.length > 0 ? `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden;">
              <tr style="background: #f9fafb;">
                <td colspan="2" style="padding: 10px 14px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; font-size: 14px;">Weekly Customizations</td>
              </tr>
              ${weeklyCustomizations.map(custom => {
                const applicableDays = custom.days.filter((day: string) => selectedDays.includes(day));
                const totalCost = custom.price * applicableDays.length;
                return `
                <tr>
                  <td style="padding: 8px 14px; color: #374151;">
                    <div><strong>${custom.name}</strong></div>
                    <div style="font-size: 12px; color: #6b7280;">${custom.description} - Applied to: ${applicableDays.join(', ')}</div>
                  </td>
                  <td style="padding: 8px 14px; text-align: right; vertical-align: top;">Rs. ${totalCost}</td>
                </tr>
                `;
              }).join('')}
              <tr>
                <td style="padding: 8px 14px; font-weight: bold; border-top: 1px solid #e5e7eb;">Customizations Total</td>
                <td style="padding: 8px 14px; text-align: right; font-weight: bold; border-top: 1px solid #e5e7eb;">Rs. ${customizationsTotal}</td>
              </tr>
            </table>
            ` : ''}

            ${customization ? `
            <div style="background: #f9fafb; padding: 14px; border-radius: 4px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
              <div style="font-weight: bold; color: #111827; margin-bottom: 4px; font-size: 13px;">Special Instructions</div>
              <div style="color: #4b5563; font-style: italic; font-size: 14px;">"${customization}"</div>
            </div>
            ` : ''}

            <!-- Price Breakdown -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden;">
              <tr style="background: #f9fafb;">
                <td colspan="2" style="padding: 10px 14px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; font-size: 14px;">Price Breakdown</td>
              </tr>
              <tr><td style="padding: 8px 14px; color: #374151;">Base Price</td><td style="padding: 8px 14px; text-align: right;">Rs. ${basePrice}</td></tr>
              ${addOnsTotal > 0 ? `<tr><td style="padding: 8px 14px; color: #374151;">Add-ons</td><td style="padding: 8px 14px; text-align: right;">+ Rs. ${addOnsTotal}</td></tr>` : ''}
              ${customizationsTotal > 0 ? `<tr><td style="padding: 8px 14px; color: #374151;">Customizations</td><td style="padding: 8px 14px; text-align: right;">+ Rs. ${customizationsTotal}</td></tr>` : ''}
              ${discountAmount > 0 ? `<tr><td style="padding: 8px 14px; color: #374151;">Discount${couponCode ? ` (${couponCode})` : ''}</td><td style="padding: 8px 14px; text-align: right; color: #b91c1c;">- Rs. ${discountAmount}</td></tr>` : ''}
              <tr>
                <td style="padding: 12px 14px; font-weight: bold; font-size: 16px; border-top: 2px solid #111827;">Total Amount</td>
                <td style="padding: 12px 14px; text-align: right; font-weight: bold; font-size: 16px; border-top: 2px solid #111827; color: #b91c1c;">Rs. ${totalPrice}</td>
              </tr>
            </table>

            <p style="color: #6b7280; line-height: 1.6; font-size: 13px; margin: 0;">
              Your food will be prepared fresh and delivered on time. If you have any questions about this order, please contact the seller directly using the details above.
            </p>
          </div>

          <div style="background: #f9fafb; padding: 16px 30px; text-align: left; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0;">This is an automated message from Tiffo. Please do not reply directly to this email.</p>
            <p style="margin: 4px 0 0 0;">&copy; ${new Date().getFullYear()} Tiffo. All rights reserved.</p>
          </div>
        </div>
      `,
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
      customerAddress,
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

    // Calculate totals for seller email
    const addOnsTotal = addOns.reduce((total: number, addOn: any) => total + (addOn.price * addOn.quantity), 0);
    const customizationsTotal = weeklyCustomizations.reduce((total: number, custom: any) => {
      const applicableDays = custom.days.filter((day: string) => selectedDays.includes(day));
      return total + (custom.price * applicableDays.length);
    }, 0);
    const basePrice = subtotal - addOnsTotal - customizationsTotal;

    const mailOptions = {
      from: `"Tiffo" <${process.env.EMAIL_FROM || 'noreply@tiffinservice.com'}>`,
      to: sellerEmail,
      subject: `New Order #${orderId} - ${tiffinTitle} - Rs. ${totalPrice}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; color: #1f2937;">
          <!-- Header -->
          <div style="background: #b91c1c; padding: 24px 30px; text-align: left;">
            <h1 style="margin: 0; font-size: 22px; color: #ffffff; letter-spacing: 0.5px;">Tiffo</h1>
            <p style="margin: 4px 0 0 0; color: #fecaca; font-size: 13px;">Fresh Food Delivery</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px; background: #ffffff;">
            <h2 style="color: #111827; margin: 0 0 6px 0; font-size: 19px;">New order received</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
              You have received a new order. Please review the details below and prepare accordingly.
            </p>

            <!-- Order Summary -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden;">
              <tr style="background: #f9fafb;">
                <td colspan="2" style="padding: 10px 14px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; font-size: 14px;">Order #${orderId}</td>
              </tr>
              <tr><td style="padding: 8px 14px; color: #6b7280; width: 40%;">Item</td><td style="padding: 8px 14px;">${tiffinTitle}</td></tr>
              <tr><td style="padding: 8px 14px; color: #6b7280;">Type</td><td style="padding: 8px 14px;">${bookingType}</td></tr>
              <tr><td style="padding: 8px 14px; color: #6b7280;">Quantity</td><td style="padding: 8px 14px;">${quantity}</td></tr>
              <tr><td style="padding: 8px 14px; color: #6b7280;">Delivery</td><td style="padding: 8px 14px;">${deliveryDate} at ${slot}</td></tr>
              ${selectedDays && selectedDays.length > 0 ? `
              <tr><td style="padding: 8px 14px; color: #6b7280;">Selected Days</td><td style="padding: 8px 14px;">${selectedDays.join(', ')}</td></tr>
              ` : ''}
            </table>

            <!-- Customer Info -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden;">
              <tr style="background: #f9fafb;">
                <td colspan="2" style="padding: 10px 14px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; font-size: 14px;">Customer Details</td>
              </tr>
              <tr><td style="padding: 8px 14px; color: #6b7280; width: 40%;">Name</td><td style="padding: 8px 14px;">${customerName}</td></tr>
              <tr><td style="padding: 8px 14px; color: #6b7280;">Phone</td><td style="padding: 8px 14px;">${customerPhone}</td></tr>
              <tr><td style="padding: 8px 14px; color: #6b7280;">Email</td><td style="padding: 8px 14px;">${customerEmail}</td></tr>
              <tr><td style="padding: 8px 14px; color: #6b7280;">Address</td><td style="padding: 8px 14px;">${deliveryAddress}, ${customerCity}</td></tr>
            </table>

            ${addOns && addOns.length > 0 ? `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden;">
              <tr style="background: #f9fafb;">
                <td colspan="2" style="padding: 10px 14px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; font-size: 14px;">Add-ons Requested</td>
              </tr>
              ${addOns.map((addOn: any) => `
              <tr>
                <td style="padding: 8px 14px; color: #374151;">${addOn.name} x ${addOn.quantity}</td>
                <td style="padding: 8px 14px; text-align: right;">Rs. ${addOn.price * addOn.quantity}</td>
              </tr>
              `).join('')}
            </table>
            ` : ''}

            ${weeklyCustomizations && weeklyCustomizations.length > 0 ? `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden;">
              <tr style="background: #f9fafb;">
                <td colspan="2" style="padding: 10px 14px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; font-size: 14px;">Customizations Requested</td>
              </tr>
              ${weeklyCustomizations.map((custom: any) => {
                const applicableDays = custom.days.filter((day: string) => selectedDays.includes(day));
                const totalCost = custom.price * applicableDays.length;
                return `
                <tr>
                  <td style="padding: 8px 14px; color: #374151;">
                    <div><strong>${custom.name}</strong></div>
                    <div style="font-size: 12px; color: #6b7280;">${custom.description} - Days: ${applicableDays.join(', ')}</div>
                  </td>
                  <td style="padding: 8px 14px; text-align: right; vertical-align: top;">Rs. ${totalCost}</td>
                </tr>
                `;
              }).join('')}
            </table>
            ` : ''}

            ${customization ? `
            <div style="background: #f9fafb; padding: 14px; border-radius: 4px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
              <div style="font-weight: bold; color: #111827; margin-bottom: 4px; font-size: 13px;">Special Instructions</div>
              <div style="color: #4b5563; font-style: italic; font-size: 14px;">"${customization}"</div>
            </div>
            ` : ''}

            <!-- Price Breakdown for Seller -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden;">
              <tr style="background: #f9fafb;">
                <td colspan="2" style="padding: 10px 14px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; font-size: 14px;">Order Value</td>
              </tr>
              <tr><td style="padding: 8px 14px; color: #374151;">Base Price</td><td style="padding: 8px 14px; text-align: right;">Rs. ${basePrice}</td></tr>
              ${addOnsTotal > 0 ? `<tr><td style="padding: 8px 14px; color: #374151;">Add-ons</td><td style="padding: 8px 14px; text-align: right;">+ Rs. ${addOnsTotal}</td></tr>` : ''}
              ${customizationsTotal > 0 ? `<tr><td style="padding: 8px 14px; color: #374151;">Customizations</td><td style="padding: 8px 14px; text-align: right;">+ Rs. ${customizationsTotal}</td></tr>` : ''}
              <tr><td style="padding: 8px 14px; font-weight: bold; border-top: 1px dashed #e5e7eb;">Subtotal</td><td style="padding: 8px 14px; text-align: right; font-weight: bold; border-top: 1px dashed #e5e7eb;">Rs. ${subtotal}</td></tr>
              ${discountAmount > 0 ? `<tr><td style="padding: 8px 14px; color: #374151;">Customer Discount${couponCode ? ` (${couponCode})` : ''}</td><td style="padding: 8px 14px; text-align: right; color: #b91c1c;">- Rs. ${discountAmount}</td></tr>` : ''}
              <tr>
                <td style="padding: 12px 14px; font-weight: bold; font-size: 16px; border-top: 2px solid #111827;">Final Amount</td>
                <td style="padding: 12px 14px; text-align: right; font-weight: bold; font-size: 16px; border-top: 2px solid #111827; color: #b91c1c;">Rs. ${totalPrice}</td>
              </tr>
            </table>

            <!-- CTA Button -->
            <div style="text-align: left; margin: 10px 0 0 0;">
              <a href="${sellerDashboardLink}" style="background: #b91c1c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-size: 14px;">
                Manage Order in Dashboard
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f9fafb; padding: 16px 30px; text-align: left; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0;">This is an automated message from Tiffo. Please do not reply directly to this email.</p>
            <p style="margin: 4px 0 0 0;">&copy; ${new Date().getFullYear()} Tiffo. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Order notification email sent successfully to:', sellerEmail);
    return result;
  } catch (error) {
    console.error('Email sending failed:', error);
    return null;
  }
}

// ✅ UPDATED: Send order cancellation notification to seller WITH PHONE NUMBER
export async function sendOrderCancellationToSeller(
  sellerEmail: string,
  sellerName: string,
  customerName: string,
  customerPhone: string, // ✅ PHONE NUMBER ADDED
  tiffinTitle: string,
  orderId: string,
  orderTime: string,
  cancellationTime: string,
  totalAmount: number
): Promise<void> {
  try {
    console.log(`📧 SENDING CANCELLATION NOTIFICATION TO SELLER: ${sellerEmail}`);

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@tiffo.com',
      to: sellerEmail,
      subject: `❌ Order Cancelled - ${tiffinTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #dc2626; border-radius: 10px; overflow: hidden;">
          <div style="background: #dc2626; padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Tiffo</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Fresh Food Delivery</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #dc2626; margin-bottom: 20px; text-align: center;">Order Cancelled 😔</h2>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border: 1px solid #fecaca; margin: 20px 0;">
              <h3 style="color: #dc2626; margin-top: 0; text-align: center;">Cancellation Details</h3>
              <p><strong>Order ID:</strong> ${orderId}</p>
              <p><strong>Tiffin:</strong> ${tiffinTitle}</p>
              <p><strong>Customer Name:</strong> ${customerName}</p>
              <p><strong>Customer Phone:</strong> ${customerPhone}</p> <!-- ✅ PHONE NUMBER ADDED -->
              <p><strong>Order Time:</strong> ${orderTime}</p>
              <p><strong>Cancellation Time:</strong> ${cancellationTime}</p>
              <p><strong>Amount:</strong> ₹${totalAmount}</p>
              <p><strong>Reason:</strong> Cancelled by user within 1-minute window</p>
            </div>

            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0; margin: 15px 0;">
              <h4 style="color: #166534; margin-top: 0;">💡 Note</h4>
              <p style="color: #166534; margin: 0;">
                This order was automatically cancelled by the system as per customer request within the 1-minute cancellation period.
                No action is required from your side.
              </p>
            </div>

            <!-- ✅ CUSTOMER CONTACT INFO -->
            <div style="background: #dbeafe; padding: 15px; border-radius: 8px; border: 1px solid #93c5fd; margin: 15px 0;">
              <h4 style="color: #1e40af; margin-top: 0;">📞 Customer Contact Information</h4>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${customerName}</p>
              <p style="margin: 5px 0;"><strong>Phone:</strong> ${customerPhone}</p>
              <p style="margin: 5px 0; font-size: 12px; color: #4b5563;">
                You can contact the customer if needed for any clarification.
              </p>
            </div>
          </div>
          
          <div style="background: #dc2626; padding: 20px; text-align: center; color: white; font-size: 14px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} Tiffo. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Cancellation notification sent to seller ${sellerEmail}`);
    
  } catch (error: any) {
    console.error('❌ Email error:', error.message);
  }
}

// ✅ Send seller status update email - RED & WHITE THEME
export async function sendSellerStatusUpdate(
  sellerEmail: string,
  sellerName: string,
  status: string
): Promise<void> {
  try {
    const statusMessages: { [key: string]: { subject: string; message: string } } = {
      active: {
        subject: '🎉 Your Tiffo Seller Account is Now Active!',
        message: 'Congratulations! Your seller account has been approved and is now active. You can now start adding tiffins and receiving orders.'
      },
      suspended: {
        subject: '⚠️ Your Tiffo Seller Account Has Been Suspended',
        message: 'Your seller account has been temporarily suspended. Please contact support for more information.'
      },
      pending: {
        subject: '📋 Your Tiffo Seller Account is Under Review',
        message: 'Your seller account application is currently under review. We will notify you once it is approved.'
      }
    };

    const statusInfo = statusMessages[status] || {
      subject: '📧 Update on Your Tiffo Seller Account',
      message: `Your seller account status has been updated to: ${status}`
    };

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@tiffinservice.com',
      to: sellerEmail,
      subject: statusInfo.subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #dc2626; border-radius: 10px; overflow: hidden;">
          <div style="background: #dc2626; padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Tiffo</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Fresh Food Delivery</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #dc2626; margin-bottom: 20px; text-align: center;">Account Status Update</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Hello <strong>${sellerName}</strong>,
            </p>
            
            <p style="color: #4b5563; line-height: 1.6;">
              ${statusInfo.message}
            </p>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border: 1px solid #fecaca; margin: 20px 0; text-align: center;">
              <h3 style="color: #dc2626; margin-top: 0;">Current Status</h3>
              <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${status.toUpperCase()}</div>
            </div>
            
            ${status === 'active' ? `
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0; margin: 15px 0;">
              <h4 style="color: #166534; margin-top: 0;">Next Steps:</h4>
              <p style="color: #166534; margin: 5px 0;">✅ Add your tiffin items</p>
              <p style="color: #166534; margin: 5px 0;">✅ Set your available time slots</p>
              <p style="color: #166534; margin: 5px 0;">✅ Start receiving orders!</p>
            </div>
            ` : ''}
          </div>
          
          <div style="background: #dc2626; padding: 20px; text-align: center; color: white; font-size: 14px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} Tiffo. All rights reserved.</p>
          </div>
        </div>
      `,
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
      from: `"Tiffo" <${process.env.EMAIL_FROM || 'noreply@tiffinservice.com'}>`,
      to: customerEmail,
      subject: `Order Update - #${orderId} is now ${status}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; color: #1f2937;">
          <div style="background: #b91c1c; padding: 24px 30px; text-align: left;">
            <h1 style="margin: 0; font-size: 22px; color: #ffffff; letter-spacing: 0.5px;">Tiffo</h1>
            <p style="margin: 4px 0 0 0; color: #fecaca; font-size: 13px;">Fresh Food Delivery</p>
          </div>

          <div style="padding: 30px; background: #ffffff;">
            <h2 style="color: #111827; margin: 0 0 6px 0; font-size: 19px;">Order status updated</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
              Hello ${customerName}, there is an update on your order.
            </p>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden;">
              <tr><td style="padding: 8px 14px; color: #6b7280; width: 40%;">Order</td><td style="padding: 8px 14px;">#${orderId} - ${tiffinTitle}</td></tr>
              <tr>
                <td style="padding: 8px 14px; color: #6b7280; border-top: 1px solid #e5e7eb;">Status</td>
                <td style="padding: 8px 14px; font-weight: bold; border-top: 1px solid #e5e7eb; color: #b91c1c;">${status}</td>
              </tr>
            </table>
          </div>

          <div style="background: #f9fafb; padding: 16px 30px; text-align: left; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0;">This is an automated message from Tiffo. Please do not reply directly to this email.</p>
            <p style="margin: 4px 0 0 0;">&copy; ${new Date().getFullYear()} Tiffo. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Order status update sent to ${customerEmail}`);
  } catch (error: any) {
    console.error('Error sending order status update:', error.message);
  }
}

export default {
  sendPasswordResetOTP,
  sendBookingConfirmationToCustomer,
  sendOrderNotificationToSeller,
  sendOrderCancellationToSeller,
  sendOrderStatusUpdateToCustomer,
  sendSellerStatusUpdate,
  sendEmailSafely,
  testEmailSending
};
