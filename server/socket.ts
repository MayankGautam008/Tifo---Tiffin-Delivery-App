import { Server as SocketIOServer, type Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { storage } from "./storage";

// ✅ Single shared Socket.IO instance for the whole process. Routes call
// the emit* helpers below instead of importing socket.io directly, so
// the realtime wiring stays in one place.
let io: SocketIOServer | null = null;

// ✅ In-memory pending notification queue for offline sellers.
// When a seller is disconnected, new-order events are stored here and
// delivered in bulk the moment they reconnect. Ephemeral by design —
// a server restart clears it, but the REST /api/seller/bookings endpoint
// already returns all orders on page load, so no data is truly lost.
const pendingNotifications = new Map<string, unknown[]>();

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
          const sellerId = String(seller._id);
          socket.join(`seller:${sellerId}`);

          // ✅ Deliver any pending notifications that arrived while the
          // seller was offline, then clear the queue.
          const pending = pendingNotifications.get(sellerId);
          if (pending && pending.length > 0) {
            socket.emit("order:pending-sync", pending);
            pendingNotifications.delete(sellerId);
            if (process.env.NODE_ENV !== "production") {
              console.log(`📬 Delivered ${pending.length} pending notification(s) to seller ${sellerId}`);
            }
          }

          // ✅ Listen for acknowledgements from the seller client so we
          // can clean up any leftover pending entries.
          socket.on("order:acknowledged", (data: { orderId?: string }) => {
            if (!data?.orderId) return;
            const q = pendingNotifications.get(sellerId);
            if (q) {
              const filtered = q.filter(
                (item: any) =>
                  item?._id !== data.orderId &&
                  item?.cartOrderId !== data.orderId &&
                  item?.orderId !== data.orderId
              );
              if (filtered.length === 0) {
                pendingNotifications.delete(sellerId);
              } else {
                pendingNotifications.set(sellerId, filtered);
              }
            }
          });
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
  if (!io) return;

  const room = io.sockets.adapter.rooms.get(`seller:${sellerId}`);
  const isOnline = room && room.size > 0;

  if (isOnline) {
    // Seller has at least one connected socket — deliver instantly.
    io.to(`seller:${sellerId}`).emit("order:new", booking);
  } else {
    // Seller is offline — store for delivery on reconnect.
    const queue = pendingNotifications.get(sellerId) || [];
    queue.push(booking);
    pendingNotifications.set(sellerId, queue);
    if (process.env.NODE_ENV !== "production") {
      console.log(`📥 Seller ${sellerId} offline — queued notification (${queue.length} pending)`);
    }
  }
}

/** Pushes an order/status change to the customer who placed it (Customer Dashboard). */
export function emitOrderStatusToCustomer(customerId: string, booking: unknown) {
  io?.to(`user:${customerId}`).emit("order:status-updated", booking);
}

/** Pushes an order change (e.g. a customer cancellation) back to the seller. */
export function emitOrderUpdateToSeller(sellerId: string, booking: unknown) {
  io?.to(`seller:${sellerId}`).emit("order:updated", booking);
}
