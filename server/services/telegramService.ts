// services/telegramService.ts
const TelegramBot = require('node-telegram-bot-api');
import { TelegramSeller } from '../models/TelegramSeller';

// Initialize Telegram Bot
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7749762991:AAF4re8yBw9MOneQDTl6N6Ek4wzk4PCOirY';

if (!TELEGRAM_BOT_TOKEN) {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN not found');
}

export const bot = TELEGRAM_BOT_TOKEN ? new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true }) : null;

// Generate verification code 
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send order notification to Telegram
export async function sendOrderToTelegram(chatId: number, orderDetails: any): Promise<boolean> {
  if (!bot) {
    console.warn('Telegram bot not initialized');
    return false;
  }

  try {
    const {
      customerName,
      customerPhone,
      tiffinTitle,
      quantity,
      totalPrice,
      deliveryDate,
      slot,
      deliveryAddress,
      addOns = [],
      customization,
      orderId
    } = orderDetails;

    // Simple message format - error avoid karne ke liye
    let message = `🎉 NEW ORDER #${orderId}\n\n`;
    message += `Tiffin: ${tiffinTitle}\n`;
    message += `Customer: ${customerName}\n`;
    message += `Phone: ${customerPhone}\n`;
    message += `Quantity: ${quantity}\n`;
    message += `Delivery: ${deliveryDate} at ${slot}\n`;
    message += `Address: ${deliveryAddress}\n`;
    message += `Amount: ₹${totalPrice}\n`;

    if (addOns.length > 0) {
      message += `\nAdd-ons:\n`;
      addOns.forEach((addOn: any) => {
        message += `• ${addOn.name} × ${addOn.quantity} - ₹${addOn.price * addOn.quantity}\n`;
      });
    }

    if (customization) {
      message += `\nInstructions: ${customization}\n`;
    }

    message += `\nTime: ${new Date().toLocaleString('en-IN')}`;

    await bot.sendMessage(chatId, message);
    console.log(`✅ Telegram notification sent to: ${chatId}`);
    return true;
  } catch (error) {
    console.error('❌ Telegram failed:', error);
    return false;
  }
}

// Setup bot commands - SIMPLIFIED VERSION
export function setupTelegramBot() {
  if (!bot) {
    console.warn('Telegram bot not available');
    return;
  }

  // Start command
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
      await bot.sendMessage(chatId, 
        `👋 Welcome to Tiffo Seller Bot!\n\n` +
        `I'll send you instant order notifications.\n\n` +
        `To get started, type:\n` +
        `/verify your-email@example.com`
      );
    } catch (error) {
      console.error('Start command error:', error);
    }
  });

  // Verify command - SIMPLIFIED
  bot.onText(/\/verify (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const email = match![1].trim().toLowerCase();

    try {
      console.log('Verification attempt:', { email, chatId });

      // Simple check - remove complex database queries for now
      const verificationCode = generateVerificationCode();
      
      // Direct save without complex checks
      const TelegramSeller = require('../models/TelegramSeller').TelegramSeller;
      
      await TelegramSeller.create({
        email,
        telegramChatId: chatId,
        isVerified: false,
        verificationCode,
        sellerId: new (require('mongoose').Types.ObjectId)() // Temporary
      });

      await bot.sendMessage(chatId,
        `📧 Verification code: ${verificationCode}\n\n` +
        `Use: /code ${verificationCode}\n\n` +
        `(Email system baad mein add karenge)`
      );

    } catch (error) {
      console.error('Verify command error:', error);
      await bot.sendMessage(chatId, '❌ Error. Please try: /verify youremail@gmail.com');
    }
  });

  // Code verification
  bot.onText(/\/code (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const code = match![1].trim();

    try {
      const TelegramSeller = require('../models/TelegramSeller').TelegramSeller;
      const telegramSeller = await TelegramSeller.findOne({ telegramChatId: chatId });
      
      if (!telegramSeller) {
        await bot.sendMessage(chatId, '❌ Please start with /verify first.');
        return;
      }

      if (telegramSeller.verificationCode === code) {
        telegramSeller.isVerified = true;
        await telegramSeller.save();

        await bot.sendMessage(chatId,
          `🎉 Verification Successful!\n\n` +
          `You will now receive order notifications.`
        );
      } else {
        await bot.sendMessage(chatId, '❌ Invalid code. Try again.');
      }

    } catch (error) {
      console.error('Code verification error:', error);
      await bot.sendMessage(chatId, '❌ Error. Please try again.');
    }
  });

  console.log('✅ Telegram bot started!');
}