import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { connectDB } from "./db";
import { createDefaultAdmin } from "./seed";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import cors from "cors";
import mongoSanitize from "express-mongo-sanitize";
import path from "path";

// ✅ Load environment variables at the top
dotenv.config();

const app = express();

// ✅ Render (and most cloud hosts) sit behind a reverse proxy, which sets
// X-Forwarded-For with the real client IP. Without trusting the proxy,
// express-rate-limit can't tell real users apart by IP (and throws the
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR warning). `1` = trust exactly one hop,
// which matches Render's single reverse-proxy setup.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ✅ SECURITY MIDDLEWARE - ORDER MATTERS!

app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "https://challenges.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:"],
      connectSrc: ["'self'", "https://challenges.cloudflare.com"],
      frameSrc: ["'self'", "https://challenges.cloudflare.com"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  // ✅ Helmet's default COOP (same-origin) blocks the cross-origin
  // postMessage/iframe handshake Turnstile's challenge needs, causing the
  // widget's own "Unable to connect to website" error.
  crossOriginOpenerPolicy: false
}));

// 2. CORS - Configure properly
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.CLIENT_URL || 'https://tifoindia.onrender.com'] 
    : ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 3. Body parser with limits (PEHLE BODY PARSER)
app.use(express.json({ 
  limit: '10kb'
}));
app.use(express.urlencoded({ 
  extended: false, 
  limit: '10kb' 
}));

// 4. Data sanitization against NoSQL injection
app.use(mongoSanitize());

// 5. Prevent parameter pollution
app.use(hpp());

// 6. Rate limiting (development me thoda relaxed)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Development me zyada requests allow
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Too many login attempts, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ Extra layer on top of the general limiter for the checkout endpoint
// specifically — this is the one place a script hammering the API can both
// spam the database with orders and (before the price fix) cause real money
// loss, so it gets its own tighter limit regardless of the general one.
const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    error: 'Too many checkout requests, please slow down and try again in a minute.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limits
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/cart/checkout', checkoutLimiter);

// ✅ Check JWT secret presence
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET missing in .env file!");
  process.exit(1);
} else {
  console.log("✅ JWT_SECRET loaded successfully");
}

// ✅ Request logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: any = undefined;

  const originalResJson = res.json.bind(res);

  res.json = ((body: any): Response => {
    capturedJsonResponse = body;
    return originalResJson(body);
  }) as typeof res.json;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        try {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        } catch {
          logLine += " :: [unserializable response]";
        }
      }
      if (logLine.length > 120) logLine = logLine.slice(0, 119) + "…";
      log ? log(logLine) : console.log(logLine);
    }
  });

  next();
});

// ✅ SIMPLE TELEGRAM BOT SETUP - NO ERRORS
function setupSimpleTelegramBot() {
  try {
    // ✅ SECURITY: no hardcoded fallback token — a leaked bot token in source
    // lets anyone impersonate the bot / read its chats. Must come from env.
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!TELEGRAM_BOT_TOKEN) {
      console.warn('⚠️ TELEGRAM_BOT_TOKEN not found. Telegram bot disabled.');
      return;
    }

    // Use dynamic import to avoid require issues
    import('node-telegram-bot-api').then((TelegramBot) => {
      const bot = new TelegramBot.default(TELEGRAM_BOT_TOKEN, { polling: true });

      // Generate verification code
      function generateVerificationCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
      }

      // ✅ SECURITY FIX: the /code handler used to accept literally any code
      // ("For now, just accept any code to test") — that's a full auth
      // bypass on this bot. Pending codes are now tracked per chat with a
      // 15-minute expiry and checked for a real match before verifying.
      const pendingVerifications = new Map<number, { email: string; code: string; expiresAt: number }>();
      const VERIFICATION_TTL_MS = 15 * 60 * 1000;

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
          console.log(`✅ Start command received from chat ID: ${chatId}`);
        } catch (error) {
          console.error('Start command error:', error);
        }
      });

      // Verify command - SUPER SIMPLE
      bot.onText(/\/verify (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const email = match![1].trim();

        try {
          console.log(`📧 Verification request from chat ID: ${chatId}`);

          const verificationCode = generateVerificationCode();
          pendingVerifications.set(chatId, {
            email,
            code: verificationCode,
            expiresAt: Date.now() + VERIFICATION_TTL_MS,
          });

          await bot.sendMessage(chatId,
            `📧 Verification code: ${verificationCode}\n\n` +
            `Use: /code ${verificationCode}\n\n` +
            `This code expires in 15 minutes`
          );

          console.log(`✅ Verification code sent to chat ID: ${chatId}`);

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
          const pending = pendingVerifications.get(chatId);

          if (!pending || pending.expiresAt < Date.now()) {
            pendingVerifications.delete(chatId);
            await bot.sendMessage(chatId, '❌ No active verification, or it expired. Please run /verify your-email@example.com again.');
            return;
          }

          if (pending.code !== code) {
            await bot.sendMessage(chatId, '❌ Incorrect code. Please check and try again.');
            return;
          }

          pendingVerifications.delete(chatId);

          await bot.sendMessage(chatId,
            `🎉 Verification Successful!\n\n` +
            `You will now receive order notifications.\n\n` +
            `Test order notification sent!`
          );

          // Send test order notification
          const testOrder = {
            customerName: "Test Customer",
            customerPhone: "9876543210", 
            tiffinTitle: "Butter Chicken Thali",
            quantity: 2,
            totalPrice: 380,
            deliveryDate: "25 Dec 2023",
            slot: "13:00-14:00",
            deliveryAddress: "123 Test Address, Bangalore",
            orderId: "TEST123"
          };

          setTimeout(() => {
            sendTestOrderNotification(chatId, testOrder);
          }, 2000);

        } catch (error) {
          console.error('Code verification error:', error);
          await bot.sendMessage(chatId, '❌ Error. Please try again.');
        }
      });

      // Help command
      bot.onText(/\/help/, async (msg) => {
        const chatId = msg.chat.id;
        
        await bot.sendMessage(chatId,
          `🤖 Tiffo Seller Bot Help\n\n` +
          `/start - Start the bot\n` +
          `/verify email@example.com - Register your email\n` +
          `/code 123456 - Verify with code\n` +
          `/help - Show this help\n\n` +
          `Once verified, you'll get instant order notifications!`
        );
      });

      console.log('✅ Telegram bot started successfully!');
      console.log('🤖 Search for: @TiffoSellerBot on Telegram');

    }).catch(error => {
      console.error('❌ Failed to load Telegram bot:', error);
    });
    
  } catch (error) {
    console.error('❌ Telegram bot setup failed:', error);
  }
}

// ✅ TEST ORDER NOTIFICATION FUNCTION
async function sendTestOrderNotification(chatId: number, orderDetails: any) {
  try {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    if (!TELEGRAM_BOT_TOKEN) return;

    const TelegramBot = await import('node-telegram-bot-api');
    const bot = new TelegramBot.default(TELEGRAM_BOT_TOKEN, { polling: false });

    const {
      customerName,
      customerPhone,
      tiffinTitle,
      quantity,
      totalPrice,
      deliveryDate,
      slot,
      deliveryAddress,
      orderId
    } = orderDetails;

    const message = `🎉 NEW ORDER #${orderId}\n\n` +
      `Tiffin: ${tiffinTitle}\n` +
      `Customer: ${customerName}\n` +
      `Phone: ${customerPhone}\n` +
      `Quantity: ${quantity}\n` +
      `Delivery: ${deliveryDate} at ${slot}\n` +
      `Address: ${deliveryAddress}\n` +
      `Amount: ₹${totalPrice}\n\n` +
      `⏰ ${new Date().toLocaleString('en-IN')}`;

    await bot.sendMessage(chatId, message);
    console.log(`✅ Test order notification sent to: ${chatId}`);
    
  } catch (error) {
    console.error('❌ Failed to send test notification:', error);
  }
}

// ✅ Main async block
(async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    await createDefaultAdmin();

    // Setup Telegram Bot
    setupSimpleTelegramBot();

    // Register all routes
    const server = await registerRoutes(app);

    // ✅ IMPORTANT: Vite setup ko pehle call karo
    if (app.get("env") === "development") {
      console.log("🔧 Setting up Vite dev server...");
      await setupVite(app, server);
    } else {
      console.log("📁 Serving static files...");
      serveStatic(app);
    }

    // ✅ Root route - Vite ke baad
    app.get("/", (req: Request, res: Response) => {
      if (app.get("env") === "development") {
        res.redirect("http://localhost:5000");
      } else {
        res.json({ 
          message: "Tiffin Service API is running!",
          version: "1.0.0",
          status: "active",
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || "development"
        });
      }
    });

    // ✅ Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("❌ Error:", err);
      res.status(status).json({ message });
    });

    // Start server
    const port = parseInt(process.env.PORT || "5000", 10);
    // ✅ Render (and most cloud hosts) require binding to 0.0.0.0 — binding
    // to "localhost" only accepts connections from inside the container,
    // so Render's port detection/health check never sees the server as up.
    const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";

    server.listen(port, host, () => {
      const msg = `🚀 Server running at http://${host}:${port}`;
      log ? log(msg) : console.log(msg);
      console.log(`🌐 Website should be available at: http://${host}:${port}`);
      console.log("🤖 Telegram Bot: @TiffoSellerBot");
      console.log("💡 Test the bot by searching '@TiffoSellerBot' on Telegram");
    });

    server.on("error", (err: any) => {
      console.error("❌ Server failed to start:", err.message);
      process.exit(1);
    });

  } catch (err: any) {
    console.error("💥 Startup error:", err.message);
    process.exit(1);
  }
})();
