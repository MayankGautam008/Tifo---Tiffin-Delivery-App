// services/orderNotificationService.ts
import { sendOrderToTelegram } from './telegramService';
import { TelegramSeller } from '../models/TelegramSeller';

export async function sendOrderNotification(orderDetails: any): Promise<void> {
  const {
    sellerEmail,
    customerName,
    customerPhone,
    tiffinTitle,
    quantity,
    totalPrice,
    deliveryDate,
    slot,
    deliveryAddress,
    addOns = [],
    weeklyCustomizations = [],
    customization,
    orderId
  } = orderDetails;

  try {
    // Check if seller has Telegram registration
    const telegramSeller = await TelegramSeller.findOne({ 
      email: sellerEmail, 
      isVerified: true 
    });

    if (telegramSeller) {
      console.log(`📱 Sending Telegram notification to: ${sellerEmail}`);
      
      const telegramSuccess = await sendOrderToTelegram(
        telegramSeller.telegramChatId, 
        orderDetails
      );

      if (telegramSuccess) {
        console.log(`✅ Telegram notification delivered to ${sellerEmail}`);
        // Telegram notification sent successfully
        return;
      }
    }

    // Fallback to email if Telegram not available or failed
    console.log(`📧 Falling back to email for: ${sellerEmail}`);
    const { sendOrderNotificationToSeller } = require('../emailService');
    const sellerDashboardLink = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/seller/dashboard`;
    
    await sendOrderNotificationToSeller(sellerEmail, orderDetails, sellerDashboardLink);
    
  } catch (error) {
    console.error('❌ Error in order notification service:', error);
    // Ensure email is sent as final fallback
    try {
      const { sendOrderNotificationToSeller } = require('../emailService');
      const sellerDashboardLink = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/seller/dashboard`;
      await sendOrderNotificationToSeller(sellerEmail, orderDetails, sellerDashboardLink);
    } catch (emailError) {
      console.error('❌ Email fallback also failed:', emailError);
    }
  }
}