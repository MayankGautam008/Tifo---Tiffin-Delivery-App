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
// ✅ FIX: tiffin create/update requests now carry the seller's photo as a
// base64 string inside the JSON body (see server/middleware/upload.ts) —
// a 1.4MB photo becomes ~1.9MB of base64 text, which blew straight through
// the 10kb cap below and got rejected with "Payload Too Large" *before it
// ever reached the route handler*. The 10kb cap is intentionally tight
// everywhere else (guards against oversized-body abuse), so instead of
// raising it globally, only these two image-carrying routes get a bigger
// 8mb parser — every other route keeps the tight 10kb limit.
const TIFFIN_IMAGE_ROUTES = [/^\/api\/seller\/tiffins$/, /^\/api\/seller\/tiffins\/[^/]+$/];
const isTiffinImageRoute = (path: string) => TIFFIN_IMAGE_ROUTES.some((re) => re.test(path));

app.use((req, res, next) => {
  const limit = isTiffinImageRoute(req.path) ? "8mb" : "10kb";
  express.json({ limit })(req, res, next);
});
app.use((req, res, next) => {
  const limit = isTiffinImageRoute(req.path) ? "8mb" : "10kb";
  express.urlencoded({ extended: false, limit })(req, res, next);
});

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

import { setupTelegramBot } from "./services/telegramService";

// ✅ Main async block
(async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    await createDefaultAdmin();

    // Setup Telegram Bot via service
    setupTelegramBot();

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
