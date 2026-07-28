import { Server as SocketIOServer, type Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { storage } from "./storage";

// ✅ Single shared Socket.IO instance for the whole process. Routes call
// the emit* helpers below instead of importing socket.io directly, so
// the realtime wiring stays in one place.
let io: SocketIOServer | null = null;

function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not defined");
  }
  return secret;
}

interface AuthedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

/**
 * Attaches Socket.IO to the existing HTTP server (same one Express uses),
 * so no extra port and no changes to how the app is deployed.
 */
export function initSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? ["https://yourdomain.com"]
          : ["http://localhost:3000", "http://localhost:5000"],
      credentials: true,
    },
  });

  // ✅ Reuse the same JWT the REST API already trusts (sent from the
  // client's existing auth token — no separate login flow needed).
  io.use((socket: AuthedSocket, next) => {
    try {
      const authHeader = socket.handshake.headers.authorization;
      const token: string | undefined =
        socket.handshake.auth?.token ||
        (typeof authHeader === "string" ? authHeader.split(" ")[1] : undefined);

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, getJWTSecret()) as {
        userId: string;
        role: string;
      };

      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", async (socket: AuthedSocket) => {
    const { userId, userRole } = socket;
    if (!userId) return;

    // Every authenticated user gets a personal room — this is what lets
    // us push order-status updates straight to a specific customer.
    socket.join(`user:${userId}`);

    // Sellers additionally join a room keyed by their seller profile id
    // (bookings store sellerId, not userId), used to push new orders.
    if (userRole === "seller") {
      try {
        const seller = await storage.getSellerByUserId(userId);
        if (seller) {
          socket.join(`seller:${seller._id}`);
        }
      } catch (error) {
        console.error("❌ Socket: failed to resolve seller for room join:", error);
      }
    }
  });

  console.log("✅ Socket.IO initialized for real-time order updates");
  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

/** Pushes a brand-new order to the seller who owns it (Seller Dashboard). */
export function emitNewOrderToSeller(sellerId: string, booking: unknown) {
  io?.to(`seller:${sellerId}`).emit("order:new", booking);
}

/** Pushes an order/status change to the customer who placed it (Customer Dashboard). */
export function emitOrderStatusToCustomer(customerId: string, booking: unknown) {
  io?.to(`user:${customerId}`).emit("order:status-updated", booking);
}

/** Pushes an order change (e.g. a customer cancellation) back to the seller. */
export function emitOrderUpdateToSeller(sellerId: string, booking: unknown) {
  io?.to(`seller:${sellerId}`).emit("order:updated", booking);
}
